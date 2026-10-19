import { create } from 'zustand';
import type { CaseResult, CodeFile, Exercise, ExerciseDraft, LanguageId, Level } from '@/lib/types';
import { SEED_EXERCISES, isRunnable } from '@/lib/exercises';
import { getLanguage } from '@/lib/languages';
import { normalizeOutput, uid } from '@/lib/cn';
import { EngineError, execute } from '@/lib/engine';
import { KEY_EXERCISES, KEY_SOLVED, readJSON, writeJSON } from '@/lib/storage';
import { useSettings } from './settings';
import { useActivity } from './activity';

/** Mapa de progreso: `{ ejercicioId: timestamp }`. Vive aparte del catálogo. */
type SolvedMap = Record<string, number>;

function loadSolved(): SolvedMap {
  return readJSON<SolvedMap>(KEY_SOLVED, {});
}

function applySolved(exercises: Exercise[]): Exercise[] {
  const solved = loadSolved();
  return exercises.map((e) => (solved[e.id] ? { ...e, solvedAt: e.solvedAt ?? solved[e.id] } : e));
}

function rememberSolved(id: string, at: number) {
  writeJSON(KEY_SOLVED, { ...loadSolved(), [id]: at });
}

interface ExercisesState {
  exercises: Exercise[];
  /** id del ejercicio que se está validando ahora. */
  validatingId: string | null;
  results: Record<string, CaseResult[]>;
  add: (draft: ExerciseDraft, languageId: LanguageId) => Exercise;
  markSolved: (id: string) => void;
  remove: (id: string) => void;
  clearCustom: () => void;
  validate: (exercise: Exercise, files: CodeFile[]) => Promise<CaseResult[]>;
  reset: () => void;
}

function save(exercises: Exercise[]) {
  // Los ejercicios semilla no se guardan: se reconstruyen siempre.
  writeJSON(KEY_EXERCISES, exercises.filter((e) => e.origin === 'ai'));
}

function load(): Exercise[] {
  const custom = readJSON<Exercise[]>(KEY_EXERCISES, []);
  const valid = custom.filter((e) => e && typeof e.title === 'string' && Array.isArray(e.tests));
  return applySolved([...SEED_EXERCISES, ...valid]);
}

export const useExercises = create<ExercisesState>((set, get) => {
  function commit(exercises: Exercise[]) {
    set({ exercises });
    save(exercises);
  }

  return {
    exercises: load(),
    validatingId: null,
    results: {},

    add: (draft, languageId) => {
      const exercise: Exercise = {
        id: uid('ex'),
        title: draft.title,
        languageId,
        level: draft.level,
        statement: draft.statement,
        concepts: draft.concepts,
        starter: draft.starter,
        hint: draft.hint,
        tests: draft.tests,
        origin: 'ai',
        createdAt: Date.now(),
        solvedAt: null,
      };
      commit([exercise, ...get().exercises]);
      return exercise;
    },

    markSolved: (id) => {
      const now = Date.now();
      const exercises = get().exercises.map((e) => (e.id === id && !e.solvedAt ? { ...e, solvedAt: now } : e));
      rememberSolved(id, now);
      commit(exercises);
      useActivity.getState().logSolved();
    },

    remove: (id) => {
      commit(get().exercises.filter((e) => e.id !== id));
      const results = { ...get().results };
      delete results[id];
      set({ results });
    },

    clearCustom: () => commit(SEED_EXERCISES),

    reset: () => {
      commit(SEED_EXERCISES);
      set({ results: {} });
    },

    /**
     * Ejecuta cada caso contra el motor real y compara la salida normalizada.
     * No hay simulaciones: o el motor responde, o el caso queda marcado como error.
     */
    validate: async (exercise, files) => {
      if (!isRunnable(exercise)) return [];
      const settings = useSettings.getState();
      const lang = getLanguage(exercise.languageId);
      const ordered: CodeFile[] = [...files].sort((a, b) => Number(b.entry) - Number(a.entry));
      const payload: CodeFile[] =
        lang.entryName && ordered[0]
          ? [{ ...ordered[0], name: lang.entryName }, ...ordered.slice(1)]
          : ordered;

      set({ validatingId: exercise.id });
      const results: CaseResult[] = [];

      for (const test of exercise.tests) {
        const started = performance.now();
        try {
          const run = await execute(exercise.languageId, payload, {
            preference: settings.engine,
            pistonBaseUrl: settings.pistonBaseUrl,
            stdin: test.stdin,
          });
          const actual = normalizeOutput(run.stdout);
          const expected = normalizeOutput(test.expected);
          const crashed = run.status !== 'ok' && !run.stdout.trim() && !!run.stderr.trim();
          results.push({
            id: test.id,
            label: test.label,
            outcome: crashed ? 'error' : actual === expected ? 'pass' : 'fail',
            stdin: test.stdin,
            expected,
            actual: run.stdout || run.stderr || '(sin salida)',
            wallMs: Math.round(performance.now() - started),
            engineError: null,
          });
        } catch (err) {
          results.push({
            id: test.id,
            label: test.label,
            outcome: 'error',
            stdin: test.stdin,
            expected: normalizeOutput(test.expected),
            actual: err instanceof EngineError ? err.message : 'Fallo del motor.',
            wallMs: Math.round(performance.now() - started),
            engineError: err instanceof EngineError ? err.message : 'Fallo del motor.',
          });
        }
      }

      set((state) => ({ validatingId: null, results: { ...state.results, [exercise.id]: results } }));
      return results;
    },
  };
});

export function filterExercises(
  exercises: Exercise[],
  filters: { language?: LanguageId | 'all'; level?: Level | 'all'; status?: 'all' | 'open' | 'solved'; query?: string },
): Exercise[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return exercises.filter((e) => {
    if (filters.language && filters.language !== 'all' && e.languageId !== filters.language) return false;
    if (filters.level && filters.level !== 'all' && e.level !== filters.level) return false;
    if (filters.status === 'open' && e.solvedAt) return false;
    if (filters.status === 'solved' && !e.solvedAt) return false;
    if (query) {
      const haystack = `${e.title} ${e.statement} ${e.concepts.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}