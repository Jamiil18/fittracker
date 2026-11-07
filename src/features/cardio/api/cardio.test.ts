import { supabase } from '@/lib/supabase';

import { fetchCardioSessions, sendCardioSession } from './cardio';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const fromMock = supabase.from as jest.Mock;
const payload = {
  id: '80000000-0000-4000-8000-000000000001',
  activity: 'walk',
  started_at: '2026-10-10T07:00:00.000Z',
  ended_at: '2026-10-10T07:46:00.000Z',
  moving_seconds: 2700,
  distance_m: 4210.5,
  route: [
    [57.5, -20.2, 1_760_079_600_000],
    [57.5, -20.19, 1_760_079_610_000],
  ],
};

describe('sendCardioSession', () => {
  it('saves the session once, even if it is sent again', async () => {
    const upsert = jest.fn(async () => ({ error: null }));
    fromMock.mockReturnValue({ upsert });

    await sendCardioSession(payload);

    expect(upsert).toHaveBeenCalledWith(payload, { onConflict: 'id', ignoreDuplicates: true });
  });

  it('refuses a damaged payload before sending it', async () => {
    const upsert = jest.fn();
    fromMock.mockReturnValue({ upsert });

    await expect(sendCardioSession({ ...payload, activity: 'swim' })).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('fetchCardioSessions', () => {
  it('reads sessions without their routes', async () => {
    const select = jest.fn(() => ({
      order: async () => ({
        data: [
          {
            id: payload.id,
            activity: 'walk',
            started_at: payload.started_at,
            ended_at: payload.ended_at,
            moving_seconds: 2700,
            distance_m: 4210.5,
          },
        ],
        error: null,
      }),
    }));
    fromMock.mockReturnValue({ select });

    const [session] = await fetchCardioSessions();

    expect(select).toHaveBeenCalledWith(
      'id, activity, started_at, ended_at, moving_seconds, distance_m',
    );
    expect(session).toMatchObject({ activity: 'walk', distanceM: 4210.5, movingSeconds: 2700 });
  });
});
