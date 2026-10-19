/** URLs por defecto de los proveedores de IA, sobreescribibles en build con VITE_* */

export function defaultAiBaseUrl(provider: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  if (provider === 'gemini') return env.VITE_AI_GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
  if (provider === 'ollama') return env.VITE_AI_OLLAMA_BASE_URL ?? 'http://localhost:11434';
  return env.VITE_AI_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
}