import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";

interface ScoreEntry {
  playerName: string;
  score: number;
  game: string;
  topic: string;
  outcome: "win" | "loss";
  submittedAt: number;
}

interface Room {
  code: string;
  topic: string;
  subject: string;
  difficulty: string;
  createdAt: number;
  entries: ScoreEntry[];
  // Maps playerName → playerToken; only registered players may submit scores.
  players: Map<string, string>;
}

const rooms = new Map<string, Room>();
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_SCORE = 100_000;

function pruneRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > EXPIRY_MS) rooms.delete(code);
  }
}

// Use crypto.randomBytes for unpredictable codes (replaces Math.random()).
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

const router: IRouter = Router();

router.post("/room", (req, res) => {
  pruneRooms();
  const { topic = "", subject = "", difficulty = "medium" } = req.body ?? {};
  let code = randomCode();
  let tries = 0;
  while (rooms.has(code) && tries++ < 20) code = randomCode();
  rooms.set(code, {
    code,
    topic: String(topic).slice(0, 200),
    subject: String(subject).slice(0, 100),
    difficulty: String(difficulty),
    createdAt: Date.now(),
    entries: [],
    players: new Map(),
  });
  res.json({ code });
});

router.get("/room/:code", (req, res) => {
  pruneRooms();
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return void res.status(404).json({ error: "Room not found or expired" });
  // Never expose the players token map to clients.
  res.json({
    code: room.code,
    topic: room.topic,
    subject: room.subject,
    difficulty: room.difficulty,
    createdAt: room.createdAt,
    entries: room.entries,
  });
});

// Register a player in the room and return their playerToken.
// First registration claims the name; subsequent calls with the same name
// return the existing token (allows page-refresh reconnects).
router.post("/room/:code/join", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return void res.status(404).json({ error: "Room not found or expired" });

  const rawName = req.body?.playerName;
  if (!rawName || typeof rawName !== "string") {
    return void res.status(400).json({ error: "playerName is required" });
  }
  const playerName = rawName.trim().slice(0, 30);
  if (!playerName) return void res.status(400).json({ error: "playerName is required" });

  let token = room.players.get(playerName);
  if (!token) {
    token = randomToken();
    room.players.set(playerName, token);
  }
  res.json({ playerToken: token });
});

router.post("/room/:code/score", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return void res.status(404).json({ error: "Room not found or expired" });

  const { playerName, score, game, outcome, playerToken } = req.body ?? {};

  if (!playerName || score == null) {
    return void res.status(400).json({ error: "playerName and score are required" });
  }

  // Validate that the submitter registered and holds the correct token.
  const expectedToken = room.players.get(String(playerName).slice(0, 30));
  if (!expectedToken || !playerToken || playerToken !== expectedToken) {
    return void res.status(403).json({ error: "Invalid or missing player token. Join the room first." });
  }

  const entry: ScoreEntry = {
    playerName: String(playerName).slice(0, 30),
    score: Math.max(0, Math.min(MAX_SCORE, Number(score))),
    game: String(game || "unknown").slice(0, 30),
    topic: room.topic,
    outcome: outcome === "win" ? "win" : "loss",
    submittedAt: Date.now(),
  };

  const idx = room.entries.findIndex((e) => e.playerName === entry.playerName && e.game === entry.game);
  if (idx >= 0) {
    if (entry.score >= room.entries[idx].score) room.entries[idx] = entry;
  } else {
    room.entries.push(entry);
  }
  room.entries.sort((a, b) => b.score - a.score);
  res.json({ ok: true, entries: room.entries });
});

export default router;
