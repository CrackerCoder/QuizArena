import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const BASE = "/api";
const STORAGE_KEY = "quiz-arena-assignment";

export const GAME_LABELS: Record<string, string> = {
  boss: "Boss Rush",
  wordle: "Word Guess",
  hangman: "HangGuy",
  blocks: "Block Master",
  crossword: "Word Grid",
  anagram: "Anagram Scramble",
  fillblank: "Fill in the Blank",
  debate: "Debate Arena",
  flashcard: "Flashcard Flip",
};

export interface AssignmentResult {
  playerName: string;
  game: string;
  score: number;
  outcome: "win" | "loss";
  submittedAt: number;
}

export interface AssignmentData {
  code: string;
  subject: string;
  topic: string;
  difficulty: string;
  allowedGames: string[];
  teacherName: string;
  createdAt: number;
  closed: boolean;
  results: AssignmentResult[];
}

export interface AssignmentSession {
  code: string;
  isTeacher: boolean;
  teacherName?: string;
  teacherToken?: string;
  playerName?: string;
  playerToken?: string;
  allowedGames: string[];
  subject: string;
  topic: string;
  difficulty: string;
}

interface AssignmentContextValue {
  session: AssignmentSession | null;
  liveData: AssignmentData | null;
  createAssignment: (params: {
    subject: string;
    topic: string;
    difficulty: string;
    allowedGames: string[];
    teacherName: string;
  }) => Promise<string>;
  joinAssignment: (code: string, playerName: string) => Promise<boolean>;
  leaveAssignment: () => void;
  submitResult: (game: string, score: number, outcome: "win" | "loss") => Promise<void>;
  fetchAssignment: (code: string) => Promise<AssignmentData | null>;
  closeAssignment: () => Promise<void>;
}

const AssignmentContext = createContext<AssignmentContextValue | null>(null);

export function useAssignment(): AssignmentContextValue {
  const ctx = useContext(AssignmentContext);
  if (!ctx) throw new Error("useAssignment must be used inside AssignmentProvider");
  return ctx;
}

function loadSession(): AssignmentSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AssignmentSession;
  } catch {
    return null;
  }
}

function saveSession(s: AssignmentSession | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AssignmentProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AssignmentSession | null>(loadSession);
  const [liveData, setLiveData] = useState<AssignmentData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAssignment = useCallback(async (code: string): Promise<AssignmentData | null> => {
    try {
      const res = await fetch(`${BASE}/assignment/${code.toUpperCase()}`);
      if (!res.ok) return null;
      return (await res.json()) as AssignmentData;
    } catch {
      return null;
    }
  }, []);

  const startPolling = useCallback((code: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const poll = async () => {
      const data = await fetchAssignment(code);
      if (data) setLiveData(data);
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
  }, [fetchAssignment]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    if (session?.code) startPolling(session.code);
    else { stopPolling(); setLiveData(null); }
    return stopPolling;
  }, [session?.code, startPolling, stopPolling]);

  const createAssignment = useCallback(async (params: {
    subject: string;
    topic: string;
    difficulty: string;
    allowedGames: string[];
    teacherName: string;
  }): Promise<string> => {
    const res = await fetch(`${BASE}/assignment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to create assignment" }));
      throw new Error(err.error || "Failed to create assignment");
    }
    const data: AssignmentData & { teacherToken?: string } = await res.json();
    const s: AssignmentSession = {
      code: data.code,
      isTeacher: true,
      teacherName: params.teacherName,
      teacherToken: data.teacherToken,
      allowedGames: data.allowedGames,
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
    };
    setSession(s);
    saveSession(s);
    return data.code;
  }, []);

  const joinAssignment = useCallback(async (code: string, playerName: string): Promise<boolean> => {
    const data = await fetchAssignment(code);
    if (!data) {
      toast.error("Assignment not found or expired.");
      return false;
    }
    if (data.closed) {
      toast.error("This assignment is closed.");
      return false;
    }
    // Register server-side to get a playerToken; required for result submission.
    let playerToken: string | undefined;
    try {
      const joinRes = await fetch(`${BASE}/assignment/${data.code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      if (joinRes.ok) {
        const { playerToken: t } = await joinRes.json();
        playerToken = t as string;
      }
    } catch {
      // non-fatal; submitResult will silently fail without a token
    }
    const s: AssignmentSession = {
      code: data.code,
      isTeacher: false,
      playerName,
      playerToken,
      allowedGames: data.allowedGames,
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
    };
    setSession(s);
    saveSession(s);
    setLiveData(data);
    return true;
  }, [fetchAssignment]);

  const leaveAssignment = useCallback(() => {
    setSession(null);
    saveSession(null);
    setLiveData(null);
    stopPolling();
  }, [stopPolling]);

  const submitResult = useCallback(async (
    game: string,
    score: number,
    outcome: "win" | "loss",
  ) => {
    if (!session || session.isTeacher || !session.playerName || !session.playerToken) return;
    try {
      await fetch(`${BASE}/assignment/${session.code}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: session.playerName,
          playerToken: session.playerToken,
          game,
          score,
          outcome,
        }),
      });
    } catch {
      // silent — don't break the game
    }
  }, [session]);

  const closeAssignment = useCallback(async () => {
    if (!session?.code) return;
    await fetch(`${BASE}/assignment/${session.code}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherToken: session.teacherToken }),
    });
    const updated = await fetchAssignment(session.code);
    if (updated) setLiveData(updated);
  }, [session, fetchAssignment]);

  return (
    <AssignmentContext.Provider value={{
      session,
      liveData,
      createAssignment,
      joinAssignment,
      leaveAssignment,
      submitResult,
      fetchAssignment,
      closeAssignment,
    }}>
      {children}
    </AssignmentContext.Provider>
  );
}
