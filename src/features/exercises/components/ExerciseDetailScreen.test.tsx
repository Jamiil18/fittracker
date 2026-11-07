import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ExerciseDetailScreen } from './ExerciseDetailScreen';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

async function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<ExerciseDetailScreen exerciseId="Plank" />, { wrapper });
}

describe('ExerciseDetailScreen', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('says to connect, instead of loading forever, for an exercise never opened online', async () => {
    onlineManager.setOnline(false);
    await renderDetail();

    expect(
      await screen.findByText("This exercise isn't saved on this phone yet"),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading')).not.toBeOnTheScreen();
  });
});
