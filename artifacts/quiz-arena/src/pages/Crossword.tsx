import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw, CheckCircle2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sound";
import { recordResult } from "@/lib/stats";
import { ShareButton } from "@/components/ShareButton";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { useRoom } from "@/lib/room";
import { useAssignment } from "@/lib/assignment";
import { useT } from "@/lib/i18n";
import { GameTutorial } from "@/components/GameTutorial";
import { hasSeenGameTutorial, markGameTutorialSeen } from "@/lib/tutorial";

const G = 15;
type Dir = "across" | "down";

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: Dir;
  num: number;
}

interface CellInfo {
  letter: string;
  wordIndices: number[];
  num?: number;
}

function initGrid(): string[][] {
  return Array.from({ length: G }, () => Array(G).fill(""));
}

function canPlace(grid: string[][], word: string, r: number, c: number, dir: Dir): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  if (r < 0 || c < 0 || r + dr * (word.length - 1) >= G || c + dc * (word.length - 1) >= G) return false;
  if (r - dr >= 0 && c - dc >= 0 && grid[r - dr][c - dc] !== "") return false;
  const er = r + dr * word.length, ec = c + dc * word.length;
  if (er < G && ec < G && grid[er][ec] !== "") return false;
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const cr = r + dr * i, cc = c + dc * i;
    const cell = grid[cr][cc];
    if (cell === word[i]) {
      intersections++;
    } else if (cell !== "") {
      return false;
    } else {
      const p1r = cr - dc, p1c = cc - dr;
      const p2r = cr + dc, p2c = cc + dr;
      if (p1r >= 0 && p1c >= 0 && p1r < G && p1c < G && grid[p1r][p1c] !== "") return false;
      if (p2r >= 0 && p2c >= 0 && p2r < G && p2c < G && grid[p2r][p2c] !== "") return false;
    }
  }
  return intersections > 0;
}

function placeInGrid(grid: string[][], word: string, r: number, c: number, dir: Dir) {
  for (let i = 0; i < word.length; i++) {
    grid[dir === "down" ? r + i : r][dir === "across" ? c + i : c] = word[i];
  }
}

function buildCrossword(raw: { word: string; clue: string }[]): PlacedWord[] {
  const entries = raw
    .filter(e => /^[A-Z]+$/.test(e.word) && e.word.length >= 3 && e.word.length <= 12)
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 7);
  if (entries.length === 0) return [];

  const grid = initGrid();
  const placed: PlacedWord[] = [];

  const first = entries[0];
  const r0 = Math.floor(G / 2);
  const c0 = Math.floor((G - first.word.length) / 2);
  placeInGrid(grid, first.word, r0, c0, "across");
  placed.push({ word: first.word, clue: first.clue, row: r0, col: c0, dir: "across", num: 1 });

  for (let wi = 1; wi < entries.length; wi++) {
    const { word, clue } = entries[wi];
    let found = false;
    const preferDir: Dir = wi % 2 === 1 ? "down" : "across";
    const dirs: Dir[] = [preferDir, preferDir === "down" ? "across" : "down"];

    for (const dir of dirs) {
      if (found) break;
      const dr = dir === "down" ? 1 : 0;
      const dc = dir === "across" ? 1 : 0;
      for (const pw of placed) {
        if (found || pw.dir === dir) continue;
        for (let ei = 0; ei < pw.word.length && !found; ei++) {
          for (let ni = 0; ni < word.length && !found; ni++) {
            if (word[ni] !== pw.word[ei]) continue;
            const ir = pw.dir === "down" ? pw.row + ei : pw.row;
            const ic = pw.dir === "across" ? pw.col + ei : pw.col;
            const nr = ir - dr * ni, nc = ic - dc * ni;
            if (canPlace(grid, word, nr, nc, dir)) {
              placeInGrid(grid, word, nr, nc, dir);
              placed.push({ word, clue, row: nr, col: nc, dir, num: placed.length + 1 });
              found = true;
            }
          }
        }
      }
    }
  }

  placed.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  let counter = 1;
  const numMap = new Map<string, number>();
  placed.forEach(p => {
    const key = `${p.row},${p.col}`;
    if (!numMap.has(key)) numMap.set(key, counter++);
    p.num = numMap.get(key)!;
  });

  return placed;
}

export default function Crossword() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);
  const [cellGrid, setCellGrid] = useState<(CellInfo | null)[][]>([]);
  const [bounds, setBounds] = useState({ minR: 0, minC: 0, rows: 0, cols: 0 });
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selWi, setSelWi] = useState<number | null>(null);
  const [curPos, setCurPos] = useState(0);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [correctWords, setCorrectWords] = useState(0);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const recorded = useRef(false);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("crossword"));

  const load = async () => {
    setLoading(true);
    setChecked(false);
    setDone(false);
    setSelWi(null);
    setCurPos(0);
    setScore(0);
    setCorrectWords(0);
    startedAt.current = Date.now();
    recorded.current = false;
    try {
      const result = await api.crosswordEntries(settings.topic, settings.notes, settings.difficulty, settings.educationLevel);
      const clean = result.entries.map(e => ({ ...e, word: e.word.toUpperCase().replace(/[^A-Z]/g, "") }));
      const pw = buildCrossword(clean);
      if (pw.length < 2) throw new Error("Not enough words placed");

      setPlaced(pw);

      const usedR = pw.flatMap(p => Array.from({ length: p.word.length }, (_, i) => p.dir === "down" ? p.row + i : p.row));
      const usedC = pw.flatMap(p => Array.from({ length: p.word.length }, (_, i) => p.dir === "across" ? p.col + i : p.col));
      const minR = Math.min(...usedR), maxR = Math.max(...usedR);
      const minC = Math.min(...usedC), maxC = Math.max(...usedC);
      const rows = maxR - minR + 1, cols = maxC - minC + 1;
      setBounds({ minR, minC, rows, cols });

      const cg: (CellInfo | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
      pw.forEach((p, wi) => {
        for (let i = 0; i < p.word.length; i++) {
          const r = p.dir === "down" ? p.row + i : p.row;
          const c = p.dir === "across" ? p.col + i : p.col;
          const dr = r - minR, dc = c - minC;
          if (!cg[dr][dc]) cg[dr][dc] = { letter: p.word[i], wordIndices: [wi] };
          else cg[dr][dc]!.wordIndices.push(wi);
        }
        const sd = p.row - minR, sc = p.col - minC;
        if (cg[sd][sc]) cg[sd][sc]!.num = p.num;
      });
      setCellGrid(cg);
      setUserGrid(Array.from({ length: rows }, () => Array(cols).fill("")));
    } catch {
      toast.error(t("couldNotLoadCrossword"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleCellClick = (dr: number, dc: number) => {
    const cell = cellGrid[dr]?.[dc];
    if (!cell || done) return;
    const { wordIndices } = cell;
    let nextWi: number;
    if (wordIndices.length === 1) {
      nextWi = wordIndices[0];
    } else {
      const curIdx = wordIndices.indexOf(selWi ?? -1);
      nextWi = wordIndices[(curIdx + 1) % wordIndices.length];
    }
    const p = placed[nextWi];
    const r = dr + bounds.minR, c = dc + bounds.minC;
    const pos = p.dir === "down" ? r - p.row : c - p.col;
    setSelWi(nextWi);
    setCurPos(Math.max(0, Math.min(pos, p.word.length - 1)));
    sfx.click();
    nativeInputRef.current?.focus();
  };

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (done || selWi === null) return;
    const p = placed[selWi];
    if (!p) return;
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const r = p.dir === "down" ? p.row + curPos : p.row;
      const c = p.dir === "across" ? p.col + curPos : p.col;
      const newUser = userGrid.map(row => [...row]);
      newUser[r - bounds.minR][c - bounds.minC] = e.key.toUpperCase();
      setUserGrid(newUser);
      sfx.type();
      if (curPos < p.word.length - 1) setCurPos(curPos + 1);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const r = p.dir === "down" ? p.row + curPos : p.row;
      const c = p.dir === "across" ? p.col + curPos : p.col;
      const dr = r - bounds.minR, dc = c - bounds.minC;
      const newUser = userGrid.map(row => [...row]);
      if (newUser[dr][dc] !== "") {
        newUser[dr][dc] = "";
      } else if (curPos > 0) {
        const pr = p.dir === "down" ? p.row + curPos - 1 : p.row;
        const pc = p.dir === "across" ? p.col + curPos - 1 : p.col;
        newUser[pr - bounds.minR][pc - bounds.minC] = "";
        setCurPos(curPos - 1);
      }
      setUserGrid(newUser);
      sfx.click();
    } else if (e.key === "Tab") {
      e.preventDefault();
      setSelWi((selWi + 1) % placed.length);
      setCurPos(0);
    }
  }, [done, selWi, curPos, placed, userGrid, bounds]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const checkAnswers = () => {
    let cw = 0;
    placed.forEach(p => {
      let ok = true;
      for (let i = 0; i < p.word.length; i++) {
        const r = p.dir === "down" ? p.row + i : p.row;
        const c = p.dir === "across" ? p.col + i : p.col;
        if ((userGrid[r - bounds.minR]?.[c - bounds.minC] ?? "") !== p.word[i]) { ok = false; break; }
      }
      if (ok) cw++;
    });
    const finalScore = cw * 50 + (cw === placed.length ? 100 : 0);
    setCorrectWords(cw);
    setScore(finalScore);
    setChecked(true);
    setDone(true);
    const outcome = cw === placed.length ? "win" : "loss";
    if (outcome === "win") sfx.win(); else sfx.lose();
    if (!recorded.current) {
      recorded.current = true;
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      recordResult({ game: "crossword", topic: settings.topic, educationLevel: settings.educationLevel, difficulty: settings.difficulty, outcome, score: finalScore, details: { words: `${cw}/${placed.length}`, time: `${elapsed}s` } });
      submitScore("crossword", finalScore, outcome);
      submitResult("crossword", finalScore, outcome);
    }
  };

  const getCellClass = (dr: number, dc: number, cell: CellInfo | null) => {
    if (!cell) return "bg-secondary/20";
    const isSelected = selWi !== null && cell.wordIndices.includes(selWi);
    const isCursor = isSelected && selWi !== null && (() => {
      const p = placed[selWi];
      const r = dr + bounds.minR, c = dc + bounds.minC;
      const pos = p.dir === "down" ? r - p.row : c - p.col;
      return pos === curPos;
    })();
    const letter = userGrid[dr]?.[dc] ?? "";
    if (checked && letter) return letter === cell.letter ? "bg-success/80 text-white border-success" : "bg-destructive/80 text-white border-destructive";
    if (checked && !letter) return "bg-warning/70 text-white border-warning";
    if (isCursor) return "bg-primary/80 text-white border-primary ring-1 ring-primary";
    if (isSelected) return "bg-primary/20 border-primary/50";
    return "bg-card border-border";
  };

  const acrossWords = placed.filter(p => p.dir === "across").sort((a, b) => a.num - b.num);
  const downWords = placed.filter(p => p.dir === "down").sort((a, b) => a.num - b.num);

  return (
    <div className="min-h-screen flex flex-col">
      <LeaderboardPanel />
      <TopBar title={t("crosswordTitle")} gradient="bg-gradient-crossword" />
      {showTutorial && (
        <GameTutorial
          icon="📝"
          title="Crossword"
          steps={[
            "Click any highlighted cell to select a word slot.",
            "Type letters on your keyboard to fill in the word.",
            "Press Tab to jump to the next clue.",
            "Hit 'Check Answers' when you think you're done!",
          ]}
          onDismiss={() => { markGameTutorialSeen("crossword"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-2xl py-6 flex-1 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("clickCellInstruction")}</p>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-1" /> {t("new_")}
          </Button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin" /> {t("generatingCrossword")}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="inline-block border border-border/40 rounded-lg overflow-hidden bg-secondary/20">
                {Array.from({ length: bounds.rows }).map((_, dr) => (
                  <div key={dr} className="flex">
                    {Array.from({ length: bounds.cols }).map((_, dc) => {
                      const cell = cellGrid[dr]?.[dc] ?? null;
                      return (
                        <div
                          key={dc}
                          className={`w-9 h-9 sm:w-10 sm:h-10 relative border-[0.5px] flex items-center justify-center font-display font-bold text-sm uppercase select-none cursor-pointer transition-colors ${getCellClass(dr, dc, cell)}`}
                          onClick={() => handleCellClick(dr, dc)}
                        >
                          {cell?.num && (
                            <span className="absolute top-0 left-0.5 text-[8px] text-muted-foreground/70 font-normal leading-none">{cell.num}</span>
                          )}
                          {cell && (userGrid[dr]?.[dc] || (done ? cell.letter : ""))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={nativeInputRef}
              type="text"
              defaultValue=""
              className="sm:hidden w-full h-12 rounded-xl border border-crossword/40 bg-secondary/60 text-center text-sm text-muted-foreground cursor-text"
              placeholder={selWi !== null ? "⌨️ Type to fill selected word…" : "⌨️ Tap a cell first, then type…"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={done}
              style={{ fontSize: "16px" }}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z]/g, "");
                if (val.length > 0 && selWi !== null && !done) {
                  const key = val[val.length - 1].toUpperCase();
                  const p = placed[selWi];
                  if (p) {
                    const r = p.dir === "down" ? p.row + curPos : p.row;
                    const c = p.dir === "across" ? p.col + curPos : p.col;
                    const newUser = userGrid.map(row => [...row]);
                    newUser[r - bounds.minR][c - bounds.minC] = key;
                    setUserGrid(newUser);
                    sfx.type();
                    if (curPos < p.word.length - 1) setCurPos(curPos + 1);
                  }
                }
                e.target.value = "";
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace") {
                  e.preventDefault();
                  if (selWi !== null && !done) {
                    const p = placed[selWi];
                    if (p) {
                      const r = p.dir === "down" ? p.row + curPos : p.row;
                      const c = p.dir === "across" ? p.col + curPos : p.col;
                      const dr2 = r - bounds.minR, dc2 = c - bounds.minC;
                      const newUser = userGrid.map(row => [...row]);
                      if (newUser[dr2][dc2] !== "") {
                        newUser[dr2][dc2] = "";
                      } else if (curPos > 0) {
                        const pr = p.dir === "down" ? p.row + curPos - 1 : p.row;
                        const pc = p.dir === "across" ? p.col + curPos - 1 : p.col;
                        newUser[pr - bounds.minR][pc - bounds.minC] = "";
                        setCurPos(curPos - 1);
                      }
                      setUserGrid(newUser);
                      sfx.click();
                    }
                  }
                } else if (e.key === "Tab") {
                  e.preventDefault();
                  if (selWi !== null) setSelWi((selWi + 1) % placed.length);
                  setCurPos(0);
                }
              }}
            />

            {!done ? (
              <Button onClick={checkAnswers} className="bg-gradient-crossword w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" /> {t("checkAnswers")}
              </Button>
            ) : (
              <Card className="bg-gradient-card border-border/60 p-4 text-center animate-pop-in space-y-3">
                <div className="text-3xl">{correctWords === placed.length ? "🎉" : "📝"}</div>
                <div className="font-display font-bold text-lg">
                  {correctWords === placed.length ? t("perfectPuzzle") : t("wordsCorrect", { n: correctWords, total: placed.length })}
                </div>
                <div className="font-display text-3xl font-bold text-crossword">{score} pts</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={load} className="bg-gradient-crossword">{t("newPuzzle")}</Button>
                  <Link href="/stats"><Button size="sm" variant="outline"><BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}</Button></Link>
                  <ShareButton game="crossword" />
                </div>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <ClueList title={t("acrossLabel")} words={acrossWords} selWi={selWi} placed={placed} onSelect={(wi) => { setSelWi(wi); setCurPos(0); sfx.click(); }} />
              <ClueList title={t("downLabel")} words={downWords} selWi={selWi} placed={placed} onSelect={(wi) => { setSelWi(wi); setCurPos(0); sfx.click(); }} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ClueList({ title, words, selWi, placed, onSelect }: {
  title: string; words: PlacedWord[]; selWi: number | null; placed: PlacedWord[]; onSelect: (wi: number) => void;
}) {
  if (words.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-0.5">
        {words.map(pw => {
          const wi = placed.indexOf(pw);
          return (
            <button
              key={`${pw.num}-${pw.dir}`}
              onClick={() => onSelect(wi)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${wi === selWi ? "bg-crossword/20 text-crossword" : "hover:bg-secondary/50 text-muted-foreground"}`}
            >
              <span className="font-bold mr-1.5">{pw.num}.</span>{pw.clue}
            </button>
          );
        })}
      </div>
    </div>
  );
}
