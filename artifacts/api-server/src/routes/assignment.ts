import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";

interface AssignmentResult {
  playerName: string;
  game: string;
  score: number;
  outcome: "win" | "loss";
  submittedAt: number;
}

interface Assignment {
  code: string;
  subject: string;
  topic: string;
  difficulty: string;
  allowedGames: string[];
  teacherName: string;
  teacherToken: string;
  createdAt: number;
  closed: boolean;
  results: AssignmentResult[];
  // Maps playerName → playerToken; only registered students may submit results.
  players: Map<string, string>;
}

const assignments = new Map<string, Assignment>();
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SCORE = 100_000;

function pruneAssignments() {
  const now = Date.now();
  for (const [code, a] of assignments.entries()) {
    if (now - a.createdAt > EXPIRY_MS) assignments.delete(code);
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

const VALID_GAMES = new Set([
  "boss", "wordle", "hangman", "blocks",
  "crossword", "anagram", "fillblank", "debate", "flashcard",
]);

const router: IRouter = Router();

router.post("/assignment", (req, res) => {
  pruneAssignments();
  const {
    subject = "",
    topic = "",
    difficulty = "medium",
    allowedGames,
    teacherName = "Teacher",
  } = req.body ?? {};

  const games: string[] = Array.isArray(allowedGames)
    ? allowedGames.filter((g: unknown) => typeof g === "string" && VALID_GAMES.has(g))
    : [...VALID_GAMES];

  if (games.length === 0) {
    return void res.status(400).json({ error: "At least one game must be allowed" });
  }

  let code = randomCode();
  let tries = 0;
  while (assignments.has(code) && tries++ < 20) code = randomCode();

  const teacherToken = randomToken();

  const assignment: Assignment = {
    code,
    subject: String(subject).slice(0, 100),
    topic: String(topic).slice(0, 200),
    difficulty: String(difficulty),
    allowedGames: games,
    teacherName: String(teacherName).slice(0, 50),
    teacherToken,
    createdAt: Date.now(),
    closed: false,
    results: [],
    players: new Map(),
  };

  assignments.set(code, assignment);

  res.json({
    code: assignment.code,
    subject: assignment.subject,
    topic: assignment.topic,
    difficulty: assignment.difficulty,
    allowedGames: assignment.allowedGames,
    teacherName: assignment.teacherName,
    teacherToken: assignment.teacherToken,
    createdAt: assignment.createdAt,
    closed: assignment.closed,
    results: assignment.results,
  });
});

router.get("/assignment/:code", (req, res) => {
  pruneAssignments();
  const assignment = assignments.get(req.params.code.toUpperCase());
  if (!assignment) {
    return void res.status(404).json({ error: "Assignment not found or expired" });
  }
  // Never expose teacherToken or the players map to clients.
  res.json({
    code: assignment.code,
    subject: assignment.subject,
    topic: assignment.topic,
    difficulty: assignment.difficulty,
    allowedGames: assignment.allowedGames,
    teacherName: assignment.teacherName,
    createdAt: assignment.createdAt,
    closed: assignment.closed,
    results: assignment.results,
  });
});

// Register a student in the assignment and return their playerToken.
// First registration claims the name; subsequent calls return the same token
// so students can reconnect after a page refresh.
router.post("/assignment/:code/join", (req, res) => {
  const assignment = assignments.get(req.params.code.toUpperCase());
  if (!assignment) {
    return void res.status(404).json({ error: "Assignment not found or expired" });
  }
  if (assignment.closed) {
    return void res.status(403).json({ error: "Assignment is closed" });
  }

  const rawName = req.body?.playerName;
  if (!rawName || typeof rawName !== "string") {
    return void res.status(400).json({ error: "playerName is required" });
  }
  const playerName = rawName.trim().slice(0, 30);
  if (!playerName) return void res.status(400).json({ error: "playerName is required" });

  let token = assignment.players.get(playerName);
  if (!token) {
    token = randomToken();
    assignment.players.set(playerName, token);
  }
  res.json({ playerToken: token });
});

router.post("/assignment/:code/result", (req, res) => {
  const assignment = assignments.get(req.params.code.toUpperCase());
  if (!assignment) {
    return void res.status(404).json({ error: "Assignment not found or expired" });
  }
  if (assignment.closed) {
    return void res.status(403).json({ error: "Assignment is closed" });
  }

  const { playerName, game, score, outcome, playerToken } = req.body ?? {};
  if (!playerName || !game || score == null) {
    return void res.status(400).json({ error: "playerName, game, and score are required" });
  }

  // Validate that the submitter registered and holds the correct token.
  const expectedToken = assignment.players.get(String(playerName).slice(0, 30));
  if (!expectedToken || !playerToken || playerToken !== expectedToken) {
    return void res.status(403).json({ error: "Invalid or missing player token. Join the assignment first." });
  }

  // Validate the submitted game is in the global set AND in this assignment's allowedGames.
  const gameStr = String(game);
  if (!VALID_GAMES.has(gameStr) || !assignment.allowedGames.includes(gameStr)) {
    return void res.status(400).json({ error: "Game not allowed in this assignment" });
  }

  const result: AssignmentResult = {
    playerName: String(playerName).slice(0, 30),
    game: gameStr,
    score: Math.max(0, Math.min(MAX_SCORE, Number(score))),
    outcome: outcome === "win" ? "win" : "loss",
    submittedAt: Date.now(),
  };

  const idx = assignment.results.findIndex(
    (r) => r.playerName === result.playerName && r.game === result.game,
  );
  if (idx >= 0) {
    if (result.score >= assignment.results[idx].score) {
      assignment.results[idx] = result;
    }
  } else {
    assignment.results.push(result);
  }

  assignment.results.sort((a, b) => b.score - a.score);
  res.json({ ok: true, results: assignment.results });
});

router.patch("/assignment/:code/close", (req, res) => {
  const assignment = assignments.get(req.params.code.toUpperCase());
  if (!assignment) {
    return void res.status(404).json({ error: "Assignment not found or expired" });
  }
  const { teacherToken } = req.body ?? {};
  if (!teacherToken || teacherToken !== assignment.teacherToken) {
    return void res.status(403).json({ error: "Invalid teacher token" });
  }
  assignment.closed = true;
  res.json({ ok: true });
});

export default router;
