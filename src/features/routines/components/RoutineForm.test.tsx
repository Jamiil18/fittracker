import { render, screen, userEvent } from '@testing-library/react-native';

import { usePickedExercises } from '@/features/exercises/pickedExercisesStore';

import type { RoutineValues } from '../schemas/routineSchemas';
import { RoutineForm } from './RoutineForm';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
  // Runs the callback once, as when the screen is first shown.
  useFocusEffect: (callback: () => void) =>
    jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('@/features/settings/api/profile', () => ({
  useProfile: () => ({ data: { defaultRestSeconds: 90, weightUnit: 'kg' } }),
}));
jest.mock('@/lib/useIsOffline', () => ({ useIsOffline: () => false }));

const bench = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bench press',
  exerciseType: 'weight_reps' as const,
  primaryMuscles: ['chest' as const],
  secondaryMuscles: [],
  equipment: 'barbell' as const,
};
const plank = {
  ...bench,
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Plank',
  exerciseType: 'duration' as const,
};

async function renderForm(onSubmit = jest.fn(async (_values: RoutineValues) => undefined)) {
  await render(
    <RoutineForm
      defaultValues={{ name: '', notes: '', exercises: [] }}
      submitLabel="Create routine"
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

describe('RoutineForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePickedExercises.setState({ picked: null });
  });

  it('asks for a name and an exercise before saving', async () => {
    const user = userEvent.setup();
    const onSubmit = await renderForm();

    await user.press(screen.getByRole('button', { name: 'Create routine' }));

    expect(await screen.findByText('Enter a name.')).toBeOnTheScreen();
    expect(screen.getByText('Add at least one exercise.')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('opens the exercise picker', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.press(screen.getByRole('button', { name: 'Add exercises' }));

    expect(mockPush).toHaveBeenCalledWith('/exercises/pick');
  });

  it('adds picked exercises with fields that follow their type, then saves and leaves', async () => {
    const user = userEvent.setup();
    usePickedExercises.getState().setPicked([bench, plank]);
    const onSubmit = await renderForm();

    expect(screen.getByLabelText('Min reps for Bench press')).toBeOnTheScreen();
    expect(screen.getByLabelText('Minutes for Plank')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Min reps for Plank')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Weight for Bench press')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Weight for Plank')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Default (1:30)')).toHaveLength(2);

    await user.type(screen.getByLabelText('Name'), 'Push A');
    await user.type(screen.getByLabelText('Min reps for Bench press'), '8');
    await user.type(screen.getByLabelText('Weight for Bench press'), '60');
    await user.type(screen.getByLabelText('Seconds for Plank'), '45');
    await user.press(screen.getByRole('button', { name: 'Create routine' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Push A',
      notes: null,
      exercises: [
        expect.objectContaining({
          exerciseId: bench.id,
          targetSets: 3,
          targetRepsMin: 8,
          targetWeightKg: 60,
        }),
        expect.objectContaining({ exerciseId: plank.id, targetDurationSeconds: 45 }),
      ],
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('removes an exercise', async () => {
    const user = userEvent.setup();
    usePickedExercises.getState().setPicked([bench, plank]);
    await renderForm();

    await user.press(screen.getByRole('button', { name: 'Remove Bench press' }));

    expect(screen.queryByText('Bench press')).not.toBeOnTheScreen();
    expect(screen.getByText('Plank')).toBeOnTheScreen();
  });

  it('shows why saving failed and stays on the form', async () => {
    const user = userEvent.setup();
    usePickedExercises.getState().setPicked([bench]);
    const onSubmit = await renderForm(
      jest.fn(async (_values: RoutineValues): Promise<undefined> => {
        throw { message: 'TypeError: Network request failed' };
      }),
    );

    await user.type(screen.getByLabelText('Name'), 'Push A');
    await user.press(screen.getByRole('button', { name: 'Create routine' }));

    expect(onSubmit).toHaveBeenCalled();
    expect(
      await screen.findByText("You're offline. Connect to the internet and try again."),
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
