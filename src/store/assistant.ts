import { create } from 'zustand';
import type { AiActionId, AiMessage, AssistantContext, ExerciseDraft, LanguageId, Level } from '@/lib/types';
import { AiError, chat } from '@/lib/ai';
import {
  ACTIONS,
  EXERCISE_SYSTEM,
  SYSTEM_PERSONA,
  buildContext,
  exercisePrompt,
  ExerciseParseError,
  parseExercise,
} from '@/lib/prompts';
import { uid } from '@/lib/cn';
import { KEY_ASSISTANT, readJSON, writeJSON } from '@/lib/storage';
import { useSettings } from './settings';
import { useProfile } from './profile';
import { useWorkspace } from './workspace';

let inflight: AbortController | null = null;

/** Acciones con prompt propio en `prompts.ts`. */
type PromptActionId = Exclude<AiActionId, 'freeform' | 'exercise'>;

function persist(messages: AiMessage[]) {
  writeJSON(KEY_ASSISTANT, messages.slice(-40));
}

interface AssistantState {
  messages: AiMessage[];
  busy: boolean;
  open: boolean;
  /** Ultimo codigo extraido de la respuesta, listo para aplicar al editor. */
  setOpen: (open: boolean) => void;
  toggle: () => void;
  clear: () => void;
  context: () => AssistantContext;
  send: (action: AiActionId, text?: string) => Promise<void>;
  stop: () => void;
  requestExercise: (languageId: LanguageId, level: Level, extra: string) => Promise<ExerciseDraft>;
}

function assistantSnapshot(): AssistantContext {
  const workspace = useWorkspace.getState();
  const file = workspace.files.find((f) => f.id === workspace.activeId) ?? workspace.files[0];
  const lastRun = workspace.runs[0] ?? null;
  return {
    languageId: workspace.languageId,
    selection: workspace.selection.text,
    selectionStartLine: workspace.selection.startLine,
    selectionEndLine: workspace.selection.endLine,
    code: file?.content ?? '',
    fileName: file?.name ?? 'main',
    lastError:
      lastRun && (lastRun.status !== 'ok' || lastRun.engineError)
        ? (lastRun.output || lastRun.stderr || 'La ejecucion termino con error.')
        : null,
    lastRunOk: lastRun ? lastRun.status === 'ok' : null,
    // El nivel vive en el perfil: una sola fuente de verdad.
    level: useProfile.getState().level,
  };
}

function aiConfig() {
  const settings = useSettings.getState();
  const sessionKey = settings.sessionApiKey;
  return {
    ...settings.ai,
    apiKey: settings.ai.keyStorage === 'session' && sessionKey ? sessionKey : settings.ai.apiKey,
  };
}

export const useAssistant = create<AssistantState>((set, get) => ({
  messages: readJSON<AiMessage[]>(KEY_ASSISTANT, []),
  busy: false,
  // En movil el copiloto arranca cerrado: si no, tapa la app al entrar.
  open: typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,

  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),

  clear: () => {
    persist([]);
    set({ messages: [] });
  },

  context: assistantSnapshot,

  stop: () => {
    inflight?.abort();
    inflight = null;
    set({ busy: false });
    set({ messages: get().messages.map((m) => (m.pending ? { ...m, pending: false } : m)) });
  },

  send: async (action, text) => {
    const state = get();
    if (state.busy) return;

    const ctx = assistantSnapshot();
    const actionDef = ACTIONS[action as PromptActionId];
    const actionPrompt = actionDef?.prompt(ctx) ?? '';
    // El texto del usuario manda; si no hay, la accion aporta el encabezado.
    const userContent = text?.trim() ? text.trim() : actionPrompt ? actionDef.label : '';

    if (!userContent) return;

    const userMsg: AiMessage = {
      id: uid('m'),
      role: 'user',
      content: action === 'freeform' ? userContent : `${userContent}`,
      createdAt: Date.now(),
      action,
    };

    const pendingId = uid('m');
    const pendingMsg: AiMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      pending: true,
    };

    const messages = [...state.messages, userMsg, pendingMsg];
    set({ messages, busy: true });
    persist(messages);

    const history = messages
      .filter((m) => m.id !== pendingId)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    inflight = new AbortController();

    try {
      const reply = await chat(
        aiConfig(),
        [
          { role: 'system', content: SYSTEM_PERSONA },
          {
            role: 'system',
            content: `${buildContext(ctx)}\n\n---\nTarea del usuario: ${userContent}\n${actionPrompt}`,
          },
          ...history,
        ],
        inflight.signal,
      );

      set({
        busy: false,
        messages: get().messages.map((m) =>
          m.id === pendingId ? { ...m, content: reply, pending: false } : m,
        ),
      });
      persist(get().messages);
    } catch (err) {
      const message =
        err instanceof AiError ? err.message : 'El asistente no respondio. Intenta de nuevo.';
      set({
        busy: false,
        messages: get().messages.map((m) =>
          m.id === pendingId
            ? { ...m, content: '', pending: false, error: message }
            : m,
        ),
      });
      persist(get().messages);
    } finally {
      inflight = null;
    }
  },

  requestExercise: async (languageId, level, extra) => {
    inflight = new AbortController();
    set({ busy: true });
    const config = aiConfig();
    try {
      const raw = await chat(
        config,
        [
          { role: 'system', content: EXERCISE_SYSTEM },
          { role: 'user', content: exercisePrompt(languageId, level, extra) },
        ],
        inflight.signal,
        {
          json: true,
          // Un ejercicio lleva enunciado, arranque y 3 casos: con el limite
          // normal la respuesta llega cortada y el JSON queda a medias.
          minTokens: config.provider === 'gemini' ? 8192 : 4096,
        },
      );
      const draft = parseExercise(raw, level);
      set({ busy: false });
      return draft;
    } catch (err) {
      set({ busy: false });
      if (err instanceof AiError) throw err;
      // El error de parseo ya trae un mensaje accionable y la respuesta cruda.
      if (err instanceof ExerciseParseError) throw err;
      // Se conserva la causa real: "el modelo devolvio algo raro" sin detalle
      // no ayuda ni al usuario ni para depurar el prompt.
      const cause = err instanceof Error ? err.message : 'motivo desconocido';
      throw new Error(`El modelo no devolvio un ejercicio valido: ${cause}`);
    } finally {
      inflight = null;
    }
  },
}));

/** Limpia el estado de carga si el componente se desmonta durante una peticion. */
export function abortInflight() {
  inflight?.abort();
  inflight = null;
}