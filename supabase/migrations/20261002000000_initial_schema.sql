-- FitTracker initial schema. Every row belongs to one user through RLS;
-- exercises with owner_id null are shared, read-only reference data.

create schema if not exists private;

create type public.weight_unit as enum ('kg', 'lb');
create type public.distance_unit as enum ('km', 'mi');
create type public.exercise_type as enum (
  'weight_reps', 'bodyweight_reps', 'weighted_bodyweight',
  'assisted_bodyweight', 'duration', 'distance_duration'
);
create type public.muscle_group as enum (
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'lats', 'lower_back', 'middle_back',
  'neck', 'quadriceps', 'shoulders', 'traps', 'triceps'
);
create type public.equipment as enum (
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bands',
  'body_only', 'ez_bar', 'medicine_ball', 'exercise_ball', 'foam_roll', 'other'
);
create type public.set_type as enum ('warmup', 'working', 'drop');
create type public.photo_pose as enum ('front', 'side', 'back');
create type public.cardio_activity as enum ('run', 'walk', 'ride');

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profiles -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  weight_unit public.weight_unit not null default 'kg',
  distance_unit public.distance_unit not null default 'km',
  -- ISO weekday numbers, 1 = Monday
  training_days smallint[] not null default '{}'
    check (training_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  training_time time,
  reminders_enabled boolean not null default false,
  default_rest_seconds smallint not null default 120
    check (default_rest_seconds between 0 and 900),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Exercises ------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  source_id text unique,
  name text not null check (char_length(name) between 1 and 80 and name = btrim(name)),
  exercise_type public.exercise_type not null,
  primary_muscles public.muscle_group[] not null
    check (cardinality(primary_muscles) between 1 and 5),
  secondary_muscles public.muscle_group[] not null default '{}',
  equipment public.equipment not null,
  instructions text[] not null default '{}'
    check (cardinality(instructions) <= 30
           and char_length(array_to_string(instructions, '')) <= 5000),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 4),
  -- Custom exercises used in history are archived instead of deleted.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Global rows come from the dataset; custom rows belong to a user. Never both.
  constraint exercises_global_or_custom check ((owner_id is null) <> (source_id is null))
);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function private.set_updated_at();

-- Sets are validated against the exercise type, so changing the type after
-- sets exist would make history invalid.
create function private.lock_exercise_type_once_logged() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.exercise_type <> old.exercise_type
     and exists (select 1 from public.workout_exercises we where we.exercise_id = old.id) then
    raise exception 'Exercise type cannot change after sets are logged'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Routines -------------------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60 and name = btrim(name)),
  notes text check (char_length(notes) <= 500),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function private.set_updated_at();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position smallint not null check (position >= 0),
  target_sets smallint not null check (target_sets between 1 and 20),
  target_reps_min smallint check (target_reps_min between 1 and 100),
  target_reps_max smallint check (target_reps_max between 1 and 100),
  target_duration_seconds integer check (target_duration_seconds between 1 and 3600),
  -- Null means "use profiles.default_rest_seconds".
  rest_seconds smallint check (rest_seconds between 0 and 900),
  check (target_reps_max is null
         or (target_reps_min is not null and target_reps_max >= target_reps_min))
);

-- Workouts -------------------------------------------------------------------
-- Only finished workouts are stored; the session in progress lives on the device.

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60 and name = btrim(name)),
  notes text check (char_length(notes) <= 1000),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at >= started_at and ended_at - started_at <= interval '24 hours')
);

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function private.set_updated_at();

-- The foreign key to exercises uses the default NO ACTION rather than
-- RESTRICT: it is checked at the end of the statement, so deleting a user
-- (which cascades to both their custom exercises and their history) succeeds.
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null check (position >= 0),
  notes text check (char_length(notes) <= 500)
);

create trigger exercises_lock_type
  before update of exercise_type on public.exercises
  for each row execute function private.lock_exercise_type_once_logged();

-- Only completed sets are saved; unfinished rows are dropped on finish.
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null check (position >= 0),
  set_type public.set_type not null default 'working',
  -- Load for weight_reps, added load for weighted_bodyweight, assistance for assisted_bodyweight.
  weight_kg numeric(7, 3) check (weight_kg between 0 and 1000),
  reps smallint check (reps between 1 and 1000),
  duration_seconds integer check (duration_seconds between 1 and 86400),
  distance_m numeric(9, 1) check (distance_m > 0 and distance_m <= 1000000),
  rpe numeric(3, 1) check (rpe between 1 and 10 and rpe * 2 = round(rpe * 2))
);

-- A check constraint can't see the exercise row, so the shape of each set is
-- enforced here against its exercise type.
create function private.check_set_matches_exercise_type() returns trigger
language plpgsql set search_path = '' as $$
declare
  kind public.exercise_type;
  valid boolean;
begin
  select e.exercise_type into kind
  from public.workout_exercises we
  join public.exercises e on e.id = we.exercise_id
  where we.id = new.workout_exercise_id;

  valid := case
    when kind in ('weight_reps', 'weighted_bodyweight', 'assisted_bodyweight') then
      new.weight_kg is not null and new.reps is not null
      and new.duration_seconds is null and new.distance_m is null
    when kind = 'bodyweight_reps' then
      new.reps is not null and new.weight_kg is null
      and new.duration_seconds is null and new.distance_m is null
    when kind = 'duration' then
      new.duration_seconds is not null and new.weight_kg is null
      and new.reps is null and new.distance_m is null
    when kind = 'distance_duration' then
      new.distance_m is not null and new.duration_seconds is not null
      and new.weight_kg is null and new.reps is null
    else false
  end;

  if not valid then
    raise exception 'Set values do not match exercise type %', kind
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger sets_match_exercise_type
  before insert or update on public.sets
  for each row execute function private.check_set_matches_exercise_type();

-- Body tracking --------------------------------------------------------------

-- One row per user per day; logging again the same day updates that row.
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) check (weight_kg between 20 and 400),
  neck_cm numeric(4, 1) check (neck_cm between 10 and 100),
  shoulders_cm numeric(4, 1) check (shoulders_cm between 30 and 250),
  chest_cm numeric(4, 1) check (chest_cm between 30 and 250),
  waist_cm numeric(4, 1) check (waist_cm between 30 and 250),
  hips_cm numeric(4, 1) check (hips_cm between 30 and 250),
  left_arm_cm numeric(4, 1) check (left_arm_cm between 10 and 100),
  right_arm_cm numeric(4, 1) check (right_arm_cm between 10 and 100),
  left_thigh_cm numeric(4, 1) check (left_thigh_cm between 20 and 150),
  right_thigh_cm numeric(4, 1) check (right_thigh_cm between 20 and 150),
  left_calf_cm numeric(4, 1) check (left_calf_cm between 15 and 100),
  right_calf_cm numeric(4, 1) check (right_calf_cm between 15 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, measured_on),
  check (num_nonnulls(weight_kg, neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm,
                      left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm,
                      left_calf_cm, right_calf_cm) >= 1)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pose public.photo_pose not null,
  taken_on date not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  -- Ties the row to the storage policies below: files live under the owner's folder.
  check (storage_path = user_id::text || '/' || id::text || '.jpg')
);

-- Cardio ---------------------------------------------------------------------

create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity public.cardio_activity not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  moving_seconds integer not null check (moving_seconds >= 0),
  -- Derivable from route, but stored so history lists don't sum thousands of
  -- points per row.
  distance_m numeric(9, 1) not null check (distance_m between 0 and 1000000),
  -- Array of [longitude, latitude, unix_ms] points (GeoJSON coordinate order).
  route jsonb not null default '[]'
    check (jsonb_typeof(route) = 'array' and jsonb_array_length(route) <= 20000),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  check (ended_at >= started_at and ended_at - started_at <= interval '24 hours'),
  check (moving_seconds <= extract(epoch from ended_at - started_at))
);

-- Indexes: every foreign key, plus the orderings the lists use ----------------

create index exercises_owner_id_idx on public.exercises (owner_id);
create unique index exercises_custom_name_key on public.exercises (owner_id, lower(name))
  where owner_id is not null and archived_at is null;
create index routines_user_position_idx on public.routines (user_id, position);
create index routine_exercises_routine_position_idx on public.routine_exercises (routine_id, position);
create index routine_exercises_user_id_idx on public.routine_exercises (user_id);
create index routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index workouts_routine_id_idx on public.workouts (routine_id);
create index workout_exercises_workout_position_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_user_exercise_idx on public.workout_exercises (user_id, exercise_id);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);
create index sets_workout_exercise_position_idx on public.sets (workout_exercise_id, position);
create index sets_user_id_idx on public.sets (user_id);
create index progress_photos_user_pose_idx on public.progress_photos (user_id, pose, taken_on desc);
create index cardio_sessions_user_started_idx on public.cardio_sessions (user_id, started_at desc);

-- One row per logged set with its exercise and workout date.
-- security_invoker makes the caller's RLS apply, so it only ever shows own sets.
create view public.exercise_set_history with (security_invoker = true) as
select
  s.id as set_id,
  s.user_id,
  we.exercise_id,
  w.id as workout_id,
  w.started_at as workout_started_at,
  we.position as exercise_position,
  s.position as set_position,
  s.set_type,
  s.weight_kg,
  s.reps,
  s.duration_seconds,
  s.distance_m,
  s.rpe
from public.sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w on w.id = we.workout_id;

-- Row Level Security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.cardio_sessions enable row level security;

-- Profiles are created by the signup trigger and removed by cascade, so users
-- can only read and update their own.
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Users read global and own exercises" on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy "Users create own exercises" on public.exercises
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and source_id is null);
create policy "Users update own exercises" on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and source_id is null);
create policy "Users delete own exercises" on public.exercises
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Users read own routines" on public.routines
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create own routines" on public.routines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own routines" on public.routines
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own routines" on public.routines
  for delete to authenticated using (user_id = (select auth.uid()));

-- Child rows repeat user_id so reads stay a simple comparison. Writes also
-- check the parent belongs to the same user, so nobody can attach rows to
-- someone else's routine or workout.
create policy "Users read own routine exercises" on public.routine_exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add exercises to own routines" on public.routine_exercises
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = routine_exercises.exercise_id
                  and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Users update own routine exercises" on public.routine_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = routine_exercises.exercise_id
                  and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Users delete own routine exercises" on public.routine_exercises
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own workouts" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create own workouts" on public.workouts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (routine_id is null
         or exists (select 1 from public.routines r
                    where r.id = workouts.routine_id and r.user_id = (select auth.uid())))
  );
create policy "Users update own workouts" on public.workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null
         or exists (select 1 from public.routines r
                    where r.id = workouts.routine_id and r.user_id = (select auth.uid())))
  );
create policy "Users delete own workouts" on public.workouts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own workout exercises" on public.workout_exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add exercises to own workouts" on public.workout_exercises
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = workout_exercises.exercise_id
                  and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Users update own workout exercises" on public.workout_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e
                where e.id = workout_exercises.exercise_id
                  and (e.owner_id is null or e.owner_id = (select auth.uid())))
  );
create policy "Users delete own workout exercises" on public.workout_exercises
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own sets" on public.sets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add sets to own workouts" on public.sets
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_exercises we
                where we.id = sets.workout_exercise_id and we.user_id = (select auth.uid()))
  );
create policy "Users update own sets" on public.sets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_exercises we
                where we.id = sets.workout_exercise_id and we.user_id = (select auth.uid()))
  );
create policy "Users delete own sets" on public.sets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own body measurements" on public.body_measurements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create own body measurements" on public.body_measurements
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own body measurements" on public.body_measurements
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own body measurements" on public.body_measurements
  for delete to authenticated using (user_id = (select auth.uid()));

-- No update policy: a photo is replaced by deleting it and taking another.
create policy "Users read own progress photos" on public.progress_photos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create own progress photos" on public.progress_photos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users delete own progress photos" on public.progress_photos
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own cardio sessions" on public.cardio_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create own cardio sessions" on public.cardio_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own cardio sessions" on public.cardio_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own cardio sessions" on public.cardio_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Privileges -----------------------------------------------------------------

-- Signed-out clients get nothing from the data API, and new functions are not
-- callable by anyone until granted explicitly.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- Called daily by the GitHub Actions keep-alive workflow so the free-plan
-- project sees database activity and is not paused during marking.
-- Reads no user data.
create function public.heartbeat() returns timestamptz
language sql stable security invoker set search_path = '' as $$
  select now();
$$;
revoke execute on function public.heartbeat() from public;
grant execute on function public.heartbeat() to anon, authenticated;

-- Storage: private bucket for progress photos ---------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 2097152, array['image/jpeg']);

create policy "Users read own progress photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own progress photo files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own progress photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
