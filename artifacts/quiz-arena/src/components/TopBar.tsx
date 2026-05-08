import { Link, useLocation } from "wouter";
import { ArrowLeft, Settings as SettingsIcon, Home, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { SettingsModal } from "./SettingsModal";
import { ExitModal } from "./ExitModal";
import { AuthButton } from "./AuthButton";
import { sfx } from "@/lib/sound";
import { getXPState, getLevelInfo, LevelDef } from "@/lib/xp";
import { useT } from "@/lib/i18n";

type XPAwardedDetail = {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newLevelDef: LevelDef;
};

function useXP() {
  const [xpState, setXPState] = useState(() => getXPState());
  const [flash, setFlash] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelDef | null>(null);

  useEffect(() => {
    const onXPUpdated = () => setXPState(getXPState());
    const onXPAwarded = (e: Event) => {
      const detail = (e as CustomEvent<XPAwardedDetail>).detail;
      setXPState(getXPState());
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
      if (detail.leveledUp) setLevelUp(detail.newLevelDef);
    };
    window.addEventListener("xp:updated", onXPUpdated);
    window.addEventListener("xp:awarded", onXPAwarded);
    return () => {
      window.removeEventListener("xp:updated", onXPUpdated);
      window.removeEventListener("xp:awarded", onXPAwarded);
    };
  }, []);

  return { xpState, flash, levelUp, clearLevelUp: () => setLevelUp(null) };
}

export function TopBar({ title, gradient }: { title: string; gradient?: string }) {
  const [, navigate] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const isHome = title === "Quiz Arena";
  const { xpState, flash, levelUp, clearLevelUp } = useXP();
  const levelInfo = getLevelInfo(xpState.xp);
  const t = useT();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!isHome && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { sfx.click(); setExitOpen(true); }}
                aria-label={t("back")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className={`h-7 w-7 rounded-md ${gradient ?? "bg-gradient-hero"} shadow-glow`} />
              <span className="font-display text-lg font-bold tracking-tight">{title}</span>
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center min-w-0 max-w-[200px]">
            <button
              onClick={() => { sfx.click(); navigate("/stats"); }}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-all ${
                flash
                  ? "border-warning/80 bg-warning/20 scale-105"
                  : "border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
              }`}
              title={t("xpToNextLevel", { prog: levelInfo.progressXP, range: levelInfo.rangeXP })}
            >
              <span className="text-sm">{levelInfo.current.emoji}</span>
              <span className={`text-xs font-semibold whitespace-nowrap ${flash ? "text-warning" : "text-muted-foreground"}`}>
                {levelInfo.current.name} Lv {levelInfo.current.level}
              </span>
              <div className="w-10 sm:w-14 h-1.5 rounded-full bg-border/60 overflow-hidden hidden xs:block">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${flash ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isHome && (
              <Button variant="ghost" size="icon" onClick={() => { sfx.click(); navigate("/"); }} aria-label={t("home")}>
                <Home className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => { sfx.click(); navigate("/stats"); }} aria-label={t("stats")}>
              <BarChart3 className="h-5 w-5" />
            </Button>
            <AuthButton />
            <Button variant="ghost" size="icon" onClick={() => { sfx.click(); setSettingsOpen(true); }} aria-label={t("settings")}>
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="h-0.5 bg-border/40">
          <div
            className={`h-full transition-all duration-700 ${flash ? "bg-warning" : "bg-primary/60"}`}
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExitModal open={exitOpen} onOpenChange={setExitOpen} onConfirm={() => navigate("/")} isGame={!!gradient} />

      {levelUp && (
        <LevelUpModal levelDef={levelUp} onClose={clearLevelUp} />
      )}
    </>
  );
}

function LevelUpModal({ levelDef, onClose }: { levelDef: LevelDef; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    sfx.win?.();
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" aria-live="assertive">
      <div
        ref={ref}
        className="pointer-events-auto animate-pop-in bg-gradient-card border-2 border-warning/60 rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4"
      >
        <div className="text-5xl mb-3">{levelDef.emoji}</div>
        <div className="text-xs uppercase tracking-widest text-warning font-bold mb-1">{t("levelUp")}</div>
        <div className="font-display text-3xl font-bold mb-1">{levelDef.name}</div>
        <div className="text-muted-foreground text-sm">{t("youReachedLevel", { n: levelDef.level })}</div>
        <button onClick={onClose} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline">
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
