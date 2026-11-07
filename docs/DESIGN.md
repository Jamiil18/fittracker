# Design plan

FitTracker should feel like a lifter's notebook: calm, dense and quick to use mid-set with sweaty hands. Numbers are the most important thing on every screen. The reference quality bar is the logging screens of Strong, Hevy and Apple Health, without copying their branding.

## Principles

- **Platform conventions first.** Native stack headers, a bottom tab bar with five tabs (Train, History, Library, Progress, Profile), bottom sheets for pickers, swipe actions on list rows, Android back behaviour and ripple feedback.
- **Lists over cards.** Content is grouped lists with hairline separators. Only the exercise images are card-like, and nothing is nested.
- **The logging screen is a table.** Aligned columns, tabular numerals, inputs at least 48 tall.
- **Quiet colour.** Mostly neutrals, one accent for primary actions and selected state, and semantic colours only for success and error.
- **Plain copy.** Buttons say what happens ("Finish workout") and the confirmation repeats it ("Workout finished"). Errors say what went wrong and what to do. Empty states say what to do next.

## Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#F2F3F5` | `#111214` | Screen behind grouped lists |
| `surface` | `#FFFFFF` | `#1C1D21` | List rows, sheets, inputs |
| `text` | `#16181C` | `#ECEDEF` | Primary text and numbers |
| `textMuted` | `#5F6670` | `#9AA0A8` | Secondary text, column headers, placeholders |
| `separator` | `#DADDE2` | `#2D2F35` | Hairlines between list rows (decorative) |
| `border` | `#80868F` | `#6B7079` | Outlines of inputs and controls (3:1, so the control is visible) |
| `accent` | `#1F5FBF` | `#7AA7F0` | Primary buttons, active tab, selected state, chart line |
| `success` | `#1E7A46` | `#4CB879` | Completed set tick, and a 12% tint on a completed row |
| `error` | `#B3261E` | `#F2716A` | Errors, destructive actions, the recording dot |

The neutrals are cool greys. Dark mode has its own values rather than inverted ones: a graphite background with a softer accent. Text on the accent is white in light mode and `#111214` in dark mode. Every text pairing meets WCAG AA (4.5:1), and control outlines and the completed-set tick meet 3:1. A unit test (`src/theme/contrast.test.ts`) checks every pairing in both themes. The `border` token exists because the `separator` hairline (about 1.4:1 on white) is too faint to outline an input.

## Typography

One family: the system font (Roboto on Android, SF Pro on iOS). It looks native on each platform, adds nothing to the app size, and supports tabular numerals (`fontVariant: ['tabular-nums']`), which every number uses so columns of weights and reps line up.

| Style | Size / line height | Weight | Used for |
|---|---|---|---|
| Display | 32 / 38 | Semibold | Rest and set timers, live cardio distance |
| Title | 22 / 28 | Semibold | Titles not in a native header, e.g. "Workout finished" |
| Body | 17 / 22 | Regular, medium | Body text, inputs, row titles |
| Secondary | 15 / 20 | Regular | Second lines in rows |
| Caption | 13 / 18 | Medium | Section headers, column headers, captions |

Sentence case everywhere, including section headers.

## Spacing, radius, elevation

- **Spacing** on a 4pt grid: 4, 8, 12, 16, 24, 32, 48. Screen padding is 16. List rows are at least 48 tall. Touch targets are at least 48 on Android and 44 on iOS.
- **Radius:** 4 for checkboxes, 8 for inputs and buttons, 12 for exercise images. Sheets use the bottom-sheet default top corners. The only pill shape is the selected segment of a segmented control, which follows the platform.
- **Elevation:** none on content. Sheets and headers use the platform default.

## Icons and motion

- **Icons:** Ionicons outline (bundled with Expo through `@expo/vector-icons`), one size step. The filled variant appears only on the active tab, which is the platform convention. Icons appear on tabs and a few actions (settings, more, close, drag handle). Icon-only buttons always have an accessibility label.
- **Motion only in response to actions:** a completed set's row tint fades in over 150 ms with a light haptic, sheets slide, and when the rest timer ends there is a haptic and the bar turns `success`. List items have no entrance animations. With reduced motion enabled, fades are instant.

## Component inventory

**Primitives** (`src/components/ui`, never fetch data):
`Screen`, `Text` (the five styles; tabular numerals for numbers), `Button` (primary, secondary, plain, destructive), `IconButton`, `TextField`, `NumberField` (numeric keypad, unit suffix), `DurationField` (m:ss), `Checkbox`, `SegmentedControl`, `ListSection` (header and footer text), `ListRow` (title, subtitle, value, chevron), `SwipeableRow`, `Separator`, `Sheet`, `EmptyState`, `ErrorState`, `OfflineBanner`, `SyncStatus` ("Not synced yet"), `Skeleton` (with row and list layouts), `LineChart`, `ResumeBar` (the bar above the tabs for a workout or paused recording), `ReorderableNameList`, `DragHandle`, `PermissionGate` (explanation before the system prompt, and Open settings when refused), `Dialog`, `DateButton`.

**Feature components:**
- Workout: `TableHeading` and `SetRow` (columns by exercise type), `RestTimerBar`, `ExerciseMenuSheet`, `ResumeWorkoutBar`, and the exercise picker screen.
- History: `MonthCalendar`.
- Cardio: `RouteMap`, the recording indicator, `CardioResumeBar`.
- Profile: `HeightField` (cm, or ft and in), shared with onboarding; `BodySection`.

Confirmations use the app's own `Dialog`, laid out like Android's, for example "Discard workout?" with "Cancel" and "Discard workout".

## Wireframes

These are wireframes, not screenshots. Navigation between screens is in [diagrams/navigation.md](diagrams/navigation.md).

### Active workout

A full-screen modal. "Close" minimises it to a resume bar above the tab bar.

```
+------------------------------------------+
| Close           Push A          Finish   |  native header; Finish = accent text action
| 42:18                                    |  elapsed, from started_at
+------------------------------------------+
| Barbell bench press                 ...  |  ... = sheet: note, rest time, swap, reorder, remove
| Pause the first rep                      |  exercise note, muted
| Set  Previous         kg     Reps   Done |  caption-size column headers
|  1   80 × 8        [ 82.5] [  8 ]   [x]  |  completed row gets the success tint
|  2   80 × 8        [ 82.5] [    ]   [ ]  |  an empty input shows the previous value as placeholder
|  3   80 × 7        [     ] [    ]   [ ]  |
|  Add set                                 |  swipe a set left to delete it
+------------------------------------------+
| Pull-up                             ...  |  bodyweight reps: no weight column
| Set  Previous                Reps   Done |
|  1   10                    [    ]   [ ]  |
+------------------------------------------+
| Plank                               ...  |  duration
| Set  Previous         Time          Done |
|  1   0:45          [ 1:00 ]  Start  [ ]  |  Start counts down; haptic at 0:00 and the set is ticked
+------------------------------------------+
| Add exercise                             |
| Workout note                             |
| Discard workout                          |  error colour
+------------------------------------------+
| Rest 1:24       -15s     +15s     Skip   |  sticky; thin progress line along the top edge
+------------------------------------------+
```

Columns follow the exercise type: weighted bodyweight shows "+kg", assisted bodyweight shows "-kg", and distance and duration (for example a rowing machine) shows "Distance" and "Time".

### Train tab and routines list

```
+------------------------------------------+
| Train                         [gear]     |  gear = Settings (labelled for screen readers)
+------------------------------------------+
| [         Start empty workout          ] |  primary
| [        Record outdoor cardio         ] |  secondary
|                                          |
| Routines                     Reorder New |  section header with text actions
| Push A                                 > |
| Bench press, incline press, +4 more      |
| Last done 28 Sep                         |
|------------------------------------------|  swipe left: Delete
| Pull A                                 > |
| Pull-up, barbell row, +3 more            |
| Not done yet                             |
+------------------------------------------+
| Push A   42:18                  Resume   |  only while a workout is in progress
+------------------------------------------+
| Train  History  Library  Progress  Profile|
+------------------------------------------+
```

Empty state: "No routines yet. Save the exercises you do each week so a workout starts already filled in." with a "New routine" button.

### Exercise detail

```
+------------------------------------------+
| <            Barbell bench press         |  library exercises are read-only
+------------------------------------------+
| [ start position ]  [ end position ]     |  dataset images, radius 12
| Chest                                    |
| Also works shoulders, triceps            |
| Barbell, weight and reps                 |
| [ About  |  History  |  Records ]        |
+------------------------------------------+
| About                                    |
|  1. Lie back on a flat bench...          |
|  2. Lower the bar to mid-chest...        |
| History                                  |
|  28 Sep 2026            Push A           |  section header per workout
|  1   82.5 kg × 8                         |
|  2   82.5 kg × 8                         |
| Records                                  |
|  Estimated 1RM          103.6 kg         |  label left, value right
|  28 Sep 2026                             |  date muted
|  Heaviest weight         85 kg           |
|  Best set             82.5 kg × 8        |
+------------------------------------------+
```

Records follow the exercise type: estimated 1RM for weighted types, most reps for bodyweight, least assistance for assisted, longest time for duration, longest distance and best pace for distance and duration.

### History

```
+------------------------------------------+
| History                                  |
|   <        September 2026        >       |
|   M    T    W    T    F    S    S        |
|   1    2    3.   4    5.   6    7        |  dot = trained that day; tap to jump to it
|   ...                                    |
| Sun 28 Sep                               |
| Push A                         58 min  > |
| 18 sets, 7,420 kg                        |
| Walk                           46 min  > |
| 4.21 km, 10:55 /km                       |
| Fri 26 Sep                               |
| ...                                      |
+------------------------------------------+
```

Empty state: "No workouts yet. Finished workouts and cardio sessions appear here by date."

### Progress

```
+------------------------------------------+
| Progress                                 |
| Exercise         Barbell bench press   > |  opens a picker sheet
| [ Est. 1RM | Best set | Volume ]         |  options depend on the exercise type
| [ 3M | 6M | 1Y | All ]                   |
| 110 |                       .--* 103.6   |  line chart; the latest point is labelled
| 100 |          .--*--*--'                |
|  90 |  *--*--'                           |
|     +--------------------------------    |
|        Jul          Aug          Sep     |
| Change over 3 months          +6.1 kg    |
|                                          |
| Personal records                See all  |
| Back squat    Est. 1RM 150 kg    12 Sep  |
| Pull-up       12 reps            20 Sep  |
| Plank         2:10               14 Sep  |
+------------------------------------------+
```

With fewer than two sessions for the chosen exercise, the chart area shows "Log this exercise in two workouts to see a trend."

### Profile tab

```
+------------------------------------------+
| Profile                                  |
| (JN)  Jamiil N                           |  initials in a plain neutral circle
|       48 workouts, 3 this week           |  one line of text, not stat tiles
| Personal info                     Edit   |  Edit needs a connection
| Date of birth      1 Jan 2000 (26)       |
| Height                     178 cm        |  cm, or ft/in when distance is in miles
| Sex                        Not set       |
| Body                                     |
| Bodyweight          81.4 kg    2 Oct     |
| BMI                           25.7       |
| BMI uses only weight and height, so it   |
| doesn't account for muscle mass.         |
+------------------------------------------+
```

Body tracking (the bodyweight log and its trend) sits in the Profile tab's Body section rather than a tab of its own.

### Body tracking in the Profile tab

```
+------------------------------------------+
| Body                               Log   |  Log opens the bodyweight form
| Bodyweight                81.4 kg        |
| 2 Oct                                    |
| BMI                          25.7        |
| All entries                            > |
| BMI uses only weight and height, so it   |
| doesn't account for muscle mass.         |
|   bodyweight trend chart, 90 days        |
+------------------------------------------+
```

### Onboarding

One screen, shown once after the email is verified. Only the units have to be chosen, and they start on kg and km.

```
+------------------------------------------+
| Welcome to FitTracker, Jamiil            |  title; the name is added as it's typed
| Your workouts and cardio, all in one     |
| place.                                   |
| Name (optional)       [ Jamiil        ]  |
| Weight unit           [ kg | lb ]        |
| Distance unit         [ km | mi ]        |
| Bodyweight (optional) [ 81.4      kg ]   |
| Height (optional)     [ 178       cm ]   |  ft and in when miles are chosen
| [              Get started             ] |
+------------------------------------------+
```

### Cardio recording

```
+------------------------------------------+
| Walk                      ● Recording    |  error-colour dot and the word, always visible
| +--------------------------------------+ |
| |  map, route line in accent,          | |
| |  current position     © OpenStreetMap| |
| +--------------------------------------+ |
| Distance                      3.42 km    |  value in the display style
| Duration                        41:07    |
| Current pace                11:52 /km    |
| Average pace                12:01 /km    |
| [     Pause      ]   [     Finish     ]  |
+------------------------------------------+
```

Before recording starts, the screen shows an activity choice (Run, Walk, Ride), one sentence explaining that location is used only while this session is recording, and a "Start recording" button. Location permission is requested only after that.
