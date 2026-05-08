import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { useSettings } from "@/lib/settings";
import { api, type QuizQuestion, type MistakeEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { renderMath } from "@/lib/math";
import {
  Loader2, Heart, Swords, RotateCcw, BarChart3, Trophy, Flame, Target,
} from "lucide-react";
import { toast } from "sonner";
import { sfx, animeSfx } from "@/lib/sound";
import { recordResult } from "@/lib/stats";
import { randomAbility, type AnimeAbility } from "@/lib/animeVfx";
import { AnimeVfx } from "@/components/AnimeVfx";
import { BOSSES, getBoss, type Boss } from "@/lib/bosses";
import { ReviewMistakesPanel } from "@/components/ReviewMistakesPanel";
import { ShareButton } from "@/components/ShareButton";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { useRoom } from "@/lib/room";
import { useAssignment } from "@/lib/assignment";
import { useT } from "@/lib/i18n";
import { GameTutorial } from "@/components/GameTutorial";
import { hasSeenGameTutorial, markGameTutorialSeen } from "@/lib/tutorial";

type Floater = { id: number; value: number; kind: "damage" | "heal" };

function bossSignatureToAbility(boss: Boss): AnimeAbility {
  return {
    anime: "jjk",
    animeLabel: boss.anime,
    character: boss.name,
    name: boss.signature.name,
    glyph: boss.signature.glyph,
    color: boss.color,
    tagline: boss.signature.tagline,
    fx: boss.signature.fx,
    sfx: boss.signature.sfx,
  };
}

export default function BossRush() {
  const { settings } = useSettings();
  const { submitScore } = useRoom();
  const { submitResult } = useAssignment();
  const t = useT();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [bossIndex, setBossIndex] = useState(0);
  const [bossHp, setBossHp] = useState(BOSSES[0].hp);
  const [playerHp, setPlayerHp] = useState(100);
  const [input, setInput] = useState("");
  const [judging, setJudging] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [shakeBoss, setShakeBoss] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalDmgDealt, setTotalDmgDealt] = useState(0);
  const [totalDmgTaken, setTotalDmgTaken] = useState(0);
  const [biggestHit, setBiggestHit] = useState(0);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const startedAt = useRef<number>(Date.now());
  const recorded = useRef(false);
  const floaterId = useRef(0);
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenGameTutorial("boss"));
  const [activeVfx, setActiveVfx] = useState<AnimeAbility | null>(null);
  const [lastAbility, setLastAbility] = useState<AnimeAbility | null>(null);

  const boss = getBoss(bossIndex);
  const current = questions?.[idx];
  const allBossesDown = bossesDefeated >= BOSSES.length;
  const ended = playerHp <= 0 || allBossesDown || !!(questions && idx >= questions.length);

  const load = async () => {
    setQuestions(null);
    setIdx(0);
    setBossIndex(0);
    setBossHp(BOSSES[0].hp);
    setPlayerHp(100);
    setInput("");
    setFeedback(null);
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setBestStreak(0);
    setTotalDmgDealt(0);
    setTotalDmgTaken(0);
    setBiggestHit(0);
    setBossesDefeated(0);
    setMistakes([]);
    startedAt.current = Date.now();
    recorded.current = false;
    try {
      const { questions } = await api.generateQuiz(
        settings.topic, 30, settings.educationLevel, settings.notes, settings.difficulty
      );
      setQuestions(questions);
    } catch {
      // toast handled in api
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const pushFloat = (value: number, kind: "damage" | "heal") => {
    const id = ++floaterId.current;
    setFloaters((f) => [...f, { id, value, kind }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1000);
  };

  const next = () => {
    sfx.click();
    setInput("");
    setFeedback(null);
    setIdx((i) => i + 1);
  };

  const handleCorrect = () => {
    const ability = randomAbility();
    const baseDmg = 15 + Math.floor(Math.random() * 10);
    const bonus = ability.fx === "domain" ? 12 : ability.fx === "beam" ? 8 : ability.fx === "burst" ? 6 : 0;
    const dmg = baseDmg + bonus;
    const newHp = Math.max(0, bossHp - dmg);
    setBossHp(newHp);
    pushFloat(dmg, "damage");
    setShakeBoss(true);
    setTimeout(() => setShakeBoss(false), 400);
    setFeedback({ correct: true, text: current?.explanation ?? "Correct!" });
    setCorrectCount((n) => n + 1);
    setTotalDmgDealt((d) => d + dmg);
    setBiggestHit((b) => Math.max(b, dmg));
    setStreak((s) => {
      const ns = s + 1;
      setBestStreak((bs) => Math.max(bs, ns));
      return ns;
    });
    sfx.hit();
    if (settings.soundEnabled) animeSfx[ability.sfx]?.();
    setActiveVfx(ability);
    setLastAbility(ability);

    if (newHp === 0) {
      setBossesDefeated((b) => b + 1);
      const nextIdx = bossIndex + 1;
      setTimeout(() => {
        if (nextIdx < BOSSES.length) {
          toast(`💥 ${boss.name} defeated! Next: ${BOSSES[nextIdx].name}`);
          setBossIndex(nextIdx);
          setBossHp(BOSSES[nextIdx].hp);
        } else {
          toast("🏆 All bosses fallen — you are the champion!");
        }
      }, 800);
    }
  };

  const handleWrong = (givenAnswer = "") => {
    const dmg = boss.attack + Math.floor(Math.random() * 4);
    setPlayerHp((h) => Math.max(0, h - dmg));
    pushFloat(dmg, "damage");
    setShakePlayer(true);
    setTimeout(() => setShakePlayer(false), 400);
    setFeedback({ correct: false, text: current?.explanation ?? "Not quite." });
    setWrongCount((n) => n + 1);
    setTotalDmgTaken((d) => d + dmg);
    setStreak(0);
    sfx.hurt();

    if (current) {
      setMistakes((m) => [
        ...m,
        { question: current.prompt, yourAnswer: givenAnswer, correctAnswer: current.answer },
      ]);
    }

    const bossAbility = bossSignatureToAbility(boss);
    if (settings.soundEnabled) animeSfx[bossAbility.sfx]?.();
    setActiveVfx(bossAbility);
  };

  const submitMcq = (choice: string) => {
    if (!current || feedback) return;
    if (choice.trim().toLowerCase() === current.answer.trim().toLowerCase()) handleCorrect();
    else handleWrong(choice);
  };

  const submitText = async () => {
    if (!current || feedback || !input.trim()) return;
    setJudging(true);
    try {
      const r = await api.evaluateAnswer(current.prompt, current.answer, input, settings.difficulty);
      if (r.correct) handleCorrect();
      else handleWrong(input);
      if (r.feedback) toast(r.feedback);
    } catch {
      handleWrong(input);
    } finally {
      setJudging(false);
    }
  };

  const won = allBossesDown;
  const lost = playerHp <= 0 || !!(questions && idx >= questions.length && !allBossesDown);

  const totalAnswered = correctCount + wrongCount;
  const accuracy = totalAnswered ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));

  useEffect(() => {
    if (!ended || recorded.current || !questions) return;
    recorded.current = true;
    if (won) sfx.win(); else sfx.lose();
    const score = correctCount * 100 + Math.max(0, playerHp) + bestStreak * 25 + bossesDefeated * 200;
    recordResult({
      game: "boss",
      topic: settings.topic,
      educationLevel: settings.educationLevel,
      difficulty: settings.difficulty,
      outcome: won ? "win" : "loss",
      score,
      details: {
        correct: correctCount,
        wrong: wrongCount,
        accuracy: `${accuracy}%`,
        bestStreak,
        biggestHit,
        dmgDealt: totalDmgDealt,
        dmgTaken: totalDmgTaken,
        bossesDefeated: `${bossesDefeated}/${BOSSES.length}`,
        playerHP: playerHp,
        difficulty: settings.difficulty,
        time: `${durationSec}s`,
      },
    });
    submitScore("boss", score, won ? "win" : "loss");
    submitResult("boss", score, won ? "win" : "loss");
  }, [ended, won, questions, correctCount, wrongCount, playerHp, bestStreak, biggestHit, totalDmgDealt, totalDmgTaken, bossesDefeated, accuracy, durationSec, settings.topic, settings.educationLevel, settings.difficulty]);

  return (
    <div className="min-h-screen">
      {activeVfx && <AnimeVfx ability={activeVfx} onDone={() => setActiveVfx(null)} />}
      <LeaderboardPanel />
      <TopBar title={t("bossRushTitle")} gradient="bg-gradient-boss" />
      {showTutorial && (
        <GameTutorial
          icon="⚔️"
          title="Boss Rush"
          steps={[
            "Answer quiz questions to deal damage to the boss.",
            "Wrong answers let the boss attack you back!",
            "Chain correct answers for a combo bonus streak.",
            "Defeat all bosses to become Champion of the Multiverse!",
          ]}
          onDismiss={() => { markGameTutorialSeen("boss"); setShowTutorial(false); }}
        />
      )}
      <main className="container max-w-3xl py-6 space-y-6">
        {lastAbility && (
          <div
            className="text-center text-xs uppercase tracking-[0.25em] font-bold animate-pop-in"
            style={{ color: lastAbility.color, textShadow: `0 0 12px ${lastAbility.color}` }}
          >
            Last hit: {lastAbility.character} — {lastAbility.name}
          </div>
        )}

        {/* HP bars */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`bg-gradient-card border-border/60 p-4 ${shakePlayer ? "animate-shake" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">You</span>
              <span className="ml-auto font-mono text-sm">{playerHp}/100</span>
            </div>
            <Progress value={playerHp} className="h-3" />
          </Card>
          <Card
            className={`bg-gradient-card border-border/60 p-4 relative ${shakeBoss ? "animate-shake" : ""}`}
            style={{ boxShadow: `0 0 30px -10px ${boss.color}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-4 w-4" style={{ color: boss.color }} />
              <span className="text-sm font-medium truncate">{boss.name}</span>
              <span className="ml-auto font-mono text-sm">{bossHp}/{boss.hp}</span>
            </div>
            <Progress value={(bossHp / boss.hp) * 100} className="h-3 [&>div]:bg-boss" />
            {floaters.map((f) => (
              <span
                key={f.id}
                className="pointer-events-none absolute left-1/2 top-2 font-display text-2xl font-bold text-boss animate-float-up"
              >
                -{f.value}
              </span>
            ))}
          </Card>
        </div>

        {/* Boss avatar */}
        <Card
          className="border-none p-8 text-center shadow-arcade relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${boss.color}, hsl(var(--boss)))`,
          }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${boss.color}, transparent 70%)` }} />
          <div className="relative">
            <div className="text-6xl drop-shadow-lg">{won ? "🏆" : lost ? "💀" : boss.emoji}</div>
            <div className="mt-2 font-display text-xl text-primary-foreground">
              {won ? "All Fallen" : lost ? "You Fell..." : boss.name}
            </div>
            <div className="text-xs uppercase tracking-[0.25em] text-primary-foreground/80 mt-1">
              {won ? "Champion" : lost ? "Try again" : `${boss.anime} · Tier ${bossIndex + 1}/${BOSSES.length}`}
            </div>
          </div>
        </Card>

        {/* Game state */}
        {!questions && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            {t("forgingQuiz", { topic: settings.topic })}
          </div>
        )}

        {questions && !ended && current && (
          <Card className="bg-gradient-card border-border/60 p-6 space-y-4 animate-pop-in">
            <div className="text-xs text-muted-foreground">
              {t("questionOf", { n: idx + 1, total: questions?.length ?? "?" })} · <span className="capitalize">{current.type}</span> · {t("vsLabel")} {boss.name} · <span className="capitalize">{settings.difficulty}</span>
            </div>
            <div
              className="font-display text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMath(current.prompt) }}
            />

            {current.type === "mcq" && current.choices && (
              <div className="grid gap-2">
                {current.choices.map((c) => {
                  const isAnswer = feedback && c.trim().toLowerCase() === current.answer.trim().toLowerCase();
                  return (
                    <Button
                      key={c}
                      variant="outline"
                      disabled={!!feedback}
                      onClick={() => submitMcq(c)}
                      className={`justify-start text-left h-auto py-3 whitespace-normal ${
                        isAnswer ? "border-success bg-success/15 text-success-foreground" : ""
                      }`}
                    >
                      <span dangerouslySetInnerHTML={{ __html: renderMath(c) }} />
                    </Button>
                  );
                })}
              </div>
            )}

            {current.type === "short" && (
              <div className="flex gap-2">
                <Input
                  value={input}
                  disabled={!!feedback || judging}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitText()}
                  placeholder={t("yourAnswerPlaceholder")}
                />
                <Button onClick={submitText} disabled={!!feedback || judging || !input.trim()}>
                  {judging ? <Loader2 className="h-4 w-4 animate-spin" /> : t("strikeBtn")}
                </Button>
              </div>
            )}

            {current.type === "long" && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  value={input}
                  disabled={!!feedback || judging}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("explainReasoning")}
                />
                <Button onClick={submitText} disabled={!!feedback || judging || !input.trim()}>
                  {judging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("strikeBtn")}
                </Button>
              </div>
            )}

            {feedback && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  feedback.correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                <div className="font-bold mb-1">{feedback.correct ? t("hitLabel") : t("bossStrikesBack", { name: boss.name })}</div>
                <div dangerouslySetInnerHTML={{ __html: renderMath(feedback.text) }} />
                <Button onClick={next} size="sm" className="mt-3">{t("nextBtn")}</Button>
              </div>
            )}
          </Card>
        )}

        {ended && (
          <div className="space-y-4">
            <Card className="bg-gradient-card border-border/60 p-8 text-center space-y-4 animate-pop-in">
              <div className="text-5xl">{won ? "🏆" : "💔"}</div>
              <div className="font-display text-2xl font-bold">
                {won ? t("champion") : t("defeated")}
              </div>
              <p className="text-muted-foreground">
                {won
                  ? t("toppledAll", { n: BOSSES.length })
                  : t("youFellTo", { name: boss.name, n: bossesDefeated })}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2">
                <Stat label={t("bossesDown")} value={`${bossesDefeated}/${BOSSES.length}`} />
                <Stat label={t("correct")} value={correctCount} />
                <Stat label={t("accuracy")} value={`${accuracy}%`} />
                <Stat label={t("bestStreak")} value={`🔥 ${bestStreak}`} />
                <Stat label={t("biggestHit")} value={biggestHit} />
                <Stat label={t("dmgDealt")} value={totalDmgDealt} />
                <Stat label={t("dmgTaken")} value={totalDmgTaken} />
                <Stat label={t("hpLeft")} value={playerHp} />
              </div>

              <div className="text-xs text-muted-foreground pt-1">
                {t("finishedIn", { sec: durationSec, n: totalAnswered, diff: settings.difficulty })}
              </div>

              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <Button onClick={load} className="bg-gradient-boss">
                  <RotateCcw className="h-4 w-4 mr-2" /> {t("newBattle")}
                </Button>
                <Link href="/stats">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" /> {t("stats")}
                  </Button>
                </Link>
                <ShareButton game="boss" />
              </div>
            </Card>

            {/* Review Mistakes panel */}
            <ReviewMistakesPanel
              mistakes={mistakes}
              topic={settings.topic}
              educationLevel={settings.educationLevel}
            />
          </div>
        )}

        {/* Footer: boss ladder + run summary + tips */}
        {!ended && (
          <div className="space-y-4 pt-2">
            <Card className="bg-gradient-card border-border/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-boss" />
                <span className="text-sm font-bold uppercase tracking-wider">{t("bossLadder")}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {bossesDefeated} / {BOSSES.length} {t("defeatedLabel")}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BOSSES.map((b, i) => {
                  const isDown = i < bossesDefeated;
                  const isActive = i === bossIndex && !isDown;
                  return (
                    <div
                      key={b.id}
                      title={`${b.name} — ${b.anime} · ${b.hp} HP`}
                      className={`relative rounded-lg p-2 text-center text-2xl border transition-all ${
                        isActive
                          ? "border-boss scale-110 shadow-arcade"
                          : isDown
                          ? "border-success/40 opacity-40 grayscale"
                          : "border-border/50 opacity-70"
                      }`}
                      style={isActive ? { borderColor: b.color, boxShadow: `0 0 16px ${b.color}` } : {}}
                    >
                      <div>{isDown ? "💀" : b.emoji}</div>
                      <div className="text-[9px] mt-1 text-muted-foreground truncate">T{i + 1}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="bg-gradient-card border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-boss" /> {t("streakLabel")}
                </div>
                <div className="font-display text-2xl font-bold mt-1">🔥 {streak}</div>
                <div className="text-[11px] text-muted-foreground">{t("bestThisRun", { n: bestStreak })}</div>
              </Card>
              <Card className="bg-gradient-card border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Target className="h-3.5 w-3.5 text-success" /> {t("accuracy")}
                </div>
                <div className="font-display text-2xl font-bold mt-1">{accuracy}%</div>
                <div className="text-[11px] text-muted-foreground">
                  {correctCount} ✓ · {wrongCount} ✗
                </div>
              </Card>
              <Card className="bg-gradient-card border-border/60 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Swords className="h-3.5 w-3.5" style={{ color: boss.color }} /> {t("bossThreat")}
                </div>
                <div className="font-display text-2xl font-bold mt-1" style={{ color: boss.color }}>
                  {boss.attack} dmg
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Signature: {boss.signature.name}
                </div>
              </Card>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Tip: ultimates like Domain Expansion and beam attacks deal bonus damage. Chain correct answers to climb the ladder faster.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-secondary/50 py-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}
