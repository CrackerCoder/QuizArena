import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

interface ShareButtonProps {
  game: "boss" | "wordle" | "hangman" | "blocks";
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
}

const GAME_PATH: Record<string, string> = {
  boss: "/boss",
  wordle: "/wordle",
  hangman: "/hangman",
  blocks: "/blocks",
};

export function ShareButton({ game, size = "sm", variant = "outline" }: ShareButtonProps) {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const base = window.location.origin + (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const params = new URLSearchParams({
      subject: settings.subject,
      topic: settings.topicName || settings.topic,
      difficulty: settings.difficulty,
      level: settings.educationLevel,
    });
    const url = `${base}${GAME_PATH[game]}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied! Share it with your class.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link — please copy it manually: " + url);
    }
  };

  return (
    <Button size={size} variant={variant} onClick={share} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
