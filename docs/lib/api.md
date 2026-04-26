# Lib API

This document details the standardized API layer provided by the `lib` component.

## API Wrapper

### `api.request<T>(queryPromise)`
`src/lib/api.ts:api.request()`

Wraps a Supabase/Postgrest query promise in a standardized response format.

**Parameters:**
- `queryPromise`: A promise returning `PostgrestResponse<T>` or `PostgrestSingleResponse<T>`.

**Returns:**
- `Promise<ApiResult<T>>`: An object containing either `data` or a structured `error`.

**Example:**
```typescript
const result = await api.request(supabase.from('profiles').select('*').single());
if (result.error) {
    // Handle error
} else {
    const profile = result.data;
}
```

## Error Handling API

### `handleError(err, context?)`
`src/lib/error-handler.ts:handleError()`

Centralized error processor that logs to console and triggers UI notifications.

**Parameters:**
- `err`: The error object caught.
- `context`: (Optional) String identifying where the error occurred (e.g., "Accesso").

**Returns:**
- `AppError`: A standardized application error object.

### `showSuccess(message, title?)`
`src/lib/error-handler.ts:showSuccess()`

Trigger a success notification in the UI.

### `registerNotificationFn(fn)`
`src/lib/error-handler.ts:registerNotificationFn()`

Bootstrap function to connect the error handler with the UI notification system (usually called in `store/index.ts`).

## Validation API

Common validation functions exported from `src/lib/validation.ts`:

| Function | Responsibility |
| --- | --- |
| `isValidEmail(email)` | Basic regex check for email format. |
| `isNonEmptyString(str)` | Checks if a string exists and is not just whitespace. |
| `isValidAge(age)` | Ensures age is between 16 and 50. |
| `isPositiveNumber(num)` | Ensures a number is >= 0 and not NaN. |
| `validateLeagueData(...)` | Complex validation for league creation (name, budget, squad size). |
