-- Saves an edited past workout: its name, notes, exercises and sets are
-- replaced in one transaction. The workout is deleted and saved again through
-- save_workout with the same id, so both use the same insert rules, and an
-- edit that fails any check leaves the original untouched.
--
-- `workout` has the same shape as save_workout's; the app sends the original
-- routine, start and end times back unchanged. Runs as the calling user, so
-- only the user's own workout can be replaced.
create function public.replace_workout(workout jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  replaced_id uuid;
begin
  delete from public.workouts w
  where w.id = (workout ->> 'id')::uuid
  returning w.id into replaced_id;

  -- Also reached when RLS hides the workout because it belongs to someone else.
  if replaced_id is null then
    raise exception 'Workout not found' using errcode = 'no_data_found';
  end if;

  return public.save_workout(workout);
end;
$$;

revoke execute on function public.replace_workout(jsonb) from public, anon;
grant execute on function public.replace_workout(jsonb) to authenticated;
