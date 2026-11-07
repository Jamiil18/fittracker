import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useOutbox } from '@/lib/outbox/outboxStore';

import type { CardioSession } from '../api/cardio';
import { CardioDetailScreen } from './CardioDetailScreen';

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';
const sessionId = '0b7c2f4e-5a1d-4c3b-9e8f-7a6b5c4d3e2f';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));
jest.mock('@/features/settings/api/profile', () => ({
  useProfile: () => ({ data: { weightUnit: 'kg', distanceUnit: 'km' } }),
}));
jest.mock('./RouteMap', () => ({ RouteMap: () => null }));
// The route request never finishes, so the screen stays on the loading state.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => new Promise(() => undefined) }) }),
    }),
  },
}));

const walk: CardioSession = {
  id: sessionId,
  activity: 'walk',
  startedAt: Date.parse('2026-10-10T08:00:00Z'),
  endedAt: Date.parse('2026-10-10T08:30:00Z'),
  movingSeconds: 1800,
  distanceM: 2500,
};

async function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['cardio-sessions', userId], [walk]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<CardioDetailScreen sessionId={sessionId} />, { wrapper });
}

describe('CardioDetailScreen', () => {
  beforeEach(() => useOutbox.setState({ items: [] }));
  afterEach(() => onlineManager.setOnline(true));

  it('shows a placeholder, not "No route was recorded.", while the route loads', async () => {
    await renderDetail();

    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
    expect(screen.queryByText('No route was recorded.')).not.toBeOnTheScreen();
  });

  it('says the route needs a connection when it was never opened online', async () => {
    onlineManager.setOnline(false);
    await renderDetail();

    expect(await screen.findByText('The route shows once you are online.')).toBeOnTheScreen();
    expect(screen.queryByText('No route was recorded.')).not.toBeOnTheScreen();
  });
});
