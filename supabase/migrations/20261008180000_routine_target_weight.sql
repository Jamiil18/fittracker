-- An optional target weight for each exercise in a routine, in kilograms like
-- every stored weight. It means the same as a set's weight for the exercise
-- type: the load for weight and reps, the added load for weighted bodyweight,
-- and the assistance for assisted bodyweight. Empty means no target.
alter table public.routine_exercises
  add column target_weight_kg numeric(7, 3)
    check (target_weight_kg > 0 and target_weight_kg <= 1000);

-- Same checks as before, plus: only the three weighted types may have a weight.
create or replace function private.check_routine_targets_match_exercise_type() returns trigger
language plpgsql set search_path = '' as $$
declare
  kind public.exercise_type;
begin
  select e.exercise_type into kind from public.exercises e where e.id = new.exercise_id;

  if kind in ('duration', 'distance_duration') and new.target_reps_min is not null then
    raise exception 'Routine targets do not match exercise type %', kind
      using errcode = 'check_violation';
  end if;
  if kind not in ('duration', 'distance_duration') and new.target_duration_seconds is not null then
    raise exception 'Routine targets do not match exercise type %', kind
      using errcode = 'check_violation';
  end if;
  if kind not in ('weight_reps', 'weighted_bodyweight', 'assisted_bodyweight')
     and new.target_weight_kg is not null then
    raise exception 'Routine targets do not match exercise type %', kind
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Same as in 20261008120000_routine_functions.sql, now also saving
-- "target_weight_kg" from each exercise in the array. `create or replace`
-- keeps the existing grants.
create or replace function public.save_routine(
  routine_id uuid,
  routine_name text,
  routine_notes text,
  exercises jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  saved_id uuid;
begin
  -- 30 matches the limit in the app's routine form.
  if jsonb_typeof(exercises) <> 'array' or jsonb_array_length(exercises) not between 1 and 30 then
    raise exception 'A routine needs between 1 and 30 exercises' using errcode = 'check_violation';
  end if;

  if routine_id is null then
    -- New routines go to the end of the list.
    insert into public.routines (name, notes, position)
    values (
      routine_name,
      routine_notes,
      coalesce((select max(r.position) + 1 from public.routines r
                where r.user_id = (select auth.uid())), 0)
    )
    returning id into saved_id;
  else
    update public.routines r
    set name = routine_name, notes = routine_notes
    where r.id = routine_id
    returning r.id into saved_id;

    -- Also reached when RLS hides the routine because it belongs to someone else.
    if saved_id is null then
      raise exception 'Routine not found' using errcode = 'no_data_found';
    end if;

    delete from public.routine_exercises re where re.routine_id = saved_id;
  end if;

  insert into public.routine_exercises (
    routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max,
    target_duration_seconds, target_weight_kg, rest_seconds
  )
  select
    saved_id,
    (item.value ->> 'exercise_id')::uuid,
    (item.ordinality - 1)::smallint,
    (item.value ->> 'target_sets')::smallint,
    (item.value ->> 'target_reps_min')::smallint,
    (item.value ->> 'target_reps_max')::smallint,
    (item.value ->> 'target_duration_seconds')::integer,
    (item.value ->> 'target_weight_kg')::numeric,
    (item.value ->> 'rest_seconds')::smallint
  from jsonb_array_elements(exercises) with ordinality as item(value, ordinality);

  return saved_id;
end;
$$;
