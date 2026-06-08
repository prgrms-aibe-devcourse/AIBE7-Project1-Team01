# AGENTS.md

## Project Overview

MOTIPE is a Korea-only local festival travel recommendation platform. The service matches user preferences, trip schedules, and festival themes to generate personalized festival-linked itineraries.

## Core Stack

- Frontend: HTML5, CSS3, JavaScript ES6+
- Backend: Node.js, Express.js
- Database: Supabase
- Deployment: Render
- AI / External APIs:
  - OpenAI API Platform
  - Google Gemini or Groq as swappable LLM providers
  - KAKAO Maps API or another domestic map API
  - VillageFcstInfoService_2.0 for weather during festival dates
  - Korea Tourism Organization TourAPI 4.0
  - Unsplash Developers API

## Working Rules

- Prefer implementing the actual requested change instead of only describing it.
- Keep the architecture provider-agnostic where the AI vendor can be swapped later.
- Use real festival data from TourAPI first; do not let the AI invent festival names, dates, or locations.
- Treat the project as Korea-only unless the user explicitly expands scope.
- Keep the UI logic simple and robust, especially for theme chip selection limits and user preference flows.

## MVP Scope

The MVP centers on these tables:

- `users`
- `user_preferences`
- `festivals`
- `trips`
- `itineraries`

Follow the database schema documentation when it exists, and keep schema changes aligned with those five core entities.

## Environment Variables

Do not commit secrets. Use `.env` locally and Render environment variables in deployment.

Required variables:

```bash
PORT=3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
AI_PROVIDER=
AI_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
KAKAO_MAPS_API_KEY=
WEATHER_API_KEY=
TOURAPI_KEY=
UNSPLASH_ACCESS_KEY=
```

Also provide `.env.sample` with placeholder values such as `****`.

## Implementation Notes

- Prefer clear, maintainable Express route structure.
- When integrating external APIs, validate inputs and handle missing keys explicitly.
- When generating recommendations, combine deterministic ranking logic with AI-generated narration only after real data is fetched.
- If a feature depends on a future file or document that does not exist yet, create the minimum needed structure rather than blocking.

## Documentation Targets

Keep these documents in sync with implementation when they exist:

- `docs/architecture/DB_SCHEMA.md`
- `docs/architecture/API_SPEC.md`
- `docs/design/DESIGN_SYSTEM.md`
- `docs/design/PAGE_SPEC.md`
- `docs/management/WBS.md`

## Troubleshooting Priorities

- External API failures usually mean missing keys or env var typos.
- AI hallucinations usually mean the prompt was not grounded with TourAPI results.
- Theme chip bugs usually mean the max-selection guard is missing in the frontend.

