import { create } from 'zustand';
import type { CodeFile, LanguageId, RunResult } from '@/lib/types';
import { getLanguage, STARTERS } from '@/lib/languages';
import { uid } from '@/lib/cn';
import { EngineError, execute } from '@/lib/engine';
import { playResultTone } from '@/lib/sound';
import { ANCHOR_NAME, dirname, filesInFolder, normalizePath, skeletonFor, uniquePath, validatePath } from '@/lib/files';
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

/** Ruta sugerida para un archivo nuevo dentro de una carpeta cualquiera. */
export function suggestFileName(languageId: LanguageId, folder: string, label?: string): string {
  const lang = getLanguage(languageId);
  const base = label ?? lang.entryName ?? `main.${lang.ext}`;
  return folder ? `${folder}/${base}` : base;
}

/** Una carpeta existe si algun archivo cuelga de ella. */
export function folderExists(files: CodeFile[], folder: string): boolean {
  return files.some((file) => file.name.startsWith(`${folder}/`));
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
  /** Crea un archivo en `folder`. Devuelve el error o el archivo creado. */
  createFile: (folder: string, rawName: string) => { ok: boolean; id?: string; error?: string };
  /** Crea una carpeta escribiendo `padre/nueva`. */
  createFolder: (folder: string, name: string) => { ok: boolean; path?: string; error?: string };
  addFile: () => void;
  renameFile: (id: string, name: string) => { ok: boolean; error?: string };
  duplicateFile: (id: string) => { ok: boolean; id?: string; error?: string };
  removeFile: (id: string) => void;
  /** Borra una carpeta entera. */
  removeFolder: (folder: string) => number;
  setEntry: (id: string) => { ok: boolean; error?: string };
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

    createFile: (folder, rawName) => {
      const state = get();
      const path = normalizePath(folder ? `${folder}/${rawName}` : rawName);
      const problem = validatePath(path, state.files);
      if (problem) return { ok: false, error: problem.message };

      const file: CodeFile = {
        id: uid('f'),
        name: path,
        content: skeletonFor(state.languageId, path),
        entry: false,
      };
      const files = [...state.files, file];
      set({ files, activeId: file.id });
      save({ files, activeId: file.id });
      return { ok: true, id: file.id };
    },

    createFolder: (folder, name) => {
      const state = get();
      const path = normalizePath(folder ? `${folder}/${name}` : name);
      if (!path) return { ok: false, error: 'El nombre de la carpeta no puede estar vacio.' };
      if (folderExists(state.files, path)) return { ok: false, error: `Ya existe una carpeta llamada "${path}".` };

      // Las carpetas son implicitas: un archivo ancla las hace existir.
      const anchor = uniquePath(`${path}/${ANCHOR_NAME}`, state.files);
      const file: CodeFile = { id: uid('f'), name: anchor, content: '', entry: false };
      const files = [...state.files, file];
      set({ files });
      save({ files });
      return { ok: true, path };
    },

    addFile: () => {
      const state = get();
      const lang = getLanguage(state.languageId);
      const path = uniquePath(`helper.${lang.ext}`, state.files);
      const file: CodeFile = {
        id: uid('f'),
        name: path,
        content: skeletonFor(state.languageId, path),
        entry: false,
      };
      const files = [...state.files, file];
      set({ files, activeId: file.id });
      save({ files, activeId: file.id });
    },

    renameFile: (id, name) => {
      const state = get();
      const current = state.files.find((file) => file.id === id);
      if (!current) return { ok: false, error: 'El archivo ya no existe.' };

      // Renombrar conserva la carpeta salvo que se escriba una ruta con "/".
      const path = name.includes('/') ? normalizePath(name) : normalizePath(`${dirname(current.name)}/${name}`);
      if (path === current.name) return { ok: true };

      const problem = validatePath(path, state.files.filter((file) => file.id !== id));
      if (problem) return { ok: false, error: problem.message };

      const files = state.files.map((file) => (file.id === id ? { ...file, name: path } : file));
      set({ files });
      save({ files });
      return { ok: true };
    },

    duplicateFile: (id) => {
      const state = get();
      const current = state.files.find((file) => file.id === id);
      if (!current) return { ok: false, error: 'El archivo ya no existe.' };
      // `current.name` ya es la ruta completa: uniquePath le anade el numero
      // sin volver a anteponer la carpeta (si no, `src/utiles.py` -> `src/src/utiles.py`).
      const path = uniquePath(current.name, state.files);
      if (path === current.name) return { ok: false, error: 'Ya existe una copia con ese nombre.' };
      const copy: CodeFile = { ...current, id: uid('f'), name: path };
      const files = [...state.files, copy];
      set({ files, activeId: copy.id });
      save({ files, activeId: copy.id });
      return { ok: true, id: copy.id };
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

    removeFolder: (folder) => {
      const state = get();
      const doomed = filesInFolder(state.files, folder);
      const files = state.files.filter((file) => !doomed.includes(file));
      if (!files.length) return 0;
      if (!files.some((f) => f.entry)) files[0] = { ...files[0], entry: true };
      const activeId = doomed.some((f) => f.id === state.activeId)
        ? (files.find((f) => f.entry)?.id ?? files[0].id)
        : state.activeId;
      set({ files, activeId });
      save({ files, activeId });
      return doomed.length;
    },

    setEntry: (id) => {
      const state = get();
      const target = state.files.find((file) => file.id === id);
      if (!target) return { ok: false, error: 'El archivo ya no existe.' };

      // Java exige que la clase principal se llame Main.java.
      const lang = getLanguage(state.languageId);
      if (lang.entryName && target.name !== lang.entryName) {
        return { ok: false, error: `En ${lang.label} el archivo de entrada debe llamarse ${lang.entryName}.` };
      }

      const files = state.files.map((f) => ({ ...f, entry: f.id === id }));
      set({ files });
      save({ files });
      return { ok: true };
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