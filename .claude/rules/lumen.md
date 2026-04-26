# Lumen — Project Documentation

This project's documentation was generated and is maintained by **Lumen**.
Trigger it with any `/lumen` command.

## Before any task

1. Read `AGENTS.md` for project overview and documentation index.
2. Read `docs/high-level-design.md` for architecture and component map.
3. For component-specific work, read `docs/<component-name>/README.md`.
4. Check `docs/codestyle.md` for coding patterns (if it exists).
5. Check `docs/rationale.md` for non-obvious decisions (if it exists).
6. Check `docs/integrations.md` for external service dependencies (if it exists).

## Keeping documentation current

Manual edits are welcome — Lumen preserves them. For structural updates, prefer
Lumen commands so everything stays consistent.

- `/lumen scan` — full analysis and doc update
- `/lumen update` — quick sync from recent commits
- `/lumen ingest` — process raw files in docs/raw_data/
- `/lumen status` — check coverage and freshness
