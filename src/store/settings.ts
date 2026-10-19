import { create } from 'zustand';
import type { AiSettings, AppSettings, EditorSettings, EnginePreference, ThemeId } from '@/lib/types';
import { defaultConfig } from '@/lib/ai';
import { defaultPistonUrl } from '@/lib/engine';
import {
  KEY_SESSION_AIKEY,
  KEY_SETTINGS,
  readJSON,
  readSession,
  removeKey,
  writeJSON,
  writeSession,
} from '@/lib/storage';

export const THEME_ORDER: ThemeId[] = ['void', 'slate', 'cyber', 'paper'];

export const THEME_META: Record<ThemeId, { label: string; hint: string; swatch: [string, string, string] }> = {
  void: { label: 'Void', hint: 'Oscuro profundo, acento menta', swatch: ['#0f1219', '#1a1f29', '#4ade9b'] },
  slate: { label: 'Slate', hint: 'Oscuro tipo VS Code, acento azul', swatch: ['#161a21', '#20262f', '#6ea8fe'] },
  cyber: { label: 'Cyber', hint: 'Oscuro magenta/cian, alto contraste', swatch: ['#14101c', '#231b2c', '#ff5ea8'] },
  paper: { label: 'Paper', hint: 'Claro calido, acento verde profundo', swatch: ['#faf9f6', '#ffffff', '#1f9c72'] },
};

const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  skin: 'sync',
  minimap: false,
  wordWrap: false,
  lineNumbers: true,
  ligatures: true,
  formatOnType: true,
  smoothScrolling: true,
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'void',
  editor: DEFAULT_EDITOR,
  ai: defaultConfig('gemini'),
  engine: 'auto',
  pistonBaseUrl: defaultPistonUrl(),
  stdin: '',
  allowEditorWrites: true,
  soundEnabled: false,
};

function hydrate(): AppSettings {
  const stored = readJSON<Partial<AppSettings>>(KEY_SETTINGS, {});

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    editor: { ...DEFAULT_EDITOR, ...(stored.editor ?? {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(stored.ai ?? {}) },
  };
}

interface SettingsStore extends AppSettings {
  /** Clave en sesión cuando keyStorage === 'session'; no se persiste en disco. */
  sessionApiKey: string;
  setTheme: (theme: ThemeId) => void;
  setEditor: (patch: Partial<EditorSettings>) => void;
  setAi: (patch: Partial<AiSettings>) => void;
  setAiProvider: (provider: AiSettings['provider']) => void;
  setEngine: (engine: EnginePreference) => void;
  setPistonBaseUrl: (url: string) => void;
  setStdin: (value: string) => void;
  setAllowEditorWrites: (value: boolean) => void;
  setSoundEnabled: (value: boolean) => void;
  resetSettings: () => void;
}

function persist(state: AppSettings, sessionKey: string) {
  const { sessionApiKey: _ignored, ...rest } = state as SettingsStore;
  void _ignored;
  const ai: AiSettings = {
    ...rest.ai,
    // Nunca escribimos la clave en disco si el usuario eligió sesión.
    apiKey: rest.ai.keyStorage === 'local' ? rest.ai.apiKey : '',
  };
  writeJSON(KEY_SETTINGS, { ...rest, ai });
  writeSession(KEY_SESSION_AIKEY, sessionKey);
}

export const useSettings = create<SettingsStore>((set, get) => {
  const initial = hydrate();
  const sessionKey = initial.ai.keyStorage === 'session' ? readSession<string>(KEY_SESSION_AIKEY, '') : '';

  return {
    ...initial,
    ai: { ...initial.ai, apiKey: sessionKey || initial.ai.apiKey },
    sessionApiKey: sessionKey,

    setTheme: (theme) => {
      set({ theme });
      document.documentElement.dataset.theme = theme;
      persist(get(), sessionKey);
    },
    setEditor: (patch) => {
      set({ editor: { ...get().editor, ...patch } });
      persist(get(), sessionKey);
    },
    setAi: (patch) => {
      const current = get().ai;
      const next: AiSettings = { ...current, ...patch };
      set({ ai: next, sessionApiKey: patch.apiKey ?? current.apiKey });
      persist(get(), patch.apiKey ?? get().sessionApiKey);
    },
    setAiProvider: (provider) => {
      const base = defaultConfig(provider);
      const previous = get().ai;
      // Conserva la key si el usuario ya la habia escrito para otro proveedor.
      const keepKey = previous.apiKey;
      const next: AiSettings = { ...base, apiKey: keepKey };
      set({ ai: next });
      persist(get(), keepKey);
    },
    setEngine: (engine) => {
      set({ engine });
      persist(get(), sessionKey);
    },

    setPistonBaseUrl: (pistonBaseUrl) => {
      set({ pistonBaseUrl });
      persist(get(), sessionKey);
    },
    setStdin: (stdin) => {
      set({ stdin });
      persist(get(), sessionKey);
    },
    setAllowEditorWrites: (allowEditorWrites) => {
      set({ allowEditorWrites });
      persist(get(), sessionKey);
    },
    setSoundEnabled: (soundEnabled) => {
      set({ soundEnabled });
      persist(get(), sessionKey);
    },
    resetSettings: () => {
      removeKey(KEY_SESSION_AIKEY);
      document.documentElement.dataset.theme = DEFAULT_SETTINGS.theme;
      set({ ...DEFAULT_SETTINGS, ai: defaultConfig('gemini'), sessionApiKey: '' });
      persist(get(), '');
    },
  };
});