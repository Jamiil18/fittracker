import { createTestDatabase, type TestDatabase } from './testDatabase';

const alice = '00000000-0000-4000-8000-00000000000a';
const bob = '00000000-0000-4000-8000-00000000000b';

const aliceRoutine = '10000000-0000-4000-8000-000000000001';
const aliceWorkout = '20000000-0000-4000-8000-000000000001';
const aliceBenchEntry = '30000000-0000-4000-8000-000000000001';
const alicePlankEntry = '30000000-0000-4000-8000-000000000002';

const rlsRefusal = /row-level security/;
const checkFailure = /violates check constraint/;
const wrongSetShape = /do not match exercise type/;

// Two users, and a routine and finished workout owned by Alice that use two
// exercises from the seeded library. Each describe block gets its own fresh
// database.
const benchPress = 'Barbell_Bench_Press_-_Medium_Grip';
// The exercises seeded from free-exercise-db (scripts/generate-exercise-seed.ts).
const libraryExerciseCount = 876;

async function setUp(): Promise<TestDatabase> {
  const db = await createTestDatabase();
  await db.createUser(alice);
  await db.createUser(bob);
  await db.asUser(
    alice,
    `
    insert into public.routines (id, name) values ('${aliceRoutine}', 'Push A');
    insert into public.routine_exercises
      (routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds)
    select '${aliceRoutine}', id, 0, 3, 8, 12, 150
    from public.exercises where source_id = '${benchPress}';

    insert into public.workouts (id, routine_id, name, started_at, ended_at)
    values ('${aliceWorkout}', '${aliceRoutine}', 'Push A', now() - interval '1 hour', now());
    insert into public.workout_exercises (id, workout_id, exercise_id, position)
    select '${aliceBenchEntry}', '${aliceWorkout}', id, 0
    from public.exercises where source_id = '${benchPress}';
    insert into public.workout_exercises (id, workout_id, exercise_id, position)
    select '${alicePlankEntry}', '${aliceWorkout}', id, 1
    from public.exercises where source_id = 'Plank';
    insert into public.sets (workout_exercise_id, position, weight_kg, reps)
    values ('${aliceBenchEntry}', 0, 82.5, 8);
    insert into public.sets (workout_exercise_id, position, duration_seconds)
    values ('${alicePlankEntry}', 0, 60);
  `,
  );
  return db;
}

describe('profiles', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it('creates a profile for every new user', async () => {
    const rows = await db.asAdmin('select id from public.profiles');
    expect(rows).toHaveLength(2);
  });

  it('lets a user read only their own profile', async () => {
    const rows = await db.asUser(alice, 'select id from public.profiles');
    expect(rows).toEqual([{ id: alice }]);
  });

  it("does not let a user change someone else's profile", async () => {
    const updated = await db.asUser(
      bob,
      `update public.profiles set weight_unit = 'lb' where id = '${alice}' returning id`,
    );
    expect(updated).toHaveLength(0);
  });

  describe('personal details', () => {
    it('lets a user set their own name, date of birth, height and sex', async () => {
      const [row] = await db.asUser(
        alice,
        `update public.profiles
         set display_name = 'Alice', date_of_birth = '2002-03-14', height_cm = 168.5, sex = 'female'
         where id = '${alice}'
         returning display_name, date_of_birth::text, height_cm::float8 as height, sex`,
      );
      expect(row).toEqual({
        display_name: 'Alice',
        date_of_birth: '2002-03-14',
        height: 168.5,
        sex: 'female',
      });
    });

    it("does not let a user change someone else's details", async () => {
      const updated = await db.asUser(
        bob,
        `update public.profiles set display_name = 'Bob' where id = '${alice}' returning id`,
      );
      expect(updated).toHaveLength(0);
    });

    it('rejects details outside the limits', async () => {
      const update = (set: string) =>
        db.asUser(alice, `update public.profiles set ${set} where id = '${alice}'`);
      await expect(update(`display_name = ' Alice'`)).rejects.toThrow(checkFailure);
      await expect(update(`display_name = '${'a'.repeat(41)}'`)).rejects.toThrow(checkFailure);
      await expect(update(`height_cm = 99`)).rejects.toThrow(checkFailure);
      await expect(update(`date_of_birth = '1899-12-31'`)).rejects.toThrow(checkFailure);
      await expect(update(`date_of_birth = current_date + 1`)).rejects.toThrow(/in the future/);
      await expect(update(`sex = 'other'`)).rejects.toThrow(/invalid input value for enum/);
    });
  });
});

describe('exercise library', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it('lets signed-in users read the whole seeded library', async () => {
    const rows = await db.asUser(bob, 'select name from public.exercises');
    expect(rows).toHaveLength(libraryExerciseCount);
  });

  it('keeps library exercises read-only', async () => {
    const updated = await db.asUser(
      alice,
      `update public.exercises set name = 'Renamed' where source_id is not null returning id`,
    );
    expect(updated).toHaveLength(0);
    const deleted = await db.asUser(
      alice,
      `delete from public.exercises where source_id is not null returning id`,
    );
    expect(deleted).toHaveLength(0);
  });

  it('does not let users create exercises', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.exercises (name, exercise_type, primary_muscles, equipment, source_id)
         values ('Landmine press', 'weight_reps', '{shoulders}', 'barbell', 'Landmine_Press')`,
      ),
    ).rejects.toThrow(rlsRefusal);
  });

  it('no longer has columns for custom exercises', async () => {
    const [columns] = await db.asAdmin(
      `select count(*)::int as count from information_schema.columns
       where table_schema = 'public' and table_name = 'exercises'
         and column_name in ('owner_id', 'archived_at')`,
    );
    expect(columns).toEqual({ count: 0 });
  });
});

describe('routines', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it('stores a per-exercise rest time and rejects one over 15 minutes', async () => {
    const rows = await db.asUser(alice, 'select rest_seconds from public.routine_exercises');
    expect(rows).toEqual([{ rest_seconds: 150 }]);

    await expect(
      db.asUser(alice, 'update public.routine_exercises set rest_seconds = 901'),
    ).rejects.toThrow(checkFailure);
  });

  it("hides one user's routines from another", async () => {
    expect(await db.asUser(bob, 'select id from public.routines')).toHaveLength(0);
    expect(await db.asUser(bob, 'select id from public.routine_exercises')).toHaveLength(0);
  });

  it('does not let a user insert a row owned by someone else', async () => {
    await expect(
      db.asUser(bob, `insert into public.routines (user_id, name) values ('${alice}', 'Sneaky')`),
    ).rejects.toThrow(rlsRefusal);
  });

  it("does not let a user add exercises to someone else's routine", async () => {
    await expect(
      db.asUser(
        bob,
        `insert into public.routine_exercises (routine_id, exercise_id, position, target_sets)
         select '${aliceRoutine}', id, 1, 3 from public.exercises where source_id = 'Plank'`,
      ),
    ).rejects.toThrow(rlsRefusal);
  });
});

describe('saving and reordering routines', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  // A save_routine call with the given exercises, each looked up by its
  // dataset id so the test doesn't depend on generated uuids.
  function saveRoutineSql(
    routineId: string | null,
    name: string,
    exercises: { sourceId: string; targets: Record<string, number | null> }[],
  ) {
    const items = exercises
      .map(
        ({ sourceId, targets }) =>
          `jsonb_build_object('exercise_id', (select id from public.exercises where source_id = '${sourceId}'))
           || '${JSON.stringify(targets)}'::jsonb`,
      )
      .join(', ');
    const id = routineId ? `'${routineId}'` : 'null';
    return `select public.save_routine(${id}, '${name}', null, jsonb_build_array(${items})) as id`;
  }

  async function routineExercises(routineId: string) {
    return db.asUser(
      alice,
      `select e.source_id, re.position, re.target_sets, re.target_reps_min, re.target_duration_seconds
       from public.routine_exercises re join public.exercises e on e.id = re.exercise_id
       where re.routine_id = '${routineId}' order by re.position`,
    );
  }

  it('creates a routine with its exercises in order, at the end of the list', async () => {
    const [saved] = await db.asUser(
      alice,
      saveRoutineSql(null, 'Legs', [
        { sourceId: 'Plank', targets: { target_sets: 3, target_duration_seconds: 60 } },
        { sourceId: benchPress, targets: { target_sets: 4, target_reps_min: 5 } },
      ]),
    );
    const routineId = String(saved?.id);

    const [routine] = await db.asUser(
      alice,
      `select name, position from public.routines where id = '${routineId}'`,
    );
    expect(routine).toEqual({ name: 'Legs', position: 1 });
    expect(await routineExercises(routineId)).toEqual([
      {
        source_id: 'Plank',
        position: 0,
        target_sets: 3,
        target_reps_min: null,
        target_duration_seconds: 60,
      },
      {
        source_id: benchPress,
        position: 1,
        target_sets: 4,
        target_reps_min: 5,
        target_duration_seconds: null,
      },
    ]);
  });

  it("replaces an existing routine's name and exercises", async () => {
    await db.asUser(
      alice,
      saveRoutineSql(aliceRoutine, 'Push B', [
        { sourceId: 'Plank', targets: { target_sets: 2, target_duration_seconds: 45 } },
      ]),
    );

    const [routine] = await db.asUser(
      alice,
      `select name from public.routines where id = '${aliceRoutine}'`,
    );
    expect(routine).toEqual({ name: 'Push B' });
    expect(await routineExercises(aliceRoutine)).toEqual([
      {
        source_id: 'Plank',
        position: 0,
        target_sets: 2,
        target_reps_min: null,
        target_duration_seconds: 45,
      },
    ]);
  });

  it('rejects a reps target on a timed exercise and keeps the routine unchanged', async () => {
    const before = await routineExercises(aliceRoutine);
    await expect(
      db.asUser(
        alice,
        saveRoutineSql(aliceRoutine, 'Push C', [
          { sourceId: 'Plank', targets: { target_sets: 3, target_reps_min: 10 } },
        ]),
      ),
    ).rejects.toThrow(/do not match exercise type/);

    expect(await routineExercises(aliceRoutine)).toEqual(before);
    const [routine] = await db.asUser(
      alice,
      `select name from public.routines where id = '${aliceRoutine}'`,
    );
    expect(routine?.name).not.toBe('Push C');
  });

  it('rejects a routine with no exercises', async () => {
    await expect(
      db.asUser(alice, `select public.save_routine(null, 'Empty', null, '[]'::jsonb)`),
    ).rejects.toThrow(/between 1 and 30 exercises/);
  });

  it('stores a target weight in kilograms for a weighted exercise', async () => {
    const [saved] = await db.asUser(
      alice,
      saveRoutineSql(null, 'Heavy', [
        {
          sourceId: benchPress,
          targets: { target_sets: 5, target_reps_min: 5, target_weight_kg: 61.235 },
        },
      ]),
    );

    const [row] = await db.asUser(
      alice,
      `select target_weight_kg::float8 as weight from public.routine_exercises
       where routine_id = '${String(saved?.id)}'`,
    );
    expect(row).toEqual({ weight: 61.235 });
  });

  it('rejects a target weight on an exercise type without weights', async () => {
    await expect(
      db.asUser(
        alice,
        saveRoutineSql(null, 'Core', [
          { sourceId: 'Plank', targets: { target_sets: 3, target_weight_kg: 10 } },
        ]),
      ),
    ).rejects.toThrow(/do not match exercise type/);
  });

  it('rejects a target weight of zero or over 1000 kg', async () => {
    for (const weight of [0, 1000.5]) {
      await expect(
        db.asUser(
          alice,
          saveRoutineSql(null, 'Too heavy', [
            { sourceId: benchPress, targets: { target_sets: 3, target_weight_kg: weight } },
          ]),
        ),
      ).rejects.toThrow(checkFailure);
    }
  });

  it("does not let a user save over someone else's routine", async () => {
    await expect(
      db.asUser(
        bob,
        saveRoutineSql(aliceRoutine, 'Taken', [
          { sourceId: benchPress, targets: { target_sets: 3 } },
        ]),
      ),
    ).rejects.toThrow(/Routine not found/);
    expect(await routineExercises(aliceRoutine)).toHaveLength(1);
  });

  it("reorders the user's routines and ignores ids they can't see", async () => {
    const [bobSaved] = await db.asUser(
      bob,
      saveRoutineSql(null, 'Bob day', [{ sourceId: benchPress, targets: { target_sets: 3 } }]),
    );
    const routines = await db.asUser(alice, 'select id from public.routines order by position');
    const reversed = routines.map((routine) => `'${String(routine.id)}'`).reverse();

    await db.asUser(
      alice,
      `select public.reorder_routines(array[${reversed.join(', ')}, '${String(bobSaved?.id)}']::uuid[])`,
    );

    const reordered = await db.asUser(alice, 'select id from public.routines order by position');
    expect(reordered.map((routine) => `'${String(routine.id)}'`)).toEqual(reversed);
    const [bobRoutine] = await db.asUser(bob, 'select position from public.routines');
    expect(bobRoutine).toEqual({ position: 0 });
  });

  it('is not callable when signed out', async () => {
    await expect(db.asAnon(`select public.reorder_routines(array[]::uuid[])`)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('workouts and sets', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it("shows a user their own sets in the history view, with the workout's date", async () => {
    const rows = await db.asUser(
      alice,
      'select weight_kg, reps, duration_seconds, workout_started_at from public.exercise_set_history order by exercise_position',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ weight_kg: '82.500', reps: 8, duration_seconds: null });
    expect(rows[1]).toMatchObject({ weight_kg: null, reps: null, duration_seconds: 60 });
  });

  it("hides one user's workouts, sets and history from another", async () => {
    expect(await db.asUser(bob, 'select id from public.workouts')).toHaveLength(0);
    expect(await db.asUser(bob, 'select id from public.sets')).toHaveLength(0);
    expect(await db.asUser(bob, 'select set_id from public.exercise_set_history')).toHaveLength(0);
  });

  it("does not let a user change someone else's workout", async () => {
    const updated = await db.asUser(
      bob,
      `update public.workouts set name = 'Changed' where id = '${aliceWorkout}' returning id`,
    );
    expect(updated).toHaveLength(0);
  });

  it("does not let a user attach an exercise to someone else's workout", async () => {
    await expect(
      db.asUser(
        bob,
        `insert into public.workout_exercises (workout_id, exercise_id, position)
         select '${aliceWorkout}', id, 5 from public.exercises where source_id = 'Plank'`,
      ),
    ).rejects.toThrow(rlsRefusal);
  });

  it("does not let a user add a set to someone else's workout", async () => {
    // The set-shape trigger runs first and can't see Alice's exercise, so it
    // refuses before RLS does. Either way the row is not written.
    await expect(
      db.asUser(
        bob,
        `insert into public.sets (workout_exercise_id, position, weight_kg, reps)
         values ('${aliceBenchEntry}', 9, 100, 1)`,
      ),
    ).rejects.toThrow();
    const sets = await db.asAdmin(`select id from public.sets where position = 9`);
    expect(sets).toHaveLength(0);
  });

  it("does not let a user start a workout from someone else's routine", async () => {
    await expect(
      db.asUser(
        bob,
        `insert into public.workouts (name, started_at, ended_at, routine_id)
         values ('Copied', now(), now(), '${aliceRoutine}')`,
      ),
    ).rejects.toThrow(rlsRefusal);
  });

  it('rejects a workout that ends before it starts', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.workouts (name, started_at, ended_at)
         values ('Backwards', now(), now() - interval '1 minute')`,
      ),
    ).rejects.toThrow(checkFailure);
  });
});

describe('saving a finished workout', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  const newWorkout = '20000000-0000-4000-8000-000000000002';

  // A save_workout call: bench press with two sets, then a plank, from
  // Alice's routine unless another routine id is given.
  function saveWorkoutSql(
    workoutId: string,
    routineId: string | null = aliceRoutine,
    plankSet = `jsonb_build_object('duration_seconds', 60)`,
  ) {
    const exercise = (sourceId: string) =>
      `(select id from public.exercises where source_id = '${sourceId}')`;
    return `select public.save_workout(jsonb_build_object(
      'id', '${workoutId}',
      'routine_id', ${routineId ? `'${routineId}'` : 'null'},
      'name', 'Push A',
      'notes', 'Felt strong',
      'started_at', now() - interval '1 hour',
      'ended_at', now(),
      'exercises', jsonb_build_array(
        jsonb_build_object('exercise_id', ${exercise(benchPress)}, 'notes', null, 'sets', jsonb_build_array(
          jsonb_build_object('weight_kg', 40, 'reps', 10),
          jsonb_build_object('weight_kg', 82.5, 'reps', 8))),
        jsonb_build_object('exercise_id', ${exercise('Plank')}, 'notes', 'Hold', 'sets',
          jsonb_build_array(${plankSet}))
      )
    )) as id`;
  }

  async function savedSets(workoutId: string) {
    return db.asUser(
      alice,
      `select exercise_position, set_position, weight_kg::float8 as weight, reps,
              duration_seconds
       from public.exercise_set_history where workout_id = '${workoutId}'
       order by exercise_position, set_position`,
    );
  }

  it('saves the workout, its exercises and sets in order', async () => {
    const [saved] = await db.asUser(alice, saveWorkoutSql(newWorkout));
    expect(saved?.id).toBe(newWorkout);

    const [workout] = await db.asUser(
      alice,
      `select name, notes, routine_id from public.workouts where id = '${newWorkout}'`,
    );
    expect(workout).toEqual({ name: 'Push A', notes: 'Felt strong', routine_id: aliceRoutine });
    expect(await savedSets(newWorkout)).toEqual([
      {
        exercise_position: 0,
        set_position: 0,
        weight: 40,
        reps: 10,
        duration_seconds: null,
      },
      {
        exercise_position: 0,
        set_position: 1,
        weight: 82.5,
        reps: 8,
        duration_seconds: null,
      },
      {
        exercise_position: 1,
        set_position: 0,
        weight: null,
        reps: null,
        duration_seconds: 60,
      },
    ]);
  });

  it('ignores set types and RPE in a workout queued by an older version of the app', async () => {
    const workoutId = '20000000-0000-4000-8000-000000000005';
    await db.asUser(
      alice,
      saveWorkoutSql(
        workoutId,
        aliceRoutine,
        `jsonb_build_object('set_type', 'working', 'duration_seconds', 75, 'rpe', 8)`,
      ),
    );
    expect((await savedSets(workoutId))[2]).toMatchObject({ duration_seconds: 75 });
  });

  it('saves nothing more when the same workout is sent again', async () => {
    const [saved] = await db.asUser(alice, saveWorkoutSql(newWorkout));

    expect(saved?.id).toBe(newWorkout);
    expect(await savedSets(newWorkout)).toHaveLength(3);
    expect(
      await db.asUser(alice, `select id from public.workouts where id = '${newWorkout}'`),
    ).toHaveLength(1);
  });

  it('saves nothing at all when one set does not fit its exercise type', async () => {
    const workoutId = '20000000-0000-4000-8000-000000000003';
    await expect(
      db.asUser(
        alice,
        saveWorkoutSql(
          workoutId,
          aliceRoutine,
          `jsonb_build_object('set_type', 'working', 'reps', 10)`,
        ),
      ),
    ).rejects.toThrow(wrongSetShape);

    expect(
      await db.asUser(alice, `select id from public.workouts where id = '${workoutId}'`),
    ).toHaveLength(0);
  });

  it("keeps the workout without the link when the routine is gone or someone else's", async () => {
    const workoutId = '20000000-0000-4000-8000-000000000004';
    await db.asUser(bob, saveWorkoutSql(workoutId, aliceRoutine));

    const [workout] = await db.asUser(
      bob,
      `select routine_id from public.workouts where id = '${workoutId}'`,
    );
    expect(workout).toEqual({ routine_id: null });
    expect(
      await db.asUser(alice, `select id from public.workouts where id = '${workoutId}'`),
    ).toHaveLength(0);
  });

  it('rejects a workout with no exercises', async () => {
    await expect(
      db.asUser(
        alice,
        `select public.save_workout(jsonb_build_object('id', gen_random_uuid(), 'exercises', '[]'::jsonb))`,
      ),
    ).rejects.toThrow(/at least one exercise/);
  });

  it('is not callable when signed out', async () => {
    await expect(db.asAnon(`select public.save_workout('{}'::jsonb)`)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('set values follow the exercise type', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  // One library exercise of each type, each logged once in Alice's workout.
  const validSets = [
    {
      type: 'weight_reps',
      entryId: '50000000-0000-4000-8000-000000000001',
      columns: 'weight_kg, reps',
      values: '100, 5',
    },
    {
      type: 'bodyweight_reps',
      entryId: '50000000-0000-4000-8000-000000000002',
      columns: 'reps',
      values: '12',
    },
    {
      type: 'weighted_bodyweight',
      entryId: '50000000-0000-4000-8000-000000000003',
      columns: 'weight_kg, reps',
      values: '20, 8',
    },
    {
      type: 'assisted_bodyweight',
      entryId: '50000000-0000-4000-8000-000000000004',
      columns: 'weight_kg, reps',
      values: '25, 6',
    },
    {
      type: 'duration',
      entryId: '50000000-0000-4000-8000-000000000005',
      columns: 'duration_seconds',
      values: '45',
    },
    {
      type: 'distance_duration',
      entryId: '50000000-0000-4000-8000-000000000006',
      columns: 'distance_m, duration_seconds',
      values: '2000, 480',
    },
  ];

  it.each(validSets)('accepts a valid $type set', async ({ type, entryId, columns, values }) => {
    await db.asUser(
      alice,
      `insert into public.workout_exercises (id, workout_id, exercise_id, position)
       select '${entryId}', '${aliceWorkout}', id, 3
       from public.exercises where exercise_type = '${type}' order by name limit 1`,
    );
    const rows = await db.asUser(
      alice,
      `insert into public.sets (workout_exercise_id, position, ${columns})
       values ('${entryId}', 0, ${values}) returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it('rejects a weight-and-reps set without a weight', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.sets (workout_exercise_id, position, reps) values ('${aliceBenchEntry}', 1, 8)`,
      ),
    ).rejects.toThrow(wrongSetShape);
  });

  it('rejects a timed set that also has reps', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.sets (workout_exercise_id, position, duration_seconds, reps)
         values ('${alicePlankEntry}', 1, 30, 5)`,
      ),
    ).rejects.toThrow(wrongSetShape);
  });

  it('no longer stores set types or RPE', async () => {
    const [left] = await db.asAdmin(
      `select
         (select count(*)::int from information_schema.columns
          where table_schema = 'public' and table_name in ('sets', 'exercise_set_history')
            and column_name in ('set_type', 'rpe')) as columns,
         to_regtype('public.set_type') as set_type`,
    );
    expect(left).toEqual({ columns: 0, set_type: null });
  });

  it('rejects zero reps and negative weight', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.sets (workout_exercise_id, position, weight_kg, reps)
         values ('${aliceBenchEntry}', 2, 80, 0)`,
      ),
    ).rejects.toThrow(checkFailure);
    await expect(
      db.asUser(
        alice,
        `insert into public.sets (workout_exercise_id, position, weight_kg, reps)
         values ('${aliceBenchEntry}', 2, -5, 5)`,
      ),
    ).rejects.toThrow(checkFailure);
  });
});

describe('bodyweight, and the removed progress photos', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it('stores one bodyweight row per day', async () => {
    await db.asUser(
      alice,
      `insert into public.body_measurements (measured_on, weight_kg) values ('2026-10-01', 81.4)`,
    );
    await expect(
      db.asUser(
        alice,
        `insert into public.body_measurements (measured_on, weight_kg) values ('2026-10-01', 82)`,
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it('requires a bodyweight inside the allowed range', async () => {
    await expect(
      db.asUser(alice, `insert into public.body_measurements (measured_on) values ('2026-09-30')`),
    ).rejects.toThrow(/not-null constraint/);
    await expect(
      db.asUser(
        alice,
        `insert into public.body_measurements (measured_on, weight_kg) values ('2026-09-30', 10)`,
      ),
    ).rejects.toThrow(checkFailure);
  });

  it('no longer stores body measurements', async () => {
    const columns = await db.asAdmin(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'body_measurements' order by column_name`,
    );
    expect(columns.map((row) => row.column_name)).toEqual([
      'created_at',
      'id',
      'measured_on',
      'user_id',
      'weight_kg',
    ]);
  });

  it('has no progress photo table, bucket or file policies any more', async () => {
    const [left] = await db.asAdmin(
      `select to_regclass('public.progress_photos') as photo_table,
              (select count(*)::int from storage.buckets) as buckets,
              (select count(*)::int from pg_policies where schemaname = 'storage') as policies`,
    );
    expect(left).toEqual({ photo_table: null, buckets: 0, policies: 0 });
  });
});

describe('cardio sessions', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it('stores a session with its route', async () => {
    const rows = await db.asUser(
      alice,
      `insert into public.cardio_sessions (activity, started_at, ended_at, moving_seconds, distance_m, route)
       values ('walk', now() - interval '40 minutes', now(), 2300, 3420,
               '[[57.50, -20.16, 1759400000000], [57.51, -20.16, 1759400005000]]')
       returning distance_m`,
    );
    expect(rows).toEqual([{ distance_m: '3420.0' }]);
  });

  it('rejects moving time longer than the session', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.cardio_sessions (activity, started_at, ended_at, moving_seconds, distance_m)
         values ('run', now() - interval '10 minutes', now(), 3600, 1000)`,
      ),
    ).rejects.toThrow(checkFailure);
  });

  it('rejects a route that is not a list of points', async () => {
    await expect(
      db.asUser(
        alice,
        `insert into public.cardio_sessions (activity, started_at, ended_at, moving_seconds, distance_m, route)
         values ('ride', now() - interval '10 minutes', now(), 600, 3000, '{"lat": 1}')`,
      ),
    ).rejects.toThrow(checkFailure);
  });
});

describe('signed-out requests', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
  });
  afterAll(() => db.close());

  it.each(['profiles', 'exercises', 'workouts', 'sets', 'body_measurements', 'cardio_sessions'])(
    'are refused access to %s',
    async (table) => {
      await expect(db.asAnon(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    },
  );

  it('can call the keep-alive heartbeat', async () => {
    const rows = await db.asAnon('select public.heartbeat() as now');
    expect(rows).toHaveLength(1);
  });
});

describe('account deletion', () => {
  let db: TestDatabase;
  beforeAll(async () => {
    db = await setUp();
    await db.asUser(
      alice,
      `insert into public.body_measurements (measured_on, weight_kg) values ('2026-10-01', 81.4);
       insert into public.cardio_sessions (activity, started_at, ended_at, moving_seconds, distance_m)
       values ('walk', now() - interval '20 minutes', now(), 1200, 1500);`,
    );
    await db.asUser(bob, `insert into public.routines (name) values ('Pull A')`);
  });
  afterAll(() => db.close());

  it("removes every one of the user's rows and nobody else's", async () => {
    await db.asAdmin(`delete from auth.users where id = '${alice}'`);

    const remaining = await db.asAdmin(`
      select
        (select count(*) from public.profiles where id = '${alice}')
        + (select count(*) from public.routines where user_id = '${alice}')
        + (select count(*) from public.routine_exercises where user_id = '${alice}')
        + (select count(*) from public.workouts where user_id = '${alice}')
        + (select count(*) from public.workout_exercises where user_id = '${alice}')
        + (select count(*) from public.sets where user_id = '${alice}')
        + (select count(*) from public.body_measurements where user_id = '${alice}')
        + (select count(*) from public.cardio_sessions where user_id = '${alice}') as count
    `);
    expect(Number(remaining[0]?.count)).toBe(0);

    expect(await db.asUser(bob, 'select name from public.routines')).toEqual([{ name: 'Pull A' }]);
    expect(await db.asAdmin('select id from public.exercises')).toHaveLength(libraryExerciseCount);
  });
});
