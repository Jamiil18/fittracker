# Architecture

FitTracker is a cross-platform mobile app built with React Native and Expo (SDK 57, React Native 0.86), written in strict TypeScript. Android is the primary target because the deliverable is an APK; iOS is kept working where it costs nothing extra. The backend is Supabase: Auth for accounts, Postgres with Row Level Security for data, and an Edge Function for account deletion.

The diagram in [diagrams/architecture.md](diagrams/architecture.md) shows how the parts connect.

## Folder structure

```
app/                                 routes only; each file re-exports a feature screen
  _layout.tsx                        providers, error boundary, signed-in or signed-out navigator
  (auth)/                            sign-in, sign-up, verify-email, forgot-password, reset-password
  (app)/                             everything behind sign-in
    (tabs)/                          bottom tabs: Train (index), History, Library, Progress, Profile
    onboarding.tsx
    workout.tsx, workout-reorder.tsx, workout-summary.tsx
    routines/                        new, [id], [id]/edit, reorder
    exercises/                       pick, [id]
    workouts/                        [id], pending/[id] (finished offline, not synced yet)
    cardio/                          record, [id]
    body/                            log, entries
    profile/edit.tsx, records.tsx
    settings.tsx, delete-account.tsx
src/
  features/
    auth/ exercises/ routines/ workout/ train/ history/ progress/ profile/
    body/ cardio/ settings/ sync/
      api/                           Supabase queries and TanStack Query hooks
      components/                    feature UI
      hooks/
      schemas/                       zod schemas for forms, writes and responses
      utils/                         pure domain logic with unit tests
  components/
    ui/                              design system primitives, including PermissionGate and ResumeBar; never fetch data
    RootNavigator.tsx, SignedInNavigator.tsx, TabNavigator.tsx, AppErrorFallback.tsx
  lib/
    supabase.ts                      client configured with encrypted session storage
    secure-session-storage.ts        AES key in SecureStore, ciphertext in AsyncStorage
    query-client.ts                  TanStack Query, AsyncStorage persister, NetInfo online manager
    outbox/                          offline write queue: persisted store and sync worker
    fetchAllPages.ts                 reads lists longer than Supabase's 1,000-row page
    errors.ts                        Postgres/Supabase error -> AppError -> user message
    logger.ts                        development only; never logs tokens, emails or health data
  theme/                             colour, typography, spacing and radius tokens; useTheme
scripts/
  generate-exercise-seed.ts          pinned free-exercise-db commit -> SQL seed migration
supabase/
  config.toml                        auth settings, pushed with the CLI
  migrations/                        the only place the schema changes
  functions/delete-account/          Edge Function: password check, then user deletion
  tests/                             database tests on PGlite
.github/workflows/                   daily keep-alive request to Supabase
docs/                                this file, the design plan (DESIGN.md), diagrams/
```

## Why it is organised this way

**Thin routes, feature folders.** Expo Router turns files in `app/` into screens, so that folder reads as a sitemap. Route files only import a screen from `src/features/*` and render it. Each feature folder holds everything for one part of the product, so it can be read and explained on its own.

**Pure domain logic.** Calculations that decide what the user sees as fact (estimated 1RM, personal records, volume, unit conversion, pace and distance) live in `utils/` as pure functions with unit tests. They have no React or Supabase imports, which makes them easy to test and to point to in the demo.

**UI primitives never fetch.** `src/components/ui` contains the design system: text, buttons, fields, list rows, sheets, empty and error states, skeletons and charts. They take props only. Data comes from feature hooks.

## Data flow

**Server state** (routines, exercises, history, body data) is read and written through TanStack Query hooks in each feature's `api/` folder. Every response is parsed with zod at that boundary, so the rest of the app works with typed, validated data. The query cache is persisted to AsyncStorage, so the app can show data and start a workout without a connection.

**Client state** that must survive the app being killed lives in Zustand stores persisted to AsyncStorage: the active workout, its timers, and the outbox of writes waiting to sync.

**The active workout is local until it is finished.** The in-progress session is never written to the server set by set. When the user finishes, the app writes one entry to the outbox. The sync worker sends it through a single `save_workout` database function, which inserts the workout, its exercises and its sets in one transaction, so a dropped connection never leaves half a workout on the server. IDs are UUIDs generated on the phone, so if a response is lost and the request is retried, the second attempt does nothing instead of creating a duplicate. Until it has synced, the workout shows "Not synced yet". Bodyweight entries use the same outbox; there is one row per day, so sending an entry twice just saves the same value again. Recorded cardio sessions use it too.

**What works offline.** Recording and finishing a workout, logging bodyweight and recording outdoor cardio work fully offline. History, routines and the exercise library can be viewed offline from the persisted cache, which is kept for 90 days, and workouts waiting in the outbox appear in History marked "Not synced yet". Deleting past workouts and creating or editing routines need a connection and show "Connect to edit" offline instead of queueing, which keeps the sync logic simple and avoids conflicting queued edits.

**Exercise search runs on the phone.** The library (about 870 exercises) is fetched once and cached, so search and filters are instant and work offline.

## Timers and app lifecycle

All timers are calculated from stored timestamps (`now - startedAt`), never by counting ticks. A timer is therefore still correct after the app has been in the background, killed, or the phone restarted. When the app goes to the background during a rest period or a timed set, a local notification is scheduled for the moment it ends.

`AppState` drives two things:
- On foreground: refresh the auth session, refetch stale queries, flush the outbox.
- On background: flush the outbox and persist stores.

## Security in the architecture

- **Session encrypted at rest.** The Supabase session is encrypted with AES-256. The key is kept in `expo-secure-store` (Android Keystore / iOS Keychain), and the encrypted session in AsyncStorage, because SecureStore entries are size-limited. This is the pattern documented by Supabase.
- **Only the publishable key ships in the app**, read from `EXPO_PUBLIC_` environment variables. The secret key never appears in the client.
- **Row Level Security on every table.** Users can read and write only their own rows; the exercise library is shared and read-only. See the migrations in `supabase/migrations/`.
- **Errors are mapped in one place.** `lib/errors.ts` turns Postgres error codes and network failures into typed app errors, and those into user-facing messages.
- **Account deletion runs on the server.** The `delete-account` Edge Function checks the password and deletes the auth user, and every table cascades from it. It is the only code that uses the secret key, which Supabase provides to the function and which never leaves Supabase.
- **Nothing outlives sign-out on the phone.** Signing out clears the query cache, the outbox, and the active workout and cardio recording. Android auto-backup is off, so none of it is copied to a cloud backup.
- **Device settings stay on the device.** The theme is stored locally because it belongs to a phone, not an account. Units and the default rest time are account settings stored in `profiles`.

## Dependencies

Core packages: Expo Router, Supabase, TanStack Query, Zustand, react-hook-form, zod, `expo-location`, `expo-notifications`, `expo-haptics`, `expo-keep-awake`, Jest and React Native Testing Library.

Additional packages, and what each is used for:

| Package | Why |
|---|---|
| `@react-native-async-storage/async-storage` | Persisted stores, query cache, encrypted session |
| `aes-js`, `expo-crypto` | Session encryption, as in Supabase's documented pattern; `expo-crypto` supplies the random key |
| `@react-native-community/netinfo` | Knowing when the connection returns to flush the outbox |
| `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` | Offline access to routines, exercises and history |
| `@expo/ui` | Native bottom sheets for pickers (platform convention) and the native date picker |
| `react-native-svg` | Hand-built charts styled from the theme tokens |
| `expo-image` | Disk-cached exercise images |
| `@maplibre/maplibre-react-native` | Route map with OpenFreeMap tiles (no API key) |
| `react-native-reorderable-list` | Drag-to-reorder for routines, the exercises in a routine and the exercises in a workout (MIT; JavaScript only, built on Reanimated and Gesture Handler) |
