import { awardXP } from "./xp";

export type GameKey = "boss" | "wordle" | "hangman" | "blocks" | "crossword" | "anagram" | "fillblank" | "debate" | "flashcard";

export type GameResult = {
  id: string;
  game: GameKey;
  topic: string;
  educationLevel: string;
  difficulty?: string;
  outcome: "win" | "loss";
  score: number;
  details: Record<string, string | number>;
  playedAt: number;
};

const KEY = "quiz-arena-stats";
const MAX_RESULTS = 100;

function read(): GameResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(arr: GameResult[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX_RESULTS)));
    window.dispatchEvent(new CustomEvent("stats:updated"));
  } catch {}
}

export function currentStreak(game?: GameKey): number {
  const all = read().sort((a, b) => b.playedAt - a.playedAt);
  const filtered = game ? all.filter((r) => r.game === game) : all;
  let streak = 0;
  for (const r of filtered) {
    if (r.outcome === "win") streak++;
    else break;
  }
  return streak;
}

export function recordResult(
  r: Omit<GameResult, "id" | "playedAt">
): { result: GameResult; xpEarned: number; leveledUp: boolean; newLevel: number } {
  const streak = currentStreak();
  const full: GameResult = { ...r, id: crypto.randomUUID(), playedAt: Date.now() };
  write([...read(), full]);
  const xpResult = awardXP(r.outcome, r.difficulty ?? "medium", streak + (r.outcome === "win" ? 1 : 0));
  window.dispatchEvent(
    new CustomEvent("xp:awarded", {
      detail: { xpEarned: xpResult.xpEarned, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel, newLevelDef: xpResult.newLevelDef },
    })
  );
  return { result: full, xpEarned: xpResult.xpEarned, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel };
}

export function getAllResults(): GameResult[] {
  return read().sort((a, b) => b.playedAt - a.playedAt);
}

export function clearResults() {
  write([]);
}

export function summary(game?: GameKey) {
  const all = read().filter((r) => (game ? r.game === game : true));
  const wins = all.filter((r) => r.outcome === "win").length;
  const losses = all.length - wins;
  const winRate = all.length ? Math.round((wins / all.length) * 100) : 0;
  const bestScore = all.reduce((m, r) => Math.max(m, r.score), 0);
  const avgScore = all.length ? Math.round(all.reduce((s, r) => s + r.score, 0) / all.length) : 0;

  let bestStreak = 0;
  let streak = 0;
  const sorted = [...all].sort((a, b) => a.playedAt - b.playedAt);
  for (const r of sorted) {
    if (r.outcome === "win") { streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
  }

  return { played: all.length, wins, losses, winRate, bestScore, avgScore, bestStreak };
}
