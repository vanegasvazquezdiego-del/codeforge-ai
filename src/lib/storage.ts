/**
 * Persistencia local con versionado y migración segura.
 * Todo el estado del producto vive en localStorage bajo claves `codeforge:v1:*`.
 * Nada sale del navegador: no hay backend ni cuentas.
 */

const PREFIX = 'codeforge:v1:';
export const KEY_SETTINGS = `${PREFIX}settings`;
export const KEY_PROFILE = `${PREFIX}profile`;
export const KEY_WORKSPACE = `${PREFIX}workspace`;
export const KEY_EXERCISES = `${PREFIX}exercises`;
export const KEY_ASSISTANT = `${PREFIX}assistant`;
export const KEY_ACTIVITY = `${PREFIX}activity`;
export const KEY_SESSION_AIKEY = `${PREFIX}ai-key-session`;
/** Mapa `{ [ejercicioId]: timestamp }`. Guarda el progreso también sobre el catálogo semilla. */
export const KEY_SOLVED = `${PREFIX}solved`;

function available(): boolean {
  try {
    const probe = `${PREFIX}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const HAS_LS = typeof window !== 'undefined' && available();
/** Cuando localStorage está bloqueado (modo privado estricto), caemos a memoria. */
const memory = new Map<string, string>();

export const storageAvailable = HAS_LS;

function merge<T>(fallback: T, parsed: unknown): T {
  // Los arrays se reemplazan enteros: mezclarlos daria un objeto sin métodos.
  if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
  if (fallback && typeof fallback === 'object' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { ...(fallback as object), ...(parsed as object) } as T;
  }
  return parsed === null || parsed === undefined ? fallback : (parsed as T);
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = HAS_LS ? localStorage.getItem(key) : (memory.get(key) ?? null);
    if (raw == null) return fallback;
    return merge(fallback, JSON.parse(raw) as unknown);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    if (HAS_LS) localStorage.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    /* Cuota llena o serialización circular: la app sigue funcionando en memoria. */
  }
}

export function removeKey(key: string): void {
  try {
    if (HAS_LS) localStorage.removeItem(key);
    else memory.delete(key);
  } catch {
    /* noop */
  }
}

export function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return merge(fallback, JSON.parse(raw) as unknown);
  } catch {
    return fallback;
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/** Borrado selectivo: solo las claves de CodeForge. */
export function clearAll(): void {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
  try {
    sessionStorage.removeItem(KEY_SESSION_AIKEY);
  } catch {
    /* noop */
  }
  memory.clear();
}

export function estimateBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) total += (localStorage.getItem(k) ?? '').length + (k?.length ?? 0);
    }
  } catch {
    /* noop */
  }
  return total * 2;
}

/* -------------------------------------------------------------------------
   Exportar / importar. El snapshot nunca incluye la clave de la IA.
   ------------------------------------------------------------------------- */

const EXPORT_KEYS = [KEY_SETTINGS, KEY_PROFILE, KEY_WORKSPACE, KEY_EXERCISES, KEY_SOLVED, KEY_ASSISTANT, KEY_ACTIVITY];

export function exportSnapshot(): string {
  const payload: Record<string, unknown> = { __codeforge: 1, exportedAt: new Date().toISOString() };
  EXPORT_KEYS.forEach((key) => {
    if (key === KEY_SETTINGS) {
      const settings = readJSON<Record<string, unknown>>(key, {});
      const ai = (settings.ai ?? {}) as Record<string, unknown>;
      // Nunca exportar secretos, ni siquiera por accidente.
      payload[key] = { ...settings, ai: { ...ai, apiKey: '' } };
      return;
    }
    const value = readJSON<unknown>(key, null);
    if (value !== null) payload[key] = value;
  });
  return JSON.stringify(payload, null, 2);
}

export function importSnapshot(raw: string): { ok: boolean; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON valido.' };
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { __codeforge?: number }).__codeforge !== 1) {
    return { ok: false, error: 'El archivo no es un snapshot de CodeForge (falta la cabecera __codeforge).' };
  }
  const entries = Object.entries(parsed as Record<string, unknown>).filter(([key]) => key.startsWith(PREFIX));
  if (!entries.length) return { ok: false, error: 'El snapshot no contiene ninguna clave de CodeForge.' };
  entries.forEach(([key, value]) => writeJSON(key, value));
  return { ok: true };
}