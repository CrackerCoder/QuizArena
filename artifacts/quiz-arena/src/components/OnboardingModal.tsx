import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings, EDUCATION_LEVELS, EducationLevel } from "@/lib/settings";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { sfx } from "@/lib/sound";

export function OnboardingModal() {
  const { settings, setSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(settings.educationLevel);

  useEffect(() => {
    if (!settings.onboarded || !settings.topic) {
      setOpen(true);
      setTopic(settings.topic);
      setEducationLevel(settings.educationLevel);
    }
  }, [settings.onboarded, settings.topic, settings.educationLevel]);

  const start = () => {
    const t = topic.trim();
    if (!t) return;
    setSettings({ topic: t, educationLevel, onboarded: true });
    sfx.win();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && topic.trim()) setOpen(false); }}>
      <DialogContent
        className="bg-gradient-card border-border/60 max-w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6 gap-3 sm:gap-4"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow mb-1 sm:mb-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="font-display text-center text-xl sm:text-2xl">Welcome to Quiz Arena</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Choose your topic and education level to get started. You can change them anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4 py-1 sm:py-2">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="onboard-topic">Choose your topic</Label>
            <Input
              id="onboard-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder="e.g. Photosynthesis, Algebra"
              className="text-base"
              style={{ fontSize: "16px" }}
              enterKeyHint="go"
              autoComplete="off"
              autoCapitalize="sentences"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label>Education level</Label>
            <Select value={educationLevel} onValueChange={(v) => setEducationLevel(v as EducationLevel)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[40dvh]">
                {EDUCATION_LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-gradient-card pt-2 -mx-4 sm:mx-0 px-4 sm:px-0">
          <Button onClick={start} disabled={!topic.trim()} className="w-full h-11">
            Start playing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
