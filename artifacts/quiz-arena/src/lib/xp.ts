export type XPState = {
  xp: number;
  level: number;
};

export type LevelDef = {
  level: number;
  name: string;
  xpRequired: number;
  emoji: string;
};

export const LEVELS: LevelDef[] = [
  { level: 1, name: "Rookie", xpRequired: 0, emoji: "🌱" },
  { level: 2, name: "Apprentice", xpRequired: 100, emoji: "📖" },
  { level: 3, name: "Student", xpRequired: 250, emoji: "✏️" },
  { level: 4, name: "Scholar", xpRequired: 500, emoji: "🎓" },
  { level: 5, name: "Expert", xpRequired: 900, emoji: "⚡" },
  { level: 6, name: "Master", xpRequired: 1400, emoji: "🔥" },
  { level: 7, name: "Champion", xpRequired: 2100, emoji: "🏆" },
  { level: 8, name: "Legend", xpRequired: 3000, emoji: "⭐" },
  { level: 9, name: "Sage", xpRequired: 4200, emoji: "🌙" },
  { level: 10, name: "Grandmaster", xpRequired: 5700, emoji: "💎" },
];

const XP_KEY = "quiz-arena-xp";

export function getXPState(): XPState {
  try {
    const raw = localStorage.getItem(XP_KEY);
    return raw ? JSON.parse(raw) : { xp: 0, level: 1 };
  } catch {
    return { xp: 0, level: 1 };
  }
}

function saveXPState(state: XPState) {
  try {
    localStorage.setItem(XP_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("xp:updated", { detail: state }));
  } catch {
  }
}

export function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  let next: LevelDef | null = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }
  const progressXP = xp - current.xpRequired;
  const rangeXP = next ? next.xpRequired - current.xpRequired : 1;
  const progress = next ? Math.min((progressXP / rangeXP) * 100, 100) : 100;
  return { current, next, progressXP, rangeXP, progress };
}

export function calcXpEarned(outcome: "win" | "loss", difficulty: string, streak: number): number {
  const base =
    outcome === "win"
      ? difficulty === "hard" ? 50 : difficulty === "easy" ? 20 : 35
      : difficulty === "hard" ? 15 : difficulty === "easy" ? 5 : 10;
  const streakBonus = streak >= 2 ? Math.min((streak - 1) * 10, 50) : 0;
  return base + streakBonus;
}

export function awardXP(
  outcome: "win" | "loss",
  difficulty: string,
  streak: number
): { newXP: number; newLevel: number; xpEarned: number; leveledUp: boolean; newLevelDef: LevelDef } {
  const xpEarned = calcXpEarned(outcome, difficulty, streak);
  const prev = getXPState();
  const prevLevelInfo = getLevelInfo(prev.xp);
  const newXP = prev.xp + xpEarned;
  const newLevelInfo = getLevelInfo(newXP);
  const newLevel = newLevelInfo.current.level;
  const leveledUp = newLevel > prevLevelInfo.current.level;
  saveXPState({ xp: newXP, level: newLevel });
  return { newXP, newLevel, xpEarned, leveledUp, newLevelDef: newLevelInfo.current };
}
