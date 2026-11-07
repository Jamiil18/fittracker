-- Routines are saved and reordered through functions so that each change is a
-- single transaction: a routine is never left with half of its exercises if
-- the connection drops mid-save. The functions run as the calling user
-- (security invoker), so every row they touch still passes the RLS policies
-- in the initial schema.

-- A check constraint can't see the exercise row, so the targets are checked
-- here against the exercise type, as sets are: rep types may have a reps
-- target, timed types a time target, and none has both.
create function private.check_routine_targets_match_exercise_type() returns trigger
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
  return new;
end;
$$;

create trigger routine_exercises_match_exercise_type
  before insert or update on public.routine_exercises
  for each row execute function private.check_routine_targets_match_exercise_type();

-- Creates a routine (routine_id null) or replaces an existing one's name,
-- notes and exercise list. `exercises` is a JSON array in display order:
-- [{ "exercise_id", "target_sets", "target_reps_min", "target_reps_max",
--    "target_duration_seconds", "rest_seconds" }]. Returns the routine's id.
create function public.save_routine(
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
    routine_id, exercise_id, position, target_sets,
    target_reps_min, target_reps_max, target_duration_seconds, rest_seconds
  )
  select
    saved_id,
    (item.value ->> 'exercise_id')::uuid,
    (item.ordinality - 1)::smallint,
    (item.value ->> 'target_sets')::smallint,
    (item.value ->> 'target_reps_min')::smallint,
    (item.value ->> 'target_reps_max')::smallint,
    (item.value ->> 'target_duration_seconds')::integer,
    (item.value ->> 'rest_seconds')::smallint
  from jsonb_array_elements(exercises) with ordinality as item(value, ordinality);

  return saved_id;
end;
$$;

-- Sets the order of the user's routines on the Train tab: the first id in the
-- array comes first. Ids of routines the user can't see are ignored by RLS.
create function public.reorder_routines(routine_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.routines r
  set position = ordered.ordinality - 1
  from unnest(routine_ids) with ordinality as ordered(id, ordinality)
  where r.id = ordered.id;
$$;

revoke execute on function public.save_routine(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.reorder_routines(uuid[]) from public, anon;
grant execute on function public.save_routine(uuid, text, text, jsonb) to authenticated;
grant execute on function public.reorder_routines(uuid[]) to authenticated;
