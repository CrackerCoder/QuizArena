import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: "Keep vocabulary simple and questions straightforward.",
  medium: "Use standard academic vocabulary at a moderate level.",
  hard: "Use precise technical vocabulary and demand deeper understanding.",
};

const LANGUAGE_PROMPTS: Record<string, string> = {
  english: "",
  malay: "Generate questions, answers, and explanations in Bahasa Melayu (standard formal BM).",
  mandarin: "Generate all questions, answers, and explanations in Mandarin Chinese (简体中文).",
  manglish: "Write questions and explanations in Manglish — a natural Malaysian mix of Bahasa Melayu and English spoken in Malaysia. Mix BM terms with English naturally within the same sentence, e.g. 'Proses ini berlaku in the mitochondria' or 'Apakah the function of osmosis?' Keep it authentic and fun.",
  "mandarin-english": "Write questions and explanations by naturally mixing Mandarin Chinese (中文) and English in the same sentences, the way many Malaysian Chinese speakers communicate. E.g. '细胞分裂 is the process of...' or '这个 concept is important because...'",
  "mandarin-malay": "Write questions and explanations by naturally mixing Mandarin Chinese (中文) and Bahasa Melayu in the same sentences. E.g. '光合作用 adalah proses yang...' or '这个 adalah sangat penting dalam...'",
};

function parseAIJson(raw: string): unknown {
  // Strip markdown code fences
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // Try direct parse first
  try { return JSON.parse(stripped); } catch { /* continue */ }

  // Try to extract first JSON object or array from the text
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* continue */ }
  }
  const arrMatch = stripped.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch { /* continue */ }
  }

  throw new SyntaxError("No valid JSON found in AI response");
}

const SAFE_ACTIONS = new Set([
  "wordle", "hangman", "facts", "flashquiz", "autocorrect",
  "suggest", "anagram", "fillblank", "crossword", "flashcard", "debate", "compat", "factsquiz",
]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ALLOWED_LEVELS = new Set(["pt3", "spm", "igcse", "a-level", "university"]);
const ALLOWED_LANGUAGES = new Set([
  "english", "malay", "mandarin", "manglish", "mandarin-english", "mandarin-malay",
  "tamil", "tamil-english",
  // legacy — kept for backward compat, treated as english
  "hindi",
]);

function clampStr(val: unknown, max: number): string {
  if (typeof val !== "string") return "";
  return val.slice(0, max);
}

function clampCount(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function clampHistory(val: unknown): { role: string; content: string }[] {
  if (!Array.isArray(val)) return [];
  return val.slice(0, 10).map((h: unknown) => {
    const obj = (h && typeof h === "object") ? h as Record<string, unknown> : {};
    return {
      role: typeof obj.role === "string" && (obj.role === "user" || obj.role === "ai") ? obj.role : "user",
      content: clampStr(obj.content, 1000),
    };
  });
}

router.post("/study", async (req, res) => {
  try {
    const raw = req.body ?? {};
    const action = clampStr(raw.action, 50);

    if (!SAFE_ACTIONS.has(action)) {
      res.status(400).json({ error: "Unknown action" });
      return;
    }

    const topic        = clampStr(raw.topic, 200);
    const notes        = clampStr(raw.notes, 3000);
    const subject      = clampStr(raw.subject, 150);
    const topicName    = clampStr(raw.topicName, 150);
    const fact         = clampStr(raw.fact, 600);
    const userMessage  = clampStr(raw.userMessage, 1200);
    const aiPosition   = clampStr(raw.aiPosition, 100);
    const seed         = clampStr(raw.seed, 50);
    const isFinal      = raw.isFinal === true;
    const count        = clampCount(raw.count, 1, 10);
    const difficulty   = ALLOWED_DIFFICULTIES.has(raw.difficulty) ? String(raw.difficulty) : "medium";
    const educationLevel = ALLOWED_LEVELS.has(raw.educationLevel) ? String(raw.educationLevel) : "spm";
    const rawLang      = ALLOWED_LANGUAGES.has(raw.language) ? String(raw.language) : "english";
    // Map legacy "hindi" to "english"
    const language     = rawLang === "hindi" ? "english" : rawLang;
    const avoid        = Array.isArray(raw.avoid)
      ? raw.avoid.slice(0, 20).map((v: unknown) => clampStr(v, 50))
      : [];
    const history      = clampHistory(raw.history);

    const langGuide = LANGUAGE_PROMPTS[language] ?? "";

    if (action === "wordle") {
      const avoidStr = avoid.length > 0 ? `\nDo NOT use these words: ${avoid.join(", ")}` : "";
      const notesSection = notes ? `\nContext: ${notes}` : "";

      const langWordDesc = language === "malay"
        ? "Bahasa Melayu (standard Latin alphabet, no diacritics)"
        : language === "mandarin"
        ? "English pinyin romanization of a Mandarin term (a-z letters only)"
        : language === "manglish" || language === "mandarin-english" || language === "mandarin-malay"
        ? "English or Bahasa Melayu (a-z letters only, no spaces)"
        : "English";

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You generate study vocabulary words for a Wordle-style game. Seed: ${seed}. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `One ${langWordDesc} vocabulary word related to: ${topic}${notesSection}${avoidStr}

Requirements: 4–10 letters, single word, a-z only (no accents, spaces, hyphens), real academic term.

Return JSON: { "word": "WORD", "hint": "short definition ≤10 words" }
Word UPPERCASE.`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "hangman") {
      const avoidStr = avoid.length > 0 ? `\nDo NOT use these words: ${avoid.join(", ")}` : "";
      const notesSection = notes ? `\nContext: ${notes}` : "";

      const langWordDesc = language === "malay"
        ? "Bahasa Melayu (standard Latin alphabet)"
        : language === "mandarin"
        ? "English pinyin romanization of a Mandarin term (a-z letters only)"
        : language === "manglish" || language === "mandarin-english" || language === "mandarin-malay"
        ? "English or Bahasa Melayu (a-z letters only)"
        : "English";

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You generate study vocabulary words for a Hangman game. Seed: ${seed}. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `One ${langWordDesc} vocabulary word related to: ${topic}${notesSection}${avoidStr}

Requirements: 4–12 letters, single word, a-z only (no accents, spaces), key term from topic.

Return JSON: { "word": "WORD", "hint": "short definition ≤10 words" }
Word UPPERCASE.`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "facts") {
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: Math.min(500, count * 70),
        messages: [
          {
            role: "system",
            content: `You generate concise study facts. ${langGuide} Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Generate ${count} concise study facts about: ${topic}${notesSection}

Rules: 1 sentence each, ≤20 words, exam-relevant, cover different key concepts — no repeats.

Return JSON: { "facts": ["fact 1", ...] }`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "factsquiz") {
      // Batch: generates facts + quiz questions together — no mid-game API calls needed
      const batchCount = Math.min(count, 5); // cap at 5 for reliability
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1800,
        messages: [
          {
            role: "system",
            content: `You output ONLY valid JSON. No markdown, no explanation. Generate study facts with MCQ questions for ${educationLevel} students. ${diffGuide} ${langGuide}`,
          },
          {
            role: "user",
            content: `Topic: ${topic}${notesSection}
Difficulty: ${difficulty}

Output a JSON object with an "items" array of exactly ${batchCount} elements.
Each element has: "fact" (string, 1 sentence ≤18 words) and "question" (object).
Each "question" has: "type":"mcq", "prompt" (string), "choices" (array of 4 strings), "answer" (string, must exactly match one choice), "explanation" (string ≤12 words).
Cover different concepts. No repeats.

Output only the JSON object, nothing else.`,
          },
        ],
      });
      try {
        const raw = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { items?: unknown[] };
        const items = Array.isArray(raw?.items) ? raw.items : [];
        res.json({ items });
      } catch {
        res.json({ items: [] });
      }

    } else if (action === "flashquiz") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 320,
        messages: [
          {
            role: "system",
            content: `You write one MCQ quiz question from a study fact for ${educationLevel} level students. ${diffGuide} ${langGuide} Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Fact: ${fact}
Topic: ${topic}${notesSection}
Difficulty: ${difficulty}

Write ONE multiple-choice question testing understanding of this fact.
- 4 choices, exactly 1 correct
- Answer must match a choice exactly
- Explanation ≤15 words

Return JSON: { "type": "mcq", "prompt": "...", "choices": ["A","B","C","D"], "answer": "exact choice", "explanation": "..." }`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = parseAIJson(text) as Record<string, unknown>;
      } catch {
        parsed = {
          type: "short",
          prompt: `Based on this fact, what is the key concept? "${fact.slice(0, 100)}"`,
          answer: "See the fact above",
          explanation: fact,
        };
      }

      if (!parsed.type || !parsed.prompt || !parsed.answer) {
        parsed = {
          type: "short",
          prompt: `Explain in your own words: "${fact.slice(0, 100)}"`,
          answer: "See the fact above",
          explanation: fact,
        };
      }

      res.json(parsed);

    } else if (action === "autocorrect") {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 300,
        messages: [
          {
            role: "system",
            content: "You autocorrect and standardize academic subject and topic names. Return valid JSON only.",
          },
          {
            role: "user",
            content: `Autocorrect these academic subject/topic names:
Subject: "${subject}"
Topic: "${topicName}"

1. Fix typos and standardize capitalization.
2. Check if the topic actually belongs to the given subject. If the topic is from a completely different academic domain (e.g. subject is "Accounting" but topic is "Photosynthesis" which belongs to Biology), set "mismatch" to true and provide "suggestedSubject" with the correct subject for that topic.
3. If nothing needs changing, set changed to false.

Return JSON only: { "subject": "corrected subject", "topic": "corrected topic", "changed": true | false, "mismatch": true | false, "suggestedSubject": "correct subject for this topic if mismatch, else null", "note": "brief note if changed or mismatched" }
If there is no mismatch, set "mismatch": false and "suggestedSubject": null.`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "suggest") {
      const notesSection = notes ? `\nStudent notes context:\n${notes.slice(0, 500)}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 300,
        messages: [
          {
            role: "system",
            content: "You suggest academic topic completions for Malaysian students (SPM, PT3, IGCSE, A-Level). Return valid JSON only.",
          },
          {
            role: "user",
            content: `Subject typed so far: "${subject}"
Topic typed so far: "${topicName}"${notesSection}

Suggest 5 specific academic topics that match what the student is typing. Prioritize Malaysian school curriculum topics. Be specific and concrete. Keep suggestions concise (2-6 words max).

Return JSON: { "suggestions": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"] }`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "anagram") {
      const avoidStr = avoid.length > 0 ? `\nDo NOT use these words: ${avoid.join(", ")}` : "";
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 280,
        messages: [
          { role: "system", content: `You generate vocabulary words for an anagram scramble game for ${educationLevel} students. ${diffGuide} ${langGuide} Return valid JSON only.` },
          {
            role: "user",
            content: `One key vocabulary term related to: ${topic}${notesSection}${avoidStr}

STRICT REQUIREMENTS:
- ONLY standard English alphabet letters A–Z — absolutely no numbers, symbols, hyphens, formulas, or spaces
- Single word, 5–9 letters long, pronounceable and spellable letter by letter
- Must be a real academic term that a student at this level would study
- For maths/science topics, use the English NAMES of concepts: GRADIENT, INTEGRAL, VARIABLE, QUADRATIC, COSINE, MATRIX, THEOREM, EQUATION, FRACTION, DECIMAL, TANGENT
- Difficulty: ${difficulty}

Return JSON: { "word": "WORD", "definition": "full definition (1–2 sentences)", "hint": "short clue ≤8 words" }
Word MUST be UPPERCASE letters only — no other characters at all.`,
          },
        ],
      });
      const anagramResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
      if (typeof anagramResult.word === "string") {
        anagramResult.word = anagramResult.word.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 12) || "STUDY";
      }
      res.json(anagramResult);

    } else if (action === "fillblank") {
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 700,
        messages: [
          { role: "system", content: `You generate fill-in-the-blank study sentences for ${educationLevel} level students. ${diffGuide} ${langGuide} Return valid JSON only.` },
          {
            role: "user",
            content: `Generate 5 fill-in-the-blank sentences about: ${topic}${notesSection}
Difficulty: ${difficulty}

Rules:
- Each sentence ≤20 words with ONE ___ blank replacing a key term
- Answer: 1-3 words
- Explanation ≤12 words
- Cover different concepts — no repeats

Return JSON:
{
  "sentences": [
    { "sentence": "Sentence with ___.", "answer": "answer", "explanation": "brief why" },
    ...
  ]
}`,
          },
        ],
      });
      res.json(parseAIJson(completion.choices[0]?.message?.content ?? "{}"));

    } else if (action === "crossword") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 500,
        messages: [
          { role: "system", content: `You generate word-clue pairs for a crossword puzzle. Return valid JSON only.` },
          {
            role: "user",
            content: `Generate 6 word-clue pairs for a crossword about: ${topic}${notesSection}

Each word: 4-10 letters, single word (no spaces/hyphens), key concept from topic.
Clue: ≤8 words. Choose words that share some letters (for crossword intersections).

Return JSON: { "entries": [{ "word": "WORD", "clue": "clue" }, ...] }
All words UPPERCASE.`,
          },
        ],
      });
      const crossResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { entries?: { word?: string; clue?: string }[] };
      if (Array.isArray(crossResult.entries)) {
        crossResult.entries = crossResult.entries
          .map((e) => ({
            ...e,
            word: typeof e.word === "string" ? e.word.replace(/[^A-Za-z]/g, "").toUpperCase() : e.word,
          }))
          .filter((e) => typeof e.word === "string" && (e.word as string).length >= 3);
      }
      res.json(crossResult);

    } else if (action === "flashcard") {
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1100,
        messages: [
          { role: "system", content: `You generate flashcards for spaced-repetition study for ${educationLevel} level students. ${diffGuide} ${langGuide} Return valid JSON only.` },
          {
            role: "user",
            content: `Generate 8 flashcards about: ${topic}${notesSection}
Difficulty: ${difficulty}

Rules:
- front: term or short question (≤10 words)
- back: definition or answer (≤2 sentences)
- tip: mnemonic ≤10 words, or null
- Cover different key concepts — no repeats

Return JSON:
{
  "cards": [
    { "front": "Term", "back": "Definition", "tip": "mnemonic or null" },
    ...
  ]
}`,
          },
        ],
      });
      res.json(parseAIJson(completion.choices[0]?.message?.content ?? "{}"));

    } else if (action === "debate") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const isInit = !userMessage;

      if (isInit) {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 400,
          messages: [
            { role: "system", content: `You are a debate partner AI for ${educationLevel} level students studying: ${topic}. ${langGuide} Return valid JSON only.` },
            {
              role: "user",
              content: `The student wants to debate a topic related to: ${topic}${notesSection}

Choose a clear, debatable statement. The student will argue FOR it; you argue AGAINST it.
Open with a sharp, confident counter-argument (2-4 sentences).

Return JSON:
{
  "statement": "The debatable statement (1 sentence)",
  "aiPosition": "AGAINST",
  "userPosition": "FOR",
  "aiOpening": "Your opening argument against (2-4 sentences, confident and challenging)"
}`,
            },
          ],
        });
        res.json(parseAIJson(completion.choices[0]?.message?.content ?? "{}"));

      } else {
        const historyMessages = history.map((h) => ({
          role: h.role === "user" ? "user" as const : "assistant" as const,
          content: h.content,
        }));

        const scoreInstruction = isFinal
          ? `\n\nThis is the FINAL round. After your closing counter-argument, score the student's debate performance.
Score each dimension 0-10: clarity (clear expression), evidence (facts/examples/logic), logic (structure/persuasion).

Return JSON:
{
  "aiResponse": "Your closing counter-argument (2-4 sentences)",
  "isFinal": true,
  "scores": { "clarity": 0-10, "evidence": 0-10, "logic": 0-10 },
  "feedback": "Overall feedback (2-3 sentences, constructive)"
}`
          : `\n\nReturn JSON: { "aiResponse": "Your counter-argument (2-4 sentences, sharp and specific)" }`;

        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: isFinal ? 600 : 350,
          messages: [
            {
              role: "system",
              content: `You are debating AGAINST: "${aiPosition || "the student's position"}" on topic: ${topic}. ${langGuide} Be sharp, confident, and academically rigorous. Return valid JSON only.`,
            },
            ...historyMessages,
            { role: "user", content: `Student argues: ${userMessage}${scoreInstruction}` },
          ],
        });
        res.json(parseAIJson(completion.choices[0]?.message?.content ?? "{}"));
      }

    } else if (action === "compat") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 350,
        messages: [
          {
            role: "system",
            content: "You judge whether word-based study games are compatible with an academic topic. Return valid JSON only.",
          },
          {
            role: "user",
            content: `Topic: "${topic}" (${educationLevel} level)${notesSection}

Word-based games need single pronounceable English vocabulary words (5–12 letters, A–Z only):
- /anagram — scramble one key term
- /wordle — guess one key term
- /hangman — guess letters of one key term
- /crossword — multiple vocabulary words as crossword entries

Be LENIENT. Almost every academic topic has vocabulary. Only disable if truly procedural/numerical with no pronounceable terms.

Compatible: "Photosynthesis" (CHLOROPHYLL, GLUCOSE), "Algebra" (EQUATION, VARIABLE), "Chemical Bonding" (IONIC, COVALENT)
Possibly incompatible: extremely procedural topics like "Solving simultaneous equations by substitution step-by-step"

Return JSON:
{
  "disabled": {
    "/anagram": null,
    "/wordle": null,
    "/hangman": null,
    "/crossword": null
  }
}
null = compatible. Short reason string (max 6 words) = incompatible.`,
          },
        ],
      });
      const compatRaw = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { disabled?: Record<string, string | null> };
      res.json({ disabled: compatRaw.disabled ?? {} });

    } else {
      res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    req.log.error({ err }, "Study route error");
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: "AI returned invalid JSON" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
