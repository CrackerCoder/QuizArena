/**
 * Cloud sync — pushes local settings + stats to the api-server
 * using cookie-based session auth (Replit Auth).
 */
const SYNC_URL = "/api/user/sync";
const DATA_URL = "/api/user/data";

export interface SettingsSnapshot {
  subject: string;
  topicName: string;
  topic: string;
  educationLevel: string;
  difficulty: string;
  language: string;
  soundEnabled: boolean;
  theme: string;
  animations: boolean;
  highContrast: boolean;
  fontSize: string;
  backgroundFx: boolean;
  notes: string;
  onboarded: boolean;
}

export interface StatEntry {
  game: string;
  topic?: string;
  educationLevel?: string;
  difficulty?: string;
  outcome: "win" | "loss";
  score: number;
  details?: Record<string, unknown>;
  playedAt?: number;
}

export async function pushToCloud(
  displayName: string,
  settings: SettingsSnapshot,
  stats: StatEntry[]
): Promise<boolean> {
  try {
    const res = await fetch(SYNC_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, stats, displayName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface CloudData {
  settings: SettingsSnapshot | null;
  stats: StatEntry[];
}

export async function pullFromCloud(): Promise<CloudData | null> {
  try {
    const res = await fetch(DATA_URL, { credentials: "include" });
    if (!res.ok) return null;
    type DBSettings = {
      subject?: string;
      topic_name?: string;
      topic?: string;
      education_level?: string;
      difficulty?: string;
      language?: string;
      sound_enabled?: boolean;
      theme?: string;
      animations?: boolean;
      high_contrast?: boolean;
      font_size?: string;
      background_fx?: boolean;
      notes?: string;
      onboarded?: boolean;
    };
    const json = (await res.json()) as {
      settings: DBSettings | null;
      stats: Array<{
        game: string;
        topic: string;
        education_level: string;
        difficulty: string;
        outcome: string;
        score: number;
        details: Record<string, unknown>;
        played_at: number;
      }>;
    };
    const dbS = json.settings;
    const mappedSettings: SettingsSnapshot | null = dbS
      ? {
          subject: dbS.subject ?? "",
          topicName: dbS.topic_name ?? "",
          topic: dbS.topic ?? "",
          educationLevel: dbS.education_level ?? "spm",
          difficulty: dbS.difficulty ?? "medium",
          language: dbS.language ?? "english",
          soundEnabled: dbS.sound_enabled ?? true,
          theme: dbS.theme ?? "arcade",
          animations: dbS.animations ?? true,
          highContrast: dbS.high_contrast ?? false,
          fontSize: dbS.font_size ?? "md",
          backgroundFx: dbS.background_fx ?? true,
          notes: dbS.notes ?? "",
          onboarded: dbS.onboarded ?? false,
        }
      : null;
    return {
      settings: mappedSettings,
      stats: (json.stats ?? []).map((s) => ({
        game: s.game,
        topic: s.topic,
        educationLevel: s.education_level,
        difficulty: s.difficulty,
        outcome: s.outcome as "win" | "loss",
        score: s.score,
        details: s.details,
        playedAt: s.played_at,
      })),
    };
  } catch {
    return null;
  }
}
