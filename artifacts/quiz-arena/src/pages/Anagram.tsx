import { useEffect, useRef, useState } from "react";
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

const TOTAL_ROUNDS = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Tile { id: string; letter: string; used: boolean; }

export default function Anagram() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [hint, setHint] = useState("");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [placed, setPlaced] = useState<(string | null)[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [roundDone, setRoundDone] = useState<"win" | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const startedAt = useRef(Date.now());
  const recorded = useRef(false);
  const recentWords = useRef<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("anagram"));

  const loadWord = async (retriesLeft = 2) => {
    setLoading(true);
    setRoundDone(null);
    setHintUsed(false);
    startedAt.current = Date.now();
    try {
      const res = await api.anagramWord(settings.topic, settings.notes, settings.difficulty, settings.educationLevel, settings.language, recentWords.current);
      const w = res.word.toUpperCase().replace(/[^A-Z]/g, "");
      if (w.length < 3) {
        if (retriesLeft > 0) { setLoading(false); await loadWord(retriesLeft - 1); return; }
        throw new Error("Word too short");
      }
      recentWords.current = [...recentWords.current, w].slice(-10);
      setWord(w);
      setDefinition(res.definition || "");
      setHint(res.hint || "");
      const shuffled = shuffle(w.split(""));
      setTiles(shuffled.map((letter, i) => ({ id: `${i}-${letter}-${Date.now()}`, letter, used: false })));
      setPlaced(Array(w.length).fill(null));
    } catch {
      toast.error(t("couldNotLoadWord"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWord(); /* eslint-disable-next-line */ }, []);

  const getTileLetter = (id: string | null) => {
    if (!id) return "";
    return tiles.find(t => t.id === id)?.letter ?? "";
  };

  const checkAnswer = (currentPlaced: (string | null)[]) => {
    const answer = currentPlaced.map(id => getTileLetter(id)).join("");
    if (answer === word) {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      const roundScore = Math.max(20, 200 - Math.floor(elapsed / 5) * 10 - (hintUsed ? 50 : 0));
      setScore(s => s + roundScore);
      setRoundDone("win");
      sfx.win();
      toast.success(t("correctPtsAnagram", { n: roundScore }));
    } else {
      sfx.wrong();
      toast.error(t("notQuite"));
      setTimeout(() => {
        setTiles(t => t.map(tile => ({ ...tile, used: false })));
        setPlaced(Array(word.length).fill(null));
      }, 600);
    }
  };

  const placeTile = (tileId: string) => {
    if (roundDone) return;
    const firstEmpty = placed.findIndex(p => p === null);
    if (firstEmpty === -1) return;
    setTiles(t => t.map(tile => tile.id === tileId ? { ...tile, used: true } : tile));
    const next = [...placed];
    next[firstEmpty] = tileId;
    setPlaced(next);
    sfx.click();
    if (next.filter(p => p !== null).length === word.length) {
      setTimeout(() => checkAnswer(next), 120);
    }
  };

  const removeTile = (slotIdx: number) => {
    if (roundDone) return;
    const tileId = placed[slotIdx];
    if (!tileId) return;
    setTiles(t => t.map(tile => tile.id === tileId ? { ...tile, used: false } : tile));
    const next = [...placed];
    next[slotIdx] = null;
    setPlaced(next);
    sfx.click();
  };

  const resetPlaced = () => {
    setTiles(t => t.map(tile => ({ ...tile, used: false })));
    setPlaced(Array(word.length).fill(null));
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setAllDone(true);
      if (!recorded.current) {
        recorded.current = true;
        const finalScore = score;
        const outcome = finalScore > 0 ? "win" : "loss";
        recordResult({ game: "anagram", topic: settings.topic, educationLevel: settings.educationLevel, difficulty: settings.difficulty, outcome, score: finalScore, details: { rounds: String(TOTAL_ROUNDS), finalScore: String(finalScore) } });
        submitScore("anagram", finalScore, outcome);
        submitResult("anagram", finalScore, outcome);
      }
    } else {
      setRound(r => r + 1);
      loadWord();
    }
  };

  const playAgain = () => {
    setRound(1);
    setScore(0);
    setAllDone(false);
    recorded.current = false;
    recentWords.current = [];
    loadWord();
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <LeaderboardPanel />
      <TopBar title={t("anagramTitle")} gradient="bg-gradient-anagram" />
      {showTutorial && (
        <GameTutorial
          icon="🔀"
          title="Anagram Scramble"
          steps={[
            "Click the scrambled letter tiles to build the hidden study term.",
            "Click a placed tile to put it back in the pool.",
            "Use Hint (−50 pts) if you're stuck!",
            "Complete 3 rounds for your final score.",
          ]}
          onDismiss={() => { markGameTutorialSeen("anagram"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-md py-6 flex-1 flex flex-col gap-4">

        {/* Header row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("roundLabel", { n: round, total: TOTAL_ROUNDS })}</span>
          <span className="font-display font-bold text-anagram">{score} pts</span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : allDone ? (
          <Card className="bg-gradient-card border-border/60 p-6 text-center space-y-4 animate-pop-in">
            <div className="text-4xl">🏆</div>
            <div className="font-display font-bold text-xl">Complete!</div>
            <div className="font-display text-4xl font-bold text-anagram">{score} pts</div>
            <div className="text-sm text-muted-foreground">{TOTAL_ROUNDS} words unscrambled</div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={playAgain} className="bg-gradient-anagram">{t("playAgain")}</Button>
              <Link href="/stats">
                <Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}</Button>
              </Link>
              <ShareButton game="anagram" />
            </div>
          </Card>
        ) : (
          <>
            {/* Definition card */}
            <Card className="bg-gradient-card border-border/60 p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{t("unscrambleThis")}</div>
              <p className="text-sm leading-relaxed">{definition}</p>
            </Card>

            {/* Hint */}
            {hintUsed ? (
              <Card className="bg-gradient-card border-amber-500/30 border p-3 text-sm text-muted-foreground">
                💡 {hint}
              </Card>
            ) : (
              <Button variant="outline" size="sm" className="self-start" onClick={() => { setHintUsed(true); sfx.click(); }}>
                <Lightbulb className="h-4 w-4 mr-1.5" /> {t("hintCost")}
              </Button>
            )}

            {/* Answer slots */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">{t("yourAnswer")}</div>
              <div className="flex flex-wrap gap-2 justify-center min-h-12">
                {placed.map((id, i) => (
                  <button
                    key={i}
                    onClick={() => removeTile(i)}
                    className={`w-10 h-10 rounded-md border-2 font-display font-bold text-lg uppercase flex items-center justify-center transition-all ${id ? "bg-card border-anagram text-foreground arcade-press" : "border-dashed border-border/40 bg-secondary/20 cursor-default"}`}
                  >
                    {getTileLetter(id)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrambled pool */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">{t("scrambledLetters")}</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {tiles.map(tile => (
                  <button
                    key={tile.id}
                    disabled={tile.used || !!roundDone}
                    onClick={() => placeTile(tile.id)}
                    className={`w-10 h-10 rounded-md border-2 border-transparent font-display font-bold text-lg uppercase flex items-center justify-center transition-all ${tile.used ? "opacity-0 pointer-events-none" : "bg-gradient-anagram text-white shadow-arcade arcade-press hover:scale-105 active:scale-95"}`}
                  >
                    {tile.letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Win card */}
            {roundDone === "win" && (
              <Card className="bg-gradient-card border-border/60 p-4 text-center animate-pop-in space-y-3">
                <div className="text-2xl">✅</div>
                <div className="font-display font-bold text-lg">{word}</div>
                <Button onClick={nextRound} className="bg-gradient-anagram w-full">
                  {round < TOTAL_ROUNDS ? t("nextWord") : t("seeResults")}
                </Button>
              </Card>
            )}

            {/* Reset */}
            {!roundDone && (
              <Button variant="ghost" size="sm" className="self-start mt-auto" onClick={resetPlaced}>
                <RotateCcw className="h-4 w-4 mr-1" /> {t("resetTiles")}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
