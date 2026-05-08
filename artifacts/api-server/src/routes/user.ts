import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function clerkAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("bad token");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { sub?: string; email?: string };
    if (!payload.sub) throw new Error("missing sub");
    (req as Request & { clerkId: string; clerkEmail: string }).clerkId = payload.sub;
    (req as Request & { clerkId: string; clerkEmail: string }).clerkEmail = payload.email ?? "";
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

type AuthedRequest = Request & { clerkId: string; clerkEmail: string };

router.post("/user/sync", clerkAuth, async (req: Request, res: Response) => {
  const { clerkId, clerkEmail } = req as AuthedRequest;
  const { settings, stats, displayName } = req.body as {
    settings?: Record<string, unknown>;
    stats?: Array<Record<string, unknown>>;
    displayName?: string;
  };

  try {
    await pool.query(
      `INSERT INTO user_profiles (clerk_id, email, display_name, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (clerk_id) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
           updated_at = EXCLUDED.updated_at`,
      [clerkId, clerkEmail, displayName ?? null, Date.now()]
    );

    if (settings) {
      await pool.query(
        `INSERT INTO user_settings (
          clerk_id, subject, topic_name, topic, education_level, difficulty,
          language, sound_enabled, theme, animations, high_contrast, font_size,
          background_fx, notes, onboarded, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (clerk_id) DO UPDATE SET
          subject = EXCLUDED.subject,
          topic_name = EXCLUDED.topic_name,
          topic = EXCLUDED.topic,
          education_level = EXCLUDED.education_level,
          difficulty = EXCLUDED.difficulty,
          language = EXCLUDED.language,
          sound_enabled = EXCLUDED.sound_enabled,
          theme = EXCLUDED.theme,
          animations = EXCLUDED.animations,
          high_contrast = EXCLUDED.high_contrast,
          font_size = EXCLUDED.font_size,
          background_fx = EXCLUDED.background_fx,
          notes = EXCLUDED.notes,
          onboarded = EXCLUDED.onboarded,
          updated_at = EXCLUDED.updated_at`,
        [
          clerkId,
          settings.subject ?? "",
          settings.topicName ?? "",
          settings.topic ?? "",
          settings.educationLevel ?? "spm",
          settings.difficulty ?? "medium",
          settings.language ?? "english",
          settings.soundEnabled ?? true,
          settings.theme ?? "arcade",
          settings.animations ?? true,
          settings.highContrast ?? false,
          settings.fontSize ?? "md",
          settings.backgroundFx ?? true,
          settings.notes ?? "",
          settings.onboarded ?? false,
          Date.now(),
        ]
      );
    }

    if (Array.isArray(stats) && stats.length > 0) {
      for (const entry of stats) {
        await pool.query(
          `INSERT INTO user_stats (clerk_id, game, topic, education_level, difficulty, outcome, score, details, played_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            clerkId,
            entry.game ?? "",
            entry.topic ?? null,
            entry.educationLevel ?? null,
            entry.difficulty ?? null,
            entry.outcome ?? "loss",
            entry.score ?? 0,
            JSON.stringify(entry.details ?? {}),
            entry.playedAt ?? Date.now(),
          ]
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[user/sync]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/data", clerkAuth, async (req: Request, res: Response) => {
  const { clerkId } = req as AuthedRequest;
  try {
    const [profileRes, settingsRes, statsRes] = await Promise.all([
      pool.query("SELECT * FROM user_profiles WHERE clerk_id=$1", [clerkId]),
      pool.query("SELECT * FROM user_settings WHERE clerk_id=$1", [clerkId]),
      pool.query(
        "SELECT * FROM user_stats WHERE clerk_id=$1 ORDER BY played_at DESC LIMIT 200",
        [clerkId]
      ),
    ]);

    res.json({
      profile: profileRes.rows[0] ?? null,
      settings: settingsRes.rows[0] ?? null,
      stats: statsRes.rows,
    });
  } catch (err) {
    console.error("[user/data]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
