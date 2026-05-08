import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, RotateCcw, CheckCircle2, RefreshCcw, Trophy } from "lucide-react";
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

interface FlashCard {
  front: string;
  back: string;
  tip: string | null;
}

export default function Flashcard() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [pass, setPass] = useState(0);
  const [totalSeen, setTotalSeen] = useState(0);
  const recorded = useRef(false);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("flashcard"));

  const load = async () => {
    setLoading(true);
    setFlipped(false);
    setMastered(new Set());
    setDone(false);
    setScore(0);
    setPass(0);
    setTotalSeen(0);
    recorded.current = false;
    try {
      const res = await api.flashcardGenerate(
        settings.topic || "General Knowledge",
        settings.notes,
        settings.difficulty,
        settings.educationLevel,
        settings.language,
      );
      if (!res.cards?.length) throw new Error("No cards");
      setCards(res.cards);
      setQueue(res.cards.map((_, i) => i));
      setCurrentIdx(0);
    } catch {
      toast.error(t("couldNotGenerateCards"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const current = queue[currentIdx] !== undefined ? cards[queue[currentIdx]] : null;
  const totalCards = cards.length;
  const masteredCount = mastered.size;
  const progressPct = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0;

  const handleFlip = () => {
    sfx.click();
    setFlipped((f) => !f);
  };

  const handleGotIt = () => {
    if (!current) return;
    sfx.win();
    const cardId = queue[currentIdx];
    const newMastered = new Set(mastered);
    newMastered.add(cardId);
    setMastered(newMastered);
    setPass((p) => p + 1);
    setTotalSeen((t) => t + 1);
    advance(newMastered, queue);
  };

  const handleReview = () => {
    if (!current) return;
    sfx.click();
    setTotalSeen((t) => t + 1);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) {
      const reviewQueue = queue.filter((id) => !mastered.has(id));
      if (reviewQueue.length === 0) {
        finish(mastered);
      } else {
        setQueue(reviewQueue);
        setCurrentIdx(0);
        setFlipped(false);
      }
    } else {
      setCurrentIdx(nextIdx);
      setFlipped(false);
    }
  };

  function advance(newMastered: Set<number>, currentQueue: number[]) {
    if (newMastered.size >= totalCards) {
      finish(newMastered);
      return;
    }
    const nextIdx = currentIdx + 1;
    const remaining = currentQueue.filter((id) => !newMastered.has(id));
    if (remaining.length === 0) {
      finish(newMastered);
    } else if (nextIdx >= currentQueue.length) {
      setQueue(remaining);
      setCurrentIdx(0);
      setFlipped(false);
    } else {
      setCurrentIdx(nextIdx);
      setFlipped(false);
    }
  }

  function finish(masteredSet: Set<number>) {
    const finalScore = Math.round((masteredSet.size / totalCards) * 100);
    setScore(finalScore);
    setDone(true);
    const outcome: "win" | "loss" = finalScore >= 60 ? "win" : "loss";
    if (!recorded.current) {
      recorded.current = true;
      recordResult({
        game: "flashcard",
        topic: settings.topic,
        educationLevel: settings.educationLevel,
        difficulty: settings.difficulty,
        outcome,
        score: finalScore,
        details: { mastered: masteredSet.size, total: totalCards },
      });
      submitScore(finalScore, outcome);
      submitResult("flashcard", finalScore, outcome);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar title={t("flashcardTitle")} gradient="bg-gradient-flashcard" />
      {showTutorial && (
        <GameTutorial
          icon="🃏"
          title="Flashcard Flip"
          steps={[
            "Tap the card to flip it and reveal the answer.",
            "Tap 'Got It' when you know it — it leaves the deck.",
            "Cards you mark 'Review Again' cycle back for another try.",
            "Session ends when all cards are mastered!",
          ]}
          onDismiss={() => { markGameTutorialSeen("flashcard"); setShowTutorial(false); }}
        />
      )}
      <div className="container max-w-xl py-4 sm:py-6 px-4 flex-1 flex flex-col gap-4">

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-flashcard" />
            <p className="text-muted-foreground text-sm">{t("generatingCards")}</p>
          </div>
        ) : done ? (
          <div className="flex-1 flex flex-col gap-4">
            <Card className="p-6 bg-gradient-card border-border/60 text-center space-y-3">
              <Trophy className="h-10 w-10 text-warning mx-auto" />
              <h2 className="font-display text-2xl font-bold">{t("sessionComplete")}</h2>
              <div className="text-4xl font-display font-bold text-flashcard">
                {mastered.size}<span className="text-lg font-normal text-muted-foreground">/{totalCards} {t("mastered", { n: "", total: "" }).replace("/ ", "")}</span>
              </div>
              <div className="text-sm text-muted-foreground">{t("masteryRate", { n: score })}</div>
            </Card>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={load}>
                <RotateCcw className="h-4 w-4 mr-2" /> {t("newSession")}
              </Button>
              <ShareButton score={score} game="Flashcard Flip" topic={settings.topic} />
            </div>
            <LeaderboardPanel game="flashcard" />
          </div>
        ) : current ? (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("mastered", { n: masteredCount, total: totalCards })}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("remaining", { n: queue.filter((id) => !mastered.has(id)).length })}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />

            <div
              className="flex-1 min-h-[180px] cursor-pointer select-none"
              onClick={handleFlip}
              style={{ perspective: "1000px" }}
            >
              <div
                className="relative w-full h-full transition-all duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  minHeight: "180px",
                }}
              >
                <Card
                  className="absolute inset-0 p-8 bg-gradient-card border-border/60 flex flex-col items-center justify-center text-center gap-3"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{t("frontLabel")}</div>
                  <p className="font-display text-xl font-bold leading-snug">{current.front}</p>
                  <div className="w-8 h-0.5 bg-flashcard/40 rounded-full mt-2" />
                </Card>

                <Card
                  className="absolute inset-0 p-8 bg-gradient-card border-flashcard/40 border-2 flex flex-col items-center justify-center text-center gap-3"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="text-xs text-flashcard uppercase tracking-widest font-semibold">{t("answerLabel")}</div>
                  <p className="text-base leading-relaxed">{current.back}</p>
                  {current.tip && (
                    <p className="text-xs text-muted-foreground italic mt-2 border-t border-border/40 pt-2 w-full">
                      💡 {current.tip}
                    </p>
                  )}
                </Card>
              </div>
            </div>

            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-boss/60 text-boss hover:bg-boss/10 py-6"
                  onClick={handleReview}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  {t("reviewAgain")}
                </Button>
                <Button
                  className="bg-gradient-to-r from-wordle-correct to-success text-white py-6"
                  onClick={handleGotIt}
                  style={{ background: "linear-gradient(135deg, hsl(142 65% 45%), hsl(142 75% 50%))" }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("gotItBtn")}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full py-6 text-flashcard border-flashcard/40"
                onClick={handleFlip}
              >
                {t("revealAnswer")}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
