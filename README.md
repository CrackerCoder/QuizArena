# 🎮 Quiz Arena

  > AI-powered study games hub for Malaysian students — learn any topic by playing.

  [![Live Demo](https://img.shields.io/badge/Live%20Demo-Quiz%20Arena-7c3aed?style=for-the-badge)](https://quizarena.replit.app)

  ---

  ## What is Quiz Arena?

  Quiz Arena turns any academic topic into an interactive game session. Type your subject and topic, pick a game, and let AI generate content tailored to the Malaysian school curriculum (Primary SK/SJK, PT3, SPM, STPM, IGCSE, O Level, A Level).

  No pre-built question banks — every question, word, flashcard, and debate prompt is generated live by AI based on exactly what you're studying.

  ---

  ## Games

  | Game | How it works |
  |------|-------------|
  | 🗡️ **Boss Rush** | Battle AI bosses with MCQ, short, and long-answer questions |
  | 🔤 **Word Guess** | Wordle-style — guess the key vocabulary term in 6 tries |
  | 💀 **HangGuy** | Guess letters before the gallows fills up |
  | 🟪 **Block Master** | Tetris-style piece placement that unlocks study facts and quizzes |
  | 🔀 **Anagram Scramble** | Unscramble key terms against the clock |
  | ✍️ **Fill in the Blank** | Complete sentences by typing the missing term |
  | 🧩 **Word Grid** | Solve an AI-generated crossword using topic vocabulary |
  | 🎤 **Debate Arena** | Argue a position — AI takes the opposite side and scores you |
  | 🃏 **Flashcard Flip** | Spaced-repetition flashcards generated from any topic |

  ---

  ## Features

  - **🇲🇾 Malaysian Curriculum Presets** — one-click topic setup for every major exam level
  - **🤖 AI Autocorrect** — typos in your subject/topic are fixed automatically before the game starts
  - **📊 Game Compatibility** — AI judges which games work best for your topic and greys out poor fits with a reason
  - **🌍 Multilingual** — English, Bahasa Melayu, Mandarin (中文), Tamil (தமிழ்), and mixed varieties (Manglish, 中英混合, etc.)
  - **📚 Notes / Syllabus mode** — paste your class notes or syllabus; AI restricts all questions to that scope
  - **🏆 XP & Levels** — earn XP across games, level up, track streaks
  - **🎓 Teacher mode** — create class rooms, assign specific games, view a live leaderboard
  - **🌙 Themes** — Arcade (default), Midnight Blue, Neon Sunset, Forest, Daylight
  - **🔔 First-time tutorial** — spotlight walkthrough for new users; per-game "How to play" cards

  ---

  ## Tech Stack

  | Layer | Technology |
  |-------|-----------|
  | Frontend | React 19 + TypeScript + Vite |
  | Styling | Tailwind CSS v4 + custom arcade design system |
  | UI Components | shadcn/ui |
  | Routing | Wouter |
  | Backend | Node.js + Express (pnpm monorepo) |
  | AI | OpenAI GPT (via Replit AI Integrations) |
  | Auth | Clerk (Google Sign-In) |
  | Workspace | pnpm workspaces |

  ---

  ## Project Structure

  ```
  ├── artifacts/
  │   ├── quiz-arena/          # React frontend (Vite)
  │   │   └── src/
  │   │       ├── components/  # Shared UI components
  │   │       ├── pages/       # Game pages + Home + Stats
  │   │       └── lib/         # Settings, i18n, API client, sound, etc.
  │   └── api-server/          # Express backend
  │       └── src/
  │           └── routes/
  │               ├── study.ts # All AI game-content endpoints
  │               └── quiz.ts  # Quiz generation & evaluation
  ```

  ---

  ## Getting Started (local)

  > Requires Node.js 20+ and pnpm.

  ```bash
  # Install dependencies
  pnpm install

  # Start both the API server and frontend dev server
  pnpm --filter @workspace/api-server run dev
  pnpm --filter @workspace/quiz-arena run dev
  ```

  You'll also need to set these environment variables:

  ```
  OPENAI_API_KEY=...      # or configure via Replit AI Integrations
  CLERK_PUBLISHABLE_KEY=...
  CLERK_SECRET_KEY=...
  ```

  ---

  ## Supported Education Levels

  | Code | Level |
  |------|-------|
  | `primary` | Primary School (SK / SJK) |
  | `pt3` | PT3 — Form 3 |
  | `spm` | SPM — Form 5 |
  | `stpm` | STPM — Form 6 |
  | `igcse` | IGCSE |
  | `o-level` | O Level |
  | `a-level` | A Level |

  ---

  ## License

  MIT — free to use, modify, and distribute.
  