import { useEffect } from "react";
import type { AnimeAbility, VfxKind } from "@/lib/animeVfx";

type Props = {
  ability: AnimeAbility;
  onDone: () => void;
};

const DURATION = 1400;

export function AnimeVfx({ ability, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  const color = ability.color;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ ["--vfx-color" as any]: color }}
    >
      {/* Backdrop flash */}
      <div className="absolute inset-0 vfx-backdrop" style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` }} />

      <FxLayer kind={ability.fx} color={color} glyph={ability.glyph} />

      {/* Title card */}
      <div className="absolute inset-x-0 top-[18%] flex flex-col items-center text-center px-4 vfx-title">
        <div
          className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-90"
          style={{ color }}
        >
          {ability.animeLabel} · {ability.character}
        </div>
        <div
          className="font-display text-4xl sm:text-6xl font-black drop-shadow-[0_0_20px_var(--vfx-color)]"
          style={{ color, textShadow: `0 0 30px ${color}, 0 0 60px ${color}` }}
        >
          {ability.name}
        </div>
        {ability.tagline && (
          <div className="mt-1 text-xs sm:text-sm italic opacity-90" style={{ color }}>
            "{ability.tagline}"
          </div>
        )}
      </div>
    </div>
  );
}

function FxLayer({ kind, color, glyph }: { kind: VfxKind; color: string; glyph: string }) {
  switch (kind) {
    case "beam":
      return (
        <div className="absolute inset-0 flex items-center">
          <div
            className="vfx-beam h-24 sm:h-40 w-full"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${color} 30%, white 50%, ${color} 70%, transparent 100%)`, boxShadow: `0 0 80px ${color}` }}
          />
        </div>
      );
    case "slash":
      return (
        <>
          <div
            className="vfx-slash absolute h-2 w-[140%] rotate-[-25deg]"
            style={{ background: `linear-gradient(90deg, transparent, white, ${color}, transparent)`, boxShadow: `0 0 40px ${color}` }}
          />
          <div
            className="vfx-slash-2 absolute h-2 w-[140%] rotate-[20deg]"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, white, transparent)`, boxShadow: `0 0 40px ${color}` }}
          />
        </>
      );
    case "burst":
      return (
        <>
          <div className="vfx-burst absolute rounded-full" style={{ background: color, boxShadow: `0 0 100px 30px ${color}` }} />
          <div className="vfx-burst-ring absolute rounded-full border-4" style={{ borderColor: color }} />
          <div className="text-7xl sm:text-9xl vfx-glyph">{glyph}</div>
        </>
      );
    case "domain":
      return (
        <>
          <div className="vfx-dome absolute rounded-full border-4" style={{ borderColor: color, boxShadow: `inset 0 0 80px ${color}, 0 0 80px ${color}` }} />
          <div className="vfx-dome-2 absolute rounded-full border-2" style={{ borderColor: color }} />
          <div className="text-7xl sm:text-9xl vfx-glyph">{glyph}</div>
        </>
      );
    case "flames":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="vfx-flame absolute bottom-0 text-5xl"
              style={{ left: `${(i / 14) * 100}%`, animationDelay: `${i * 50}ms`, color, filter: `drop-shadow(0 0 20px ${color})` }}
            >
              🔥
            </span>
          ))}
          <div className="absolute inset-0 flex items-center justify-center text-8xl vfx-glyph">{glyph}</div>
        </div>
      );
    case "lightning":
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="vfx-bolt absolute h-full w-1"
              style={{ left: `${20 + i * 20}%`, background: `linear-gradient(180deg, transparent, white, ${color}, white, transparent)`, boxShadow: `0 0 30px ${color}`, animationDelay: `${i * 80}ms` }}
            />
          ))}
          <div className="text-8xl vfx-glyph">{glyph}</div>
        </>
      );
    case "stars":
      return (
        <div className="absolute inset-0">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="vfx-star absolute text-4xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 600}ms`,
                color,
                filter: `drop-shadow(0 0 12px ${color})`,
              }}
            >
              ✦
            </span>
          ))}
          <div className="absolute inset-0 flex items-center justify-center text-8xl vfx-glyph">{glyph}</div>
        </div>
      );
    case "bubbles":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="vfx-bubble absolute bottom-0 rounded-full border-2"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${10 + Math.random() * 30}px`,
                height: `${10 + Math.random() * 30}px`,
                borderColor: color,
                background: `${color.replace(")", " / 0.25)").replace("hsl", "hsla")}`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center text-8xl vfx-glyph">{glyph}</div>
        </div>
      );
    case "ice":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="vfx-ice absolute text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 400}ms`,
                color,
                filter: `drop-shadow(0 0 10px ${color})`,
              }}
            >
              ❄
            </span>
          ))}
          <div className="absolute inset-0 flex items-center justify-center text-8xl vfx-glyph">{glyph}</div>
        </div>
      );
    case "stand":
      return (
        <>
          <div className="absolute inset-0 vfx-aura" style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 50%)` }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="vfx-ora absolute font-display font-black text-3xl sm:text-5xl"
              style={{
                left: `${15 + (i % 4) * 20}%`,
                top: `${30 + Math.floor(i / 4) * 30}%`,
                color,
                textShadow: `0 0 20px ${color}`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              {i % 2 ? "ORA!" : "MUDA!"}
            </span>
          ))}
        </>
      );
    case "blood":
      return (
        <div className="absolute inset-0 vfx-burst" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 60%)` }}>
          <div className="absolute inset-0 flex items-center justify-center text-8xl vfx-glyph">{glyph}</div>
        </div>
      );
  }
}
