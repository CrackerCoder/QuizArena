import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

const BASE = "/api";

export interface ScoreEntry {
  playerName: string;
  score: number;
  game: string;
  topic: string;
  outcome: "win" | "loss";
  submittedAt: number;
}

export interface RoomInfo {
  code: string;
  topic: string;
  subject: string;
  difficulty: string;
  createdAt: number;
  entries: ScoreEntry[];
}

export interface RoomSession {
  code: string;
  playerName: string;
  playerToken: string;
}

const ROOM_KEY = "quiz-arena-room";

function loadSession(): RoomSession | null {
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(s: RoomSession | null) {
  if (s) localStorage.setItem(ROOM_KEY, JSON.stringify(s));
  else localStorage.removeItem(ROOM_KEY);
}

async function apiCreateRoom(topic: string, subject: string, difficulty: string): Promise<string> {
  const res = await fetch(`${BASE}/room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, subject, difficulty }),
  });
  if (!res.ok) throw new Error("Could not create room");
  const { code } = await res.json();
  return code as string;
}

async function apiGetRoom(code: string): Promise<RoomInfo> {
  const res = await fetch(`${BASE}/room/${code}`);
  if (!res.ok) throw new Error(res.status === 404 ? "Room not found or expired" : "Could not fetch room");
  return res.json();
}

async function apiJoinRoom(code: string, playerName: string): Promise<string> {
  const res = await fetch(`${BASE}/room/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) throw new Error("Could not join room");
  const { playerToken } = await res.json();
  return playerToken as string;
}

async function apiSubmitScore(
  code: string,
  playerName: string,
  playerToken: string,
  score: number,
  game: string,
  outcome: "win" | "loss",
): Promise<ScoreEntry[]> {
  const res = await fetch(`${BASE}/room/${code}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName, playerToken, score, game, outcome }),
  });
  if (!res.ok) throw new Error("Could not submit score");
  const { entries } = await res.json();
  return entries as ScoreEntry[];
}

interface RoomCtx {
  session: RoomSession | null;
  createRoom(topic: string, subject: string, difficulty: string): Promise<string>;
  joinRoom(code: string, playerName: string): Promise<boolean>;
  leaveRoom(): void;
  submitScore(game: string, score: number, outcome: "win" | "loss"): Promise<void>;
  fetchRoom(): Promise<RoomInfo | null>;
}

const RoomContext = createContext<RoomCtx | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<RoomSession | null>(() => loadSession());

  const createRoom = useCallback(async (topic: string, subject: string, difficulty: string) => {
    const code = await apiCreateRoom(topic, subject, difficulty);
    return code;
  }, []);

  const joinRoom = useCallback(async (code: string, playerName: string): Promise<boolean> => {
    try {
      // Verify room exists first, then register to get a playerToken.
      await apiGetRoom(code.toUpperCase());
      const playerToken = await apiJoinRoom(code.toUpperCase(), playerName.trim());
      const s: RoomSession = { code: code.toUpperCase(), playerName: playerName.trim(), playerToken };
      setSession(s);
      saveSession(s);
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Room not found");
      return false;
    }
  }, []);

  const leaveRoom = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  const submitScore = useCallback(async (game: string, score: number, outcome: "win" | "loss") => {
    if (!session) return;
    try {
      await apiSubmitScore(session.code, session.playerName, session.playerToken, score, game, outcome);
    } catch {
      // silent — don't block the game
    }
  }, [session]);

  const fetchRoom = useCallback(async (): Promise<RoomInfo | null> => {
    if (!session) return null;
    try {
      return await apiGetRoom(session.code);
    } catch {
      return null;
    }
  }, [session]);

  return (
    <RoomContext.Provider value={{ session, createRoom, joinRoom, leaveRoom, submitScore, fetchRoom }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}

export { apiGetRoom };
