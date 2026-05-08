import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings, EDUCATION_LEVELS, EducationLevel, Difficulty, combineTopic } from "@/lib/settings";
import { Sparkles, Pencil, Wand2, Loader2, X, Zap } from "lucide-react";
import { sfx } from "@/lib/sound";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { saveTopicHistory } from "@/lib/history";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; activeClass: string }[] = [
  { value: "easy", label: "Easy", activeClass: "border-success/70 bg-success/15 text-success font-bold" },
  { value: "medium", label: "Medium", activeClass: "border-warning/70 bg-warning/15 text-warning font-bold" },
  { value: "hard", label: "Hard", activeClass: "border-boss/70 bg-boss/15 text-boss font-bold" },
];

export function TopicEditor({ compact = false }: { compact?: boolean }) {
  const { settings, setSettings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(settings.subject);
  const [topicName, setTopicName] = useState(settings.topicName || settings.topic);
  const [busy, setBusy] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setSubject(settings.subject);
      setTopicName(settings.topicName || settings.topic);
      setTimeout(() => subjectRef.current?.focus(), 30);
    }
  }, [editing, settings.subject, settings.topicName, settings.topic]);

  const commit = async () => {
    let s = subject.trim();
    let t = topicName.trim();
    if (!s && !t) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const fixed = await api.autocorrectTopic(s, t);
      s = fixed.subject?.trim() || s;
      t = fixed.topic?.trim() || t;
      if (fixed.changed) toast.success(`Autocorrected: ${[s, t].filter(Boolean).join(" — ")}`);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
    const combined = combineTopic(s, t);
    setSettings({ subject: s, topicName: t, topic: combined });
    saveTopicHistory({ subject: s, topicName: t, topic: combined, educationLevel: settings.educationLevel, difficulty: settings.difficulty });
    sfx.click();
    setEditing(false);
  };

  const display = combineTopic(settings.subject, settings.topicName) || settings.topic;
  const currentDiff = DIFFICULTY_OPTIONS.find((d) => d.value === settings.difficulty) ?? DIFFICULTY_OPTIONS[1];

  if (editing) {
    return (
      <Card className="bg-gradient-card border-border/60 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-gradient-hero flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-sm font-medium">Edit subject &amp; topic</div>
          <button onClick={() => setEditing(false)} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="te-subject" className="text-xs">Subject</Label>
            <Input
              id="te-subject"
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              placeholder="e.g. Biology"
              style={{ fontSize: "16px" }}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="te-topic" className="text-xs">Topic</Label>
            <Input
              id="te-topic"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
              placeholder="e.g. Photosynthesis"
              style={{ fontSize: "16px" }}
              className="h-9"
            />
          </div>
        </div>
        {!compact && (
          <>
            <Select
              value={settings.educationLevel}
              onValueChange={(v) => { setSettings({ educationLevel: v as EducationLevel }); sfx.click(); }}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Difficulty
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSettings({ difficulty: opt.value }); sfx.click(); }}
                    className={`rounded-lg border-2 px-2 py-1.5 text-center text-xs transition-all ${
                      settings.difficulty === opt.value
                        ? opt.activeClass
                        : "border-border/50 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <Button onClick={commit} disabled={busy} className="w-full h-9">
          {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Autocorrecting…</> : <><Wand2 className="h-4 w-4 mr-2" /> Save (auto-fix typos)</>}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border/60 px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-gradient-hero flex items-center justify-center shadow-glow shrink-0">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>
      <button onClick={() => setEditing(true)} className="flex-1 min-w-0 text-left hover:text-primary transition-colors" title="Click to change subject & topic">
        <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          Studying <Pencil className="h-3 w-3 opacity-60" />
        </div>
        <div className="font-medium truncate">
          {display || <span className="text-muted-foreground italic">Tap to choose…</span>}
        </div>
      </button>
      {!compact && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const opts: Difficulty[] = ["easy", "medium", "hard"];
              const next = opts[(opts.indexOf(settings.difficulty) + 1) % opts.length];
              setSettings({ difficulty: next });
              sfx.click();
            }}
            className={`rounded-md border px-2.5 py-1 text-xs transition-all ${currentDiff.activeClass}`}
            title="Click to change difficulty"
          >
            <Zap className="h-3 w-3 inline mr-1" />
            {currentDiff.label}
          </button>
          <Select
            value={settings.educationLevel}
            onValueChange={(v) => { setSettings({ educationLevel: v as EducationLevel }); sfx.click(); }}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Card>
  );
}
