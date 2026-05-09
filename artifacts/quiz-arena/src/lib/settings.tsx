import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const EDUCATION_LEVELS = [
  { value: "primary", label: "Primary School (SK/SJK)" },
  { value: "pt3", label: "PT3 (Form 3)" },
  { value: "spm", label: "SPM (Form 5)" },
  { value: "stpm", label: "STPM (Form 6)" },
  { value: "igcse", label: "IGCSE" },
  { value: "o-level", label: "O Level" },
  { value: "a-level", label: "A Level" },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];

export const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "malay", label: "Bahasa Melayu" },
  { value: "mandarin", label: "Mandarin (中文)" },
  { value: "tamil", label: "Tamil (தமிழ்)" },
  { value: "manglish", label: "Manglish (BM + English mix)" },
  { value: "mandarin-english", label: "Mandarin-English mix (中英混合)" },
  { value: "mandarin-malay", label: "Mandarin-Melayu mix (中马混合)" },
  { value: "tamil-english", label: "Tamil-English mix (தமிழ்-English)" },
] as const;
export type Language = (typeof LANGUAGES)[number]["value"];

export const THEMES = [
  { value: "arcade", label: "Arcade (default)" },
  { value: "midnight", label: "Midnight Blue" },
  { value: "neon", label: "Neon Sunset" },
  { value: "forest", label: "Forest" },
  { value: "light", label: "Daylight" },
] as const;
export type ThemeName = (typeof THEMES)[number]["value"];

export const FONT_SIZES = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
] as const;
export type FontSize = (typeof FONT_SIZES)[number]["value"];

export type Difficulty = "easy" | "medium" | "hard";

export type Settings = {
  subject: string;
  topicName: string;
  topic: string;
  educationLevel: EducationLevel;
  difficulty: Difficulty;
  language: Language;
  onboarded: boolean;
  soundEnabled: boolean;
  theme: ThemeName;
  animations: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  backgroundFx: boolean;
  notes: string;
};

const KEY = "quiz-arena-settings";
const DEFAULT: Settings = {
  subject: "",
  topicName: "",
  topic: "",
  educationLevel: "spm",
  difficulty: "medium",
  language: "english",
  onboarded: false,
  soundEnabled: true,
  theme: "arcade",
  animations: true,
  highContrast: false,
  fontSize: "md",
  backgroundFx: true,
  notes: "",
};

const VALID_LANGUAGES = new Set<string>(LANGUAGES.map((l) => l.value));

export function combineTopic(subject: string, topicName: string) {
  const s = subject.trim();
  const t = topicName.trim();
  if (s && t) return `${s} — ${t}`;
  return s || t;
}

type Ctx = {
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT;
      const parsed = JSON.parse(raw);
      if (parsed.difficulty && !parsed.educationLevel) {
        parsed.educationLevel = "spm";
      }
      // Migrate removed languages (e.g. "hindi") to "english"
      if (parsed.language && !VALID_LANGUAGES.has(parsed.language)) {
        parsed.language = "english";
      }
      return { ...DEFAULT, ...parsed };
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.animations = settings.animations ? "on" : "off";
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.bgfx = settings.backgroundFx ? "on" : "off";
  }, [settings.theme, settings.fontSize, settings.animations, settings.highContrast, settings.backgroundFx]);

  const update = (s: Partial<Settings>) =>
    setSettingsState((prev) => ({ ...prev, ...s }));

  return (
    <SettingsContext.Provider value={{ settings, setSettings: update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function educationLabel(value: EducationLevel) {
  return EDUCATION_LEVELS.find((l) => l.value === value)?.label ?? value;
}
