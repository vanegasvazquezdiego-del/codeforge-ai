import { create } from 'zustand';
import type { DayLog } from '@/lib/types';
import { todayISO } from '@/lib/cn';
import { KEY_ACTIVITY, readJSON, writeJSON } from '@/lib/storage';

const EMPTY: DayLog[] = [];

interface ActivityState {
  logs: DayLog[];
  logRun: () => void;
  bumpCleanRun: (ok: boolean) => void;
  logSolved: () => void;
  reset: () => void;
}

function bump(logs: DayLog[], patch: (day: DayLog) => DayLog): DayLog[] {
  const day = todayISO();
  const index = logs.findIndex((l) => l.day === day);
  if (index === -1) return [...logs, patch({ day, runs: 0, solved: 0, cleanRuns: 0 })].slice(-180);
  const next = [...logs];
  next[index] = patch(next[index]);
  return next;
}

export const useActivity = create<ActivityState>((set, get) => {
  function commit(logs: DayLog[]) {
    set({ logs });
    writeJSON(KEY_ACTIVITY, logs);
  }

  return {
    logs: readJSON<DayLog[]>(KEY_ACTIVITY, EMPTY).slice(-180),

    logRun: () => commit(bump(get().logs, (d) => ({ ...d, runs: d.runs + 1 }))),

    bumpCleanRun: (ok) => {
      if (!ok) return;
      commit(bump(get().logs, (d) => ({ ...d, cleanRuns: d.cleanRuns + 1 })));
    },

    logSolved: () => commit(bump(get().logs, (d) => ({ ...d, solved: d.solved + 1 }))),

    reset: () => commit([]),
  };
});