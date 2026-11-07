-- Editing past workouts was removed from the app; deleting one stays and
-- needs no function.
drop function public.replace_workout(jsonb);
