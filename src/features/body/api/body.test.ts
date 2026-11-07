import { supabase } from '@/lib/supabase';

import { sendBodyLog } from './body';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const fromMock = supabase.from as jest.Mock;

describe('sendBodyLog', () => {
  it("upserts the day's bodyweight", async () => {
    const upsert = jest.fn(async () => ({ error: null }));
    fromMock.mockReturnValue({ upsert });

    await sendBodyLog({ measured_on: '2026-10-10', weight_kg: 81.4 });

    expect(fromMock).toHaveBeenCalledWith('body_measurements');
    expect(upsert).toHaveBeenCalledWith(
      { measured_on: '2026-10-10', weight_kg: 81.4 },
      { onConflict: 'user_id,measured_on' },
    );
  });

  it('refuses a damaged payload before sending it', async () => {
    const upsert = jest.fn();
    fromMock.mockReturnValue({ upsert });

    await expect(sendBodyLog({ measured_on: '2026-10-10', weight_kg: 1000 })).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});
