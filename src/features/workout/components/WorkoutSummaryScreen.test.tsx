import { act, render, screen } from '@testing-library/react-native';

import { useOutbox } from '@/lib/outbox/outboxStore';

import { useFinishedWorkout } from '../finishedWorkoutStore';
import { WorkoutSummaryScreen } from './WorkoutSummaryScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  Stack: { Screen: () => null },
}));

const workoutId = '30000000-0000-4000-8000-000000000001';
const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

describe('WorkoutSummaryScreen', () => {
  beforeEach(() => {
    useOutbox.setState({ items: [] });
    useFinishedWorkout.setState({
      summary: {
        workoutId,
        name: 'Push A',
        durationSeconds: 2700,
        volumeKg: 1060,
        setCount: 2,
        records: [{ kind: 'estimated_1rm', value: 104.5, exerciseName: 'Bench press' }],
        units: { weightUnit: 'kg', distanceUnit: 'km' },
      },
    });
  });

  it('shows the duration, volume, sets and new records', async () => {
    await render(<WorkoutSummaryScreen />);

    expect(screen.getByText('Workout finished')).toBeOnTheScreen();
    expect(screen.getByText('45:00')).toBeOnTheScreen();
    expect(screen.getByText('1,060 kg')).toBeOnTheScreen();
    expect(screen.getByText('Estimated 1RM')).toBeOnTheScreen();
    expect(screen.getByText('104.5 kg')).toBeOnTheScreen();
  });

  it('says the workout is not synced yet until it leaves the outbox', async () => {
    useOutbox.getState().add({ id: workoutId, kind: 'workout', userId, payload: {} });
    await render(<WorkoutSummaryScreen />);

    expect(screen.getByText(/^Not synced yet\./)).toBeOnTheScreen();

    await act(async () => useOutbox.getState().remove(workoutId));
    expect(screen.getByText('Saved')).toBeOnTheScreen();
  });
});
