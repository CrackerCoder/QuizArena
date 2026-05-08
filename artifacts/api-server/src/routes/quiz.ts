import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function parseAIJson(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(stripped);
}

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: "Use simple vocabulary, straightforward concepts, and multiple-choice questions with obvious distractors. Focus on basic recall and recognition.",
  medium: "Use standard academic vocabulary and mix recall with application questions. Include some analysis. Make distractors plausible.",
  hard: "Use precise technical vocabulary, demand analysis and synthesis, include multi-step reasoning and evaluation. Distractors should be sophisticated.",
};

const SAFE_ACTIONS = new Set(["generate", "evaluate", "explain"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const ALLOWED_LEVELS = new Set(["pt3", "spm", "igcse", "a-level", "university"]);

function clampStr(val: unknown, max: number): string {
  if (typeof val !== "string") return "";
  return val.slice(0, max);
}

function clampCount(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

router.post("/quiz", async (req, res) => {
  try {
    const raw = req.body ?? {};
    const action = clampStr(raw.action, 50);

    if (!SAFE_ACTIONS.has(action)) {
      res.status(400).json({ error: "Unknown action" });
      return;
    }

    const topic       = clampStr(raw.topic, 200);
    const educationLevel = ALLOWED_LEVELS.has(raw.educationLevel) ? raw.educationLevel : "spm";
    const notes       = clampStr(raw.notes, 3000);
    const difficulty  = ALLOWED_DIFFICULTIES.has(raw.difficulty) ? raw.difficulty : "medium";
    const question    = clampStr(raw.question, 500);
    const expected    = clampStr(raw.expected, 500);
    const given       = clampStr(raw.given, 1000);
    const count       = clampCount(raw.count, 1, 10);
    const rawMistakes = Array.isArray(raw.mistakes) ? raw.mistakes.slice(0, 10) : [];
    const mistakes = rawMistakes.map((m: unknown) => {
      const obj = (m && typeof m === "object") ? m as Record<string, unknown> : {};
      return {
        question:      clampStr(obj.question, 300),
        yourAnswer:    clampStr(obj.yourAnswer, 300),
        correctAnswer: clampStr(obj.correctAnswer, 300),
      };
    });

    if (action === "generate") {
      const notesSection = notes ? `\n\nStudent notes/syllabus context:\n${notes}` : "";
      const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: Math.min(4096, count * 400),
        messages: [
          {
            role: "system",
            content: `You are an expert quiz generator for ${educationLevel} level students. Generate exactly ${count} questions about the topic. Difficulty: ${difficulty.toUpperCase()}. ${difficultyGuide} Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Generate ${count} quiz questions about: ${topic}${notesSection}

Difficulty level: ${difficulty.toUpperCase()} — ${difficultyGuide}

Return a JSON object with this exact shape:
{
  "questions": [
    {
      "type": "mcq" | "short" | "long",
      "prompt": "question text",
      "choices": ["A", "B", "C", "D"],  // only for mcq
      "answer": "correct answer",
      "explanation": "brief explanation",
      "damage": 10  // damage points: mcq=10, short=20, long=30
    }
  ]
}

Mix question types: ~50% mcq, ~30% short answer, ~20% long answer.
For MCQ, provide exactly 4 choices and make them plausible.
Keep questions relevant to ${topic} at ${educationLevel} level with ${difficulty} difficulty.`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "evaluate") {
      const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium;
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 512,
        messages: [
          {
            role: "system",
            content: `You are a quiz evaluator. Evaluate student answers fairly at ${difficulty} difficulty. ${difficultyGuide} Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Question: ${question}
Expected answer: ${expected}
Student's answer: ${given}
Difficulty: ${difficulty}

Evaluate the student's answer and return JSON:
{
  "correct": true | false,
  "score": 0-100,
  "feedback": "brief encouraging feedback"
}

At ${difficulty} difficulty: ${difficulty === "easy" ? "Be generous, accept near-correct answers." : difficulty === "hard" ? "Require precise technical terms and complete reasoning." : "Be fair, accept partially correct answers with partial score."}`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else if (action === "explain") {
      if (!Array.isArray(mistakes) || mistakes.length === 0) {
        res.json({ explanations: [] });
        return;
      }
      const mistakeList = mistakes
        .map((m: { question: string; yourAnswer: string; correctAnswer: string }, i: number) =>
          `${i + 1}. Question: ${m.question}\n   Student answered: "${m.yourAnswer}"\n   Correct answer: "${m.correctAnswer}"`
        )
        .join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: Math.min(2048, Math.max(300, mistakes.length * 200)),
        messages: [
          {
            role: "system",
            content: `You are a helpful tutor explaining why answers were wrong for ${educationLevel} level students studying ${topic}. Be encouraging and educational. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `The student got these questions wrong. Explain each mistake clearly and helpfully:

${mistakeList}

Return JSON:
{
  "explanations": [
    {
      "question": "the question text",
      "correctAnswer": "the correct answer",
      "explanation": "2-3 sentence explanation of why the correct answer is right and what the student may have misunderstood. Be encouraging."
    }
  ]
}`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parseAIJson(text);
      res.json(parsed);

    } else {
      res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    req.log.error({ err }, "Quiz route error");
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: "AI returned invalid JSON" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
