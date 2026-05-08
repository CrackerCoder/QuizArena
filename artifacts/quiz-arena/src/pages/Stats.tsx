import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllResults, summary, clearResults, GameKey, GameResult } from "@/lib/stats";
import { educationLabel } from "@/lib/settings";
import { getXPState, getLevelInfo, LEVELS } from "@/lib/xp";
import { Sword, Type, Skull, Grid3x3, Trophy, Trash2, BarChart3, TrendingUp, Flame } from "lucide-react";
import { useT } from "@/lib/i18n";

function XPCard() {
  const [xpState, setXPState] = useState(() => getXPState());
  const t = useT();

  useEffect(() => {
    const h = () => setXPState(getXPState());
    window.addEventListener("xp:updated", h);
    return () => window.removeEventListener("xp:updated", h);
  }, []);

  const levelInfo = getLevelInfo(xpState.xp);
  const next = levelInfo.next;

  return (
    <Card className="bg-gradient-card border-border/60 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow text-2xl shrink-0">
          {levelInfo.current.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("yourLevel")}</div>
          <div className="font-display text-xl font-bold">{levelInfo.current.name} <span className="text-primary">Lv {levelInfo.current.level}</span></div>
          <div className="text-xs text-muted-foreground">{t("xpTotal", { xp: xpState.xp.toLocaleString() })}</div>
        </div>
        {next && (
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">{t("nextLevel", { name: next.name })}</div>
            <div className="font-display text-sm font-bold text-muted-foreground">{levelInfo.progressXP}/{levelInfo.rangeXP} XP</div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Lv {levelInfo.current.level}</span>
          {next && <span>Lv {next.level}</span>}
        </div>
        <div className="h-3 rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-hero transition-all duration-700"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {LEVELS.map((lvl) => (
          <div
            key={lvl.level}
            className={`rounded-lg p-1.5 text-center transition-all ${
              xpState.level >= lvl.level
                ? "bg-primary/20 border border-primary/40"
                : "bg-border/20 border border-transparent"
            }`}
            title={`Lv ${lvl.level}: ${lvl.name} (${lvl.xpRequired} XP)`}
          >
            <div className="text-base">{lvl.emoji}</div>
            <div className={`text-[9px] font-semibold ${xpState.level >= lvl.level ? "text-primary" : "text-muted-foreground"}`}>
              {lvl.level}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Stats() {
  const [tick, setTick] = useState(0);
  const t = useT();

  const GAMES = [
    { key: "all", label: t("stats"), Icon: BarChart3, gradient: "bg-gradient-hero" },
    { key: "boss", label: t("bossRushTitle"), Icon: Sword, gradient: "bg-gradient-boss" },
    { key: "wordle", label: t("wordGuessTitle"), Icon: Type, gradient: "bg-gradient-wordle" },
    { key: "hangman", label: t("hangmanTitle"), Icon: Skull, gradient: "bg-gradient-hangman" },
    { key: "blocks", label: t("blockMasterTitle"), Icon: Grid3x3, gradient: "bg-gradient-blocks" },
  ];

  const GAME_LABEL: Record<string, string> = {
    boss: t("bossRushTitle"),
    wordle: t("wordGuessTitle"),
    hangman: t("hangmanTitle"),
    blocks: t("blockMasterTitle"),
  };

  useEffect(() => {
    const h = () => setTick((tick) => tick + 1);
    window.addEventListener("stats:updated", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("stats:updated", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const all = getAllResults();
  const total = summary();

  return (
    <div className="min-h-screen">
      <TopBar title="Quiz Arena" />
      <main className="container max-w-4xl py-6 space-y-6 px-4">
        <XPCard />

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label={t("gamesPlayed")} value={total.played} icon={<BarChart3 className="h-4 w-4" />} />
          <StatTile label={t("wins")} value={total.wins} icon={<Trophy className="h-4 w-4 text-success" />} />
          <StatTile label={t("winRate")} value={`${total.winRate}%`} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
          <StatTile label={t("bestStreak")} value={total.bestStreak} icon={<Flame className="h-4 w-4 text-warning" />} />
        </section>

        <Tabs defaultValue="all" key={tick}>
          <TabsList className="flex-wrap h-auto">
            {GAMES.map(({ key, label, Icon }) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {GAMES.map(({ key, gradient }) => {
            const list = key === "all" ? all : all.filter((r) => r.game === key);
            const s = summary(key === "all" ? undefined : (key as GameKey));
            return (
              <TabsContent key={key} value={key} className="space-y-4">
                <Card className={`border-none p-5 ${gradient} shadow-arcade text-primary-foreground`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-xs uppercase opacity-80">{t("played")}</div>
                      <div className="font-display text-2xl font-bold">{s.played}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase opacity-80">{t("winRate")}</div>
                      <div className="font-display text-2xl font-bold">{s.winRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase opacity-80">{t("avgScore")}</div>
                      <div className="font-display text-2xl font-bold">{s.avgScore}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase opacity-80">{t("bestStreak")}</div>
                      <div className="font-display text-2xl font-bold">{s.bestStreak}</div>
                    </div>
                  </div>
                </Card>

                {list.length === 0 ? (
                  <Card className="bg-gradient-card border-border/60 p-10 text-center text-muted-foreground">
                    {t("noGamesYet")}
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {list.map((r) => (
                      <ResultRow key={r.id} r={r} gameLabel={GAME_LABEL[r.game] ?? r.game} winLabel={t("winLabel")} lossLabel={t("lossLabel")} />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {all.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(t("clearConfirm"))) {
                  clearResults();
                  setTick((tick) => tick + 1);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> {t("clearHistory")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="bg-gradient-card border-border/60 p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function ResultRow({ r, gameLabel, winLabel, lossLabel }: { r: GameResult; gameLabel: string; winLabel: string; lossLabel: string }) {
  const date = new Date(r.playedAt);
  const detailEntries = Object.entries(r.details);
  return (
    <Card className="bg-gradient-card border-border/60 p-4 flex items-center gap-4">
      <div className={`h-2 w-2 rounded-full shrink-0 ${r.outcome === "win" ? "bg-success" : "bg-destructive"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{gameLabel}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${r.outcome === "win" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
            {r.outcome === "win" ? winLabel : lossLabel}
          </span>
          {r.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              r.difficulty === "hard" ? "bg-boss/20 text-boss" : r.difficulty === "easy" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            }`}>{r.difficulty}</span>
          )}
          <span className="text-xs text-muted-foreground">· {educationLabel(r.educationLevel as any)}</span>
        </div>
        <div className="text-sm text-muted-foreground truncate">{r.topic}</div>
        {detailEntries.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
            {detailEntries.map(([k, v]) => (
              <span key={k}><span className="capitalize">{k}</span>: <span className="text-foreground/80">{v}</span></span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-xl font-bold">{r.score}</div>
        <div className="text-[10px] text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </Card>
  );
}
