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
const ALLOWED_LEVELS = new Set(["primary", "pt3", "spm", "stpm", "igcse", "o-level", "a-level", "university"]);
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
      let parsed: unknown;
      try { parsed = parseAIJson(text); }
      catch { parsed = { word: "STUDY", hint: "Key concept for this topic" }; }
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
      let parsed: unknown;
      try { parsed = parseAIJson(text); }
      catch { parsed = { word: "STUDY", hint: "Key concept for this topic" }; }
      res.json(parsed);

    } else if (action === "facts") {
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
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
      let parsed: unknown;
      try { parsed = parseAIJson(text); }
      catch { parsed = { facts: [] }; }
      res.json(parsed);

    } else if (action === "factsquiz") {
      // Batch: generates facts + quiz questions together — no mid-game API calls needed
      const batchCount = Math.min(count, 5); // cap at 5 for reliability
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
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
IMPORTANT: Place the correct answer at a RANDOM position in the choices array (not always first).
Cover different concepts. No repeats.

Output only the JSON object, nothing else.`,
          },
        ],
      });
      try {
        const raw = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { items?: unknown[] };
        const rawItems = Array.isArray(raw?.items) ? raw.items : [];
        // Server-side shuffle: ensure correct answer is never predictably first
        const items = rawItems.map((item: unknown) => {
          const it = item as Record<string, unknown>;
          const q = it.question as Record<string, unknown> | undefined;
          if (q && Array.isArray(q.choices) && q.choices.length > 1) {
            const choices = [...(q.choices as string[])];
            for (let i = choices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [choices[i], choices[j]] = [choices[j], choices[i]];
            }
            return { ...it, question: { ...q, choices } };
          }
          return item;
        });
        res.json({ items });
      } catch {
        res.json({ items: [] });
      }

    } else if (action === "flashquiz") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
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
      let parsed: unknown;
      try {
        parsed = parseAIJson(text);
      } catch {
        parsed = { subject, topic: topicName, changed: false, mismatch: false, suggestedSubject: null, note: "" };
      }
      res.json(parsed);

    } else if (action === "suggest") {
      const notesSection = notes ? `\nStudent notes context:\n${notes.slice(0, 500)}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You suggest academic topic completions for Malaysian students (Primary SK/SJK, PT3 Form 3, SPM Form 5, STPM Form 6, IGCSE, O Level, A Level). Return valid JSON only.",
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
      let parsed: unknown;
      try { parsed = parseAIJson(text); } catch { parsed = { suggestions: [] }; }
      res.json(parsed);

    } else if (action === "anagram") {
      const avoidStr = avoid.length > 0 ? `\nDo NOT use these words: ${avoid.join(", ")}` : "";
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You output ONLY a JSON object — no explanation, no markdown. You generate one vocabulary word for an anagram game for ${educationLevel} students. ${diffGuide}`,
          },
          {
            role: "user",
            content: `Topic: "${topic}"${notesSection}${avoidStr}

Choose ONE key vocabulary term that is DIRECTLY about "${topic}".
The word must be a central concept from this specific topic — not a generic academic word.
Rules: English A–Z letters only, 5–9 letters, single word, no spaces/hyphens/numbers/symbols.

Output ONLY this JSON (no other text at all):
{"word":"TOPICWORD","definition":"one clear sentence defining this term within ${topic}","hint":"3-6 word clue"}`,
          },
        ],
      });
      let anagramResult: Record<string, unknown>;
      try {
        anagramResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
      } catch {
        // Pick a fallback word from a diverse bank, avoid repeats
        const topicLower = topic.toLowerCase();
        type WordEntry = { word: string; definition: string; hint: string };
        const bank: WordEntry[] = topicLower.match(/\b(biology|cell|photosynthes|osmosis|respiration|genetics|ecology|evolution|organ)\b/)
          ? [
            { word: "OSMOSIS", definition: "Movement of water through a semipermeable membrane from low to high solute concentration.", hint: "Water transport in cells" },
            { word: "MITOSIS", definition: "Cell division producing two genetically identical daughter cells.", hint: "Cell division type" },
            { word: "NUCLEUS", definition: "Membrane-bound organelle containing the cell's genetic material.", hint: "Cell control centre" },
            { word: "GLUCOSE", definition: "A simple sugar that is the primary energy source for cells.", hint: "Energy-giving sugar" },
            { word: "PROTEIN", definition: "A large molecule made of amino acids with many biological functions.", hint: "Made of amino acids" },
            { word: "ENZYME", definition: "A biological catalyst that speeds up chemical reactions in the body.", hint: "Biological catalyst" },
          ]
          : topicLower.match(/\b(chemistry|atom|molecule|element|compound|reaction|acid|bond|periodic|electrolysis|titration)\b/)
          ? [
            { word: "ELECTRON", definition: "A negatively charged subatomic particle found outside the nucleus.", hint: "Negative particle in atom" },
            { word: "NEUTRON", definition: "A neutral subatomic particle found in the nucleus of an atom.", hint: "Neutral nuclear particle" },
            { word: "CATALYST", definition: "A substance that speeds up a chemical reaction without being consumed.", hint: "Speeds up reactions" },
            { word: "COMPOUND", definition: "A substance formed when two or more elements are chemically combined.", hint: "Elements bonded together" },
            { word: "COVALENT", definition: "A type of chemical bond formed by sharing electrons between atoms.", hint: "Shared electron bond" },
          ]
          : topicLower.match(/\b(physics|force|energy|wave|light|electric|motion|gravity|pressure|velocity|momentum|kinetic|thermal)\b/)
          ? [
            { word: "VELOCITY", definition: "Speed in a given direction; a vector quantity measured in m/s.", hint: "Speed with direction" },
            { word: "MOMENTUM", definition: "Product of an object's mass and velocity.", hint: "Mass times velocity" },
            { word: "FRICTION", definition: "A force that opposes the relative motion between two surfaces.", hint: "Opposing motion force" },
            { word: "VOLTAGE", definition: "Electric potential difference between two points in a circuit.", hint: "Electrical potential difference" },
            { word: "KINETIC", definition: "Energy possessed by an object due to its motion.", hint: "Energy of motion" },
          ]
          : topicLower.match(/\b(math|algebra|fraction|decimal|equation|gradient|triangle|quadratic|geometry|calculus|statistic)\b/)
          ? [
            { word: "FRACTION", definition: "A number that represents part of a whole, written as numerator over denominator.", hint: "Part of a whole" },
            { word: "GRADIENT", definition: "A measure of steepness or rate of change of a line on a graph.", hint: "Steepness of a line" },
            { word: "THEOREM", definition: "A mathematical statement that has been proven to be true.", hint: "Proven math statement" },
            { word: "VARIABLE", definition: "A symbol used to represent an unknown quantity in algebra.", hint: "Unknown in algebra" },
            { word: "DECIMAL", definition: "A number expressed using the base-10 system with a decimal point.", hint: "Base-10 number system" },
          ]
          : topicLower.match(/\b(history|colonial|empire|republic|monarchy|democracy|revolution|independence|treaty|war)\b/)
          ? [
            { word: "COLONIAL", definition: "Relating to the period when countries were ruled by foreign powers.", hint: "Foreign rule era" },
            { word: "MONARCHY", definition: "A system of government in which a king or queen is the head of state.", hint: "King or queen rules" },
            { word: "REPUBLIC", definition: "A system of government in which people elect representatives.", hint: "Elected government system" },
            { word: "FEUDALISM", definition: "Medieval social system based on land ownership and military service.", hint: "Medieval land system" },
            { word: "DEMOCRACY", definition: "A system of government in which citizens vote to elect their leaders.", hint: "Rule by the people" },
          ]
          : [
            { word: "LEARNING", definition: "The process of acquiring knowledge or skills through study or experience.", hint: "Gaining new knowledge" },
            { word: "CONCEPT", definition: "An abstract idea or general notion forming the basis of understanding.", hint: "Abstract idea" },
            { word: "THEORY", definition: "A system of ideas intended to explain a set of facts or phenomena.", hint: "Explanatory framework" },
            { word: "ANALYSIS", definition: "The detailed examination of the elements or structure of something.", hint: "Detailed examination" },
            { word: "EVIDENCE", definition: "Facts or information indicating whether a belief or proposition is true.", hint: "Supporting facts" },
          ];
        const unused = bank.filter((b) => !avoid.map((a) => a.toUpperCase()).includes(b.word));
        const pool = unused.length > 0 ? unused : bank;
        anagramResult = pool[Math.floor(Math.random() * pool.length)];
      }
      if (typeof anagramResult.word === "string") {
        const cleaned = (anagramResult.word as string).replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 12);
        anagramResult.word = cleaned.length >= 3 ? cleaned : "LEARNING";
      } else {
        anagramResult.word = "LEARNING";
      }
      if (!anagramResult.definition) anagramResult.definition = "A key vocabulary term for this topic.";
      if (!anagramResult.hint) anagramResult.hint = "Think about the topic carefully";
      res.json(anagramResult);

    } else if (action === "fillblank") {
      const notesSection = notes ? `\nContext/syllabus: ${notes}` : "";
      const diffGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const isScienceTopic = /\b(biology|chemistry|physics|science|cell|organ|enzyme|photosynthes|osmosis|respiration|genetics|evolution|atom|molecule|element|compound|reaction|force|energy|wave|light|electric|magnetic|circuit|motion|gravity|pressure|density|acid|base|pH|periodic|bond|mitosis|meiosis|diffusion|ecosystem|organ|tissue|nucleus|DNA|RNA|protein|bacteria|virus|gene|chromosome|refraction|reflection|displacement|velocity|acceleration|momentum|kinetic|potential|thermal|radiation|convection|conduction|experiment|lab|titration|electrolysis|catalyst)\b/i.test(topic);
      const scienceGuide = isScienceTopic
        ? `\n- Include at least 2 observation sentences (e.g. "When litmus is dipped in acid, it turns ___.")\n- Include 1 sentence from a diagram or graph context`
        : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You output ONLY a JSON object — no explanation, no markdown, no extra text. Generate fill-in-the-blank sentences for ${educationLevel} students. ${diffGuide} ${langGuide}`,
          },
          {
            role: "user",
            content: `Generate 5 fill-in-the-blank sentences about: "${topic}"${notesSection}
Difficulty: ${difficulty}${scienceGuide}

Each sentence: ≤25 words, ONE ___ blank for a key term, answer 1-3 words, explanation ≤12 words.
All sentences must be directly about "${topic}".

Output ONLY this JSON (no other text):
{"sentences":[{"sentence":"Sentence with ___.","answer":"answer","explanation":"brief why"},{"sentence":"Another ___ sentence.","answer":"answer2","explanation":"why2"}]}`,
          },
        ],
      });
      let fillResult: unknown;
      try { fillResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}"); }
      catch { fillResult = { sentences: [] }; }
      res.json(fillResult);

    } else if (action === "crossword") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You output ONLY a JSON object — no explanation, no markdown. Generate crossword word-clue pairs for a study game.`,
          },
          {
            role: "user",
            content: `Generate 6 word-clue pairs for a crossword about: "${topic}"${notesSection}

Each entry: word is a key term from "${topic}", 4-10 letters, single word, no spaces or hyphens. Clue ≤8 words.

Output ONLY this JSON (no other text):
{"entries":[{"word":"WORD1","clue":"clue one"},{"word":"WORD2","clue":"clue two"},{"word":"WORD3","clue":"clue three"},{"word":"WORD4","clue":"clue four"},{"word":"WORD5","clue":"clue five"},{"word":"WORD6","clue":"clue six"}]}`,
          },
        ],
      });
      let crossResult: { entries?: { word?: string; clue?: string }[] };
      try { crossResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { entries?: { word?: string; clue?: string }[] }; }
      catch { crossResult = { entries: [] }; }
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
        messages: [
          {
            role: "system",
            content: `You output ONLY a JSON object — no explanation, no markdown, no extra text. Generate flashcards for ${educationLevel} level students. ${diffGuide} ${langGuide}`,
          },
          {
            role: "user",
            content: `Generate 6 flashcards about: ${topic}${notesSection}
Difficulty: ${difficulty}

Each card:
- front: key term or short question (≤8 words)
- back: definition or answer (1 sentence, ≤20 words)
- tip: memory tip ≤8 words, or null

Output ONLY this JSON (no other text):
{"cards":[{"front":"Term","back":"Definition","tip":"tip or null"},{"front":"Term2","back":"Definition2","tip":null}]}`,
          },
        ],
      });
      let flashResult: { cards?: unknown[] };
      try {
        flashResult = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { cards?: unknown[] };
      } catch {
        flashResult = { cards: [{ front: topic || "Key Term", back: "Study this topic to learn the key concepts.", tip: null }] };
      }
      if (!flashResult.cards?.length) {
        flashResult = { cards: [{ front: topic || "Key Term", back: "Study this topic to learn the key concepts.", tip: null }] };
      }
      res.json(flashResult);

    } else if (action === "debate") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const isInit = !userMessage;

      if (isInit) {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
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
        let debateInit: unknown;
        try { debateInit = parseAIJson(completion.choices[0]?.message?.content ?? "{}"); }
        catch { debateInit = { statement: `Is the study of ${topic} important?`, aiPosition: "AGAINST", userPosition: "FOR", aiOpening: "I believe we should examine this critically." }; }
        res.json(debateInit);

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
          messages: [
            {
              role: "system",
              content: `You output ONLY a JSON object — no explanation, no prose, no markdown. You are a debate opponent arguing AGAINST "${aiPosition || "the student's position"}" on: ${topic}. ${langGuide} Be sharp and academically rigorous.`,
            },
            ...historyMessages,
            {
              role: "user",
              content: `Student's argument: "${userMessage}"${scoreInstruction}

IMPORTANT: Output ONLY valid JSON. Do not write any text outside the JSON object.`,
            },
          ],
        });
        let debateResp: unknown;
        try {
          debateResp = parseAIJson(completion.choices[0]?.message?.content ?? "{}");
          if (!(debateResp as Record<string, unknown>).aiResponse) throw new Error("missing aiResponse");
        } catch {
          debateResp = { aiResponse: "Your argument has merit, but consider this: the evidence does not fully support your claim. Please re-examine your position with specific facts." };
        }
        res.json(debateResp);
      }

    } else if (action === "compat") {
      const notesSection = notes ? `\nContext: ${notes}` : "";
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You judge whether each study game is compatible with an academic topic. Return valid JSON only.",
          },
          {
            role: "user",
            content: `Topic: "${topic}" (${educationLevel} level)${notesSection}

Evaluate all 9 games. Return null if compatible, or a short reason (≤6 words) if not.

WORD GAMES — need single pronounceable A–Z vocabulary words:
- /anagram — unscramble one key term (5–9 letters). Disable for purely procedural topics with no spellable vocab.
- /wordle — guess a key term (4–10 letters). Same constraint.
- /hangman — guess letters of a key term (4–12 letters). Same constraint.
- /crossword — multiple vocabulary words. Needs ≥6 distinct spellable terms.

CONTENT GAMES — work with facts, sentences, concepts:
- /boss — MCQ + short/long answer questions. Works for almost all academic topics.
- /fillblank — fill-in-the-blank sentences. Works for most topics; disable for purely abstract procedural topics with no factual statements.
- /debate — argue a position. Disable for purely procedural/factual topics with no debatable aspect (e.g. "multiplying fractions").
- /flashcard — front/back flashcards. Works for all academic topics.
- /blocks — Tetris with study facts. Works for all academic topics.

Examples:
- "Photosynthesis": all games compatible
- "Solving simultaneous equations by substitution": disable /anagram, /wordle, /hangman, /crossword (no vocab), /debate (not debatable)
- "Climate change": all compatible
- "Long division algorithm": disable /anagram, /wordle, /hangman, /crossword, /debate

Return JSON exactly:
{
  "disabled": {
    "/anagram": null,
    "/wordle": null,
    "/hangman": null,
    "/crossword": null,
    "/boss": null,
    "/fillblank": null,
    "/debate": null,
    "/flashcard": null,
    "/blocks": null
  }
}`,
          },
        ],
      });
      let compatRaw: { disabled?: Record<string, string | null> };
      try {
        compatRaw = parseAIJson(completion.choices[0]?.message?.content ?? "{}") as { disabled?: Record<string, string | null> };
      } catch {
        compatRaw = { disabled: {} };
      }
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
