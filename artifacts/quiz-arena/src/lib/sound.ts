// Lightweight Web Audio synth — no assets, instant playback.
let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

type ToneOpts = {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
};

function tone({ freq, duration = 0.12, type = "sine", volume = 0.18, slideTo }: ToneOpts) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

function noise(duration = 0.15, volume = 0.12) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(c.destination);
  src.start();
}

export const sfx = {
  click: () => tone({ freq: 480, duration: 0.05, type: "square", volume: 0.08 }),
  type: () => tone({ freq: 320 + Math.random() * 80, duration: 0.04, type: "square", volume: 0.06 }),
  correct: () => {
    tone({ freq: 660, duration: 0.1, type: "triangle", volume: 0.18 });
    setTimeout(() => tone({ freq: 880, duration: 0.14, type: "triangle", volume: 0.18 }), 90);
  },
  wrong: () => tone({ freq: 200, slideTo: 110, duration: 0.3, type: "sawtooth", volume: 0.18 }),
  hit: () => {
    tone({ freq: 420, slideTo: 140, duration: 0.18, type: "square", volume: 0.2 });
    noise(0.1, 0.08);
  },
  hurt: () => {
    tone({ freq: 180, slideTo: 90, duration: 0.25, type: "sawtooth", volume: 0.2 });
  },
  place: () => tone({ freq: 380, duration: 0.07, type: "square", volume: 0.1 }),
  clear: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.12, type: "triangle", volume: 0.18 }), i * 70)
    );
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.18, type: "triangle", volume: 0.2 }), i * 110)
    );
  },
  lose: () => {
    [440, 370, 311, 247].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.2, type: "sawtooth", volume: 0.18 }), i * 130)
    );
  },
  flip: () => tone({ freq: 540, duration: 0.06, type: "triangle", volume: 0.1 }),
  combo: () => {
    [659, 784, 988, 1175, 1397].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.1, type: "triangle", volume: 0.18 }), i * 60),
    );
  },
  sparkle: () => {
    [1200, 1600, 2000].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.08, type: "sine", volume: 0.1 }), i * 40),
    );
  },
  whoosh: () => {
    tone({ freq: 800, slideTo: 200, duration: 0.25, type: "sine", volume: 0.12 });
    noise(0.2, 0.06);
  },
  bonus: () => {
    [523, 784, 1047, 1568].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.14, type: "triangle", volume: 0.2 }), i * 80),
    );
  },
};

// ===== Anime ability SFX presets =====
export const animeSfx = {
  sword: () => {
    tone({ freq: 1800, slideTo: 600, duration: 0.18, type: "sawtooth", volume: 0.15 });
    setTimeout(() => noise(0.08, 0.1), 60);
  },
  blast: () => {
    tone({ freq: 120, slideTo: 800, duration: 0.4, type: "sawtooth", volume: 0.18 });
    noise(0.5, 0.14);
    setTimeout(() => tone({ freq: 200, slideTo: 60, duration: 0.5, type: "sine", volume: 0.2 }), 200);
  },
  thunder: () => {
    noise(0.25, 0.18);
    setTimeout(() => tone({ freq: 80, slideTo: 40, duration: 0.4, type: "sawtooth", volume: 0.22 }), 80);
    setTimeout(() => noise(0.15, 0.12), 250);
  },
  domain: () => {
    [110, 165, 220, 330].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.5, type: "sine", volume: 0.18 }), i * 80)
    );
    setTimeout(() => noise(0.6, 0.08), 200);
  },
  fire: () => {
    noise(0.6, 0.14);
    tone({ freq: 220, slideTo: 110, duration: 0.5, type: "sawtooth", volume: 0.15 });
  },
  bubble: () => {
    [400, 520, 660, 540, 720].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.08, type: "sine", volume: 0.14 }), i * 50)
    );
  },
  punch: () => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        tone({ freq: 380 + Math.random() * 120, slideTo: 120, duration: 0.08, type: "square", volume: 0.16 });
        noise(0.05, 0.08);
      }, i * 70);
    }
  },
  rumble: () => {
    tone({ freq: 60, duration: 0.7, type: "sawtooth", volume: 0.22 });
    noise(0.7, 0.14);
  },
  ice: () => {
    [1200, 1500, 1800, 2100].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, slideTo: f * 0.6, duration: 0.18, type: "triangle", volume: 0.12 }), i * 60)
    );
  },
};

export type AnimeSfxKind = keyof typeof animeSfx;
