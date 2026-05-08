import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw, Lightbulb, BarChart3 } from "lucide-react";
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

const ROWS = 6;
const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

type Status = "correct" | "present" | "absent" | "";

function gradeGuess(guess: string, answer: string): Status[] {
  const cols = answer.length;
  const result: Status[] = Array(cols).fill("absent");
  const ansArr = answer.split("");
  const used = Array(cols).fill(false);
  for (let i = 0; i < cols; i++) {
    if (guess[i] === ansArr[i]) { result[i] = "correct"; used[i] = true; }
  }
  for (let i = 0; i < cols; i++) {
    if (result[i] === "correct") continue;
    const idx = ansArr.findIndex((c, j) => !used[j] && c === guess[i]);
    if (idx !== -1) { result[i] = "present"; used[idx] = true; }
  }
  return result;
}

export default function Wordle() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();
  const [word, setWord] = useState<string>("");
  const [hint, setHint] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<"won" | "lost" | null>(null);
  const [loading, setLoading] = useState(true);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [shake, setShake] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const recorded = useRef(false);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("wordle"));

  const RECENT_KEY = "wordle-recent";
  const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
  const pushRecent = (w: string) => {
    const list = [w, ...readRecent().filter((x) => x !== w)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  };

  const load = async () => {
    setLoading(true); setGuesses([]); setCurrent(""); setDone(null);
    setHintOpen(false); setHintUsed(false);
    startedAt.current = Date.now(); recorded.current = false;
    try {
      const recent = readRecent();
      let r = await api.wordleWord(settings.topic, settings.notes, recent, settings.language);
      let w = r.word.toLowerCase().replace(/[^a-z]/g, "");
      if ((w.length < 3 || recent.includes(w)) && recent.length < 20) {
        const r2 = await api.wordleWord(settings.topic, settings.notes, [...recent, w], settings.language);
        const w2 = r2.word.toLowerCase().replace(/[^a-z]/g, "");
        if (w2.length >= 3 && !recent.includes(w2)) { r = r2; w = w2; }
      }
      if (w.length < 3) {
        const fallbacks = ["learn", "study", "brain", "logic", "topic", "smart", "facts", "quiet", "force", "light"];
        const pool = fallbacks.filter((f) => !recent.includes(f));
        w = (pool.length ? pool : fallbacks)[Math.floor(Math.random() * (pool.length || fallbacks.length))];
      }
      setWord(w); setHint(r.hint || "Related to your study topic."); pushRecent(w);
    } catch { setWord("study"); setHint("Default fallback word."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const wordLen = word.length || 5;

  const submit = useCallback(() => {
    if (done || !word) return;
    if (current.length !== wordLen) {
      setShake(true); sfx.wrong(); setTimeout(() => setShake(false), 400); return;
    }
    sfx.flip();
    const next = [...guesses, current];
    setGuesses(next); setCurrent("");
    if (current === word) { setDone("won"); sfx.win(); toast.success(t("brilliant")); }
    else if (next.length >= ROWS) { setDone("lost"); sfx.lose(); toast.error(t("theWordWas", { word: word.toUpperCase() })); }
  }, [current, guesses, word, done, wordLen, t]);

  const press = useCallback((k: string) => {
    if (done || loading) return;
    if (k === "ENTER") return submit();
    if (k === "BACK") { sfx.click(); return setCurrent((c) => c.slice(0, -1)); }
    if (/^[a-z]$/.test(k) && current.length < wordLen) { sfx.type(); setCurrent((c) => c + k); }
  }, [current, done, loading, submit, wordLen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const tries = guesses.length;
  const greens = guesses.reduce((acc, g) => acc + gradeGuess(g, word).filter((s) => s === "correct").length, 0);
  const yellows = guesses.reduce((acc, g) => acc + gradeGuess(g, word).filter((s) => s === "present").length, 0);
  const totalLetters = tries * wordLen;
  const letterAccuracy = totalLetters ? Math.round(((greens + yellows) / totalLetters) * 100) : 0;
  const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));

  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    const score = done === "won" ? Math.max(0, (ROWS - tries + 1) * 100) - (hintUsed ? 50 : 0) : 0;
    recordResult({ game: "wordle", topic: settings.topic, educationLevel: settings.educationLevel, difficulty: settings.difficulty, outcome: done === "won" ? "win" : "loss", score: Math.max(0, score), details: { word: word.toUpperCase(), tries, max: ROWS, greens, yellows, letterAccuracy: `${letterAccuracy}%`, hintUsed: hintUsed ? "yes" : "no", time: `${durationSec}s` } });
    submitScore("wordle", Math.max(0, score), done === "won" ? "win" : "loss");
    submitResult("wordle", Math.max(0, score), done === "won" ? "win" : "loss");
  }, [done]);

  const keyStatus: Record<string, Status> = {};
  guesses.forEach((g) => {
    const grade = gradeGuess(g, word);
    g.split("").forEach((ch, i) => {
      const prev = keyStatus[ch]; const cur = grade[i];
      const rank = { correct: 3, present: 2, absent: 1, "": 0 } as const;
      if (!prev || rank[cur] > rank[prev]) keyStatus[ch] = cur;
    });
  });

  const statusBg = (s: Status) =>
    s === "correct" ? "bg-wordle-correct text-primary-foreground border-wordle-correct"
    : s === "present" ? "bg-wordle-present text-primary-foreground border-wordle-present"
    : s === "absent" ? "bg-wordle-absent text-muted-foreground border-wordle-absent"
    : "bg-secondary border-border";

  const tileClass = wordLen <= 5 ? "w-12 h-12 sm:w-14 sm:h-14 text-2xl"
    : wordLen <= 7 ? "w-10 h-10 sm:w-12 sm:h-12 text-xl"
    : "w-8 h-8 sm:w-10 sm:h-10 text-lg";

  return (
    <div className="min-h-screen flex flex-col">
      <LeaderboardPanel />
      <TopBar title={t("wordGuessTitle")} gradient="bg-gradient-wordle" />
      {showTutorial && (
        <GameTutorial
          icon="🟩"
          title="Word Guess"
          steps={[
            "Guess the hidden study term in 6 tries.",
            "Type your guess and press Enter.",
            "🟩 Green = correct letter in the right spot.",
            "🟨 Yellow = right letter, wrong spot. ⬛ Grey = not in word.",
          ]}
          onDismiss={() => { markGameTutorialSeen("wordle"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-md py-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => { sfx.click(); setHintOpen((o) => !o); setHintUsed(true); }} disabled={loading}>
            <Lightbulb className="h-4 w-4 mr-1" /> {t("hint")}
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-1" /> {t("new_")}
          </Button>
        </div>

        {hintOpen && (
          <Card className="bg-gradient-card border-border/60 p-3 mb-4 text-sm text-muted-foreground animate-pop-in">{hint}</Card>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            <div className={`grid gap-1.5 mx-auto mb-6 ${shake ? "animate-shake" : ""}`}>
              {Array.from({ length: ROWS }).map((_, r) => {
                const guess = guesses[r];
                const isCurrent = r === guesses.length && !done;
                const text = isCurrent ? current : (guess ?? "");
                const grade = guess ? gradeGuess(guess, word) : null;
                return (
                  <div key={r} className="flex gap-1.5 justify-center">
                    {Array.from({ length: wordLen }).map((__, c) => {
                      const ch = text[c] ?? "";
                      const status = grade?.[c] ?? "";
                      return (
                        <div key={c} className={`${tileClass} border-2 rounded-md flex items-center justify-center font-display font-bold uppercase transition-all ${statusBg(status)} ${guess ? "animate-flip" : ""} ${ch && isCurrent ? "border-primary scale-105" : ""}`} style={guess ? { animationDelay: `${c * 80}ms` } : {}}>
                          {ch}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {done && (
              <Card className="bg-gradient-card border-border/60 p-4 mb-4 text-center animate-pop-in space-y-3">
                <div className="text-3xl">{done === "won" ? "🎉" : "💀"}</div>
                <div className="font-display font-bold">
                  {done === "won" ? t("brilliant") : t("theWordWas", { word: word.toUpperCase() })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                  <MiniStat label={t("guesses")} value={`${tries}/${ROWS}`} />
                  <MiniStat label={t("greens")} value={`🟩 ${greens}`} />
                  <MiniStat label={t("yellows")} value={`🟨 ${yellows}`} />
                  <MiniStat label={t("accuracy")} value={`${letterAccuracy}%`} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("solvedIn", { n: durationSec })} · {hintUsed ? t("hintUsedYes") : t("hintUsedNo")}
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={load} className="bg-gradient-wordle">{t("newWord")}</Button>
                  <Link href="/stats"><Button size="sm" variant="outline"><BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}</Button></Link>
                  <ShareButton game="wordle" />
                </div>
              </Card>
            )}

            <div className="mt-auto space-y-1.5">
              {KEYS.map((row, ri) => (
                <div key={ri} className="flex gap-1 justify-center">
                  {ri === 2 && <button onClick={() => press("ENTER")} className="px-2 h-12 rounded-md bg-secondary text-xs font-bold arcade-press">ENTER</button>}
                  {row.split("").map((k) => (
                    <button key={k} onClick={() => press(k)} className={`w-7 sm:w-9 h-12 rounded-md font-bold uppercase text-sm border arcade-press ${statusBg(keyStatus[k] ?? "")}`}>{k}</button>
                  ))}
                  {ri === 2 && <button onClick={() => press("BACK")} className="px-2 h-12 rounded-md bg-secondary text-xs font-bold arcade-press">⌫</button>}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
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
