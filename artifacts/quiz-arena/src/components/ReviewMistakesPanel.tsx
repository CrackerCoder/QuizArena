import { useRef, useState } from "react";
import { api, type MistakeEntry, type MistakeExplanation } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sound";

export function ReviewMistakesPanel({
  mistakes,
  topic,
  educationLevel,
}: {
  mistakes: MistakeEntry[];
  topic: string;
  educationLevel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanations, setExplanations] = useState<MistakeExplanation[]>([]);
  const fetched = useRef(false);

  const fetchExplanations = async () => {
    if (fetched.current || mistakes.length === 0) return;
    fetched.current = true;
    setLoading(true);
    try {
      const result = await api.explainMistakes(topic, educationLevel, mistakes);
      setExplanations(result.explanations ?? []);
    } catch {
      toast.error("Couldn't load explanations.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open && !fetched.current) fetchExplanations();
    setOpen((o) => !o);
    sfx.click();
  };

  if (mistakes.length === 0) return null;

  return (
    <Card className="bg-gradient-card border-border/60 overflow-hidden animate-pop-in">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="h-9 w-9 rounded-md bg-destructive/20 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Review Mistakes</div>
          <div className="text-xs text-muted-foreground">
            {mistakes.length} wrong answer{mistakes.length !== 1 ? "s" : ""} · tap for AI explanations
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating explanations…
            </div>
          )}
          {!loading && explanations.length === 0 && mistakes.map((m, i) => (
            <div key={i} className="rounded-md bg-secondary/40 p-3 space-y-1">
              <div className="text-xs font-medium text-destructive">Q{i + 1}: {m.question}</div>
              <div className="text-xs text-muted-foreground">
                Your answer: <span className="text-foreground/70">{m.yourAnswer || "(blank)"}</span>
              </div>
              <div className="text-xs text-success">Correct: {m.correctAnswer}</div>
            </div>
          ))}
          {explanations.map((e, i) => (
            <div key={i} className="rounded-md bg-secondary/40 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground/90">{e.question}</div>
              <div className="text-xs text-success font-medium">✓ {e.correctAnswer}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{e.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
