# API Reference

This document covers the interaction surface between the mobile application and Supabase.

## Authentication

Authentication is handled via Supabase Auth using Email/Password. Tokens are managed by the Supabase client and persisted locally.

## Endpoints (Supabase Tables)

### `leagues`
Handles fantasy league data.
- **Implementation:** `src/lib/api.ts:fetchLeagues()`

### `teams`
Handles team data within leagues.
- **Implementation:** `src/lib/api.ts:fetchTeams()`

### `players`
Handles football player stats and profiles.
- **Implementation:** `src/lib/api.ts:fetchPlayers()`

## Common Error Format

Errors are wrapped in a standard structure defined in `src/lib/error-handler.ts`.

```json
{
  "message": "Human readable error",
  "code": "ERROR_CODE",
  "originalError": {}
}
```
