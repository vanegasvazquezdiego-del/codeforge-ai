import type { DayLog, Exercise } from './types';
import { daysBetween, todayISO } from './cn';

export interface Stats {
  totalRuns: number;
  cleanRuns: number;
  totalSolved: number;
  languagesPracticed: number;
  exercisesAttempted: number;
  streak: number;
  bestStreak: number;
  activeDays: number;
  minutesToday: number;
  last14: DayLog[];
  /** Índice de 0 = domingo, para el mapa de calor semanal. */
  weekdayHistogram: number[];
}

function isActive(day: DayLog): boolean {
  return day.runs > 0 || day.solved > 0;
}

export function computeStreak(logs: DayLog[]): { streak: number; best: number } {
  const activeDays = logs.filter(isActive).map((l) => l.day).sort();
  if (!activeDays.length) return { streak: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < activeDays.length; i += 1) {
    const gap = daysBetween(activeDays[i - 1], activeDays[i]);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const today = todayISO();
  const yesterday = todayISO(new Date(Date.now() - 86_400_000));
  const last = activeDays.at(-1) ?? '';
  const distance = last === today ? 0 : last === yesterday ? 1 : Infinity;
  const streak = distance === Infinity ? 0 : best;

  return { streak, best };
}

export function computeStats(logs: DayLog[], exercises: Exercise[]): Stats {
  const sorted = [...logs].sort((a, b) => (a.day < b.day ? -1 : 1));
  const { streak, best } = computeStreak(sorted);

  const totals = sorted.reduce(
    (acc, day) => {
      acc.runs += day.runs;
      acc.cleanRuns += day.cleanRuns;
      return acc;
    },
    { runs: 0, cleanRuns: 0 },
  );

  const languages = new Set<string>();
  let totalSolved = 0;
  exercises.forEach((e) => {
    if (!e.solvedAt) return;
    totalSolved += 1;
    languages.add(e.languageId);
  });

  const last14: DayLog[] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = todayISO(new Date(Date.now() - offset * 86_400_000));
    last14.push(sorted.find((l) => l.day === day) ?? { day, runs: 0, solved: 0, cleanRuns: 0 });
  }

  const weekdayHistogram = [0, 0, 0, 0, 0, 0, 0];
  sorted.forEach((day) => {
    const index = new Date(`${day.day}T00:00:00`).getDay();
    weekdayHistogram[index] += day.runs + day.solved;
  });

  const today = sorted.find((l) => l.day === todayISO());
  // Estimación honesta: cada ejecución ≈ 45 s de trabajo real, tope de 8 h.
  const minutesToday = today ? Math.min(480, Math.round(((today.runs + today.solved * 4) * 45) / 60)) : 0;

  return {
    totalRuns: totals.runs,
    cleanRuns: totals.cleanRuns,
    // Fuente de verdad unica: el estado `solvedAt` de cada ejercicio.
    totalSolved,
    languagesPracticed: languages.size,
    exercisesAttempted: new Set(exercises.map((e) => e.id)).size,
    streak,
    bestStreak: best,
    activeDays: sorted.filter(isActive).length,
    minutesToday,
    last14,
    weekdayHistogram,
  };
}