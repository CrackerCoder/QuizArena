import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface Props {
  icon: string;
  title: string;
  steps: string[];
  onDismiss: () => void;
}

export function GameTutorial({ icon, title, steps, onDismiss }: Props) {
  const content = (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div
        className="bg-card border border-border/60 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">How to play</p>
          </div>
        </div>

        <ul className="space-y-2.5 mb-5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] flex items-center justify-center shrink-0 font-bold">
                {i + 1}
              </span>
              <span className="text-foreground/80 leading-snug">{step}</span>
            </li>
          ))}
        </ul>

        <Button className="w-full" onClick={onDismiss}>
          Got it, let's play!
        </Button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
