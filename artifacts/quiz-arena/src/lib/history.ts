export type HistoryEntry = {
  subject: string;
  topicName: string;
  topic: string;
  educationLevel: string;
  difficulty: string;
  studiedAt: number;
};

const HISTORY_KEY = "quiz-arena-history";
const MAX_HISTORY = 20;

export function getTopicHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTopicHistory(entry: Omit<HistoryEntry, "studiedAt">) {
  const history = getTopicHistory();
  const filtered = history.filter((h) => h.topic !== entry.topic);
  const updated = [{ ...entry, studiedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("history:updated"));
  } catch {
  }
}

export function clearTopicHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("history:updated"));
  } catch {
  }
}
