import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Flag, ChevronDown } from "lucide-react";
import { sfx } from "@/lib/sound";
import type { EducationLevel } from "@/lib/settings";
import { PRESET_CATEGORIES, type Preset } from "@/lib/presets";

interface Props {
  onApply: (p: Preset) => void;
  busy?: boolean;
  size?: "sm" | "default";
}

export function QuickStartPopover({ onApply, busy = false, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);

  const handle = (p: Preset) => {
    setOpen(false);
    onApply(p);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
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
