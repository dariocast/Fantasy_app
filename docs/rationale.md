# Rationale

Non-obvious decisions in this project that deviate from common patterns or best practices, with reasoning.

### Zustand vs Redux

- **Date:** 2026-04-26
- **Status:** active
- **Context:** Need a state management library for React Native.
- **Decision:** Use Zustand.
- **Alternatives considered:** Redux Toolkit, React Context.
- **Rationale:** Zustand provides a simpler API, less boilerplate, and better performance for mobile apps while still supporting modular "slices".

### Supabase as Backend

- **Date:** 2026-04-26
- **Status:** active
- **Context:** Requirement for rapid development and real-time features.
- **Decision:** Use Supabase.
- **Alternatives considered:** Firebase, Custom Node.js/Postgres.
- **Rationale:** Supabase offers a relational database with built-in Auth and Real-time, which fits the fantasy football league structure better than Firebase's NoSQL approach.

### Circular Dependency Mitigation in Error Handling

- **Date:** 2026-04-28
- **Status:** active
- **Context:** `lib/error-handler.ts` needs to trigger UI notifications managed by the Zustand store, but the store actions often depend on `lib` utilities.
- **Decision:** Use a registration pattern (`registerNotificationFn`) instead of direct imports.
- **Rationale:** Allows the core utility to remain independent of the high-level state implementation while still providing a unified error experience.

### Optimistic State Updates

- **Date:** 2026-04-28
- **Status:** active
- **Context:** Mobile users expect immediate feedback on actions like deleting a league or updating a lineup, especially on slow networks.
- **Decision:** Implement manual optimistic updates in Zustand slices (League, Admin, Fantasy).
- **Rationale:** Minimizes perceived latency. If the network call fails, the `SyncSlice` or specific error rollbacks restore consistency.

### Manual Snake_case to CamelCase Mapping

- **Date:** 2026-04-28
- **Status:** active
- **Context:** Supabase/Postgrest returns data with snake_case fields (database standard), but the TypeScript codebase follows camelCase conventions.
- **Decision:** Use explicit mapping functions in `SyncSlice` and individual store actions.
- **Alternatives considered:** Automapping middleware, Postgrest transformations.
- **Rationale:** Provides full type safety and explicit control over data transformation, avoiding "magic" that can be hard to debug in React Native environments.
