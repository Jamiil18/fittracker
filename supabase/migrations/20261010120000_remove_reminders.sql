-- Training reminders were removed from the app, so the settings that drove
-- them are no longer stored.
alter table public.profiles
  drop column training_days,
  drop column training_time,
  drop column reminders_enabled;
