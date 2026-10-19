import type { AiSettings } from './types';
import { defaultAiBaseUrl } from './ai-urls';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'config' | 'network' | 'auth' | 'rate' | 'server' | 'empty',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export const MODEL_PRESETS: Record<AiSettings['provider'], { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash — el mas recomendado' },
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — anterior, muy solido' },
    { value: 'gemini-flash-lite-latest', label: 'Flash Lite — el mas ligero y barato' },
    { value: 'gemini-pro-latest', label: 'Gemini Pro — el mas potente (gasta mas cuota)' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini — equilibrio' },
    { value: 'gpt-4o', label: 'GPT-4o — mas matiz' },
    { value: 'o4-mini', label: 'o4-mini — razonamiento' },
  ],
  ollama: [
    { value: 'qwen2.5-coder:7b', label: 'qwen2.5-coder:7b — codigo' },
    { value: 'llama3.1:8b', label: 'llama3.1:8b — generalista' },
    { value: 'deepseek-coder-v2:16b', label: 'deepseek-coder-v2:16b — codigo' },
  ],
};

export const PROVIDER_LABEL: Record<AiSettings['provider'], string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI o compatible',
  ollama: 'Ollama (local)',
};

export const PROVIDER_NEEDS_KEY: Record<AiSettings['provider'], boolean> = {
  gemini: true,
  openai: true,
  ollama: false,
};

function requiresKey(config: AiSettings): boolean {
  return PROVIDER_NEEDS_KEY[config.provider];
}

function assertConfigured(config: AiSettings) {
  if (!config.model.trim()) throw new AiError('Elige un modelo en Ajustes.', 'config');
  if (!config.baseUrl.trim()) throw new AiError('Falta la URL base del proveedor.', 'config');
  if (requiresKey(config) && !config.apiKey.trim())
    throw new AiError(
      `${PROVIDER_LABEL[config.provider]} necesita una API key. Añadela en Ajustes → Asistente IA.`,
      'config',
    );
}

async function readError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const err = json.error as { message?: string } | string | undefined;
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    const candidate = json.message ?? json.detail;
    if (typeof candidate === 'string') return candidate;
  } catch {
    /* no JSON */
  }
  return raw.slice(0, 240) || `HTTP ${response.status}`;
}

function toAiError(status: number, detail: string): AiError {
  // El detalle del proveedor suele decir mucho mas que el codigo HTTP
  // (por ejemplo, "usa el modelo X en su lugar"), asi que no se descarta.
  const extra = detail && detail.length < 220 ? ` Detalle del proveedor: ${detail}` : '';
  if (status === 401 || status === 403)
    return new AiError(`Credenciales rechazadas. Revisa la API key.${extra}`, 'auth', status);
  if (status === 429)
    return new AiError(
      `Se agoto la cuota o el rate limit del proveedor.${extra || ' Prueba con un modelo mas ligero o espera unos minutos.'}`,
      'rate',
      status,
    );
  if (status === 404)
    return new AiError(
      `Endpoint o modelo no encontrado. Revisa la URL base y el nombre del modelo.${extra}`,
      'config',
      status,
    );
  if (status >= 500) return new AiError(`El proveedor fallo (${status}): ${detail}`, 'server', status);
  return new AiError(`Error ${status}: ${detail}`, 'server', status);
}

function joinPrompt(turns: ChatTurn[]): { system: string; history: { role: 'user' | 'assistant'; content: string }[] } {
  const system = turns
    .filter((t) => t.role === 'system')
    .map((t) => t.content)
    .join('\n\n');
  const history = turns
    .filter((t) => t.role !== 'system')
    .map((t) => ({ role: t.role as 'user' | 'assistant', content: t.content }))
    .slice(-10);
  return { system, history };
}

async function postJson(url: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    throw new AiError(
      aborted
        ? 'Peticion cancelada.'
        : `No se pudo contactar ${new URL(url, location.origin).host}. Revisa la URL base y tu conexion.`,
      'network',
    );
  }
  if (!response.ok) throw toAiError(response.status, await readError(response));
  try {
    return await response.json();
  } catch {
    throw new AiError('El proveedor devolvio una respuesta que no es JSON valido.', 'server');
  }
}

/* -------------------------------------------------------------------------
   Adaptadores
   ------------------------------------------------------------------------- */

type GeminiPart = { text: string };
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

async function callGemini(config: AiSettings, turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  const { system, history } = joinPrompt(turns);
  const contents: GeminiContent[] = history.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.content }],
  }));

  const url = `${config.baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(config.model)}:generateContent`;
  const data = (await postJson(
    `${url}?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        },
      }),
    },
    signal,
  )) as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> };

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new AiError('El modelo no devolvio texto. Prueba a bajar `maxTokens` o cambiar de modelo.', 'empty');
  return text;
}

async function callOpenAICompatible(config: AiSettings, turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  const messages: ChatTurn[] = turns.slice(-12);
  const data = (await postJson(
    `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
      }),
    },
    signal,
  )) as { choices?: Array<{ message?: { content?: string } }> };

  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!text) throw new AiError('El modelo no devolvio texto. Revisa el nombre del modelo.', 'empty');
  return text;
}

async function callOllama(config: AiSettings, turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  const messages: ChatTurn[] = turns.slice(-12);
  const data = (await postJson(
    `${config.baseUrl.replace(/\/+$/, '')}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: { temperature: config.temperature, num_predict: config.maxTokens },
      }),
    },
    signal,
  )) as { message?: { content?: string } };

  const text = data.message?.content?.trim() ?? '';
  if (!text) throw new AiError('Ollama no devolvio texto. Comprueba que el modelo este descargado (`ollama pull`).', 'empty');
  return text;
}

export async function chat(config: AiSettings, turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  assertConfigured(config);
  if (config.provider === 'gemini') return callGemini(config, turns, signal);
  if (config.provider === 'ollama') return callOllama(config, turns, signal);
  return callOpenAICompatible(config, turns, signal);
}

/* -------------------------------------------------------------------------
   Verificación de conexión (Ajustes)
   ------------------------------------------------------------------------- */

export interface PingResult {
  ok: boolean;
  detail: string;
}

export async function testConnection(config: AiSettings): Promise<PingResult> {
  try {
    assertConfigured(config);
    const text = await chat(
      config,
      [
        { role: 'system', content: 'Responde solo con la palabra LISTO.' },
        { role: 'user', content: 'Conexion de prueba. Responde LISTO.' },
      ],
      AbortSignal.timeout(25_000),
    );
    const normalized = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    return normalized.includes('LISTO')
      ? { ok: true, detail: `Conectado a ${PROVIDER_LABEL[config.provider]} · ${config.model}` }
      : { ok: true, detail: `Respondio ${config.model}: "${text.slice(0, 80)}"` };
  } catch (err) {
    if (err instanceof AiError) return { ok: false, detail: err.message };
    return { ok: false, detail: 'Fallo inesperado al probar la conexion.' };
  }
}

export function defaultConfig(provider: AiSettings['provider'] = 'gemini'): AiSettings {
  return {
    provider,
    apiKey: '',
    baseUrl: defaultAiBaseUrl(provider),
    model: MODEL_PRESETS[provider][0].value,
    temperature: 0.3,
    maxTokens: 1600,
    keyStorage: 'local',
  };
}