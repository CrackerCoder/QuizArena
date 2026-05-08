import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Plus, Copy, CheckCheck, RefreshCw, X, ExternalLink,
  Sword, Type, Skull, Grid3x3, Trophy, Clock, AlertTriangle, Loader2,
  ChevronRight, Users, LayoutGrid, Shuffle, PenLine, MessageSquare, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sound";
import { useSettings, EDUCATION_LEVELS, type EducationLevel, type Difficulty, combineTopic } from "@/lib/settings";
import { useAssignment, GAME_LABELS, type AssignmentData } from "@/lib/assignment";

const GAME_OPTIONS = [
  { key: "boss", label: "Boss Rush", Icon: Sword, color: "text-boss" },
  { key: "wordle", label: "Word Guess", Icon: Type, color: "text-wordle-correct" },
  { key: "hangman", label: "HangGuy", Icon: Skull, color: "text-hangman" },
  { key: "blocks", label: "Block Master", Icon: Grid3x3, color: "text-blocks" },
  { key: "crossword", label: "Word Grid", Icon: LayoutGrid, color: "text-crossword" },
  { key: "anagram", label: "Anagram Scramble", Icon: Shuffle, color: "text-anagram" },
  { key: "fillblank", label: "Fill in the Blank", Icon: PenLine, color: "text-fillblank" },
  { key: "debate", label: "Debate Arena", Icon: MessageSquare, color: "text-debate" },
  { key: "flashcard", label: "Flashcard Flip", Icon: CreditCard, color: "text-flashcard" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function GameIcon({ game, className }: { game: string; className?: string }) {
  const opt = GAME_OPTIONS.find((g) => g.key === game);
  if (!opt) return <span className="text-xs text-muted-foreground">{game}</span>;
  const { Icon, color } = opt;
  return <Icon className={`h-3.5 w-3.5 ${color} ${className ?? ""}`} />;
}

function CreateForm() {
  const { settings } = useSettings();
  const { createAssignment } = useAssignment();
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState(settings.subject || "");
  const [topic, setTopic] = useState(settings.topicName || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty || "medium");
  const [level, setLevel] = useState<EducationLevel>(settings.educationLevel || "spm");
  const [allowedGames, setAllowedGames] = useState<string[]>(["boss", "wordle", "hangman", "blocks", "crossword", "anagram", "fillblank", "debate", "flashcard"]);
  const [busy, setBusy] = useState(false);

  const toggleGame = (key: string) => {
    setAllowedGames((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key],
    );
    sfx.click();
  };

  const handleCreate = async () => {
    if (!teacherName.trim()) { toast.error("Enter your display name."); return; }
    if (!subject.trim() && !topic.trim()) { toast.error("Enter a subject or topic."); return; }
    if (allowedGames.length === 0) { toast.error("Allow at least one game."); return; }
    setBusy(true);
    try {
      const combinedTopic = combineTopic(subject.trim(), topic.trim());
      await createAssignment({
        subject: subject.trim(),
        topic: combinedTopic,
        difficulty,
        allowedGames,
        teacherName: teacherName.trim(),
      });
      sfx.win();
      toast.success("Assignment created!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create assignment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border/60 p-5 sm:p-6 space-y-5 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Create Assignment</h2>
          <p className="text-xs text-muted-foreground">Students get a code to join and play only the games you allow.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Your display name (teacher)</Label>
        <Input
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value.slice(0, 50))}
          placeholder="e.g. Cikgu Ahmad, Ms Priya"
          style={{ fontSize: "16px" }}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Biology, Chemistry"
            style={{ fontSize: "16px" }}
          />
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Education level</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as EducationLevel)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Allowed game modes</Label>
        <div className="grid grid-cols-2 gap-2">
          {GAME_OPTIONS.map(({ key, label, Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleGame(key)}
              className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all ${
                allowedGames.includes(key)
                  ? "border-primary/70 bg-primary/10 font-semibold"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              <Icon className={`h-4 w-4 ${allowedGames.includes(key) ? color : ""}`} />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Students will only see the games you've checked.</p>
      </div>

      <Button
        className="w-full h-11"
        onClick={handleCreate}
        disabled={busy}
      >
        {busy
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
          : <><Plus className="h-4 w-4 mr-2" /> Create assignment</>}
      </Button>
    </Card>
  );
}

function ResultsTable({ data, onRefresh, onClose, isClosing }: {
  data: AssignmentData;
  onRefresh: () => void;
  onClose: () => void;
  isClosing: boolean;
}) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}?join=${data.code}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(data.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Assignment header */}
      <Card className="bg-gradient-card border-primary/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-lg font-bold">Assignment Active</h2>
              {data.closed ? (
                <Badge variant="destructive" className="text-xs">Closed</Badge>
              ) : (
                <Badge className="text-xs bg-success/20 text-success border-success/30">Live</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {data.topic} · {data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onRefresh} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Code + share */}
        <div className="space-y-2">
          <Label className="text-xs">Assignment code — share with students</Label>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-2xl font-bold tracking-[0.4em] text-center text-primary">
              {data.code}
            </div>
            <Button size="sm" variant="outline" onClick={copyCode} title="Copy code">
              {codeCopied ? <CheckCheck className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={copyUrl}>
            {urlCopied ? <CheckCheck className="h-4 w-4 text-success" /> : <ExternalLink className="h-4 w-4" />}
            {urlCopied ? "Link copied!" : "Copy shareable student link"}
          </Button>
        </div>

        {/* Allowed games */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Allowed:</span>
          {data.allowedGames.map((g) => (
            <div key={g} className="flex items-center gap-1 text-xs rounded-full border border-border/60 px-2 py-0.5">
              <GameIcon game={g} />
              <span>{GAME_LABELS[g] ?? g}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Results table */}
      <Card className="bg-gradient-card border-border/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="font-semibold text-sm">Student Results</span>
            <Badge variant="outline" className="text-xs">{data.results.length} submissions</Badge>
          </div>
          {!data.closed && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onClose}
              disabled={isClosing}
              className="gap-1.5 text-xs"
            >
              {isClosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Close assignment
            </Button>
          )}
        </div>

        {data.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Waiting for students to play…</p>
            <p className="text-xs text-muted-foreground/70">Results appear here automatically every 5 seconds</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">#</th>
                  <th className="text-left px-4 py-2 font-medium">Student</th>
                  <th className="text-left px-4 py-2 font-medium">Game</th>
                  <th className="text-right px-4 py-2 font-medium">Score</th>
                  <th className="text-center px-4 py-2 font-medium">Result</th>
                  <th className="text-right px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r, i) => (
                  <tr
                    key={`${r.playerName}-${r.game}`}
                    className="border-b border-border/20 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.playerName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <GameIcon game={r.game} />
                        <span className="text-xs text-muted-foreground">{GAME_LABELS[r.game] ?? r.game}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono">{r.score.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        className={`text-xs ${r.outcome === "win" ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}
                        variant="outline"
                      >
                        {r.outcome === "win" ? "Win" : "Loss"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(r.submittedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Results refresh automatically every 5 seconds · Assignment expires after 7 days
      </p>
    </div>
  );
}

export default function Teacher() {
  const { session, liveData, fetchAssignment, closeAssignment, leaveAssignment } = useAssignment();
  const [isClosing, setIsClosing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!session?.code) return;
    await fetchAssignment(session.code);
    sfx.click();
  }, [session, fetchAssignment]);

  const handleClose = useCallback(async () => {
    setIsClosing(true);
    try {
      await closeAssignment();
      toast.success("Assignment closed. No new results will be accepted.");
      sfx.click();
    } catch {
      toast.error("Could not close assignment.");
    } finally {
      setIsClosing(false);
    }
  }, [closeAssignment]);

  const handleLeave = () => {
    leaveAssignment();
    sfx.click();
    toast.success("Left assignment. Your student data is preserved.");
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Teacher Dashboard" />
      <main className="container max-w-5xl py-6 sm:py-10 space-y-6 px-4">
        <section className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <h1 className="font-display text-2xl sm:text-4xl font-bold">
              Teacher Dashboard
            </h1>
            {session && (
              <Button size="sm" variant="ghost" onClick={handleLeave} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Create an assignment, share the code with your class, and watch results roll in live.
          </p>
        </section>

        {/* Warning if assignment closed */}
        {liveData?.closed && (
          <Card className="border-destructive/40 bg-destructive/5 p-3 flex items-center gap-2 max-w-xl mx-auto">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">This assignment is closed. Students can no longer submit results.</span>
          </Card>
        )}

        {session?.isTeacher && liveData ? (
          <ResultsTable
            data={liveData}
            onRefresh={handleRefresh}
            onClose={handleClose}
            isClosing={isClosing}
          />
        ) : (
          <CreateForm />
        )}

        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back to Quiz Arena
          </Link>
        </div>
      </main>
    </div>
  );
}
