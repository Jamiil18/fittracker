-- Personal details for the Profile tab. All are optional. The existing RLS
-- policies on profiles already limit reading and updating to the user's own
-- row, so no new policy is needed; the database tests check that.

create type public.sex as enum ('female', 'male');

alter table public.profiles
  add column display_name text
    check (char_length(display_name) between 1 and 40 and display_name = btrim(display_name)),
  add column date_of_birth date check (date_of_birth >= date '1900-01-01'),
  -- Stored in centimetres; shown in ft/in when distances are in miles.
  add column height_cm numeric(4, 1) check (height_cm between 100 and 250),
  add column sex public.sex;

-- A check constraint can't compare with today's date, so a date of birth in
-- the future is refused here.
create function private.check_date_of_birth() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.date_of_birth > current_date then
    raise exception 'Date of birth is in the future' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_check_date_of_birth
  before insert or update of date_of_birth on public.profiles
  for each row execute function private.check_date_of_birth();
