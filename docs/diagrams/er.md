# Entity relationship diagram

The tables as they stand after every migration in `supabase/migrations/` (the initial schema, the profile details, and the later removals of unused tables and columns). Every table except `profiles` and `exercises` also has a `user_id` column referencing `auth.users`. Those links are left out below to keep the diagram readable; Row Level Security uses them to restrict each row to its owner.

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "has"
  AUTH_USERS ||--o{ ROUTINES : "owns"
  ROUTINES ||--o{ ROUTINE_EXERCISES : "contains"
  EXERCISES ||--o{ ROUTINE_EXERCISES : "planned as"
  AUTH_USERS ||--o{ WORKOUTS : "logs"
  ROUTINES |o--o{ WORKOUTS : "started from"
  WORKOUTS ||--o{ WORKOUT_EXERCISES : "contains"
  EXERCISES ||--o{ WORKOUT_EXERCISES : "performed as"
  WORKOUT_EXERCISES ||--o{ SETS : "has"
  AUTH_USERS ||--o{ BODY_MEASUREMENTS : "records"
  AUTH_USERS ||--o{ CARDIO_SESSIONS : "records"

  AUTH_USERS {
    uuid id PK
    text email
  }
  PROFILES {
    uuid id PK, FK
    weight_unit weight_unit
    distance_unit distance_unit
    smallint default_rest_seconds
    timestamptz onboarding_completed_at
    text display_name
    date date_of_birth
    numeric height_cm
    sex sex
  }
  EXERCISES {
    uuid id PK
    text source_id UK "dataset id"
    text name
    exercise_type exercise_type
    muscle_group_array primary_muscles
    muscle_group_array secondary_muscles
    equipment equipment
    text_array instructions
    text_array image_paths
  }
  ROUTINES {
    uuid id PK
    uuid user_id FK
    text name
    text notes
    integer position
  }
  ROUTINE_EXERCISES {
    uuid id PK
    uuid routine_id FK
    uuid exercise_id FK
    smallint position
    smallint target_sets
    smallint target_reps_min
    smallint target_reps_max
    integer target_duration_seconds
    numeric target_weight_kg
    smallint rest_seconds "null uses profile default"
  }
  WORKOUTS {
    uuid id PK
    uuid user_id FK
    uuid routine_id FK
    text name
    text notes
    timestamptz started_at
    timestamptz ended_at
  }
  WORKOUT_EXERCISES {
    uuid id PK
    uuid workout_id FK
    uuid exercise_id FK
    smallint position
    text notes
  }
  SETS {
    uuid id PK
    uuid workout_exercise_id FK
    smallint position
    numeric weight_kg
    smallint reps
    integer duration_seconds
    numeric distance_m
  }
  BODY_MEASUREMENTS {
    uuid id PK
    uuid user_id FK
    date measured_on "one row per day"
    numeric weight_kg "bodyweight"
  }
  CARDIO_SESSIONS {
    uuid id PK
    uuid user_id FK
    cardio_activity activity
    timestamptz started_at
    timestamptz ended_at
    integer moving_seconds
    numeric distance_m
    jsonb route "lng, lat, time points"
  }
```
