-- Custom exercises were removed from the app. The exercises table now holds
-- only the seeded library, which every signed-in user can read and nobody
-- can change through the API.

-- Existing custom exercises go, with everything that used them: their logged
-- sets (through their workout entries), their routine entries (by cascade),
-- and any workout or routine left with no exercises.
delete from public.workout_exercises we
using public.exercises e
where e.id = we.exercise_id and e.owner_id is not null;

delete from public.workouts w
where not exists (select 1 from public.workout_exercises we where we.workout_id = w.id);

delete from public.exercises where owner_id is not null;

delete from public.routines r
where not exists (select 1 from public.routine_exercises re where re.routine_id = r.id);

-- Exercises: read-only for everyone signed in.
drop policy "Users read global and own exercises" on public.exercises;
drop policy "Users create own exercises" on public.exercises;
drop policy "Users update own exercises" on public.exercises;
drop policy "Users delete own exercises" on public.exercises;

create policy "Users read the exercise library" on public.exercises
  for select to authenticated using (true);

-- Routine and workout entries no longer need to check who owns the exercise,
-- since every exercise is shared. They still check that the routine or
-- workout belongs to the user.
drop policy "Users add exercises to own routines" on public.routine_exercises;
drop policy "Users update own routine exercises" on public.routine_exercises;
drop policy "Users add exercises to own workouts" on public.workout_exercises;
drop policy "Users update own workout exercises" on public.workout_exercises;

create policy "Users add exercises to own routines" on public.routine_exercises
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid()))
  );
create policy "Users update own routine exercises" on public.routine_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r
                where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid()))
  );
create policy "Users add exercises to own workouts" on public.workout_exercises
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid()))
  );
create policy "Users update own workout exercises" on public.workout_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w
                where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid()))
  );

-- The type lock existed so a user couldn't change their own exercise's type
-- after logging it; nobody can change an exercise now.
drop trigger exercises_lock_type on public.exercises;
drop function private.lock_exercise_type_once_logged();

-- Dropping owner_id also drops its index and the unique custom-name index.
alter table public.exercises
  drop constraint exercises_global_or_custom,
  drop column owner_id,
  drop column archived_at,
  alter column source_id set not null;
