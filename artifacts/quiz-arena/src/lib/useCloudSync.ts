/**
 * useCloudSync — automatically syncs local settings + stats to the cloud
 * when the user is signed in (Replit Auth, cookie-based).
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { pushToCloud, pullFromCloud } from "@/lib/cloudSync";

const STATS_KEY = "quiz-arena-history";

function getLocalStats(): Array<Record<string, unknown>> {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

export function useCloudSync() {
  const { user, isAuthenticated } = useAuth();
  const { settings, setSettings } = useSettings();
  const pulledRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // On sign-in: pull cloud data and merge into local settings
  useEffect(() => {
    if (!isAuthenticated || !user) {
      pulledRef.current = false;
      lastUserIdRef.current = null;
      return;
    }
    if (pulledRef.current && lastUserIdRef.current === user.id) return;
    pulledRef.current = true;
    lastUserIdRef.current = user.id;

    (async () => {
      const cloud = await pullFromCloud();
      if (!cloud?.settings) return;

      const s = cloud.settings;
      setSettings({
        subject: s.subject || settings.subject,
        topicName: s.topicName || settings.topicName,
        topic: s.topic || settings.topic,
        educationLevel: (s.educationLevel || settings.educationLevel) as never,
        difficulty: (s.difficulty || settings.difficulty) as never,
        language: (s.language || settings.language) as never,
        soundEnabled: s.soundEnabled ?? settings.soundEnabled,
        theme: (s.theme || settings.theme) as never,
        animations: s.animations ?? settings.animations,
        highContrast: s.highContrast ?? settings.highContrast,
        fontSize: (s.fontSize || settings.fontSize) as never,
        backgroundFx: s.backgroundFx ?? settings.backgroundFx,
        notes: s.notes ?? settings.notes,
        onboarded: s.onboarded ?? settings.onboarded,
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Debounced push every time settings change while signed in
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Student";

    const timer = setTimeout(async () => {
      const localStats = getLocalStats();
      await pushToCloud(displayName, settings as never, localStats as never);
    }, 3000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, JSON.stringify(settings)]);
}
