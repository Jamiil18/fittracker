-- Saves a finished workout, its exercises and their completed sets in one
-- transaction. It runs as the calling user (security invoker), so every row
-- still passes the RLS policies and the set-shape trigger in the initial schema.
--
-- The workout id is created on the phone when the workout starts. If the
-- phone sends the same workout twice, for example because the connection
-- dropped before the first reply arrived, the second call saves nothing and
-- returns the same id, so a retry never creates a duplicate.
--
-- `workout` is a JSON object:
-- { "id", "routine_id", "name", "notes", "started_at", "ended_at",
--   "exercises": [{ "exercise_id", "notes",
--                   "sets": [{ "set_type", "weight_kg", "reps",
--                              "duration_seconds", "distance_m", "rpe" }] }] }
-- Exercises and sets are saved in array order.
create function public.save_workout(workout jsonb) returns uuid
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
      workout_exercise_id, position, set_type, weight_kg, reps, duration_seconds, distance_m, rpe
    )
    select
      entry_id,
      (s.ordinality - 1)::smallint,
      (s.value ->> 'set_type')::public.set_type,
      (s.value ->> 'weight_kg')::numeric,
      (s.value ->> 'reps')::smallint,
      (s.value ->> 'duration_seconds')::integer,
      (s.value ->> 'distance_m')::numeric,
      (s.value ->> 'rpe')::numeric
    from jsonb_array_elements(exercise_item.value -> 'sets') with ordinality as s(value, ordinality);
  end loop;

  return saved_id;
end;
$$;

revoke execute on function public.save_workout(jsonb) from public, anon;
grant execute on function public.save_workout(jsonb) to authenticated;
