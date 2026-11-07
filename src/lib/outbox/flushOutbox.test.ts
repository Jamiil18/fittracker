import { onlineManager } from '@tanstack/react-query';

import { flushOutbox } from './flushOutbox';
import { useOutbox } from './outboxStore';

const alice = '00000000-0000-4000-8000-00000000000a';
const bob = '00000000-0000-4000-8000-00000000000b';

function queue(id: string, userId = alice) {
  useOutbox.getState().add({ id, kind: 'workout', userId, payload: { id } });
}

const networkFailure = { message: 'TypeError: Network request failed' };
// These tests only queue workouts.
const unusedSender = async () => undefined;

describe('flushOutbox', () => {
  beforeEach(() => {
    useOutbox.setState({ items: [] });
    onlineManager.setOnline(true);
  });

  it("sends the user's items oldest first and removes each once saved", async () => {
    queue('w1');
    queue('w2');
    queue('w3', bob);
    const sent: unknown[] = [];

    await flushOutbox(alice, {
      workout: async (payload) => void sent.push(payload),
      body: unusedSender,
      cardio: unusedSender,
    });

    expect(sent).toEqual([{ id: 'w1' }, { id: 'w2' }]);
    expect(useOutbox.getState().items.map((item) => item.id)).toEqual(['w3']);
  });

  it('stops at a network failure and keeps everything queued', async () => {
    queue('w1');
    queue('w2');
    const send = jest.fn(async () => {
      throw networkFailure;
    });

    await flushOutbox(alice, { workout: send, body: unusedSender, cardio: unusedSender });

    expect(send).toHaveBeenCalledTimes(1);
    expect(useOutbox.getState().items.map((item) => [item.id, item.failure])).toEqual([
      ['w1', null],
      ['w2', null],
    ]);
  });

  it('records why the server refused an item, keeps it, and carries on', async () => {
    queue('w1');
    queue('w2');
    const send = jest.fn(async (payload: unknown) => {
      if ((payload as { id: string }).id === 'w1') throw { code: 'P0002', message: '' };
    });

    await flushOutbox(alice, { workout: send, body: unusedSender, cardio: unusedSender });

    expect(useOutbox.getState().items).toEqual([
      expect.objectContaining({ id: 'w1', failure: 'not_found' }),
    ]);
  });

  it('sends nothing while offline', async () => {
    onlineManager.setOnline(false);
    queue('w1');
    const send = jest.fn(async () => undefined);

    await flushOutbox(alice, { workout: send, body: unusedSender, cardio: unusedSender });

    expect(send).not.toHaveBeenCalled();
  });

  it('never sends an item twice when asked to flush again mid-send', async () => {
    queue('w1');
    const send = jest.fn(async () => undefined);

    await Promise.all([
      flushOutbox(alice, { workout: send, body: unusedSender, cardio: unusedSender }),
      flushOutbox(alice, { workout: send, body: unusedSender, cardio: unusedSender }),
    ]);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
