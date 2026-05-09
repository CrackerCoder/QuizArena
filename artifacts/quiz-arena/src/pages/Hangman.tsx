import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw, Lightbulb, BarChart3 } from "lucide-react";
import { sfx } from "@/lib/sound";
import { recordResult } from "@/lib/stats";
import { ShareButton } from "@/components/ShareButton";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { useRoom } from "@/lib/room";
import { useAssignment } from "@/lib/assignment";
import { useT } from "@/lib/i18n";
import { GameTutorial } from "@/components/GameTutorial";
import { hasSeenGameTutorial, markGameTutorialSeen } from "@/lib/tutorial";

const MAX_WRONG = 6;
const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

export default function Hangman() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();
  const [word, setWord] = useState("");
  const [hint, setHint] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const recorded = useRef(false);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("hangman"));
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const wordLetters = word.split("").filter((c) => /[a-z]/.test(c));
  const wrongs = [...guessed].filter((g) => !word.includes(g));
  const rights = [...guessed].filter((g) => word.includes(g));
  const wrongCount = wrongs.length;
  const rightCount = rights.length;
  const lost = wrongCount >= MAX_WRONG;
  const won = word.length > 0 && wordLetters.every((c) => guessed.has(c));
  const uniqueLetters = new Set(wordLetters).size;
  const guessAccuracy = guessed.size ? Math.round((rightCount / guessed.size) * 100) : 0;
  const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));

  const RECENT_KEY = "hangman-recent";
  const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
  const pushRecent = (w: string) => {
    const list = [w, ...readRecent().filter((x) => x !== w)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  };

  const load = async () => {
    setLoading(true); setGuessed(new Set()); setHintOpen(false); setHintUsed(false);
    startedAt.current = Date.now(); recorded.current = false;
    try {
      const recent = readRecent();
      let r = await api.hangmanWord(settings.topic, settings.notes, recent, settings.language);
      let w = r.word.toLowerCase().replace(/[^a-z]/g, "");
      if (w && recent.includes(w)) {
        const r2 = await api.hangmanWord(settings.topic, settings.notes, [...recent, w], settings.language);
        const w2 = r2.word.toLowerCase().replace(/[^a-z]/g, "");
        if (w2 && !recent.includes(w2)) { r = r2; w = w2; }
      }
      const finalWord = w || "learning";
      setWord(finalWord); setHint(r.hint || "Related to your study topic."); pushRecent(finalWord);
    } catch { setWord("learning"); setHint("Default fallback word."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const press = useCallback((k: string) => {
    if (lost || won || loading) return;
    setGuessed((g) => {
      if (g.has(k)) return g;
      const n = new Set(g); n.add(k);
      if (word.includes(k)) sfx.correct(); else sfx.wrong();
      return n;
    });
  }, [lost, won, loading, word]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => {
    if (!(won || lost) || recorded.current) return;
    recorded.current = true;
    if (won) sfx.win(); else sfx.lose();
    const score = won ? Math.max(0, (MAX_WRONG - wrongCount) * 100 + word.length * 10) : 0;
    recordResult({ game: "hangman", topic: settings.topic, educationLevel: settings.educationLevel, difficulty: settings.difficulty, outcome: won ? "win" : "loss", score, details: { word: word.toUpperCase(), mistakes: wrongCount, max: MAX_WRONG, correctLetters: rightCount, uniqueLetters, accuracy: `${guessAccuracy}%`, hintUsed: hintUsed ? "yes" : "no", time: `${durationSec}s` } });
    submitScore("hangman", score, won ? "win" : "loss");
    submitResult("hangman", score, won ? "win" : "loss");
  }, [won, lost]);

  return (
    <div className="min-h-screen flex flex-col">
      <LeaderboardPanel />
      <TopBar title={t("hangmanTitle")} gradient="bg-gradient-hangman" />
      {showTutorial && (
        <GameTutorial
          icon="🪢"
          title="HangGuy"
          steps={[
            "Guess the hidden study term one letter at a time.",
            "Tap any letter button to make a guess.",
            "You get 6 wrong guesses before the hangman is complete.",
            "Use the Hint button if you're stuck!",
          ]}
          onDismiss={() => { markGameTutorialSeen("hangman"); setShowTutorial(false); }}
        />
      )}
      <input
        ref={nativeInputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className="sr-only"
        onKeyDown={(e) => {
          if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); press(e.key.toLowerCase()); }
        }}
      />
      <main className="container max-w-md py-6 flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => { sfx.click(); setHintOpen((o) => !o); setHintUsed(true); }} disabled={loading}>
            <Lightbulb className="h-4 w-4 mr-1" /> {t("hint")}
          </Button>
          <div className="text-sm text-muted-foreground">{t("mistakesLabel", { n: wrongCount, max: MAX_WRONG })}</div>
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
            <Card className="bg-gradient-card border-border/60 p-4 flex justify-center mb-4">
              <Gallows wrong={wrongCount} />
            </Card>

            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {word.split("").map((c, i) => (
                <div key={i} className={`min-w-[2.25rem] w-9 h-12 border-b-4 ${guessed.has(c) || lost ? "border-hangman" : "border-border"} flex items-end justify-center pb-1 font-display text-2xl font-bold uppercase`}>
                  {guessed.has(c) || lost ? c : ""}
                </div>
              ))}
            </div>

            {(won || lost) && (
              <Card className="bg-gradient-card border-border/60 p-4 mb-4 text-center animate-pop-in space-y-3">
                <div className="text-3xl">{won ? "🎉" : "💀"}</div>
                <div className="font-display font-bold">
                  {won ? t("youSavedThem") : t("theWordWas", { word: word.toUpperCase() })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
                  <MiniStat label={t("mistakesLabel", { n: wrongCount, max: MAX_WRONG })} value="" />
                  <MiniStat label={t("correctLetters")} value={`${rightCount}/${uniqueLetters}`} />
                  <MiniStat label={t("accuracy")} value={`${guessAccuracy}%`} />
                  <MiniStat label={t("time")} value={`${durationSec}s`} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {hintUsed ? t("hintUsedYes") : t("hintUsedNo")} · {guessed.size} {t("totalGuesses")}
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={load} className="bg-gradient-hangman">{t("newWord")}</Button>
                  <Link href="/stats"><Button size="sm" variant="outline"><BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}</Button></Link>
                  <ShareButton game="hangman" />
                </div>
              </Card>
            )}

            <input
              type="text"
              defaultValue=""
              className="mt-auto block sm:hidden w-full h-12 mb-2 rounded-xl border border-hangman/40 bg-secondary/60 text-center text-sm text-muted-foreground cursor-text"
              placeholder="⌨️ Tap here — type any letter to guess"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={won || lost || loading}
              style={{ fontSize: "16px" }}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z]/g, "").toLowerCase();
                if (val.length > 0) press(val[val.length - 1]);
                e.target.value = "";
              }}
            />

            <div className="grid grid-cols-7 gap-1.5">
              {ALPHA.map((k) => {
                const used = guessed.has(k);
                const wrong = used && !word.includes(k);
                const right = used && word.includes(k);
                return (
                  <button key={k} onClick={() => press(k)} disabled={used || won || lost}
                    className={`h-10 rounded-md font-bold uppercase text-sm arcade-press border ${right ? "bg-success/30 border-success text-success" : wrong ? "bg-destructive/20 border-destructive/50 text-destructive opacity-60" : "bg-secondary border-border hover:border-hangman"}`}>
                    {k}
                  </button>
                );
              })}
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
      {value !== "" && <div className="font-display text-lg font-bold">{value}</div>}
    </div>
  );
}

function Gallows({ wrong }: { wrong: number }) {
  const stroke = "hsl(var(--hangman))";
  return (
    <svg viewBox="0 0 200 220" className="w-44 h-52">
      <line x1="20" y1="200" x2="180" y2="200" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="200" x2="60" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="20" x2="140" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="140" y1="20" x2="140" y2="40" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      {wrong >= 1 && <circle cx="140" cy="55" r="14" stroke={stroke} strokeWidth="3" fill="none" />}
      {wrong >= 2 && <line x1="140" y1="69" x2="140" y2="120" stroke={stroke} strokeWidth="3" />}
      {wrong >= 3 && <line x1="140" y1="85" x2="120" y2="105" stroke={stroke} strokeWidth="3" />}
      {wrong >= 4 && <line x1="140" y1="85" x2="160" y2="105" stroke={stroke} strokeWidth="3" />}
      {wrong >= 5 && <line x1="140" y1="120" x2="122" y2="150" stroke={stroke} strokeWidth="3" />}
      {wrong >= 6 && <line x1="140" y1="120" x2="158" y2="150" stroke={stroke} strokeWidth="3" />}
    </svg>
  );
}
