import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider, useSettings, combineTopic, type EducationLevel, type Difficulty } from "@/lib/settings";
import { RoomProvider } from "@/lib/room";
import { AssignmentProvider, useAssignment } from "@/lib/assignment";
import { useCloudSync } from "@/lib/useCloudSync";

import { setSoundEnabled } from "@/lib/sound";
import Home from "./pages/Home";
import BossRush from "./pages/BossRush";
import Wordle from "./pages/Wordle";
import Hangman from "./pages/Hangman";
import Blocks from "./pages/Blocks";
import Crossword from "./pages/Crossword";
import Anagram from "./pages/Anagram";
import FillBlank from "./pages/FillBlank";
import Debate from "./pages/Debate";
import Flashcard from "./pages/Flashcard";
import Stats from "./pages/Stats";
import Teacher from "./pages/Teacher";
import NotFound from "./pages/NotFound";

function SoundSync() {
  const { settings } = useSettings();
  useEffect(() => { setSoundEnabled(settings.soundEnabled); }, [settings.soundEnabled]);
  return null;
}

function CloudSyncBridge() {
  useCloudSync();
  return null;
}

const VALID_LEVELS = ["upsr", "pt3", "igcse", "o-level", "spm", "a-level"];
const VALID_DIFFS = ["easy", "medium", "hard"];

function URLParamLoader() {
  const { setSettings } = useSettings();
  const { joinAssignment, session } = useAssignment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get("subject")?.trim();
    const topic = params.get("topic")?.trim();
    const difficulty = params.get("difficulty")?.trim();
    const level = params.get("level")?.trim();
    const joinCode = params.get("join")?.trim().toUpperCase();

    // Clean URL immediately
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());

    // Auto-fill topic settings
    if (subject || topic) {
      const patch: Record<string, string | boolean> = {};
      if (subject) patch.subject = subject;
      if (topic) patch.topicName = topic;
      if (subject || topic) {
        patch.topic = combineTopic(subject || "", topic || "");
        patch.onboarded = true;
      }
      if (difficulty && VALID_DIFFS.includes(difficulty)) patch.difficulty = difficulty as Difficulty;
      if (level && VALID_LEVELS.includes(level)) patch.educationLevel = level as EducationLevel;
      setSettings(patch);
    }

    // Auto-join assignment from link
    if (joinCode && !session) {
      const savedName = localStorage.getItem("quiz-arena-player-name");
      const playerName = savedName ?? "";
      if (playerName) {
        joinAssignment(joinCode, playerName).catch(() => {});
      } else {
        // Store pending join code; AssignmentJoinPrompt on Home will pick it up
        sessionStorage.setItem("quiz-arena-pending-join", joinCode);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <RoomProvider>
        <AssignmentProvider>
          <SoundSync />
          <CloudSyncBridge />
          <URLParamLoader />
          <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" richColors />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/boss" component={BossRush} />
              <Route path="/wordle" component={Wordle} />
              <Route path="/hangman" component={Hangman} />
              <Route path="/blocks" component={Blocks} />
              <Route path="/crossword" component={Crossword} />
              <Route path="/anagram" component={Anagram} />
              <Route path="/fillblank" component={FillBlank} />
              <Route path="/debate" component={Debate} />
              <Route path="/flashcard" component={Flashcard} />
              <Route path="/stats" component={Stats} />
              <Route path="/teacher" component={Teacher} />
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
          </TooltipProvider>
        </AssignmentProvider>
      </RoomProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
