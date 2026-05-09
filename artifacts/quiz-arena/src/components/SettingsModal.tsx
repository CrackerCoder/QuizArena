import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, X, BookOpen } from "lucide-react";
import {
  useSettings,
  EDUCATION_LEVELS,
  EducationLevel,
  LANGUAGES,
  Language,
  THEMES,
  ThemeName,
  FONT_SIZES,
  FontSize,
} from "@/lib/settings";
import { useState, useEffect } from "react";
import { sfx, setSoundEnabled } from "@/lib/sound";
import { useT } from "@/lib/i18n";
import { resetAllTutorials } from "@/lib/tutorial";

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings, setSettings } = useSettings();
  const t = useT();
  const [topic, setTopic] = useState(settings.topic);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(settings.educationLevel);
  const [language, setLanguage] = useState<Language>(settings.language ?? "english");
  const [soundEnabled, setSoundLocal] = useState(settings.soundEnabled);
  const [theme, setTheme] = useState<ThemeName>(settings.theme);
  const [animations, setAnimations] = useState(settings.animations);
  const [highContrast, setHighContrast] = useState(settings.highContrast);
  const [fontSize, setFontSize] = useState<FontSize>(settings.fontSize);
  const [backgroundFx, setBackgroundFx] = useState(settings.backgroundFx);
  const [notes, setNotes] = useState(settings.notes);

  useEffect(() => {
    if (open) {
      setTopic(settings.topic);
      setEducationLevel(settings.educationLevel);
      setLanguage(settings.language ?? "english");
      setSoundLocal(settings.soundEnabled);
      setTheme(settings.theme);
      setAnimations(settings.animations);
      setHighContrast(settings.highContrast);
      setFontSize(settings.fontSize);
      setBackgroundFx(settings.backgroundFx);
      setNotes(settings.notes);
    }
  }, [open, settings]);

  const handleNotesUpload = async (file: File) => {
    if (file.size > 500_000) {
      toast.error(t("fileTooLarge"));
      return;
    }
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
    if (!isText) {
      toast.error(t("fileTypeError"));
      return;
    }
    try {
      const text = await file.text();
      setNotes((prev) => (prev ? prev + "\n\n" + text : text));
      toast.success(t("fileLoaded", { filename: file.name }));
    } catch {
      toast.error(t("fileReadError"));
    }
  };

  const save = () => {
    const newTopic = topic.trim() || settings.topic;
    const topicChanged = newTopic !== settings.topic;
    setSettings({
      topic: newTopic,
      ...(topicChanged ? { subject: "", topicName: newTopic } : {}),
      educationLevel,
      language,
      soundEnabled,
      theme,
      animations,
      highContrast,
      fontSize,
      backgroundFx,
      notes,
    });
    setSoundEnabled(soundEnabled);
    sfx.click();
    onOpenChange(false);
  };

  const MIX_LANGS = new Set(["manglish", "mandarin-english", "mandarin-malay", "tamil-english"]);
  const langDesc =
    language === "english" ? "Questions and answers in pure English."
    : language === "malay" ? "Soalan dan jawapan dalam Bahasa Melayu standard."
    : language === "mandarin" ? "题目和答案用简体中文。"
    : language === "tamil" ? "கேள்விகளும் விடைகளும் தமிழில்."
    : language === "manglish" ? "Manglish — a natural Malaysian mix of Bahasa Melayu and English, the way Malaysians actually speak."
    : language === "mandarin-english" ? "Mandarin-English mix (中英混合) — sentences naturally blend 中文 and English together."
    : language === "mandarin-malay" ? "Mandarin-Melayu mix (中马混合) — sentences naturally blend 中文 and Bahasa Melayu together."
    : language === "tamil-english" ? "Tamil-English mix — questions and content blend தமிழ் and English naturally."
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-card border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{t("settingsTitle")}</DialogTitle>
          <DialogDescription>{t("settingsDesc")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="study" className="py-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="study">{t("tabStudy")}</TabsTrigger>
            <TabsTrigger value="notes">{t("tabNotes")}</TabsTrigger>
            <TabsTrigger value="visual">{t("tabVisual")}</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="notes">{t("notesLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("notesDesc")}</p>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesDesc")}
              className="min-h-[180px] font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border/60 bg-secondary/40 hover:bg-secondary cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {t("uploadNotes")}
                <input
                  type="file"
                  accept=".txt,.md,.csv,text/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleNotesUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">{t("acceptsFiles")}</span>
              {notes && (
                <>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {notes.length.toLocaleString()} chars
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setNotes("")} className="text-xs">
                    <X className="h-3 w-3 mr-1" /> {t("clearNotes")}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="study" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="topic">{t("topicLabel")}</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("topicPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("educationLevelLabel")}</Label>
              <Select value={educationLevel} onValueChange={(v) => setEducationLevel(v as EducationLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("languageLabel")}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {langDesc && (
                <p className="text-xs text-muted-foreground">{langDesc}</p>
              )}
              {MIX_LANGS.has(language) && (
                <p className="text-xs text-primary/80 font-medium">
                  Mix mode — AI content uses this language blend.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label htmlFor="sound" className="cursor-pointer">{t("gameplaySounds")}</Label>
              <Switch id="sound" checked={soundEnabled} onCheckedChange={setSoundLocal} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label className="cursor-pointer">{t("resetTutorial")}</Label>
                <p className="text-xs text-muted-foreground">Home tour + all game how-to-play cards</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetAllTutorials();
                  toast.success(t("resetTutorialDone"));
                }}
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="visual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("themeLabel")}</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemeName)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THEMES.map((th) => (
                    <SelectItem key={th.value} value={th.value}>{th.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("themeLivePreview")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("textSizeLabel")}</Label>
              <Select value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label htmlFor="anim" className="cursor-pointer">{t("animations")}</Label>
                <p className="text-xs text-muted-foreground">{t("animationsDesc")}</p>
              </div>
              <Switch id="anim" checked={animations} onCheckedChange={setAnimations} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label htmlFor="bgfx" className="cursor-pointer">{t("backgroundGlow")}</Label>
                <p className="text-xs text-muted-foreground">{t("backgroundGlowDesc")}</p>
              </div>
              <Switch id="bgfx" checked={backgroundFx} onCheckedChange={setBackgroundFx} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label htmlFor="contrast" className="cursor-pointer">{t("highContrast")}</Label>
                <p className="text-xs text-muted-foreground">{t("highContrastDesc")}</p>
              </div>
              <Switch id="contrast" checked={highContrast} onCheckedChange={setHighContrast} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={save}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
