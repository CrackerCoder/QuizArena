import { useEffect, useMemo, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api, type MistakeEntry } from "@/lib/api";
import { ReviewMistakesPanel } from "@/components/ReviewMistakesPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RotateCcw, Sparkles, BarChart3, BookOpen, Gift, CheckCircle2, Brain } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sound";
import { recordResult } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/ShareButton";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { useRoom } from "@/lib/room";
import { useAssignment } from "@/lib/assignment";
import { useT } from "@/lib/i18n";
import { GameTutorial } from "@/components/GameTutorial";
import { hasSeenGameTutorial, markGameTutorialSeen } from "@/lib/tutorial";

const SIZE = 8;

type Shape = number[][];
const SHAPES: Shape[] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
];

const COLORS = ["bg-blocks", "bg-primary", "bg-accent", "bg-wordle-correct", "bg-hangman", "bg-boss"];

type Piece = { shape: Shape; color: string; id: number };
type FlashQ = { type: "mcq" | "short" | "fill"; prompt: string; choices?: string[]; answer: string; explanation: string };
type FactItem = { fact: string; question: FlashQ };

const emptyBoard = (): (string | null)[][] =>
  Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null as string | null));

let pid = 0;
function randomPiece(): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { shape, color, id: ++pid };
}

function canPlace(board: (string | null)[][], shape: Shape, r: number, c: number) {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[0].length; j++) {
      if (!shape[i][j]) continue;
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) return false;
      if (board[rr][cc]) return false;
    }
  }
  return true;
}

function place(board: (string | null)[][], shape: Shape, r: number, c: number, color: string) {
  const next = board.map((row) => row.slice());
  for (let i = 0; i < shape.length; i++)
    for (let j = 0; j < shape[0].length; j++)
      if (shape[i][j]) next[r + i][c + j] = color;
  return next;
}

function findFullLines(board: (string | null)[][]) {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < SIZE; i++) if (board[i].every((c) => c)) rows.push(i);
  for (let j = 0; j < SIZE; j++) {
    let full = true;
    for (let i = 0; i < SIZE; i++) if (!board[i][j]) { full = false; break; }
    if (full) cols.push(j);
  }
  return { rows, cols };
}

function clearLineCells(board: (string | null)[][], rows: number[], cols: number[]) {
  const next = board.map((row) => row.slice());
  for (const r of rows) for (let j = 0; j < SIZE; j++) next[r][j] = null;
  for (const c of cols) for (let i = 0; i < SIZE; i++) next[i][c] = null;
  return next;
}

function clearOneRandomLine(board: (string | null)[][]) {
  const candidates: { kind: "row" | "col"; idx: number; filled: number }[] = [];
  for (let i = 0; i < SIZE; i++) {
    const filled = board[i].filter(Boolean).length;
    if (filled > 0) candidates.push({ kind: "row", idx: i, filled });
  }
  for (let j = 0; j < SIZE; j++) {
    let filled = 0;
    for (let i = 0; i < SIZE; i++) if (board[i][j]) filled++;
    if (filled > 0) candidates.push({ kind: "col", idx: j, filled });
  }
  if (!candidates.length) return { board, cleared: 0 };
  candidates.sort((a, b) => b.filled - a.filled);
  const top = candidates.slice(0, Math.min(3, candidates.length));
  const pick = top[Math.floor(Math.random() * top.length)];
  const next = board.map((row) => row.slice());
  if (pick.kind === "row") for (let j = 0; j < SIZE; j++) next[pick.idx][j] = null;
  else for (let i = 0; i < SIZE; i++) next[i][pick.idx] = null;
  return { board: next, cleared: 1 };
}

type Spark = { id: number; x: number; y: number; dx: number; dy: number; color: string };
let sparkId = 0;

export default function Blocks() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();
  const [board, setBoard] = useState(emptyBoard);
  const [pieces, setPieces] = useState<(Piece | null)[]>(() => [randomPiece(), randomPiece(), randomPiece()]);
  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [bestClear, setBestClear] = useState(0);
  const [combos, setCombos] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [bonusesEarned, setBonusesEarned] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<MistakeEntry[]>([]);
  const startedAt = useRef<number>(Date.now());
  const recorded = useRef(false);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("blocks"));

  // FX
  const [poppingCells, setPoppingCells] = useState<Set<string>>(new Set());
  const [flashLines, setFlashLines] = useState<{ rows: number[]; cols: number[] } | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [comboBanner, setComboBanner] = useState<string | null>(null);

  // Flashcards / quiz queue — pre-loaded as fact+question pairs (no mid-game API calls)
  const [factPool, setFactPool] = useState<FactItem[]>([]);
  const factsLoading = useRef(false);
  const [activeFlash, setActiveFlash] = useState<string | null>(null);
  const lastItemRef = useRef<FactItem | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<FlashQ | null>(null);

  // End-of-game review
  const [seenFacts, setSeenFacts] = useState<string[]>([]);
  const [seenItems, setSeenItems] = useState<FactItem[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewQ, setReviewQ] = useState<FlashQ | null>(null);
  const [reviewCorrect, setReviewCorrect] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);

  // Drag state — x/y are kept in a ref to avoid triggering the event-listener effect on every frame
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<null | {
    pieceIdx: number;
    pointerId: number;
    offsetX: number; offsetY: number;
  }>(null);
  const dragXY = useRef({ x: 0, y: 0 });
  const [dragVisual, setDragVisual] = useState<{ x: number; y: number; snapCellSize?: number }>({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  // Track last valid hover so pointerup uses it instead of recomputing from (possibly drifted) coordinates
  const lastHoverRef = useRef<{ r: number; c: number } | null>(null);
  // Always-fresh refs for values needed inside event handlers
  const boardLive = useRef(board);
  useEffect(() => { boardLive.current = board; }, [board]);
  const piecesLive = useRef(pieces);
  useEffect(() => { piecesLive.current = pieces; }, [pieces]);
  const commitPlaceRef = useRef<typeof commitPlace | null>(null);
  useEffect(() => { commitPlaceRef.current = commitPlace; });

  const refillFacts = async () => {
    if (factsLoading.current) return;
    factsLoading.current = true;
    try {
      const r = await api.studyFactsWithQuiz(
        settings.topic, 6, settings.educationLevel,
        settings.notes, settings.difficulty, settings.language,
      );
      // Shuffle choices so the correct answer isn't always first.
      // Don't guard on type — shuffle whenever choices array exists (AI may omit type).
      const items = r.items.map((item) => {
        const choices = item.question.choices;
        if (Array.isArray(choices) && choices.length > 1) {
          // Fisher-Yates — unbiased unlike .sort(() => Math.random() - 0.5)
          const shuffled = [...choices];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return { ...item, question: { ...item.question, choices: shuffled } };
        }
        return item;
      });
      setFactPool((p) => [...p, ...items]);
    } catch {
      // handled
    } finally {
      factsLoading.current = false;
    }
  };

  useEffect(() => { refillFacts(); /* eslint-disable-next-line */ }, [settings.topic, settings.notes]);

  const reset = () => {
    sfx.click();
    setBoard(emptyBoard());
    setPieces([randomPiece(), randomPiece(), randomPiece()]);
    setScore(0);
    setLinesCleared(0);
    setPiecesPlaced(0);
    setBestClear(0);
    setCombos(0);
    setQuestionsAnswered(0);
    setQuestionsCorrect(0);
    setBonusesEarned(0);
    setWrongAnswers([]);
    setActiveFlash(null);
    setActiveQuestion(null);
    lastItemRef.current = null;
    startedAt.current = Date.now();
    recorded.current = false;
    setSeenFacts([]);
    setSeenItems([]);
    setReviewMode(false);
    setReviewIdx(0);
    setReviewQ(null);
    setReviewCorrect(0);
    setReviewTotal(0);
    setReviewDone(false);
  };

  const BOARD_GAP = 4; // gap-1 = 4px

  const computeHover = (clientX: number, clientY: number, piece: Piece, offsetX: number, offsetY: number) => {
    const grid = boardRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    // Use gap-aware stride so the snapped cell matches the visual board grid exactly
    const cellSize = (rect.width - (SIZE - 1) * BOARD_GAP) / SIZE;
    const stride = cellSize + BOARD_GAP;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top - 24;
    const c = Math.round(localX / stride - offsetX);
    const r = Math.round(localY / stride - offsetY);
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return null;
    if (r + piece.shape.length > SIZE || c + piece.shape[0].length > SIZE) return null;
    return { r, c, cellSize, stride };
  };

  const onPiecePointerDown = (e: ReactPointerEvent<HTMLDivElement>, idx: number) => {
    const p = pieces[idx];
    if (!p) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    sfx.click();
    dragXY.current = { x: e.clientX, y: e.clientY };
    setDragVisual({ x: e.clientX, y: e.clientY });
    lastHoverRef.current = null;
    setDrag({
      pieceIdx: idx,
      pointerId: e.pointerId,
      offsetX: (p.shape[0].length - 1) / 2,
      offsetY: (p.shape.length - 1) / 2,
    });
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      dragXY.current = { x: e.clientX, y: e.clientY };
      const piece = piecesLive.current[drag.pieceIdx];
      if (!piece) return;
      const h = computeHover(e.clientX, e.clientY, piece, drag.offsetX, drag.offsetY);
      const valid = h && canPlace(boardLive.current, piece.shape, h.r, h.c) ? h : null;
      // Store only r/c in hover state (cellSize/stride are compute-only)
      const hoverCell = valid ? { r: valid.r, c: valid.c } : null;
      lastHoverRef.current = hoverCell;
      setHover(hoverCell);

      if (valid && boardRef.current) {
        // Snap the floating piece so it overlays the highlighted board cells exactly
        const boardRect = boardRef.current.getBoundingClientRect();
        const cols = piece.shape[0].length;
        const rows = piece.shape.length;
        const pieceLeft = boardRect.left + valid.c * valid.stride;
        const pieceTop  = boardRect.top  + valid.r * valid.stride;
        // Center of the piece (used by translate(-50%,-50%) anchor)
        const snapX = pieceLeft + (cols * valid.stride - BOARD_GAP) / 2;
        const snapY = pieceTop  + (rows * valid.stride - BOARD_GAP) / 2;
        setDragVisual({ x: snapX, y: snapY, snapCellSize: valid.cellSize });
      } else {
        // Off-board: ghost follows cursor
        setDragVisual({ x: e.clientX, y: e.clientY });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      // Prefer the last known valid hover (matches what was highlighted on the board).
      // Fall back to recomputing from the final pointer position if hover was never set.
      let h = lastHoverRef.current;
      if (!h) {
        const piece = piecesLive.current[drag.pieceIdx];
        if (piece) {
          const computed = computeHover(e.clientX, e.clientY, piece, drag.offsetX, drag.offsetY);
          if (computed && canPlace(boardLive.current, piece.shape, computed.r, computed.c)) h = computed;
        }
      }
      const piece = piecesLive.current[drag.pieceIdx];
      if (h && piece) {
        commitPlaceRef.current(piece, h.r, h.c, drag.pieceIdx);
      } else {
        sfx.wrong();
      }
      setDrag(null);
      setHover(null);
      lastHoverRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag]); // drag no longer contains x/y so this only fires when a drag starts/stops

  const spawnSparks = (cells: { r: number; c: number; color: string }[]) => {
    const grid = boardRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cellSize = rect.width / SIZE;
    const newSparks: Spark[] = [];
    for (const cell of cells) {
      const cx = cell.c * cellSize + cellSize / 2;
      const cy = cell.r * cellSize + cellSize / 2;
      for (let k = 0; k < 4; k++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 40;
        newSparks.push({
          id: ++sparkId,
          x: cx,
          y: cy,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          color: cell.color,
        });
      }
    }
    setSparks((s) => [...s, ...newSparks]);
    setTimeout(() => {
      const ids = new Set(newSparks.map((s) => s.id));
      setSparks((s) => s.filter((sp) => !ids.has(sp.id)));
    }, 800);
  };

  const commitPlace = (piece: Piece, r: number, c: number, idx: number) => {
    sfx.place();
    const placed = place(board, piece.shape, r, c, piece.color);
    const { rows, cols } = findFullLines(placed);
    const lines = rows.length + cols.length;

    setBoard(placed);
    setScore((s) => s + piece.shape.flat().filter(Boolean).length + lines * 20);
    setPiecesPlaced((n) => n + 1);

    const newPieces = [...pieces];
    newPieces[idx] = null;
    if (newPieces.every((p) => p === null)) setPieces([randomPiece(), randomPiece(), randomPiece()]);
    else setPieces(newPieces);

    if (lines > 0) {
      handleLinesCleared(placed, rows, cols, lines);
    }
  };

  const handleLinesCleared = (afterPlace: (string | null)[][], rows: number[], cols: number[], lines: number) => {
    setLinesCleared((n) => n + lines);
    setBestClear((b) => Math.max(b, lines));
    if (lines >= 2) {
      setCombos((c) => c + 1);
      sfx.combo();
      setComboBanner(lines >= 3 ? `MEGA COMBO ×${lines}!` : `COMBO ×${lines}!`);
      setTimeout(() => setComboBanner(null), 900);
    } else {
      sfx.clear();
    }
    sfx.sparkle();

    const cellsToClear: { r: number; c: number; color: string }[] = [];
    const popKey = new Set<string>();
    for (const r of rows) for (let j = 0; j < SIZE; j++) {
      const col = afterPlace[r][j];
      if (col) cellsToClear.push({ r, c: j, color: col });
      popKey.add(`${r}-${j}`);
    }
    for (const c of cols) for (let i = 0; i < SIZE; i++) {
      const col = afterPlace[i][c];
      if (col) cellsToClear.push({ r: i, c, color: col });
      popKey.add(`${i}-${c}`);
    }
    setPoppingCells(popKey);
    setFlashLines({ rows, cols });
    spawnSparks(cellsToClear);

    setTimeout(() => {
      setPoppingCells(new Set());
      setFlashLines(null);
      const cleared = clearLineCells(afterPlace, rows, cols);
      setBoard(cleared);
      onAfterClear(lines);
    }, 420);
  };

  const onAfterClear = (lines: number) => {
    if (activeFlash || activeQuestion) return;
    if (!lastItemRef.current) {
      const item = factPool[0];
      if (item) {
        setFactPool((p) => p.slice(1));
        if (factPool.length < 3) refillFacts();
        lastItemRef.current = item;
        setSeenFacts((prev) => prev.includes(item.fact) ? prev : [...prev, item.fact]);
        setSeenItems((prev) => prev.some(i => i.fact === item.fact) ? prev : [...prev, item]);
        setActiveFlash(item.fact);
        sfx.whoosh();
      } else {
        toast.success(`${lines} line${lines > 1 ? "s" : ""} cleared!`);
        refillFacts();
      }
    } else {
      // Use pre-loaded question — zero API call mid-game
      sfx.whoosh();
      setActiveQuestion(lastItemRef.current.question);
      lastItemRef.current = null;
    }
  };

  const submitAnswer = (given: string) => {
    if (!activeQuestion) return;
    const expected = activeQuestion.answer.trim().toLowerCase();
    const got = given.trim().toLowerCase();
    const correct = activeQuestion.type === "mcq"
      ? got === expected
      : got === expected || expected.includes(got) || got.includes(expected);
    setQuestionsAnswered((n) => n + 1);
    if (correct) {
      setQuestionsCorrect((n) => n + 1);
      setScore((s) => s + 30);
      sfx.correct();
      if (Math.random() < 0.25) {
        const { board: nb, cleared } = clearOneRandomLine(board);
        if (cleared) {
          setBoard(nb);
          setBonusesEarned((n) => n + 1);
          setScore((s) => s + 40);
          sfx.bonus();
          toast.success(t("bonusToast"), { description: activeQuestion.explanation });
        } else {
          toast.success(t("correctPts"), { description: activeQuestion.explanation });
        }
      } else {
        toast.success(t("correctPts"), { description: activeQuestion.explanation });
      }
    } else {
      sfx.wrong();
      toast.error(t("answerWas", { ans: activeQuestion.answer }), { description: activeQuestion.explanation });
      setWrongAnswers((w) => [
        ...w,
        { question: activeQuestion.prompt, yourAnswer: given, correctAnswer: activeQuestion.answer },
      ]);
    }
    setActiveQuestion(null);
  };

  // Review quiz logic
  const startReview = () => {
    if (seenItems.length === 0) return;
    setReviewMode(true);
    setReviewIdx(0);
    setReviewCorrect(0);
    setReviewTotal(seenItems.length);
    setReviewDone(false);
    setReviewQ(seenItems[0].question);
  };

  const handleReviewAnswer = (given: string) => {
    if (!reviewQ) return;
    const expected = reviewQ.answer.trim().toLowerCase();
    const got = given.trim().toLowerCase();
    const correct = reviewQ.type === "mcq"
      ? got === expected
      : got === expected || expected.includes(got) || got.includes(expected);
    if (correct) {
      setReviewCorrect((n) => n + 1);
      sfx.correct();
      toast.success(t("correct"), { description: reviewQ.explanation });
    } else {
      sfx.wrong();
      toast.error(t("answerWas", { ans: reviewQ.answer }), { description: reviewQ.explanation });
    }
    nextReviewFact();
  };

  const nextReviewFact = () => {
    const next = reviewIdx + 1;
    if (next >= seenItems.length) {
      setReviewDone(true);
      setReviewMode(false);
      sfx.win();
    } else {
      setReviewIdx(next);
      setReviewQ(seenItems[next].question);
    }
  };

  const previewCells = useMemo(() => {
    if (!drag || !hover) return new Set<string>();
    const piece = pieces[drag.pieceIdx];
    if (!piece) return new Set<string>();
    const s = new Set<string>();
    for (let i = 0; i < piece.shape.length; i++)
      for (let j = 0; j < piece.shape[0].length; j++)
        if (piece.shape[i][j]) s.add(`${hover.r + i}-${hover.c + j}`);
    return s;
  }, [drag, hover, pieces]);

  const dragPiece = drag ? pieces[drag.pieceIdx] : null;

  const noMoves = !drag && pieces.every((p) => {
    if (!p) return true;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (canPlace(board, p.shape, r, c)) return false;
    return true;
  }) && pieces.some((p) => p);

  const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
  const cellsFilled = board.reduce((n, row) => n + row.filter(Boolean).length, 0);

  useEffect(() => {
    if (!noMoves || recorded.current) return;
    recorded.current = true;
    sfx.lose();
    const outcome = score >= 200 ? "win" : "loss";
    recordResult({
      game: "blocks",
      topic: settings.topic,
      educationLevel: settings.educationLevel,
      difficulty: settings.difficulty,
      outcome,
      score,
      details: {
        lines: linesCleared,
        bestClear,
        combos,
        piecesPlaced,
        questions: `${questionsCorrect}/${questionsAnswered}`,
        bonuses: bonusesEarned,
        cellsLeft: cellsFilled,
        time: `${durationSec}s`,
      },
    });
    submitScore("blocks", score, outcome);
    submitResult("blocks", score, outcome);
  }, [noMoves, score, linesCleared, bestClear, combos, piecesPlaced, cellsFilled, durationSec, settings.topic, settings.educationLevel, questionsAnswered, questionsCorrect, bonusesEarned]);

  return (
    <div className="min-h-screen select-none">
      <LeaderboardPanel />
      <TopBar title={t("blockMasterTitle")} gradient="bg-gradient-blocks" />
      {showTutorial && (
        <GameTutorial
          icon="🧱"
          title="Block Master"
          steps={[
            "Drag and drop block pieces onto the 8×8 board.",
            "Fill a complete row or column to clear it and unlock a study fact.",
            "Answer the fact question correctly to earn a bonus clear!",
            "Game ends when no pieces fit on the board.",
          ]}
          onDismiss={() => { markGameTutorialSeen("blocks"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-md py-6 space-y-4 relative overflow-y-auto" style={{ touchAction: noMoves ? "auto" : "none" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("scoreLabel")}</div>
            <div className="font-display text-3xl font-bold text-blocks">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Sparkles className="h-3 w-3" /> {t("factsLabel")}
            </div>
            <div className="font-mono text-sm">{factPool.length}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" /> {t("reset")}
          </Button>
        </div>

        <Card className="bg-gradient-card border-border/60 p-2 relative overflow-hidden">
          <div ref={boardRef} className="grid grid-cols-8 gap-1 relative">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const previewing = previewCells.has(`${r}-${c}`);
                const popping = poppingCells.has(`${r}-${c}`);
                const lineFlashing =
                  flashLines && (flashLines.rows.includes(r) || flashLines.cols.includes(c));
                return (
                  <div
                    key={`${r}-${c}`}
                    className={cn(
                      "aspect-square rounded-sm transition-colors",
                      cell ? cell : previewing ? `${dragPiece?.color} opacity-50` : "bg-secondary/50",
                      popping && "block-pop",
                      !popping && cell && "block-drop",
                      lineFlashing && !popping && "line-flash",
                    )}
                  />
                );
              }),
            )}
            <div className="absolute inset-0 pointer-events-none">
              {sparks.map((s) => (
                <span
                  key={s.id}
                  className={cn("spark", s.color)}
                  style={{
                    left: s.x,
                    top: s.y,
                    ["--dx" as never]: `${s.dx}px`,
                    ["--dy" as never]: `${s.dy}px`,
                  }}
                />
              ))}
            </div>
            {comboBanner && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="combo-pop font-display text-3xl sm:text-4xl font-black text-warning drop-shadow-[0_0_18px_hsl(var(--warning))] tracking-wide">
                  {comboBanner}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-gradient-card border-border/60 p-3">
          <div className="grid grid-cols-3 gap-2">
            {pieces.map((p, i) => {
              const isDragging = drag?.pieceIdx === i;
              return (
                <div
                  key={i}
                  onPointerDown={(e) => onPiecePointerDown(e, i)}
                  className={cn(
                    "aspect-square rounded-md p-2 transition-all flex items-center justify-center touch-none",
                    p ? "bg-secondary/40 hover:bg-secondary cursor-grab active:cursor-grabbing" : "bg-secondary/20 opacity-30",
                    isDragging && "opacity-30 ring-2 ring-primary",
                  )}
                  style={{ touchAction: "none" }}
                >
                  {p && (
                    <div
                      className="grid gap-0.5"
                      style={{ gridTemplateColumns: `repeat(${p.shape[0].length}, minmax(0, 1fr))` }}
                    >
                      {p.shape.flatMap((row, ri) =>
                        row.map((v, ci) => (
                          <div key={`${ri}-${ci}`} className={`w-3 h-3 rounded-sm ${v ? p.color : ""}`} />
                        )),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("dragInstruction")}
          </p>
        </Card>

        {noMoves && (
          <div className="space-y-4">
            <Card className="bg-gradient-card border-border/60 p-4 text-center animate-pop-in space-y-3">
              <div className="text-3xl">🧱</div>
              <div className="font-display font-bold">{t("noMovesLeft")}</div>
              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto pt-1">
                <MiniStat label={t("scoreLabel")} value={score} />
                <MiniStat label={t("linesLabel")} value={linesCleared} />
                <MiniStat label={t("bestClearLabel")} value={bestClear > 0 ? `${bestClear}× combo` : "—"} />
                <MiniStat label={t("combosLabel")} value={combos} />
                <MiniStat label={t("qCorrectLabel")} value={`${questionsCorrect}/${questionsAnswered}`} />
                <MiniStat label={t("bonusesLabel")} value={bonusesEarned} />
                <MiniStat label={t("piecesLabel")} value={piecesPlaced} />
                <MiniStat label={t("time")} value={`${durationSec}s`} />
                <MiniStat label={t("cellsLabel")} value={`${cellsFilled}/${SIZE * SIZE}`} />
              </div>
              <div className="flex gap-2 justify-center flex-wrap pt-2">
                <Button onClick={reset} className="bg-gradient-blocks">{t("playAgain")}</Button>
                <Link href="/stats">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}
                  </Button>
                </Link>
                <ShareButton game="blocks" />
              </div>
            </Card>

            {/* Knowledge Review Panel */}
            {seenFacts.length > 0 && !reviewMode && (
              <Card className="bg-gradient-card border-border/60 p-4 space-y-3 animate-pop-in">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blocks" />
                  <div className="font-display font-bold text-sm">{t("factsYouLearned")}</div>
                  <div className="ml-auto text-xs text-muted-foreground">{seenFacts.length} {t("factsLabel")}</div>
                </div>
                <div className="space-y-2">
                  {seenFacts.map((f, i) => (
                    <div key={i} className="flex gap-2 text-sm leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-blocks shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                {!reviewDone && (
                  <Button onClick={startReview} className="w-full bg-gradient-blocks">
                    <Brain className="h-4 w-4 mr-2" />
                    {t("testMeFacts")}
                  </Button>
                )}
                {reviewDone && (
                  <div className="text-center space-y-1">
                    <div className="text-2xl">🎓</div>
                    <div className="font-display font-bold text-sm">{t("reviewComplete")}</div>
                    <div className="text-muted-foreground text-sm">
                      {t("youGotReview", { correct: reviewCorrect, total: reviewTotal })}
                    </div>
                  </div>
                )}
              </Card>
            )}

            <ReviewMistakesPanel
              mistakes={wrongAnswers}
              topic={settings.topic}
              educationLevel={settings.educationLevel}
            />
          </div>
        )}
      </main>

      {/* Floating piece preview while dragging */}
      {drag && dragPiece && (() => {
        const cs = dragVisual.snapCellSize;
        const snapping = cs != null;
        return (
          <div
            className="fixed pointer-events-none z-40"
            style={{
              left: dragVisual.x,
              top: snapping ? dragVisual.y : dragVisual.y - 24,
              transform: "translate(-50%, -50%)",
              // Smooth snap transitions feel tactile; no transition when ghosting off-board
              transition: snapping ? "left 55ms ease-out, top 55ms ease-out" : "none",
            }}
          >
            <div
              className={snapping ? "opacity-75" : "p-1 rounded-md bg-background/40 backdrop-blur-sm shadow-lg ring-1 ring-primary/40 opacity-90"}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${dragPiece.shape[0].length}, ${cs ?? 24}px)`,
                gap: "4px",
              }}
            >
              {dragPiece.shape.flatMap((row, ri) =>
                row.map((v, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    style={{ width: cs ?? 24, height: cs ?? 24 }}
                    className={cn("rounded-sm", v ? dragPiece.color : "opacity-0")}
                  />
                )),
              )}
            </div>
          </div>
        );
      })()}

      {/* Mid-screen flashcard — centered via flex parent */}
      {activeFlash && !activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="flash-rise w-[min(92vw,420px)]">
            <Card className="bg-gradient-card border-2 border-primary/60 shadow-glow p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="h-5 w-5" />
                <div className="font-display font-bold text-sm uppercase tracking-wider">Flashcard</div>
              </div>
              <div className="text-base sm:text-lg leading-relaxed">{activeFlash}</div>
              <p className="text-xs text-muted-foreground">
                Clear another line to unlock a question on this fact. Get a bonus chance to clear an extra line!
              </p>
              <Button
                className="w-full bg-gradient-blocks"
                onClick={() => { sfx.click(); setActiveFlash(null); }}
              >
                Got it — keep playing
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Mid-screen question — centered via flex parent */}
      {activeQuestion && (
        <QuestionModal
          q={activeQuestion}
          loading={false}
          onSubmit={submitAnswer}
          onSkip={() => { setActiveQuestion(null); lastItemRef.current = null; }}
          fact={lastItemRef.current?.fact ?? ""}
        />
      )}

      {/* End-of-game review quiz modal */}
      {reviewMode && reviewQ && (
        <QuestionModal
          q={reviewQ}
          loading={false}
          onSubmit={handleReviewAnswer}
          onSkip={nextReviewFact}
          fact={seenFacts[reviewIdx] ?? ""}
          reviewLabel={`Review ${reviewIdx + 1} / ${seenItems.length}`}
        />
      )}
    </div>
  );
}

function QuestionModal({
  q,
  loading,
  fact,
  onSubmit,
  onSkip,
  reviewLabel,
}: {
  q: FlashQ | null;
  loading: boolean;
  fact: string;
  onSubmit: (a: string) => void;
  onSkip: () => void;
  reviewLabel?: string;
}) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(""); }, [q]);

  // Shuffle choices once per question, at render time — guaranteed randomness
  const shuffledChoices = useMemo(() => {
    if (!q?.choices || q.choices.length < 2) return q?.choices ?? [];
    const arr = [...q.choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top,16px)] overflow-y-auto">
      <div className="flash-rise w-[min(92vw,460px)] my-auto">
        <Card className="bg-gradient-card border-2 border-accent/60 shadow-glow p-5 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto">
          <div className="flex items-center gap-2 text-accent">
            <Gift className="h-5 w-5" />
            <div className="font-display font-bold text-sm uppercase tracking-wider">
              {reviewLabel ?? "Quick check"} {loading && "…"}
            </div>
          </div>
          {fact && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-accent/50 pl-2">
              About: {fact}
            </div>
          )}
          {loading || !q ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Generating question…</div>
          ) : (
            <>
              <div className="text-base sm:text-lg font-medium leading-relaxed">{q.prompt}</div>
              {q.type === "mcq" && q.choices ? (
                <div className="grid gap-2">
                  {shuffledChoices.map((c) => (
                    <Button
                      key={c}
                      variant="outline"
                      className="justify-start text-left h-auto py-2 whitespace-normal"
                      onClick={() => onSubmit(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && val.trim() && onSubmit(val)}
                    placeholder={q.type === "fill" ? "Fill in the blank…" : "Your answer…"}
                    style={{ fontSize: "16px" }}
                  />
                  <Button
                    className="w-full bg-gradient-blocks"
                    onClick={() => val.trim() && onSubmit(val)}
                    disabled={!val.trim()}
                  >
                    Submit
                  </Button>
                </div>
              )}
            </>
          )}
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            onClick={onSkip}
          >
            Skip this question
          </button>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-secondary/50 py-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
