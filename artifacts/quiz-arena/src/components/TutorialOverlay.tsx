import { useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";

export interface TutorialStep {
  targetId?: string;
  title: string;
  message: string;
}

interface Props {
  steps: TutorialStep[];
  onFinish: () => void;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const PAD = 12;
const TOOLTIP_W = 288;

export function TutorialOverlay({ steps, onFinish }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const updateRect = useCallback(() => {
    if (!step?.targetId) {
      setRect(null);
      return;
    }
    const el = document.getElementById(step.targetId);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [step?.targetId]);

  useLayoutEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const next = () => {
    if (isLast) onFinish();
    else setStepIdx((i) => i + 1);
  };

  const vw = typeof window !== "undefined" ? window.innerWidth : 375;
  const vh = typeof window !== "undefined" ? window.innerHeight : 667;

  let tooltipLeft = rect
    ? rect.left + rect.width / 2 - TOOLTIP_W / 2
    : vw / 2 - TOOLTIP_W / 2;
  tooltipLeft = Math.max(12, Math.min(vw - TOOLTIP_W - 12, tooltipLeft));

  let tooltipTop: number;
  if (!rect) {
    tooltipTop = vh / 2 - 90;
  } else if (rect.bottom + PAD + 8 + 160 < vh) {
    tooltipTop = rect.bottom + PAD + 8;
  } else {
    tooltipTop = Math.max(8, rect.top - PAD - 8 - 170);
  }

  const clipPath = rect
    ? `polygon(
        0% 0%, 0% 100%,
        ${rect.left - PAD}px 100%,
        ${rect.left - PAD}px ${rect.top - PAD}px,
        ${rect.right + PAD}px ${rect.top - PAD}px,
        ${rect.right + PAD}px ${rect.bottom + PAD}px,
        ${rect.left - PAD}px ${rect.bottom + PAD}px,
        ${rect.left - PAD}px 100%,
        100% 100%, 100% 0%
      )`
    : undefined;

  const content = (
    <div className="fixed inset-0 z-[300]" aria-modal="true" aria-label="Tutorial">
      <div
        className="absolute inset-0 bg-black/75 transition-all duration-300"
        style={{ clipPath }}
        onClick={onFinish}
      />

      {rect && (
        <div
          className="absolute rounded-xl border-2 border-primary pointer-events-none"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 4px hsla(var(--primary) / 0.25), 0 0 24px 4px hsla(var(--primary) / 0.15)",
          }}
        />
      )}

      <div
        className="absolute bg-card border border-border/80 shadow-2xl rounded-2xl p-4 animate-pop-in"
        style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-bold text-sm leading-snug">{step.title}</h3>
          <button
            onClick={onFinish}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 -mt-0.5"
            aria-label="Skip tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.message}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === stepIdx ? "w-5 bg-primary" : "w-2 bg-border"}`}
              />
            ))}
          </div>
          <Button size="sm" onClick={next} className="h-7 text-xs px-3 gap-1">
            {isLast ? "Done" : <>Next <ChevronRight className="h-3 w-3" /></>}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
