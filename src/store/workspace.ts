import { create } from 'zustand';
import type { CodeFile, LanguageId, RunResult } from '@/lib/types';
import { getLanguage, STARTERS } from '@/lib/languages';
import { uid } from '@/lib/cn';
import { EngineError, execute } from '@/lib/engine';
import { playResultTone } from '@/lib/sound';
import { KEY_WORKSPACE, readJSON, writeJSON } from '@/lib/storage';
import { useSettings } from './settings';
import { useActivity } from './activity';

const MAX_RUNS = 30;

export function defaultFileName(languageId: LanguageId): string {
  const lang = getLanguage(languageId);
  if (lang.entryName) return lang.entryName;
  return `main.${lang.ext}`;
}

function starterFiles(languageId: LanguageId): CodeFile[] {
  return [{ id: uid('f'), name: defaultFileName(languageId), content: STARTERS[languageId], entry: true }];
}

interface SelectionSnapshot {
  text: string;
  startLine: number | null;
  endLine: number | null;
}

export interface WorkspaceState {
  languageId: LanguageId;
  files: CodeFile[];
  activeId: string;
  runs: RunResult[];
  running: boolean;
  lastRunId: string | null;
  selection: SelectionSnapshot;
  setLanguage: (id: LanguageId) => void;
  setActive: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  addFile: () => void;
  renameFile: (id: string, name: string) => void;
  removeFile: (id: string) => void;
  setEntry: (id: string) => void;
  resetToStarter: () => void;
  setSelection: (snapshot: SelectionSnapshot) => void;
  run: () => Promise<RunResult>;
  cancel: () => void;
  clearRuns: () => void;
}

const persisted = readJSON<{ languageId?: LanguageId; files?: CodeFile[]; activeId?: string }>(KEY_WORKSPACE, {});
const initialLanguage: LanguageId = persisted.languageId ?? 'python';
const initialFiles =
  Array.isArray(persisted.files) && persisted.files.length
    ? persisted.files
    : starterFiles(initialLanguage);
const initialActive =
  persisted.activeId && initialFiles.some((f) => f.id === persisted.activeId)
    ? persisted.activeId
    : (initialFiles.find((f) => f.entry) ?? initialFiles[0]).id;

let controller: AbortController | null = null;

export const useWorkspace = create<WorkspaceState>((set, get) => {
  function save(patch: Partial<Pick<WorkspaceState, 'languageId' | 'files' | 'activeId'>>) {
    const next = { ...get(), ...patch };
    writeJSON(KEY_WORKSPACE, {
      languageId: next.languageId,
      files: next.files,
      activeId: next.activeId,
    });
  }

  return {
    languageId: initialLanguage,
    files: initialFiles,
    activeId: initialActive,
    runs: [],
    running: false,
    lastRunId: null,
    selection: { text: '', startLine: null, endLine: null },

    setLanguage: (id) => {
      const current = get();
      // Si ya hay archivos con contenido propio, no los pisamos.
      const touched = current.files.length > 1;
      if (!touched && getLanguage(current.languageId).id !== id) {
        const files = starterFiles(id);
        set({ languageId: id, files, activeId: files[0].id });
        save({ languageId: id, files, activeId: files[0].id });
        return;
      }
      // Java exige Main.java: renombramos o creamos el archivo de entrada.
      const lang = getLanguage(id);
      const files = current.files.map((f) =>
        lang.entryName && f.entry ? { ...f, name: lang.entryName as string } : f,
      );
      const needsEntry = lang.entryName && !files.some((f) => f.name === lang.entryName);
      if (needsEntry) {
        files.unshift({
          id: uid('f'),
          name: lang.entryName as string,
          content: STARTERS[id],
          entry: true,
        });
      }
      set({ languageId: id, files, activeId: files[0].id });
      save({ languageId: id, files, activeId: files[0].id });
    },

    setActive: (id) => {
      set({ activeId: id });
      save({ activeId: id });
    },

    updateContent: (id, content) => {
      const files = get().files.map((f) => (f.id === id ? { ...f, content } : f));
      set({ files });
      save({ files });
    },

    addFile: () => {
      const state = get();
      const lang = getLanguage(state.languageId);
      const name = `helper.${lang.ext}`;
      const file: CodeFile = {
        id: uid('f'),
        name: state.files.some((f) => f.name === name) ? `helper-${state.files.length}.${lang.ext}` : name,
        content: lang.kind === 'sql' ? '-- Archivo auxiliar\n' : lang.kind === 'preview' ? `/* ${name} */\n` : `\n`,
        entry: false,
      };
      const files = [...state.files, file];
      set({ files, activeId: file.id });
      save({ files, activeId: file.id });
    },

    renameFile: (id, name) => {
      const clean = name.trim().replace(/\s+/g, '-');
      if (!clean) return;
      const files = get().files.map((f) => (f.id === id ? { ...f, name: clean } : f));
      set({ files });
      save({ files });
    },

    removeFile: (id) => {
      const state = get();
      if (state.files.length <= 1) return;
      const files = state.files.filter((f) => f.id !== id);
      if (!files.some((f) => f.entry)) files[0] = { ...files[0], entry: true };
      const activeId = state.activeId === id ? (files.find((f) => f.entry)?.id ?? files[0].id) : state.activeId;
      set({ files, activeId });
      save({ files, activeId });
    },

    setEntry: (id) => {
      const files = get().files.map((f) => ({ ...f, entry: f.id === id }));
      set({ files });
      save({ files });
    },

    resetToStarter: () => {
      const files = starterFiles(get().languageId);
      set({ files, activeId: files[0].id });
      save({ files, activeId: files[0].id });
    },

    setSelection: (snapshot) => set({ selection: snapshot }),

    clearRuns: () => set({ runs: [], lastRunId: null }),

    cancel: () => {
      controller?.abort();
      controller = null;
    },

    run: async () => {
      const state = get();
      if (state.running) return state.runs[0];

      const settings = useSettings.getState();
      const activity = useActivity.getState();
      const lang = getLanguage(state.languageId);

      // HTML/CSS no se ejecutan: generan un preview local y lo dicen.
      if (lang.kind === 'preview') {
        const bytes = new TextEncoder().encode(state.files.map((f) => f.content).join('\n')).length;
        const result: RunResult = {
          id: uid('run'),
          languageId: state.languageId,
          status: 'ok',
          stdout: `Preview generado · ${bytes} bytes de marcado`,
          stderr: '',
          output: `Preview generado · ${bytes} bytes de marcado`,
          exitCode: 0,
          signal: null,
          wallMs: 0,
          cpuMs: 0,
          createdAt: Date.now(),
          engineError: null,
        };
        set({ runs: [result, ...state.runs].slice(0, MAX_RUNS), lastRunId: result.id });
        activity.logRun();
        return result;
      }

      controller = new AbortController();
      set({ running: true });
      activity.logRun();

      try {
        const result = await execute(state.languageId, state.files, {
          preference: settings.engine,
          pistonBaseUrl: settings.pistonBaseUrl,
          stdin: settings.stdin,
          signal: controller.signal,
        });
        set({ runs: [result, ...get().runs].slice(0, MAX_RUNS), running: false, lastRunId: result.id });
        activity.bumpCleanRun(result.status === 'ok');
        if (settings.soundEnabled) playResultTone(result.status === 'ok' ? 'ok' : 'error');
        return result;
      } catch (err) {
        const message = err instanceof EngineError ? err.message : 'Error desconocido al ejecutar.';
        const result: RunResult = {
          id: uid('run'),
          languageId: state.languageId,
          status: 'error',
          stdout: '',
          stderr: message,
          output: message,
          exitCode: null,
          signal: null,
          wallMs: 0,
          cpuMs: null,
          createdAt: Date.now(),
          engineError: message,
        };
        set({ runs: [result, ...get().runs].slice(0, MAX_RUNS), running: false, lastRunId: result.id });
        if (settings.soundEnabled) playResultTone('error');
        return result;
      } finally {
        controller = null;
      }
    },
  };
});

export function activeFile(state: WorkspaceState): CodeFile {
  return state.files.find((f) => f.id === state.activeId) ?? state.files[0];
}