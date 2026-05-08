const BASE = "/api";

async function callFn<T>(fn: "quiz" | "study", body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    if (res.status === 429) console.error("[QuizArena] Rate limit hit. Try again in a moment.");
    else if (res.status === 402) console.error("[QuizArena] AI credits exhausted.");
    else console.error("[QuizArena] Request failed:", text);
    throw new Error(text || "Request failed");
  }
  const data = await res.json();
  if (data && typeof data === "object" && "error" in data) {
    console.error("[QuizArena] API error:", String((data as { error: string }).error));
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export type QuizQuestion = {
  type: "mcq" | "short" | "long";
  prompt: string;
  choices?: string[];
  answer: string;
  explanation: string;
  damage: number;
};

export type MistakeEntry = {
  question: string;
  yourAnswer: string;
  correctAnswer: string;
};

export type MistakeExplanation = {
  question: string;
  correctAnswer: string;
  explanation: string;
};

export type FactQuizItem = {
  fact: string;
  question: {
    type: "mcq" | "short" | "fill";
    prompt: string;
    choices?: string[];
    answer: string;
    explanation: string;
  };
};

export const api = {
  generateQuiz: (topic: string, count = 5, educationLevel = "spm", notes = "", difficulty = "medium") =>
    callFn<{ questions: QuizQuestion[] }>("quiz", { action: "generate", topic, count, educationLevel, notes, difficulty }),

  evaluateAnswer: (question: string, expected: string, given: string, difficulty = "medium") =>
    callFn<{ correct: boolean; score: number; feedback: string }>("quiz", {
      action: "evaluate",
      question,
      expected,
      given,
      difficulty,
    }),

  explainMistakes: (topic: string, educationLevel = "spm", mistakes: MistakeEntry[]) =>
    callFn<{ explanations: MistakeExplanation[] }>("quiz", {
      action: "explain",
      topic,
      educationLevel,
      mistakes,
    }),

  wordleWord: (topic: string, notes = "", avoid: string[] = [], language = "english") =>
    callFn<{ word: string; hint: string }>("study", {
      action: "wordle", topic, notes, avoid, language,
      seed: Math.random().toString(36).slice(2, 10),
    }),

  hangmanWord: (topic: string, notes = "", avoid: string[] = [], language = "english") =>
    callFn<{ word: string; hint: string }>("study", {
      action: "hangman", topic, notes, avoid, language,
      seed: Math.random().toString(36).slice(2, 10),
    }),

  studyFacts: (topic: string, count = 5, notes = "") =>
    callFn<{ facts: string[] }>("study", { action: "facts", topic, count, notes }),

  // Batch: fetches facts + their quiz questions in one call — no mid-game API calls needed
  studyFactsWithQuiz: (topic: string, count = 6, educationLevel = "spm", notes = "", difficulty = "medium", language = "english") =>
    callFn<{ items: FactQuizItem[] }>("study", {
      action: "factsquiz", topic, count, educationLevel, notes, difficulty, language,
    }),

  flashcardQuiz: (topic: string, fact: string, educationLevel = "spm", notes = "", difficulty = "medium") =>
    callFn<{ type: "mcq" | "short" | "fill"; prompt: string; choices?: string[]; answer: string; explanation: string }>(
      "study",
      { action: "flashquiz", topic, fact, educationLevel, notes, difficulty },
    ),

  autocorrectTopic: (subject: string, topicName: string) =>
    callFn<{ subject: string; topic: string; changed: boolean; mismatch?: boolean; suggestedSubject?: string | null; note: string }>("study", {
      action: "autocorrect", subject, topicName,
    }),

  suggestTopics: (subject: string, topicName: string, notes = "") =>
    callFn<{ suggestions: string[] }>("study", {
      action: "suggest", subject, topicName, notes,
    }),

  anagramWord: (topic: string, notes = "", difficulty = "medium", educationLevel = "spm", language = "english", avoid: string[] = []) =>
    callFn<{ word: string; definition: string; hint: string }>("study", {
      action: "anagram", topic, notes, difficulty, educationLevel, language, avoid,
      seed: Math.random().toString(36).slice(2, 10),
    }),

  fillBlankSentences: (topic: string, notes = "", difficulty = "medium", educationLevel = "spm", language = "english") =>
    callFn<{ sentences: { sentence: string; answer: string; explanation: string }[] }>("study", {
      action: "fillblank", topic, notes, difficulty, educationLevel, language,
    }),

  crosswordEntries: (topic: string, notes = "", difficulty = "medium", educationLevel = "spm", language = "english") =>
    callFn<{ entries: { word: string; clue: string }[] }>("study", {
      action: "crossword", topic, notes, difficulty, educationLevel, language,
    }),

  flashcardGenerate: (topic: string, notes = "", difficulty = "medium", educationLevel = "spm", language = "english") =>
    callFn<{ cards: { front: string; back: string; tip: string | null }[] }>("study", {
      action: "flashcard", topic, notes, difficulty, educationLevel, language,
    }),

  debateInit: (topic: string, notes = "", educationLevel = "spm", language = "english") =>
    callFn<{ statement: string; aiPosition: string; userPosition: string; aiOpening: string }>("study", {
      action: "debate", topic, notes, educationLevel, language,
    }),

  checkGameCompat: (topic: string, educationLevel = "spm", notes = "") =>
    callFn<{ disabled: Record<string, string | null> }>("study", {
      action: "compat", topic, educationLevel, notes,
    }),

  debateRespond: (
    topic: string,
    aiPosition: string,
    history: { role: string; content: string }[],
    userMessage: string,
    isFinal: boolean,
    educationLevel = "spm",
    language = "english",
  ) =>
    callFn<{
      aiResponse: string;
      isFinal?: boolean;
      scores?: { clarity: number; evidence: number; logic: number };
      feedback?: string;
    }>("study", {
      action: "debate", topic, aiPosition, history, userMessage, isFinal, educationLevel, language,
    }),
};
