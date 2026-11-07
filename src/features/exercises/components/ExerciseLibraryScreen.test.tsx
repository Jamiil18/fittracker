import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ExerciseSummary } from '../schemas/exerciseSchemas';
import { ExerciseLibraryScreen } from './ExerciseLibraryScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: 'user-1', email: 'lifter@example.com' } }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function exercise(name: string, overrides: Partial<ExerciseSummary> = {}): ExerciseSummary {
  return {
    id: name,
    name,
    exerciseType: 'weight_reps',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    ...overrides,
  };
}

const library = [
  exercise('Barbell Bench Press - Medium Grip'),
  exercise('Pull-Up', { primaryMuscles: ['lats'], equipment: 'body_only' }),
  exercise('Landmine Press', { primaryMuscles: ['shoulders'] }),
];

async function renderLibrary() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  queryClient.setQueryData(['exercises', 'user-1'], library);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<ExerciseLibraryScreen />, { wrapper });
}

describe('ExerciseLibraryScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists every exercise with its muscle and equipment', async () => {
    await renderLibrary();

    expect(screen.getByText('3 exercises')).toBeOnTheScreen();
    expect(screen.getByText('Lats, bodyweight')).toBeOnTheScreen();
  });

  it('narrows the list as you type, and opens an exercise', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'pull');

    expect(screen.getByText('1 of 3 exercises')).toBeOnTheScreen();
    expect(screen.queryByText('Landmine Press')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Pull-Up'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/exercises/[id]',
      params: { id: 'Pull-Up' },
    });
  });

  it('filters by muscle from the sheet', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.press(screen.getByRole('button', { name: 'All muscles' }));
    await user.press(screen.getByText('Shoulders'));

    expect(screen.getByRole('button', { name: 'Shoulders' })).toBeOnTheScreen();
    expect(screen.getByText('1 of 3 exercises')).toBeOnTheScreen();
    expect(screen.getByText('Landmine Press')).toBeOnTheScreen();
  });

  it('says what to do when nothing matches, and can clear everything', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'zercher');
    expect(screen.getByText('No exercises match')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByText('3 exercises')).toBeOnTheScreen();
  });
});
