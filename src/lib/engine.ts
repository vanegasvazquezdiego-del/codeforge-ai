import type { CodeFile, EngineId, EnginePreference, LanguageId, RunResult } from './types';
import { getLanguage, SQLITE_SCHEMA, SQLITE_SEED } from './languages';
import { uid } from './cn';

/* =========================================================================
   Motores de ejecución
   -------------------------------------------------------------------------
   CodeForge habla con hasta tres motores públicos y rota entre ellos:

   1. Judge0 CE   → cobertura completa de lenguajes y versiones recientes.
   2. Wandbox     → mas rapido en algunos casos; no soporta Java.
   3. Piston      → el unico que acepta varios archivos. Desde 2026-02-15 el
                    servicio publico exige lista blanca, asi que solo sirve si
                    apuntas a tu propia instancia (Ajustes → Motor).

   Un fallo de infraestructura (red, 429, 5xx) hace caer al siguiente motor.
   Un error del programa es un resultado valido: nunca se oculta.
   ========================================================================= */

export const ENGINE_BASE: Record<EngineId, string> = {
  judge0: 'https://ce.judge0.com',
  wandbox: 'https://wandbox.org/api',
  piston: 'https://emkc.org/api/v2/piston',
};

export const ENGINE_META: Record<EngineId, { label: string; hint: string; multiFile: boolean }> = {
  judge0: {
    label: 'Judge0 CE',
    hint: 'Servicio publico de evaluacion. Cubre los diez lenguajes con versiones recientes.',
    multiFile: false,
  },
  wandbox: {
    label: 'Wandbox',
    hint: 'Ejecucion rapida en una jaula. No acepta Java ni varios archivos.',
    multiFile: false,
  },
  piston: {
    label: 'Piston',
    hint: 'El unico motor con soporte multi-archivo. La instancia publica exige lista blanca desde 2026-02-15.',
    multiFile: true,
  },
};

const PREFERENCE_ORDER: EngineId[] = ['judge0', 'wandbox', 'piston'];

/* -------------------------------------------------------------------------
   Limitador de caudal. Judge0 CE sin clave admite ~50 peticiones/minuto.
   ------------------------------------------------------------------------- */
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP = 260;

function throttle<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_GAP - (Date.now() - lastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return task();
  });
  chain = run.catch(() => undefined);
  return run;
}

export class EngineError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'rate' | 'server' | 'timeout' | 'bad-request' | 'unsupported',
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/* -------------------------------------------------------------------------
   Modo SQL: un unico archivo Python con esquema, semilla y consulta en base64.
   Se evita por completo cualquier problema de escapado con las comillas.
   ------------------------------------------------------------------------- */

function b64(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export const SQL_ENGINE_KEYS = {
  judge0: '109',
  wandbox: 'cpython-3.13.8',
  piston: 'python',
} as const;

export function buildSqlProgram(query: string): string {
  return `import base64, sqlite3, sys

def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)

SCHEMA = base64.b64decode("${b64(SQLITE_SCHEMA)}").decode("utf-8")
SEED = base64.b64decode("${b64(SQLITE_SEED)}").decode("utf-8")
QUERY = base64.b64decode("${b64(query)}").decode("utf-8")

con = sqlite3.connect(":memory:")
try:
    con.executescript(SCHEMA)
    con.executescript(SEED)
except Exception as exc:
    die("Error preparando la base: %s" % exc)

statements = [s.strip() for s in QUERY.split(";") if s.strip()]
if not statements:
    die("La consulta esta vacia.")

cur = con.cursor()
for index, stmt in enumerate(statements, start=1):
    if len(statements) > 1:
        print("-- sentencia %d/%d" % (index, len(statements)))
    try:
        cur.execute(stmt)
    except Exception as exc:
        die("Error SQL: %s" % exc)
    if cur.description:
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        print(" | ".join(cols))
        print("-+-".join("-" * len(c) for c in cols))
        for row in rows:
            print(" | ".join("" if v is None else str(v) for v in row))
        if not rows:
            print("(0 filas)")
    else:
        print("OK - %d fila(s) afectadas" % cur.rowcount)
`;
}

/* -------------------------------------------------------------------------
   Candidatos
   ------------------------------------------------------------------------- */

function targetKey(languageId: LanguageId, engine: EngineId): string | null {
  const lang = getLanguage(languageId);
  if (lang.kind === 'preview') return null;
  if (lang.kind === 'sql') return SQL_ENGINE_KEYS[engine];
  const map = lang.engines;
  if (!map) return null;
  return map[engine] ?? null;
}

export function engineSupports(languageId: LanguageId, engine: EngineId): boolean {
  return targetKey(languageId, engine) !== null;
}

export function resolveEngines(languageId: LanguageId, preference: EnginePreference): EngineId[] {
  const lang = getLanguage(languageId);
  const ordered: EngineId[] = preference === 'auto' ? [] : [preference];
  for (const engine of PREFERENCE_ORDER) {
    if (engineSupports(languageId, engine) && !ordered.includes(engine)) ordered.push(engine);
  }
  if (!ordered.length) {
    throw new EngineError(`${lang.label} no se puede ejecutar desde el navegador.`, 'unsupported');
  }
  return ordered;
}

/* -------------------------------------------------------------------------
   Resultado
   ------------------------------------------------------------------------- */

interface Stage {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  wallMs: number;
  cpuMs: number | null;
  status: RunResult['status'];
}

function finish(languageId: LanguageId, stage: Stage, wallMs: number): RunResult {
  return {
    id: uid('run'),
    languageId,
    createdAt: Date.now(),
    engineError: null,
    stdout: stage.stdout,
    stderr: stage.stderr,
    output: `${stage.stdout}${stage.stderr}`,
    exitCode: stage.code,
    signal: stage.signal,
    wallMs,
    cpuMs: stage.cpuMs,
    status: stage.status,
  };
}

function errorResult(languageId: LanguageId, message: string, wallMs: number): RunResult {
  return {
    id: uid('run'),
    languageId,
    createdAt: Date.now(),
    engineError: message,
    stdout: '',
    stderr: message,
    output: message,
    exitCode: null,
    signal: null,
    wallMs,
    cpuMs: null,
    status: 'error',
  };
}

/* -------------------------------------------------------------------------
   Judge0 CE
   ------------------------------------------------------------------------- */

interface Judge0Response {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  exit_code?: number | null;
  signal?: string | null;
  time?: string | null;
  status?: { id: number; description: string };
}

/**
 * Códigos de estado de Judge0 CE:
 *   1 encolado · 2 procesando · 3 aceptado · 4 respuesta incorrecta
 *   5 tiempo límite excedido · 6 error de compilación
 *   7-12 errores en tiempo de ejecución (SEGV, KILL, BUS, FPE, ABRT)
 *   13 error interno · 14 formato de ejecutable
 */
const JUDGE0_TIMEOUT = 5;
const JUDGE0_COMPILE_ERROR = 6;

async function runJudge0(
  key: string,
  code: string,
  stdin: string,
  signal: AbortSignal,
): Promise<Stage> {
  const response = await fetch(`${ENGINE_BASE.judge0}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: Number(key),
      source_code: code,
      stdin,
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 256_000,
    }),
    signal,
  });

  if (!response.ok) throw await readError(response, 'judge0');

  const data = (await response.json()) as Judge0Response;
  const statusId = data.status?.id ?? 3;
  const compileOutput = (data.compile_output ?? '').trim();
  const stderr = (data.stderr ?? '').trim();
  const message = (data.message ?? '').trim();
  const stdout = data.stdout ?? '';
  const cpuMs = data.time ? Math.round(Number(data.time) * 1000) : null;
  // Judge0 no siempre devuelve exit_code. Antes se inventaba el id de estado
  // como codigo de salida y la consola llegaba a mostrar "exit 11" sin sentido.
  const exitCode = typeof data.exit_code === 'number' ? data.exit_code : null;
  const statusNote = !exitCode && data.status?.description ? `[${data.status.description}] ` : '';

  if (statusId === JUDGE0_COMPILE_ERROR || (compileOutput && statusId !== 3)) {
    return {
      stdout,
      stderr: [compileOutput, message].filter(Boolean).join('\n'),
      code: 1,
      signal: data.signal ?? null,
      wallMs: 0,
      cpuMs,
      status: 'error',
    };
  }

  const ok = statusId === 3 && !stderr;
  return {
    stdout,
    stderr: `${statusNote}${[stderr, message].filter(Boolean).join('\n')}`.trim(),
    code: exitCode,
    signal: data.signal ?? null,
    wallMs: 0,
    cpuMs,
    status: statusId === JUDGE0_TIMEOUT ? 'timeout' : ok ? 'ok' : 'error',
  };
}

/* -------------------------------------------------------------------------
   Wandbox
   ------------------------------------------------------------------------- */

interface WandboxResponse {
  status: string;
  signal?: string;
  compiler_error?: string;
  compiler_output?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
}

async function runWandbox(key: string, code: string, stdin: string, signal: AbortSignal): Promise<Stage> {
  const response = await fetch(`${ENGINE_BASE.wandbox}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, compiler: key, stdin }),
    signal,
  });

  if (!response.ok) throw await readError(response, 'wandbox');

  const data = (await response.json()) as WandboxResponse;
  const compilerError = (data.compiler_error ?? '').trim();
  const compilerMessage = (data.compiler_message ?? '').trim();
  const programError = (data.program_error ?? '').trim();
  const programOutput = data.program_output ?? '';
  const exitCode = data.status === '0' ? 0 : Number(data.status) || 1;

  if (compilerError) {
    return {
      stdout: programOutput,
      stderr: [compilerError, compilerMessage].filter(Boolean).join('\n'),
      code: exitCode,
      signal: data.signal || null,
      wallMs: 0,
      cpuMs: null,
      status: 'error',
    };
  }

  const ok = data.status === '0' && !programError;
  const timedOut = data.status === '3' || /timeout|time limit/i.test(data.signal ?? '');
  return {
    stdout: programOutput,
    stderr: [programError].filter(Boolean).join('\n').trim(),
    code: exitCode,
    signal: data.signal || null,
    wallMs: 0,
    cpuMs: null,
    status: timedOut ? 'timeout' : ok ? 'ok' : 'error',
  };
}

/* -------------------------------------------------------------------------
   Piston (multi-archivo)
   ------------------------------------------------------------------------- */

interface PistonStage {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
  cpu_time?: number;
}

interface PistonResponse {
  run?: PistonStage;
  compile?: PistonStage;
  message?: string;
}

async function runPiston(
  key: string,
  files: CodeFile[],
  stdin: string,
  baseUrl: string,
  signal: AbortSignal,
): Promise<Stage> {
  const base = (baseUrl || ENGINE_BASE.piston).replace(/\/+$/, '');
  const ordered = [...files].sort((a, b) => Number(b.entry) - Number(a.entry));
  const payload = ordered.map((f) => ({ name: f.name, content: f.content }));

  const response = await throttle(() =>
    fetch(`${base}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: key,
        version: '*',
        files: payload,
        stdin,
        compile_timeout: 10_000,
        run_timeout: 8_000,
        compile_memory_limit: 256_000_000,
        run_memory_limit: 256_000_000,
      }),
      signal,
    }),
  );

  if (!response.ok) throw await readError(response, 'piston');

  const data = (await response.json()) as PistonResponse;
  if (data.message && !data.run) throw new EngineError(data.message, 'bad-request');

  const compile = data.compile ?? {};
  const run = data.run ?? {};
  const compileFailed = typeof compile.code === 'number' && compile.code !== 0;
  const stderr = [compile.output, run.stderr].filter(Boolean).join('\n').trim();
  const timedOut = run.signal === 'SIGKILL';
  const exitCode = compileFailed ? (compile.code ?? 1) : (run.code ?? 0);
  const ok = !compileFailed && exitCode === 0 && !stderr && !timedOut;

  return {
    stdout: run.stdout ?? '',
    stderr,
    code: exitCode,
    signal: run.signal ?? null,
    wallMs: 0,
    cpuMs: typeof run.cpu_time === 'number' ? Math.round(run.cpu_time * 1000) : null,
    status: timedOut ? 'timeout' : ok ? 'ok' : 'error',
  };
}

/* -------------------------------------------------------------------------
   Errores
   ------------------------------------------------------------------------- */

async function readError(response: Response, engine: EngineId): Promise<EngineError> {
  const raw = await response.text().catch(() => '');
  let detail = raw.slice(0, 200);
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const message = json.message ?? json.error ?? json.detail;
    if (typeof message === 'string') detail = message;
  } catch {
    /* respuesta no JSON */
  }

  const { status } = response;
  const label = ENGINE_META[engine].label;

  if (status === 401 || status === 403) {
    return new EngineError(
      engine === 'piston'
        ? 'La instancia publica de Piston exige lista blanca desde 2026-02-15. Judge0 y Wandbox siguen funcionando.'
        : `${label} rechazo la peticion.`,
      'server',
    );
  }
  if (status === 422) return new EngineError(detail || 'El motor rechazo el codigo enviado.', 'bad-request');
  if (status === 429) return new EngineError(`${label}: limite de peticiones alcanzado.`, 'rate');
  if (status >= 500) return new EngineError(`${label} fallo (${status}).`, 'server');
  return new EngineError(`${label} respondio ${status}: ${detail}`, 'network');
}

/* -------------------------------------------------------------------------
   API pública
   ------------------------------------------------------------------------- */

export interface ExecuteOptions {
  preference: EnginePreference;
  pistonBaseUrl: string;
  stdin: string;
  signal?: AbortSignal;
}

export async function execute(
  languageId: LanguageId,
  files: CodeFile[],
  options: ExecuteOptions,
): Promise<RunResult> {
  const lang = getLanguage(languageId);
  const started = performance.now();
  const candidates = resolveEngines(languageId, options.preference);

  if (candidates.length === 0) {
    throw new EngineError(`${lang.label} no tiene motor de ejecucion.`, 'unsupported');
  }

  const multiFile = files.filter((f) => f.content.trim()).length > 1;
  const usable = multiFile
    ? candidates.filter((c) => ENGINE_META[c].multiFile)
    : candidates;

  if (multiFile && usable.length === 0) {
    throw new EngineError(
      'Este proyecto tiene varios archivos y solo Piston los admite. Configura tu propia instancia de Piston en Ajustes → Motor de ejecucion, o deja un unico archivo en el editor.',
      'unsupported',
    );
  }

  // Si el proyecto es multi-archivo, se explica por que el resto no participa.
  const discarded = multiFile
    ? ` Judge0 y Wandbox solo aceptan un archivo, asi que no se han probado.`
    : '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  const problems: string[] = [];

  try {
    for (const engine of usable) {
      const key = targetKey(languageId, engine);
      if (!key) continue;

      const payload = buildSingleFile(languageId, files);

      try {
        const stage =
          engine === 'judge0'
            ? await throttle(() => runJudge0(key, payload, options.stdin, controller.signal))
            : engine === 'wandbox'
              ? await throttle(() => runWandbox(key, payload, options.stdin, controller.signal))
              : await runPiston(key, files, options.stdin, options.pistonBaseUrl, controller.signal);

        return finish(languageId, stage, Math.round(performance.now() - started));
      } catch (err) {
        if (err instanceof EngineError) {
          // Un rechazo del codigo es del usuario, no de la infraestructura.
          if (err.kind === 'bad-request') return errorResult(languageId, err.message, Math.round(performance.now() - started));
          problems.push(`${ENGINE_META[engine].label}: ${err.message}`);
          continue;
        }
        problems.push(`${ENGINE_META[engine].label}: fallo inesperado.`);
      }
    }

    const message = `Ningun motor pudo ejecutar el programa.${discarded} ${problems.join(' ')}`;
    return errorResult(languageId, message, Math.round(performance.now() - started));
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

/** Judge0 y Wandbox aceptan un unico archivo: el de entrada. */
function buildSingleFile(languageId: LanguageId, files: CodeFile[]): string {
  const lang = getLanguage(languageId);
  if (lang.kind === 'sql') {
    const entry = files.find((f) => f.entry) ?? files[0];
    return buildSqlProgram(entry?.content ?? '');
  }
  const entry = files.find((f) => f.entry) ?? files[0];
  return entry?.content ?? '';
}

/** Salud del motor: ejecuta una prueba real, no un ping a la raiz. */
export async function probeEngine(
  engine: EngineId,
  pistonBaseUrl: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; detail: string }> {
  const ac = signal ?? new AbortController().signal;
  try {
    if (engine === 'piston') {
      const base = (pistonBaseUrl || ENGINE_BASE.piston).replace(/\/+$/, '');

      let runtimes = 0;
      try {
        const res = await fetch(`${base}/runtimes`, { signal: ac });
        if (res.ok) {
          const list = (await res.json()) as unknown[];
          runtimes = Array.isArray(list) ? list.length : 0;
        }
      } catch {
        runtimes = 0;
      }

      // `/runtimes` puede seguir abierto aunque `/execute` este bloqueado:
      // la unica comprobacion fiable es compilar y ejecutar de verdad.
      const stage = await runPiston(
        'python',
        [{ id: 'probe', name: 'main.py', content: 'print("ok")', entry: true }],
        '',
        base,
        ac,
      );
      if (stage.status !== 'ok') {
        throw new EngineError(
          runtimes > 0
            ? 'La instancia responde a /runtimes pero rechaza la ejecucion. Si es emkc.org, su API publica exige lista blanca desde 2026-02-15. Judge0 y Wandbox siguen funcionando.'
            : 'Sin respuesta del motor de ejecucion.',
          'server',
        );
      }
      return {
        ok: true,
        detail: `Operativo · ejecuto una prueba real${runtimes > 0 ? ` · ${runtimes} runtimes` : ''}`,
      };
    }

    const key = engine === 'judge0' ? SQL_ENGINE_KEYS.judge0 : SQL_ENGINE_KEYS.wandbox;
    const stage =
      engine === 'judge0' ? await runJudge0(key, 'print("ok")', '', ac) : await runWandbox(key, 'print("ok")', '', ac);
    return {
      ok: stage.status === 'ok',
      detail:
        stage.status === 'ok'
          ? 'Operativo · compilo y ejecuto una prueba real'
          : 'Responde, pero la prueba de humo no salio limpia. Puede estar saturado.',
    };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'Sin respuesta del motor.' };
  }
}

export function defaultPistonUrl(): string {
  return (import.meta.env.VITE_PISTON_BASE_URL as string | undefined) ?? ENGINE_BASE.piston;
}