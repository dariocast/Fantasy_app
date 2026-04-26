# Utils

Lightweight utility functions and shared helpers for the project.

- **Purpose**: Provides cross-cutting utilities like logging to maintain code consistency and reduce boilerplate.
- **What it wraps**: Standard global objects (e.g., `console`) with environment-aware logic.
- **Main Entry Point**: `src/utils/logger.ts`

## Key Files

- `src/utils/logger.ts:logger` — Conditional logger that suppresses output in production while providing tagged debug/info/warn levels in development.
