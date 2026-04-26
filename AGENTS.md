# fantalega-mobile

A React Native mobile application for fantasy football (fantalega), built with Expo and Supabase.

## Tech Stack

- **Language:** TypeScript
- **Framework:** React Native / Expo
- **Database:** Supabase (PostgreSQL)
- **State Management:** Zustand
- **Deployment:** EAS (Expo Application Services)

## Project Structure

```
├── assets/        # Static assets (images, icons)
├── src/           # Source code
│   ├── components/# Reusable UI components
│   ├── config/    # Environment and app configuration
│   ├── lib/       # API clients and validation logic
│   ├── navigation/# Routing and navigation structure
│   ├── screens/   # Main application screens
│   ├── store/     # Zustand state slices
│   ├── styles/    # Global styles and themes
│   ├── types/     # TypeScript type definitions
│   └── utils/     # Helper functions and logging
├── docs/          # Project documentation
└── ...
```

## Key Entry Points

- **App Entry:** `index.ts`
- **Root Component:** `App.tsx`
- **Navigation Root:** `src/navigation/index.ts` (implied)
- **Store Entry:** `src/store/index.ts`

## Documentation Index

- [High-Level Design](docs/high-level-design.md) — Architecture and key decisions
- [Screens](docs/screens/README.md) — View layer and navigation
- [Store](docs/store/README.md) — State management and data flow
- [Lib](docs/lib/README.md) — API and external integrations
- [Navigation](docs/navigation/README.md) — App structure and routing
- [Components](docs/components/README.md) — Reusable UI elements
- [API](docs/api.md) — Supabase interaction surface
- [Data Model](docs/data-model.md) — Database schema and store structure
- [Rationale](docs/rationale.md) — Non-obvious decisions with reasoning
- [Project Context](docs/project-context.md) — Game rules and requirements
- [Deployment](docs/deployment.md) — EAS build and submission
- [Log](docs/log.md) — Operation history

## Lumen — Project Documentation

This project's documentation was generated and is maintained by **Lumen**, a skill
that acts as the persistent knowledge keeper for this repository.

**Skill trigger:** any `/lumen` command, or mentions of "lumen", "knowledge base",
"document the project", or broad architectural questions.

### Before starting any task

1. Read `AGENTS.md` for the project overview, tech stack, and documentation index.
2. Read `docs/high-level-design.md` for architecture and component map.
3. For component-specific work, read `docs/<component-name>/README.md`.
4. Check `docs/codestyle.md` for project patterns and code style (if it exists).
5. Check `docs/rationale.md` for non-obvious decisions and their reasoning (if it exists).
6. Check `docs/integrations.md` for external service dependencies (if it exists).

### Keeping documentation current

This documentation is not static — use Lumen to keep it in sync with the code.
Manual edits are welcome (Lumen preserves them), but for structural updates prefer
Lumen commands so everything stays consistent.

| Command | Purpose |
|---------|---------|
| `/lumen scan` | Analyze code and update documentation |
| `/lumen update` | Quick sync from recent commits |
| `/lumen ingest` | Process raw files in docs/raw_data/ |
| `/lumen status` | Check coverage and freshness |
| `/lumen rules` | Regenerate these rule files |
| `/lumen <question>` | Query the documentation |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

## Configuration

- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

## Metadata

| Field | Value |
|-------|-------|
| **Managed by** | [Lumen](skills/lumen/) — project knowledge keeper skill |
| **Project type** | Mobile App (React Native/Expo) |
| **Domain complexity** | Medium |
| **Integration density** | 2 |
| **Scan depths** | Deep: store, lib; Standard: screens, navigation, components; Light: utils, styles, types |
| Fingerprint status | active |
| **Last scan** | 2026-04-26 |
| **Last ingest** | — |
| **Last lint** | — |
| **Last update commit** | 9b55627 |
| **Lumen version** | 2.0 |

