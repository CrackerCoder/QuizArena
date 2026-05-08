import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, X, Crown, RefreshCw, Users } from "lucide-react";
import { useRoom, type ScoreEntry, type RoomInfo } from "@/lib/room";
import { useT } from "@/lib/i18n";

const MEDALS = ["🥇", "🥈", "🥉"];

function OutcomeBadge({ outcome, win, loss }: { outcome: "win" | "loss"; win: string; loss: string }) {
  return (
    <span className={`text-[9px] px-1 rounded ${outcome === "win" ? "bg-success/25 text-success" : "bg-destructive/25 text-destructive"}`}>
      {outcome === "win" ? win : loss}
    </span>
  );
}

export function LeaderboardPanel() {
  const { session, fetchRoom, leaveRoom } = useRoom();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [open, setOpen] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useT();

  // Build game labels using translations
  const GAME_LABEL: Record<string, string> = {
    boss: t("bossRushTitle"),
    wordle: t("wordGuessTitle"),
    hangman: t("hangmanTitle"),
    blocks: t("blockMasterTitle"),
  };

  const refresh = async () => {
    const r = await fetchRoom();
    setRoom(r);
    setLastRefresh(Date.now());
  };

  useEffect(() => {
    if (!session) return;
    refresh();
    intervalRef.current = setInterval(refresh, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.code]);

  if (!session) return null;

  const secAgo = Math.round((Date.now() - lastRefresh) / 1000);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-primary shadow-arcade flex items-center justify-center hover:scale-105 transition-transform"
        title={t("showLeaderboard")}
      >
        <Trophy className="h-5 w-5 text-primary-foreground" />
      </button>
    );
  }

  const entries: ScoreEntry[] = room?.entries ?? [];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 animate-pop-in">
      <Card className="bg-background/95 backdrop-blur border-border/80 shadow-arcade overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-hero text-primary-foreground">
          <Trophy className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide">{t("classLeaderboard")}</div>
            <div className="text-[10px] opacity-80 truncate">{t("room", { code: session.code })} · {session.playerName}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
            title={t("minimise")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
          {entries.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center flex flex-col items-center gap-2">
              <Users className="h-5 w-5 opacity-40" />
              {t("waitingForPlayers")}
            </div>
          ) : (
            entries.map((e, i) => {
              const isMe = e.playerName === session.playerName;
              return (
                <div
                  key={`${e.playerName}-${e.game}`}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    isMe ? "bg-primary/10" : "hover:bg-secondary/40"
                  }`}
                >
                  <span className="text-base w-5 text-center shrink-0">
                    {i < 3 ? MEDALS[i] : <span className="text-xs text-muted-foreground">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 truncate">
                      {isMe && <Crown className="h-3 w-3 text-primary shrink-0" />}
                      <span className={`truncate ${isMe ? "font-bold text-primary" : ""}`}>{e.playerName}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {GAME_LABEL[e.game] ?? e.game} · {e.topic}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-display font-bold text-sm">{e.score}</div>
                    <OutcomeBadge outcome={e.outcome} win={t("win")} loss={t("loss")} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-secondary/20">
          <span className="text-[10px] text-muted-foreground">
            {t("updatedAgo", { n: secAgo })}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={refresh} className="text-muted-foreground hover:text-foreground transition-colors" title={t("refreshNow")}>
              <RefreshCw className="h-3 w-3" />
            </button>
            <button
              onClick={() => { leaveRoom(); }}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-2"
            >
              {t("leaveRoom")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
