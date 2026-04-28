# Deployment

The application is built and distributed using Expo Application Services (EAS).

## Build Profiles (eas.json)

- **development**: Internal distribution with `developmentClient: true`.
- **preview**: Internal distribution for testing.
- **production**: Stores build (App Bundle for Android).

## Build Commands

```bash
# Build for Android (Preview)
npm run build:preview

# Build for production (All platforms)
eas build --platform all --profile production
```

## Configuration (app.json)

- **Name:** Fantasy
- **Slug:** fantalega-mobile
- **Bundle ID:** `it.dvdesp.fantatorneo` (iOS/Android)
- **Permissions:** Camera and Photo Library access for profile/team logo uploads.

## Environment Variables

The app expects the following variables (typically defined in `.env` or EAS Secrets):

- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous public key.

## CI/CD

EAS handles the build pipeline. Automations for staging/production releases are configured in `eas.json` and triggered via EAS CLI.
