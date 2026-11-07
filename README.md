# FitTracker

A training log for people who lift weights and do some outdoor cardio. Many apps in this space put routines, full history or progress charts behind a subscription; FitTracker includes all of them, for free.

Group coursework for the Mobile Application Development module, BSc (Hons) Computer Science and Artificial Intelligence, Polytechnics Mauritius, by Nohur Muhammad Jamiil and Angishaan Bissessur.

## Features

- **Accounts:** sign up with email verification, sign in, sign out and password reset, then a one-screen setup for name, units, bodyweight and height.
- **Exercise library:** about 900 exercises from an open dataset, with search, filters by muscle and equipment, instructions, and your own history and records for each one.
- **Routines:** create, edit, reorder and delete routines, with target sets and reps and an optional rest time per exercise.
- **Active workout:** log sets in a table that matches the exercise (weight and reps, reps, time, or distance and time), with what you did last time on each row. A rest timer starts when a set is ticked, with a notification if the app is in the background and a haptic tap. Timed sets count down. The workout survives the app being closed or the phone restarting, and works offline.
- **Workout summary:** duration, total volume, sets and new personal records.
- **History:** past workouts by date with a month view of training days.
- **Progress:** per-exercise charts (estimated 1RM using the Epley formula, best set, volume) and personal records that suit each exercise type.
- **Body tracking:** bodyweight log with a trend chart, height and BMI.
- **Outdoor cardio:** record a run, walk or ride with GPS, with live distance, time and pace and the route drawn on a map.
- **Settings:** units, default rest time, light, dark or system theme, and deleting the account with all its data.

## Tech stack

- [Expo](https://expo.dev) SDK 57 and React Native, in strict TypeScript
- Expo Router for navigation
- [Supabase](https://supabase.com): authentication, Postgres with row-level security, and an Edge Function for account deletion
- TanStack Query for server data, with an offline cache; Zustand for the active workout and timers
- react-hook-form and zod for forms and validation
- `expo-location`, MapLibre and OpenFreeMap tiles for GPS cardio and route maps
- `expo-notifications`, `expo-haptics` and `expo-keep-awake` for timers and recording
- `react-native-svg` for the charts
- Jest and React Native Testing Library for app tests; PGlite for database tests
- EAS Build for the development build and the APK

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together.

## Installing the APK

1. Copy the FitTracker APK to an Android phone, or open its download link on the phone.
2. Open the file. If Android asks, allow your browser or file manager to install unknown apps.
3. Tap **Install**, then open FitTracker and create an account.

The APK runs on its own and connects to the hosted Supabase project; nothing else needs to be set up. The rest of this file is for running the project from source.

## Requirements

- Node.js 22.13 or newer
- An Android phone, the target platform, with the development build installed (see below). [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) works for quick checks of anything it can run.
- A free [Expo](https://expo.dev) account for building with EAS.

## Setup

```sh
npm install
cp .env.example .env
```

Then fill in `.env` (see below).

## Environment variables

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard, Project Settings > API Keys |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page, the publishable key (`sb_publishable_...`) |
| `SUPABASE_SMTP_PASSWORD` | The Gmail app password for the account that sends FitTracker's emails. Used only by `npx supabase config push`; it has no `EXPO_PUBLIC_` prefix, so it never goes into the app |

Only the publishable key belongs in the app. The secret key must never be added to `.env` or committed: the one piece of code that needs it, the account deletion function, runs on Supabase's servers, where Supabase provides it.

## Database

The schema lives in `supabase/migrations/` and is only ever changed by adding a migration, never in the dashboard. Auth settings live in `supabase/config.toml`.

```sh
npx supabase login                               # once per computer, opens the browser
npx supabase link --project-ref <project-ref>    # once per clone
npx supabase db push                             # applies new migrations to the hosted project
npx supabase config push                         # applies the auth settings in config.toml
npx supabase db advisors --linked                # Supabase's security and performance checks
```

### Exercise library

The exercise library is the only data that ships with the app. It comes from a pinned commit of [free-exercise-db](https://github.com/yuhonas/free-exercise-db) and is added by a migration, so `db push` seeds it. The migration is generated by a script, which only needs to run again if the pinned commit changes:

```sh
npm run seed:exercises     # rewrites the seed migration from the pinned commit
npx supabase db push
```

### Edge Function

Deleting an account runs on Supabase's servers in `supabase/functions/delete-account`, because it needs the secret key. Deploy it after cloning, and again whenever it changes. If a change to the function goes with a migration, deploy the function first:

```sh
npx supabase functions deploy delete-account
```

Supabase provides the project URL and keys to the function itself; nothing needs to be set.

The database tests in `supabase/tests/` run every migration on PGlite (the Postgres engine compiled to WebAssembly) and check constraints and row-level security as two signed-in users and a signed-out user. They run as part of `npm test` and need no Supabase project or Docker.

## Running on a phone

The phone and the computer must be on the same Wi-Fi network.

### Development build (Android)

A development build is FitTracker's own app with the native code built in. It loads the JavaScript from the development server, and can run everything, including features Expo Go can't. It is built on Expo's servers with EAS, so Android Studio is not needed.

```sh
npx eas-cli login                                              # once per computer
npx eas-cli build --profile development --platform android     # when native code or app.json changes
```

When the build finishes, open its link or scan its QR code on the phone and install the APK. Then start the server and open FitTracker on the phone:

```sh
npm start
```

A new build is only needed after adding a package with native code or changing `app.json`. Changes to TypeScript load straight from the server.

### Expo Go

For a quick check without a development build, on anything Expo Go can run:

```sh
npm run start:go
```

Scan the QR code with Expo Go.

### Build profiles

`eas.json` has two profiles. `development` produces the development build above. `preview` produces a standalone APK that runs without the development server:

```sh
npx eas-cli build --profile preview --platform android
```

`.env` is never uploaded to EAS, so the preview build reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's `preview` environment on EAS. Both are public values that ship inside the app. To set them on a new EAS project:

```sh
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment preview --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <key> --environment preview --visibility plaintext
```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Starts the development server for the development build |
| `npm run start:go` | Starts the development server for Expo Go |
| `npm run typecheck` | Type-checks the project with TypeScript |
| `npm run lint` | Runs ESLint, including Prettier formatting checks |
| `npm run format` | Formats the code with Prettier |
| `npm test` | Runs the app tests, then the database tests |
| `npm run test:app` | Runs only the app tests |
| `npm run test:db` | Runs only the database tests (needs Node's `--experimental-vm-modules`, which the script adds) |

## Licence of the exercise data

The exercise library comes from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), released under the Unlicense (public domain). Map tiles are from [OpenFreeMap](https://openfreemap.org), with map data © OpenStreetMap contributors, credited on every map.
