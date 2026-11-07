-- RPE, warm-up sets and drop sets were removed from the app, so every set is
-- now an ordinary set. Existing warm-ups are deleted: they never counted
-- towards records, so records stay the same.
-- Drop sets are kept as ordinary sets.
delete from public.sets where set_type = 'warmup';

-- The history view and save_workout read the two columns, so the view is
-- dropped first and both are recreated without them.
drop view public.exercise_set_history;

alter table public.sets
  drop column set_type,
  drop column rpe;

drop type public.set_type;

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
  s.weight_kg,
  s.reps,
  s.duration_seconds,
  s.distance_m
from public.sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w on w.id = we.workout_id;

-- Same as in 20261009090000_save_workout.sql, without set_type and rpe. Any
-- other keys in a set, such as those in a workout queued on a phone before
-- this change, are ignored. `create or replace` keeps the existing grants.
--
-- `workout` is a JSON object:
-- { "id", "routine_id", "name", "notes", "started_at", "ended_at",
--   "exercises": [{ "exercise_id", "notes",
--                   "sets": [{ "weight_kg", "reps", "duration_seconds", "distance_m" }] }] }
create or replace function public.save_workout(workout jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  saved_id uuid;
  exercise_item record;
  entry_id uuid;
begin
  if jsonb_typeof(workout -> 'exercises') <> 'array'
     or jsonb_array_length(workout -> 'exercises') = 0 then
    raise exception 'A workout needs at least one exercise' using errcode = 'check_violation';
  end if;

  insert into public.workouts (id, routine_id, name, notes, started_at, ended_at)
  values (
    (workout ->> 'id')::uuid,
    -- The routine may have been deleted while the workout waited to sync;
    -- the workout is kept either way, without the link.
    (select r.id from public.routines r where r.id = (workout ->> 'routine_id')::uuid),
    workout ->> 'name',
    workout ->> 'notes',
    (workout ->> 'started_at')::timestamptz,
    (workout ->> 'ended_at')::timestamptz
  )
  on conflict (id) do nothing
  returning id into saved_id;

  -- Already saved by an earlier call.
  if saved_id is null then
    return (workout ->> 'id')::uuid;
  end if;

  for exercise_item in
    select item.value, item.ordinality
    from jsonb_array_elements(workout -> 'exercises') with ordinality as item(value, ordinality)
  loop
    insert into public.workout_exercises (workout_id, exercise_id, position, notes)
    values (
      saved_id,
      (exercise_item.value ->> 'exercise_id')::uuid,
      (exercise_item.ordinality - 1)::smallint,
      exercise_item.value ->> 'notes'
    )
    returning id into entry_id;

    insert into public.sets (
      workout_exercise_id, position, weight_kg, reps, duration_seconds, distance_m
    )
    select
      entry_id,
      (s.ordinality - 1)::smallint,
      (s.value ->> 'weight_kg')::numeric,
      (s.value ->> 'reps')::smallint,
      (s.value ->> 'duration_seconds')::integer,
      (s.value ->> 'distance_m')::numeric
    from jsonb_array_elements(exercise_item.value -> 'sets') with ordinality as s(value, ordinality);
  end loop;

  return saved_id;
end;
$$;
