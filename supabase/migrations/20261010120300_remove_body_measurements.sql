-- Body measurements (neck, shoulders, chest, waist, hips, arms, thighs and
-- calves) were removed from the app; the table now holds one bodyweight per
-- day. Days that only had measurements are deleted, so every row left has a
-- weight. Dropping the columns also drops the check that needed at least one
-- value, which the not-null weight replaces.

delete from public.body_measurements where weight_kg is null;

alter table public.body_measurements
  drop column neck_cm,
  drop column shoulders_cm,
  drop column chest_cm,
  drop column waist_cm,
  drop column hips_cm,
  drop column left_arm_cm,
  drop column right_arm_cm,
  drop column left_thigh_cm,
  drop column right_thigh_cm,
  drop column left_calf_cm,
  drop column right_calf_cm,
  alter column weight_kg set not null;
