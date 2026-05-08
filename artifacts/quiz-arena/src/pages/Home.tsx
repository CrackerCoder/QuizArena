import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { TopBar } from "@/components/TopBar";
import { TopicEditor } from "@/components/TopicEditor";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sword, Type, Skull, Grid3x3, ArrowRight, BarChart3, Sparkles, NotebookPen,
  Upload, X, ChevronDown, ChevronUp, Wand2, Loader2, Zap, Clock, ChevronRight,
  Users, Plus, LogIn, Trophy, Copy, CheckCheck, GraduationCap, BookOpen,
  LayoutGrid, Shuffle, PenLine, MessageSquare, CreditCard, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sound";
import { useSettings, EDUCATION_LEVELS, EducationLevel, Difficulty, combineTopic } from "@/lib/settings";
import { api } from "@/lib/api";
import { saveTopicHistory, getTopicHistory, HistoryEntry } from "@/lib/history";
import { useRoom } from "@/lib/room";
import { useAssignment, GAME_LABELS } from "@/lib/assignment";
import { useT } from "@/lib/i18n";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { hasCompletedHomeTour, markHomeTourDone } from "@/lib/tutorial";

const GAME_DEFS = [
  { href: "/boss",      titleKey: "bossRushTitle",    descKey: "descBossRush",    Icon: Sword,         gradient: "bg-gradient-boss",      accent: "text-boss" },
  { href: "/wordle",    titleKey: "wordGuessTitle",   descKey: "descWordGuess",   Icon: Type,          gradient: "bg-gradient-wordle",    accent: "text-wordle-correct" },
  { href: "/hangman",   titleKey: "hangmanTitle",     descKey: "descHangGuy",     Icon: Skull,         gradient: "bg-gradient-hangman",   accent: "text-hangman" },
  { href: "/blocks",    titleKey: "blockMasterTitle", descKey: "descBlockMaster", Icon: Grid3x3,       gradient: "bg-gradient-blocks",    accent: "text-blocks" },
  { href: "/crossword", titleKey: "crosswordTitle",   descKey: "descWordGrid",    Icon: LayoutGrid,    gradient: "bg-gradient-crossword", accent: "text-crossword" },
  { href: "/anagram",   titleKey: "anagramTitle",     descKey: "descAnagram",     Icon: Shuffle,       gradient: "bg-gradient-anagram",   accent: "text-anagram" },
  { href: "/fillblank", titleKey: "fillBlankTitle",   descKey: "descFillBlank",   Icon: PenLine,       gradient: "bg-gradient-fillblank", accent: "text-fillblank" },
  { href: "/debate",    titleKey: "debateTitle",      descKey: "descDebate",      Icon: MessageSquare, gradient: "bg-gradient-debate",    accent: "text-debate" },
  { href: "/flashcard", titleKey: "flashcardTitle",   descKey: "descFlashcard",   Icon: CreditCard,    gradient: "bg-gradient-flashcard", accent: "text-flashcard" },
] as const;

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; color: string; desc: string }[] = [
  { value: "easy", label: "Easy", color: "text-success border-success/60 bg-success/10", desc: "Basic recall, simple vocab" },
  { value: "medium", label: "Medium", color: "text-warning border-warning/60 bg-warning/10", desc: "Application & analysis" },
  { value: "hard", label: "Hard", color: "text-boss border-boss/60 bg-boss/10", desc: "Synthesis, precise reasoning" },
];

type Preset = { subject: string; topic: string; level: EducationLevel };
type PresetCategory = { label: string; emoji: string; presets: Preset[] };

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: "Mathematics",
    emoji: "📐",
    presets: [
      { subject: "Additional Mathematics", topic: "Quadratic Functions", level: "spm" },
      { subject: "Additional Mathematics", topic: "Differentiation", level: "spm" },
      { subject: "Additional Mathematics", topic: "Integration", level: "spm" },
      { subject: "Mathematics", topic: "Statistics", level: "pt3" },
      { subject: "Mathematics", topic: "Algebraic Expressions", level: "pt3" },
    ],
  },
  {
    label: "Languages",
    emoji: "🗣️",
    presets: [
      { subject: "Bahasa Melayu", topic: "Teks Argumentatif", level: "spm" },
      { subject: "Bahasa Melayu", topic: "Teks Perbahasan", level: "spm" },
      { subject: "English Literature", topic: "Short Stories", level: "spm" },
      { subject: "English ↔ Malay", topic: "Common Vocabulary", level: "spm" },
      { subject: "English ↔ Malay", topic: "Peribahasa & Proverbs", level: "spm" },
    ],
  },
  {
    label: "History & Social",
    emoji: "🏛️",
    presets: [
      { subject: "Sejarah", topic: "Kesultanan Melayu Melaka", level: "spm" },
      { subject: "Sejarah", topic: "Malaysia Merdeka", level: "spm" },
      { subject: "Sejarah", topic: "Pembentukan Malaysia", level: "spm" },
      { subject: "Economics", topic: "Supply and Demand", level: "spm" },
    ],
  },
  {
    label: "Science",
    emoji: "🔬",
    presets: [
      { subject: "Biology", topic: "Cell Division", level: "spm" },
      { subject: "Biology", topic: "Photosynthesis", level: "spm" },
      { subject: "Chemistry", topic: "Chemical Bonding", level: "spm" },
      { subject: "Physics", topic: "Forces & Motion", level: "spm" },
    ],
  },
];

// Flat list for fallback use
const MALAYSIAN_PRESETS = PRESET_CATEGORIES.flatMap((c) => c.presets);

function DifficultyToggle({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-warning" /> Difficulty
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border-2 px-3 py-2 text-center transition-all ${
              value === opt.value
                ? opt.color + " font-bold shadow-sm"
                : "border-border/50 text-muted-foreground hover:border-border"
            }`}
          >
            <div className="text-sm font-semibold">{opt.label}</div>
            <div className="text-[10px] mt-0.5 opacity-80 hidden sm:block">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicAutocomplete({
  value,
  onChange,
  placeholder,
  id,
  subject,
  topicName,
  notes,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
  subject: string;
  topicName: string;
  notes: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (subj: string, topic: string) => {
    if (!subj.trim() && !topic.trim()) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const result = await api.suggestTopics(subj, topic, notes);
      setSuggestions(result.suggestions ?? []);
      setOpen((result.suggestions ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [notes]);

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(subject, v);
    }, 600);
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    sfx.click();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{ fontSize: "16px" }}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border/60 bg-popover shadow-lg overflow-hidden animate-pop-in">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/60 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickStartPopover({ onApply, busy }: { onApply: (p: { subject: string; topic: string; level: EducationLevel }) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);

  const handle = (p: { subject: string; topic: string; level: EducationLevel }) => {
    setOpen(false);
    onApply(p);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          className="gap-2 border-primary/40 hover:border-primary/70 hover:bg-primary/10"
          onClick={() => { sfx.click(); setOpen((o) => !o); }}
        >
          <Flag className="h-3.5 w-3.5 text-primary" />
          🇲🇾 Quick Start
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Malaysian curriculum topics
        </div>
        {PRESET_CATEGORIES.map((cat) => (
          <div key={cat.label} className="space-y-1">
            <div className="text-xs font-medium text-foreground/70 flex items-center gap-1">
              <span>{cat.emoji}</span> {cat.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.presets.map((p) => (
                <button
                  key={`${p.subject}-${p.topic}`}
                  type="button"
                  onClick={() => handle(p)}
                  className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs hover:border-primary/60 hover:bg-primary/10 transition-all whitespace-nowrap text-left"
                >
                  {p.subject === "Additional Mathematics" ? "Add Maths" : p.subject} · {p.topic}
                  <span className="ml-1 text-muted-foreground opacity-60 uppercase text-[9px]">{p.level}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function useGameCompat(topic: string, educationLevel: string, notes: string) {
  const [compat, setCompat] = useState<Record<string, string | null>>({});
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!topic) { setCompat({}); return; }
    const cacheKey = `quiz-arena-compat-${topic.toLowerCase().replace(/\s+/g, "-")}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { ts, disabled } = JSON.parse(cached) as { ts: number; disabled: Record<string, string | null> };
        if (Date.now() - ts < 86400000) { setCompat(disabled); return; }
      } catch { /* ignore */ }
    }
    if (checkingRef.current) return;
    checkingRef.current = true;
    let cancelled = false;
    api.checkGameCompat(topic, educationLevel, notes)
      .then((r) => {
        if (cancelled) return;
        const disabled = r.disabled ?? {};
        setCompat(disabled);
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), disabled }));
      })
      .catch(() => { if (!cancelled) setCompat({}); })
      .finally(() => { if (!cancelled) checkingRef.current = false; });
    return () => { cancelled = true; };
  }, [topic, educationLevel, notes]);

  return { compat };
}

function InlineTopicSetup() {
  const { settings, setSettings } = useSettings();
  const [subject, setSubject] = useState(settings.subject);
  const [topicName, setTopicName] = useState(settings.topicName);
  const [level, setLevel] = useState<EducationLevel>(settings.educationLevel);
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<{ subject: string; topic: string } | null>(null);

  const applySettings = (s: string, t: string) => {
    const combined = combineTopic(s, t);
    setSettings({
      subject: s,
      topicName: t,
      topic: combined,
      educationLevel: level,
      difficulty,
      onboarded: true,
    });
    saveTopicHistory({ subject: s, topicName: t, topic: combined, educationLevel: level, difficulty });
    sfx.win();
  };

  const start = async (overrideSubject?: string, overrideTopic?: string) => {
    let s = (overrideSubject ?? subject).trim();
    let t = (overrideTopic ?? topicName).trim();
    if (!s && !t) return;
    setSuggestion(null);
    setBusy(true);
    try {
      const fixed = await api.autocorrectTopic(s, t);
      if (fixed.mismatch && fixed.suggestedSubject) {
        setSuggestion({ subject: fixed.suggestedSubject, topic: fixed.topic?.trim() || t });
        setBusy(false);
        return;
      }
      s = fixed.subject?.trim() || s;
      t = fixed.topic?.trim() || t;
      if (fixed.changed) {
        setSubject(s);
        setTopicName(t);
      }
    } catch {
      // graceful fallback — just use what they typed
    } finally {
      setBusy(false);
    }
    applySettings(s, t);
  };

  const applyPreset = (preset: typeof MALAYSIAN_PRESETS[number]) => {
    setSubject(preset.subject);
    setTopicName(preset.topic);
    setLevel(preset.level);
    sfx.click();
    start(preset.subject, preset.topic);
  };

  return (
    <Card className="bg-gradient-card border-border/60 p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow shrink-0">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">Welcome to Quiz Arena</h2>
          <p className="text-xs text-muted-foreground">Type your subject and topic — typos are fine, AI will fix them.</p>
        </div>
      </div>

      {/* Malaysian quick start — single button → popover with categories */}
      <QuickStartPopover onApply={applyPreset} busy={busy} />

      {suggestion && (
        <div className="rounded-lg border border-warning/60 bg-warning/10 p-3 space-y-2 text-sm animate-pop-in">
          <p className="font-medium text-foreground">⚠️ Subject and topic don't seem to match</p>
          <p className="text-muted-foreground text-xs">
            Did you mean <strong className="text-foreground">{suggestion.topic}</strong> under <strong className="text-foreground">{suggestion.subject}</strong>?
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => {
              setSubject(suggestion.subject);
              setTopicName(suggestion.topic);
              setSuggestion(null);
              applySettings(suggestion.subject, suggestion.topic);
            }}>
              Yes, use {suggestion.subject}
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => {
              setSuggestion(null);
              applySettings(subject, topicName);
            }}>
              Keep what I typed
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="home-subject">Subject</Label>
          <TopicAutocomplete
            id="home-subject"
            value={subject}
            onChange={setSubject}
            placeholder="e.g. Biology, Sejarah"
            subject={subject}
            topicName={topicName}
            notes={settings.notes}
            onKeyDown={(e) => e.key === "Enter" && start()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="home-topic">Topic</Label>
          <TopicAutocomplete
            id="home-topic"
            value={topicName}
            onChange={setTopicName}
            placeholder="e.g. Photosynthesis"
            subject={subject}
            topicName={topicName}
            notes={settings.notes}
            onKeyDown={(e) => e.key === "Enter" && start()}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Education level</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as EducationLevel)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[40dvh]">
              {EDUCATION_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-1">
          <DifficultyToggle value={difficulty} onChange={setDifficulty} />
        </div>
      </div>

      <Button onClick={() => start()} disabled={busy || (!subject.trim() && !topicName.trim())} className="w-full h-11">
        {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Autocorrecting…</> : <><Wand2 className="h-4 w-4 mr-2" /> Autocorrect & start</>}
      </Button>
    </Card>
  );
}

export default function Home() {
  const { settings } = useSettings();
  const { session: assignmentSession } = useAssignment();
  const t = useT();
  const studentInAssignment = assignmentSession && !assignmentSession.isTeacher;
  const needsTopic = !studentInAssignment && (!settings.onboarded || !settings.topic);
  const [showTour, setShowTour] = useState(false);
  const tourTriggered = useRef(false);

  const { compat } = useGameCompat(
    needsTopic ? "" : settings.topic,
    settings.educationLevel,
    settings.notes,
  );

  useEffect(() => {
    if (!needsTopic && !studentInAssignment && !tourTriggered.current && !hasCompletedHomeTour()) {
      tourTriggered.current = true;
      const timer = setTimeout(() => setShowTour(true), 700);
      return () => clearTimeout(timer);
    }
  }, [needsTopic, studentInAssignment]);

  const games = GAME_DEFS.map((g) => ({ ...g, title: t(g.titleKey), desc: t(g.descKey) }));
  const allowedGames = studentInAssignment ? assignmentSession.allowedGames : null;
  const visibleGames = allowedGames
    ? games.filter((g) => allowedGames.includes(g.href.replace("/", "")))
    : games;

  return (
    <div className="min-h-screen">
      <TopBar title="Quiz Arena" />
      <main className="container max-w-5xl py-6 sm:py-10 space-y-6 sm:space-y-10 px-4">
        <section className="text-center space-y-3 sm:space-y-4">
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient-hero">{t("heroPlay")}</span>{" "}{t("heroTagline")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-lg">
            {t("heroSub")}
          </p>
        </section>

        <div id="tutorial-topic-card">
          {needsTopic ? <InlineTopicSetup /> : <TopicEditor />}
        </div>

        <RecentSessions />

        <AssignmentCard />

        <ClassRoomCard />

        {!needsTopic && <NotesCard />}

        <section id="tutorial-game-grid" className={`grid gap-4 sm:gap-5 md:grid-cols-2 ${needsTopic ? "opacity-50 pointer-events-none" : ""}`}>
          {allowedGames && (
            <div className="md:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Showing only games allowed by your teacher:{" "}
              <span className="font-semibold text-foreground">
                {allowedGames.map((g) => GAME_LABELS[g] ?? g).join(", ")}
              </span>
            </div>
          )}
          {visibleGames.map(({ href, title, desc, Icon, gradient, accent }) => {
            const disabledReason = needsTopic ? null : (compat[href] ?? null);
            const isDisabled = !!disabledReason;
            const card = (
              <Card className={`group bg-gradient-card border-border/60 p-5 sm:p-6 transition-all ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer arcade-press hover:border-primary/60 hover:shadow-card"
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl ${gradient} flex items-center justify-center shadow-arcade shrink-0`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg sm:text-xl font-bold">{title}</h3>
                      {!isDisabled && <ArrowRight className={`h-5 w-5 ${accent} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{desc}</p>
                    {disabledReason && (
                      <p className="text-[11px] text-warning/80 mt-1.5 flex items-center gap-1">
                        <span>⚠️</span> {disabledReason}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
            if (isDisabled) return <div key={href} title={disabledReason ?? ""}>{card}</div>;
            return <Link key={href} href={href} onClick={() => sfx.click()} className="block">{card}</Link>;
          })}
        </section>

        <div className="flex items-center justify-center gap-6">
          <Link href="/stats" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <BarChart3 className="h-4 w-4" /> View your game stats
          </Link>
          <span className="text-border">·</span>
          <Link href="/teacher" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <GraduationCap className="h-4 w-4" /> Teacher mode
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Tip: tap your topic above to change it.
        </p>
      </main>

      {showTour && (
        <TutorialOverlay
          steps={[
            { title: "Welcome to Quiz Arena! 🎮", message: "AI-powered study games for Malaysian students. Here's a quick 20-second tour!" },
            { targetId: "tutorial-topic-card", title: "Your study topic", message: "Your current topic is shown here. Tap to change subject, topic, difficulty, or language anytime." },
            { targetId: "tutorial-game-grid", title: "Pick a game", message: "Each game teaches your topic a different way. Some may be greyed out if they don't work well with your topic." },
            { targetId: "tutorial-signin", title: "Save your progress", message: "Sign in to sync your XP, streaks, and settings across all your devices." },
          ]}
          onFinish={() => { markHomeTourDone(); setShowTour(false); }}
        />
      )}
    </div>
  );
}

function RecentSessions() {
  const { settings, setSettings } = useSettings();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const load = () => setHistory(getTopicHistory().slice(0, 10));
    load();
    window.addEventListener("history:updated", load);
    return () => window.removeEventListener("history:updated", load);
  }, []);

  if (history.length === 0) return null;

  const resume = (entry: HistoryEntry) => {
    setSettings({
      subject: entry.subject,
      topicName: entry.topicName,
      topic: entry.topic,
      educationLevel: entry.educationLevel as EducationLevel,
      difficulty: (entry.difficulty || "medium") as Difficulty,
      onboarded: true,
    });
    sfx.click();
  };

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
        <Clock className="h-3.5 w-3.5" /> Recent sessions
      </div>
      <div className="flex gap-2 flex-wrap">
        {history.map((entry, i) => {
          const isActive = entry.topic === settings.topic;
          return (
            <button
              key={i}
              type="button"
              onClick={() => resume(entry)}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                isActive
                  ? "border-primary/70 bg-primary/15 text-primary font-semibold"
                  : "border-border/60 hover:border-primary/60 hover:bg-primary/10 text-foreground/80"
              }`}
            >
              <span className="font-medium truncate max-w-[160px]">{entry.topic}</span>
              <span className="text-muted-foreground opacity-70 whitespace-nowrap">{relativeTime(entry.studiedAt)}</span>
              {!isActive && <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentCard() {
  const { session, liveData, joinAssignment, leaveAssignment } = useAssignment();
  const { setSettings } = useSettings();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState(() =>
    localStorage.getItem("quiz-arena-player-name") ?? "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const code = sessionStorage.getItem("quiz-arena-pending-join");
    if (code) setPendingCode(code);
  }, []);

  useEffect(() => {
    if (session && !session.isTeacher && session.topic) {
      const combined = combineTopic(session.subject, session.topic);
      setSettings({
        subject: session.subject,
        topicName: session.topic,
        topic: combined,
        onboarded: true,
      });
    }
  }, [session?.code]);

  const handleJoin = async () => {
    if (!pendingCode || !playerName.trim()) return;
    setBusy(true);
    const ok = await joinAssignment(pendingCode, playerName.trim());
    if (ok) {
      localStorage.setItem("quiz-arena-player-name", playerName.trim());
      sessionStorage.removeItem("quiz-arena-pending-join");
      setPendingCode(null);
      toast.success(`Joined assignment ${pendingCode} as ${playerName}!`);
      sfx.win();
    }
    setBusy(false);
  };

  const handleLeave = () => {
    leaveAssignment();
    sfx.click();
    toast.success("Left assignment.");
  };

  // Student with active assignment
  if (session && !session.isTeacher) {
    return (
      <Card className="bg-gradient-card border-primary/40 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Assignment active</div>
            <div className="text-sm font-bold truncate">
              {session.topic} · Playing as {session.playerName}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={handleLeave} className="text-muted-foreground shrink-0">
            <X className="h-4 w-4 mr-1" /> Leave
          </Button>
        </div>
        {session.allowedGames.length < 4 && (
          <div className="flex items-center gap-1.5 pl-12 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            Allowed: {session.allowedGames.map((g) => GAME_LABELS[g] ?? g).join(", ")}
          </div>
        )}
        {liveData && (
          <div className="pl-12 text-xs text-muted-foreground">
            {liveData.results.length} submission{liveData.results.length !== 1 ? "s" : ""} so far
            {liveData.closed && <span className="ml-2 text-destructive font-medium">· Assignment closed</span>}
          </div>
        )}
      </Card>
    );
  }

  // Pending join (student opened share link but has no name yet)
  if (pendingCode) {
    return (
      <Card className="bg-gradient-card border-primary/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Join assignment</div>
            <div className="text-sm font-bold font-mono tracking-widest">{pendingCode}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { sessionStorage.removeItem("quiz-arena-pending-join"); setPendingCode(null); sfx.click(); }} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Your display name</Label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
            placeholder="e.g. Ali, Siti, Student 1"
            style={{ fontSize: "16px" }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>
        <Button className="w-full" onClick={handleJoin} disabled={busy || !playerName.trim()}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
          Join assignment
        </Button>
      </Card>
    );
  }

  return null;
}

function ClassRoomCard() {
  const { settings } = useSettings();
  const { session, createRoom, joinRoom, leaveRoom } = useRoom();
  const [tab, setTab] = useState<"none" | "join" | "create">("none");
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !playerName.trim()) return;
    setBusy(true);
    const ok = await joinRoom(code.trim(), playerName.trim());
    if (ok) {
      setTab("none");
      toast.success(`Joined room ${code.toUpperCase()} as ${playerName}!`);
      sfx.win();
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    if (!playerName.trim()) return;
    setBusy(true);
    try {
      const roomCode = await createRoom(settings.topic, settings.subject, settings.difficulty);
      await joinRoom(roomCode, playerName.trim());
      setCreatedCode(roomCode);
      sfx.win();
    } catch {
      toast.error("Could not create room. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  if (session) {
    return (
      <Card className="bg-gradient-card border-primary/40 p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
          <Trophy className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Class room active</div>
          <div className="text-sm font-bold">Room {session.code} · Playing as {session.playerName}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { leaveRoom(); sfx.click(); }} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" /> Leave
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/60 p-4 sm:p-5 space-y-3">
      <button
        type="button"
        onClick={() => { setTab((t) => t === "none" ? "join" : "none"); sfx.click(); }}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Class leaderboard</div>
          <div className="text-sm font-medium">Join or create a class room to compete live</div>
        </div>
        {tab !== "none" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {tab !== "none" && (
        <div className="space-y-3 animate-pop-in">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === "join" ? "default" : "outline"}
              onClick={() => { setTab("join"); setCreatedCode(null); sfx.click(); }}
              className="gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" /> Join room
            </Button>
            <Button
              size="sm"
              variant={tab === "create" ? "default" : "outline"}
              onClick={() => { setTab("create"); setCreatedCode(null); sfx.click(); }}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Create room
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Your display name</Label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
              placeholder="e.g. Ali, Siti, Player 1"
              style={{ fontSize: "16px" }}
              onKeyDown={(e) => e.key === "Enter" && tab === "join" && handleJoin()}
            />
          </div>

          {tab === "join" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Room code (6 characters)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. AB3XY7"
                  className="font-mono uppercase tracking-widest text-center text-lg"
                  style={{ fontSize: "18px" }}
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>
              <Button
                className="w-full"
                disabled={busy || !code.trim() || !playerName.trim()}
                onClick={handleJoin}
              >
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                Join class
              </Button>
            </>
          )}

          {tab === "create" && !createdCode && (
            <Button
              className="w-full"
              disabled={busy || !playerName.trim()}
              onClick={handleCreate}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create room
            </Button>
          )}

          {tab === "create" && createdCode && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Share this code with your class:</div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-2xl font-bold tracking-[0.4em] text-center text-primary">
                  {createdCode}
                </div>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {codeCopied ? <CheckCheck className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground text-center">Room expires after 24 hours · No login needed</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function NotesCard() {
  const { settings, setSettings } = useSettings();
  const [open, setOpen] = useState(() => settings.notes.trim().length > 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX = 8000;

  const onUpload = async (file: File) => {
    if (file.size > 200_000) {
      toast.error("File too large. Keep notes under 200KB.");
      return;
    }
    try {
      const text = await file.text();
      const merged = (settings.notes ? settings.notes + "\n\n" : "") + text;
      setSettings({ notes: merged.slice(0, MAX) });
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Couldn't read that file.");
    }
  };

  return (
    <Card className="bg-gradient-card border-border/60 p-4 sm:p-5 space-y-3">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); sfx.click(); }}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <NotebookPen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">My notes <span className="opacity-60">(optional)</span></div>
          <div className="text-sm font-medium truncate">
            {settings.notes.trim()
              ? `${settings.notes.length} chars saved · grounding questions to your syllabus`
              : "Paste class notes so questions stay on-topic"}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-2 animate-pop-in">
          <Textarea
            value={settings.notes}
            onChange={(e) => setSettings({ notes: e.target.value.slice(0, MAX) })}
            placeholder="Paste your syllabus, lecture notes, or key terms here…"
            className="min-h-[140px] text-sm"
            style={{ fontSize: "16px" }}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-muted-foreground">
              {settings.notes.length}/{MAX} chars · used by Boss Rush, Word Guess, HangGuy & Block Master
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload notes
              </Button>
              <span className="text-xs text-muted-foreground">Accepts .txt, .md</span>
              {settings.notes && (
                <Button size="sm" variant="ghost" onClick={() => { setSettings({ notes: "" }); sfx.click(); }}>
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
