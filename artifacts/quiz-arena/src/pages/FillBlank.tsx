import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, BarChart3, CheckCircle2, XCircle, ChevronRight, RotateCcw } from "lucide-react";
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

interface Sentence { sentence: string; answer: string; explanation: string; }

const PTS: Record<string, number> = { easy: 50, medium: 60, hard: 80 };

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

export default function FillBlank() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef(Date.now());
  const recorded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("fillblank"));

  const load = async () => {
    setLoading(true);
    setIdx(0);
    setInput("");
    setResult(null);
    setScore(0);
    setCorrect(0);
    setDone(false);
    startedAt.current = Date.now();
    recorded.current = false;
    try {
      const res = await api.fillBlankSentences(settings.topic, settings.notes, settings.difficulty, settings.educationLevel, settings.language);
      if (!res.sentences?.length) throw new Error("No sentences");
      setSentences(res.sentences);
    } catch {
      toast.error(t("couldNotLoadQuestions"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!loading && !done && result === null) inputRef.current?.focus();
  }, [idx, loading, done, result]);

  const submit = () => {
    if (!input.trim() || result) return;
    const cur = sentences[idx];
    const isCorrect = normalize(input) === normalize(cur.answer);
    const pts = PTS[settings.difficulty] ?? 60;
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      sfx.win();
      setScore(s => s + pts);
      setCorrect(c => c + 1);
    } else {
      sfx.wrong();
    }
  };

  const next = () => {
    if (idx >= sentences.length - 1) {
      setDone(true);
      if (!recorded.current) {
        recorded.current = true;
        const finalScore = score;
        const finalCorrect = correct;
        const outcome = finalCorrect >= Math.ceil(sentences.length / 2) ? "win" : "loss";
        const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
        recordResult({ game: "fillblank", topic: settings.topic, educationLevel: settings.educationLevel, difficulty: settings.difficulty, outcome, score: finalScore, details: { correct: `${finalCorrect}/${sentences.length}`, time: `${elapsed}s` } });
        submitScore("fillblank", finalScore, outcome);
        submitResult("fillblank", finalScore, outcome);
      }
    } else {
      setIdx(i => i + 1);
      setInput("");
      setResult(null);
    }
  };

  const cur = sentences[idx];

  const renderSentence = (sentence: string) => {
    const parts = sentence.split("___");
    return (
      <span className="text-base sm:text-lg leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className={`inline-block px-2 min-w-[4rem] text-center font-bold border-b-2 ${result === "correct" ? "border-success text-success" : result === "wrong" ? "border-destructive text-destructive" : "border-fillblank text-fillblank"}`}>
                {result === "correct" ? cur?.answer : result === "wrong" ? (input || "___") : (input || "___")}
              </span>
            )}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <LeaderboardPanel />
      <TopBar title={t("fillBlankTitle")} gradient="bg-gradient-fillblank" />
      {showTutorial && (
        <GameTutorial
          icon="✍️"
          title="Fill in the Blank"
          steps={[
            "Read the sentence with a blank (___) and type the missing word.",
            "Press Enter or tap Submit when you're ready.",
            "Close answers count — AI checks the meaning not just exact spelling.",
            "5 questions per round. Score as many as you can!",
          ]}
          onDismiss={() => { markGameTutorialSeen("fillblank"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-lg py-4 sm:py-6 px-4 flex-1 flex flex-col gap-4 overflow-y-auto">

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin" /> {t("generatingQuestions")}
          </div>
        ) : done ? (
          <Card className="bg-gradient-card border-border/60 p-6 text-center space-y-4 animate-pop-in">
            <div className="text-4xl">{correct >= Math.ceil(sentences.length / 2) ? "🎉" : "📖"}</div>
            <div className="font-display font-bold text-xl">
              {correct >= Math.ceil(sentences.length / 2) ? t("wellDone") : t("keepStudying")}
            </div>
            <div className="font-display text-4xl font-bold text-fillblank">{score} pts</div>
            <div className="text-muted-foreground text-sm">{correct}/{sentences.length} correct</div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={load} className="bg-gradient-fillblank">
                <RotateCcw className="h-4 w-4 mr-1.5" /> {t("tryAgain")}
              </Button>
              <Link href="/stats">
                <Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-1" /> {t("stats")}</Button>
              </Link>
              <ShareButton game="fillblank" />
            </div>
          </Card>
        ) : cur ? (
          <>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("questionOf", { n: idx + 1, total: sentences.length })}</span>
                <span className="font-bold text-fillblank">{score} pts</span>
              </div>
              <Progress value={(idx / sentences.length) * 100} className="h-1.5" />
            </div>

            {/* Question card */}
            <Card className="bg-gradient-card border-border/60 p-5 space-y-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("completeSentence")}</div>
              <div className="py-2">{renderSentence(cur.sentence)}</div>

              {!result ? (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    placeholder="Type your answer…"
                    className="flex-1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button onClick={submit} disabled={!input.trim()} className="bg-gradient-fillblank shrink-0">
                    {t("submit")}
                  </Button>
                </div>
              ) : (
                <div className={`rounded-lg p-3 text-sm space-y-1.5 ${result === "correct" ? "bg-success/15 border border-success/40" : "bg-destructive/15 border border-destructive/40"}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {result === "correct"
                      ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    }
                    {result === "correct" ? t("correct") : t("answerWas", { ans: cur.answer })}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{cur.explanation}</p>
                </div>
              )}
            </Card>

            {result && (
              <Button onClick={next} className="bg-gradient-fillblank w-full">
                {idx >= sentences.length - 1 ? t("seeResults") : <>{t("nextQuestion")} <ChevronRight className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
