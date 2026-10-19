import type { AiActionId, AssistantContext, ExerciseDraft, Level, TestCase } from './types';
import { getLanguage } from './languages';
import { uid } from './cn';

export const SYSTEM_PERSONA = `Eres el copiloto de CodeForge, un asistente de programacion integrado en un IDE web.
El usuario esta escribiendo codigo en un editor Monaco y puede ejecutar el programa en un motor real.

Reglas:
- Responde en espanol neutro, con vocativo "tu" y sin excessos de entusiasmo.
- Se concreto: primero la idea o el error, despues el detalle. Nada de preambulos ni de repetir la pregunta.
- Usa Markdown breve: \`codigo en linea\`, listas y bloques con lenguaje. Nada de titulos gigantes.
- Cuando des codigo completo, ponlo siempre en un bloque con el lenguaje correcto y sin fences dentro.
- Si el codigo tiene un error, di cual es la causa raiz y cual es la correction minima. No reescribas el programa entero si basta con una linea.
- No inventes APIs que no existen. Si no estas seguro de una version, dilo.
- No generes codigo malicioso ni que haga scraping de credenciales. Tareas de autenticacion: explica el riesgo y ofrece la alternativa etica.`;

export function buildContext(ctx: AssistantContext): string {
  const lang = getLanguage(ctx.languageId);
  const lines: string[] = [];

  lines.push(`## Contexto del editor`);
  lines.push(`- Lenguaje: ${lang.label} (${lang.kind === 'preview' ? 'renderizado en el navegador' : 'ejecutado en un contenedor remoto'})`);
  lines.push(`- Archivo: \`${ctx.fileName}\``);
  lines.push(`- Nivel declarado del usuario: ${ctx.level}`);

  if (ctx.selection.trim()) {
    const linesLabel =
      ctx.selectionStartLine !== null && ctx.selectionEndLine !== null
        ? ctx.selectionStartLine === ctx.selectionEndLine
          ? `linea ${ctx.selectionStartLine}`
          : `lineas ${ctx.selectionStartLine}-${ctx.selectionEndLine}`
        : 'seleccion';
    lines.push(`\n### Seleccion del usuario (${linesLabel})`);
    lines.push('```' + lang.id + '\n' + ctx.selection.trim() + '\n```');
    lines.push(`\n(Fragmento seleccionado. Enfocate solo en esto; el archivo completo va aparte si hace falta.)`);
  }

  if (!ctx.lastError && ctx.lastRunOk === true) {
    lines.push(`\n### Ultima ejecucion\nEl programa termino correctamente.`);
  } else if (ctx.lastError) {
    lines.push(`\n### Salida de la ultima ejecucion (stdout + stderr)`);
    lines.push('```text\n' + ctx.lastError.slice(0, 3000) + '\n```');
  }

  if (!ctx.selection.trim() && ctx.code.trim()) {
    lines.push(`\n### Archivo activo (\`${ctx.fileName}\`)`);
    lines.push('```' + lang.id + '\n' + ctx.code.slice(0, 6000) + '\n```');
  }

  return lines.join('\n');
}

export const ACTIONS: Record<
  Exclude<AiActionId, 'freeform' | 'exercise'>,
  { label: string; short: string; prompt: (ctx: AssistantContext) => string; placeholder: string }
> = {
  explain: {
    label: 'Explicar seleccion',
    short: 'Explicar',
    placeholder: 'Que hace este fragmento y por que asi?',
    prompt: (ctx) =>
      ctx.selection.trim()
        ? `Explica que hace el fragmento seleccionado, paso a paso y con calma. Si hay una decision de diseno no obvia, seniala. Si el codigo tiene un fallo sutil, mencionalo al final.`
        : `Selecciona el fragmento que quieras que te explique. Mientras tanto, dame una idea general de que deberia hacer el archivo activo.`,
  },
  debug: {
    label: 'Depurar error',
    short: 'Depurar',
    placeholder: 'Por que falla y como lo arreglo?',
    prompt: () =>
      `El usuario ha ejecutado el programa y hay un problema. Diagnostica la causa raiz en este orden: 1) sintaxis o imports, 2) tipos, 3) logica y casos borde, 4) entradas. Da la correccion minima y explica en una frase por que funciona. Si necesitas un caso de entrada concreto para demostrar el fallo, dimelo.`,
  },
  optimize: {
    label: 'Optimizar',
    short: 'Optimizar',
    placeholder: 'Como lo hago mas rapido o mas limpio?',
    prompt: () =>
      `Revisa el codigo buscando mejoras con impacto real: coste algoritmico, llamadas repetidas dentro de bucles, estructuras de datos inadecuadas, y legibilidad. Ordena las sugerencias por impacto. Para cada una di el antes/despues y cuanto cambia. No propongas cambios cosmeticos.`,
  },
  teach: {
    label: 'Explicar concepto',
    short: 'Concepto',
    placeholder: 'Que es un closure / recursion / puntero?',
    prompt: (ctx) =>
      `El usuario quiere entender un concepto. Explica el concepto que nombre en su mensaje: que significa, un ejemplo minimo ejecutable en ${getLanguage(ctx.languageId).label}, dos errores tipicos y cuando conviene cada variante. Si no encaja con el contexto del editor, da igual: responde igual de bien.`,
  },
};

/* -------------------------------------------------------------------------
   Generación de ejercicios: salida JSON estricta.
   ------------------------------------------------------------------------- */

const LEVEL_BLURB: Record<Level, string> = {
  Principiante:
    'variables, condicionales, bucles, funciones y estructuras basicas. Un unico concepto nuevo por ejercicio. Entradas pequenas.',
  Intermedio:
    'colecciones, funciones de orden superior, recursion, manipulacion de cadenas, concurrencia basica o algoritmos clasicos (dos punteros, sorting, backtracking simple).',
  Avanzado:
    'complejidad, estructuras balanceadas, grafos, heaps, diseno de algoritmos, concurrencia y rendimiento. Pide justificar la complejidad.',
};

const RULES_STDIN = `El programa DEBE leer sus datos de stdin, uno por linea, y escribir el resultado en stdout con println/print (sin prefijos como "Resultado:").
NO leas argumentos de linea de comandos. NO uses librerias externas. NO incluyas ejemplos ni texto explicativo en la salida.`;

export function exercisePrompt(languageId: string, level: Level, extra: string): string {
  const lang = getLanguage(languageId as AssistantContext['languageId']);
  const isMarkup = lang.kind === 'preview';

  if (isMarkup) {
    return `Crea un ejercicio practico de ${lang.label} de nivel ${level}. No se ejecuta en un motor, asi que el enunciado debe describir que se ve en el preview.
Responde EXCLUSIVAMENTE con un bloque \`\`\`json\`\`\`.`;
  }

  const inputRule = lang.stdin
    ? RULES_STDIN
    : `El problema NO depende de stdin: el programa debe imprimir su resultado directamente. Usa datos definidos en una constante al principio del archivo.`;

  return `Genera UN ejercicio de programacion en ${lang.label}, nivel **${level}**.

Foco del nivel: ${LEVEL_BLURB[level]}
${extra.trim() ? `\nPeticion extra del usuario: ${extra.trim()}\n` : ''}
${inputRule}

El enunciado debe:
- Nombrar el objetivo en una frase y explicar la entrada y la salida esperada.
- Indicar las restricciones (rangos, tamano maximo) para que el tiempo sea acotado.
- Ser autocontenido: quien lo lea sin ver el chat debe poder resolverlo.

Casos de prueba: escribe exactamente 3, con ${lang.stdin ? 'stdin' : 'sin stdin'} y la stdout exacta esperada, incluyendo el salto de linea final.

Responde EXCLUSIVAMENTE con un bloque \`\`\`json\`\`\`, sin texto antes ni despues, con esta forma exacta:
\`\`\`json
{
  "title": "Titulo corto en imperativo",
  "statement": "Enunciado en markdown. Usa \\n para los saltos de linea.",
  "concepts": ["concepto1", "concepto2"],
  "starter": "Codigo inicial con TODO claramente marcado. Debe compilar o ejecutar.",
  "hint": "Una pista util, no la solucion.",
  "tests": [
    { "label": "Caso basico", "stdin": "1 2 3", "expected": "6" },
    { "label": "Caso limite", "stdin": "0", "expected": "0" },
    { "label": "Caso con negativos", "stdin": "-2 5", "expected": "7" }
  ]
}
\`\`\``;
}

export const EXERCISE_SYSTEM = `${SYSTEM_PERSONA}

Ademas, cuando te pidan un ejercicio, devuelves SOLO el bloque JSON con la forma indicada.
El campo \`starter\` debe compilar y ejecutar (puede no resolver el problema, pero no debe romperse).
El campo \`expected\` es la stdout EXACTA, incluyendo el salto de linea final.`;

/* -------------------------------------------------------------------------
   Parseo tolerante del JSON de ejercicios
   ------------------------------------------------------------------------- */

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('no hay ningun objeto JSON en la respuesta.');
  }
  // trim + poda de comas colgantes: los modelos casi nunca devuelven JSON puro.
  const slice = body.slice(start, end + 1).trim().replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.stringify(JSON.parse(slice));
  } catch (err) {
    // El mensaje de JSON.parse incluye la posicion: es lo accionable.
    throw new Error(`${err instanceof Error ? err.message : 'JSON ilegible'} — recibe: ${slice.slice(0, 160)}`);
  }
}

function cleanText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').trim();
}

function parseTests(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];
  const out: TestCase[] = [];
  value.slice(0, 6).forEach((raw, i) => {
    if (raw && typeof raw === 'object') {
      const t = raw as Record<string, unknown>;
      out.push({
        id: uid('t'),
        label: cleanText(t.label, `Caso ${i + 1}`),
        stdin: cleanText(t.stdin) || cleanText(t.input),
        expected: cleanText(t.expected) || cleanText(t.output),
      });
    } else if (typeof raw === 'string') {
      out.push({ id: uid('t'), label: `Caso ${i + 1}`, stdin: raw, expected: '' });
    }
  });
  return out;
}

export function parseExercise(raw: string, level: Level): ExerciseDraft {
  const json = JSON.parse(extractJsonBlock(raw)) as Record<string, unknown>;
  const statement = cleanText(json.statement);
  const starter = cleanText(json.starter);

  if (!statement) throw new Error('El enunciado vino vacio.');
  if (!starter) throw new Error('El codigo inicial vino vacio.');

  const concepts = Array.isArray(json.concepts)
    ? (json.concepts as unknown[]).slice(0, 6).map((c) => cleanText(c)).filter(Boolean)
    : [];

  const rawLevel = cleanText(json.level).toLowerCase();
  const levelHit = (['Principiante', 'Intermedio', 'Avanzado'] as Level[]).find(
    (l) => rawLevel.startsWith(l.toLowerCase()),
  );

  return {
    title: cleanText(json.title, 'Ejercicio sin titulo'),
    level: levelHit ?? level,
    statement,
    concepts,
    starter,
    hint: cleanText(json.hint, 'No hay pista disponible.'),
    tests: parseTests(json.tests),
  };
}

/* -------------------------------------------------------------------------
   Extracción de código para "aplicar al editor"
   ------------------------------------------------------------------------- */

export interface ExtractedCode {
  language: string;
  code: string;
}

/** Devuelve el ultimo bloque cercado de la respuesta, si lo hay. */
export function extractLastCode(raw: string): ExtractedCode | null {
  const matches = [...raw.matchAll(/```([a-zA-Z0-9+#._-]*)\s*\n([\s\S]*?)```/g)];
  const usable = matches.filter((m) => m[2].trim().length > 0);
  const last = usable.at(-1);
  if (!last) return null;
  return { language: (last[1] || '').toLowerCase(), code: last[2].replace(/\s+$/, '') };
}

/** Cuenta líneas no vacías: una medida honesta de "cuánto escribió el usuario". */
export function countCodeLines(code: string): number {
  return code.split('\n').filter((l) => l.trim().length > 0).length;
}