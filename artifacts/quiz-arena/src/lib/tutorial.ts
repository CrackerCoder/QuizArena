const HOME_TOUR_KEY = "quiz-arena-tour-v1";
const GAME_TOUR_PREFIX = "quiz-arena-game-tour-";

export function hasCompletedHomeTour(): boolean {
  try {
    return localStorage.getItem(HOME_TOUR_KEY) === "done";
  } catch {
    return false;
  }
}

export function markHomeTourDone(): void {
  try {
    localStorage.setItem(HOME_TOUR_KEY, "done");
  } catch { /* ignore */ }
}

export function hasSeenGameTutorial(game: string): boolean {
  try {
    return localStorage.getItem(`${GAME_TOUR_PREFIX}${game}`) === "done";
  } catch {
    return false;
  }
}

export function markGameTutorialSeen(game: string): void {
  try {
    localStorage.setItem(`${GAME_TOUR_PREFIX}${game}`, "done");
  } catch { /* ignore */ }
}
