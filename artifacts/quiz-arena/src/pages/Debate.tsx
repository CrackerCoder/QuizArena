import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, RotateCcw, Trophy, Mic } from "lucide-react";
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

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Scores {
  clarity: number;
  evidence: number;
  logic: number;
}

export default function Debate() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState("");
  const [userPosition, setUserPosition] = useState("FOR");
  const [aiPosition, setAiPosition] = useState("AGAINST");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [scores, setScores] = useState<Scores | null>(null);
  const [feedback, setFeedback] = useState("");
  const recorded = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("debate"));

  const init = async () => {
    setLoading(true);
    setMessages([]);
    setInput("");
    setRound(0);
    setDone(false);
    setScores(null);
    setFeedback("");
    recorded.current = false;
    try {
      const res = await api.debateInit(
        settings.topic || "Malaysian education policy",
        settings.notes,
        settings.educationLevel,
        settings.language,
      );
      setStatement(res.statement);
      setUserPosition(res.userPosition ?? "FOR");
      setAiPosition(res.aiPosition ?? "AGAINST");
      setMessages([{ role: "ai", content: res.aiOpening }]);
      setRound(1);
    } catch {
      toast.error(t("couldNotStartDebate"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { init(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendArgument = async () => {
    if (!input.trim() || busy || done) return;
    const userArg = input.trim();
    setInput("");
    setBusy(true);
    const isFinal = round >= TOTAL_ROUNDS;

    const newMessages: Message[] = [...messages, { role: "user", content: userArg }];
    setMessages(newMessages);

    try {
      const history = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.debateRespond(
        settings.topic || "Malaysian education policy",
        aiPosition,
        history.slice(0, -1),
        userArg,
        isFinal,
        settings.educationLevel,
        settings.language,
      );

      setMessages((prev) => [...prev, { role: "ai", content: res.aiResponse }]);

      if (isFinal && res.scores) {
        setScores(res.scores);
        setFeedback(res.feedback ?? "");
        setDone(true);

        const total = res.scores.clarity + res.scores.evidence + res.scores.logic;
        const finalScore = Math.round((total / 30) * 100);
        const outcome: "win" | "loss" = finalScore >= 50 ? "win" : "loss";

        if (!recorded.current) {
          recorded.current = true;
          recordResult({
            game: "debate",
            topic: settings.topic,
            educationLevel: settings.educationLevel,
            difficulty: settings.difficulty,
            outcome,
            score: finalScore,
            details: { clarity: res.scores.clarity, evidence: res.scores.evidence, logic: res.scores.logic },
          });
          submitScore(finalScore, outcome);
          submitResult("debate", finalScore, outcome);
        }
        sfx.win();
      } else {
        setRound((r) => r + 1);
        sfx.click();
      }
    } catch {
      toast.error(t("aiCouldNotRespond"));
      setMessages((prev) => prev.slice(0, -1));
      setInput(userArg);
    } finally {
      setBusy(false);
    }
  };

  const totalScore = scores ? Math.round(((scores.clarity + scores.evidence + scores.logic) / 30) * 100) : 0;

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar title={t("debateTitle")} gradient="bg-gradient-debate" />
      {showTutorial && (
        <GameTutorial
          icon="🎤"
          title="Debate Arena"
          steps={[
            "Read the statement — you argue FOR it, AI argues AGAINST.",
            "Write your argument in the text box and press Send.",
            "You get 3 rounds. Use specific, evidence-based arguments!",
            "AI scores you on Clarity, Evidence, and Logic (out of 10 each).",
          ]}
          onDismiss={() => { markGameTutorialSeen("debate"); setShowTutorial(false); }}
        />
      )}
      <div className="container max-w-2xl py-4 sm:py-6 px-4 flex-1 flex flex-col gap-4 min-h-0">

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-debate" />
            <p className="text-muted-foreground text-sm">{t("aiPickingTopic")}</p>
          </div>
        ) : done && scores ? (
          <div className="flex-1 flex flex-col gap-4">
            <Card className="p-6 bg-gradient-card border-border/60 text-center space-y-3">
              <Trophy className="h-10 w-10 text-warning mx-auto" />
              <h2 className="font-display text-2xl font-bold">{t("debateComplete")}</h2>
              <p className="text-muted-foreground text-sm">You argued: <span className="text-debate font-semibold">{userPosition}</span> — "{statement}"</p>
              <div className="text-4xl font-display font-bold text-debate">{totalScore}<span className="text-lg font-normal text-muted-foreground">/100</span></div>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("clarityLabel"), key: "clarity" as const, color: "text-flashcard" },
                { label: t("evidenceLabel"), key: "evidence" as const, color: "text-wordle-correct" },
                { label: t("logicLabel"), key: "logic" as const, color: "text-warning" },
              ].map(({ label, key, color }) => (
                <Card key={key} className="p-4 bg-gradient-card border-border/60 text-center">
                  <div className={`text-2xl font-bold font-display ${color}`}>{scores[key]}<span className="text-sm text-muted-foreground">/10</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </Card>
              ))}
            </div>

            {feedback && (
              <Card className="p-4 bg-gradient-card border-border/60">
                <p className="text-sm text-muted-foreground leading-relaxed">{feedback}</p>
              </Card>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={init} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" /> {t("newDebate")}
              </Button>
              <ShareButton score={totalScore} game="Debate Arena" topic={settings.topic} />
            </div>
            <LeaderboardPanel game="debate" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            <Card className="p-3 bg-gradient-card border-border/60">
              <div className="text-xs text-muted-foreground mb-1">{t("debateStatement")}</div>
              <p className="font-semibold text-sm leading-snug">"{statement}"</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-wordle-correct font-medium">{t("youLabel")}: {userPosition}</span>
                <span className="text-boss font-medium">{t("aiOpponent")}: {aiPosition}</span>
                <span className="text-muted-foreground ml-auto">{t("roundLabel", { n: Math.min(round, TOTAL_ROUNDS), total: TOTAL_ROUNDS })}</span>
              </div>
            </Card>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0" style={{ maxHeight: "clamp(140px, 38dvh, 360px)" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground"
                      : "bg-secondary/60 border border-border/40 text-foreground"
                  }`}>
                    <div className={`text-[10px] font-semibold mb-1 ${msg.role === "user" ? "text-primary" : "text-debate"}`}>
                      {msg.role === "user" ? t("youLabel") : t("aiOpponent")}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-secondary/60 border border-border/40 rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-debate" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendArgument(); } }}
                placeholder={t("argPlaceholder", { pos: userPosition })}
                className="min-h-[56px] max-h-[120px] resize-none text-sm"
                disabled={busy || done}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-debate text-white"
                  onClick={sendArgument}
                  disabled={!input.trim() || busy || done}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {round >= TOTAL_ROUNDS ? t("finalArg") : t("sendRound", { n: round, total: TOTAL_ROUNDS })}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
