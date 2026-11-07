import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Keyboard, TextInput, type HostInstance, type KeyboardEvent } from 'react-native';

import { gapAboveKeyboard, useKeyboardAwareScroll } from './useKeyboardAwareScroll';

type Listener = (event: KeyboardEvent) => void;

// The keyboard, a field and a scroll view, placed in window coordinates: the
// scroll view starts 80 points down, below the header, and the keyboard's
// top edge is at 500.
const keyboardTop = 500;
const scrollViewTop = 80;
const fieldHeight = 44;

let listeners: Record<string, Listener> = {};
let fieldTop = 0;
const field = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
    callback(16, fieldTop, 300, fieldHeight),
} as unknown as HostInstance;
const scrollView = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
    callback(0, scrollViewTop, 360, 600),
  scrollResponderScrollNativeHandleToKeyboard: jest.fn(),
};

function openKeyboard() {
  listeners.keyboardDidShow?.({
    endCoordinates: { screenX: 0, screenY: keyboardTop, width: 360, height: 300 },
  } as KeyboardEvent);
}

// The hook checks the field one frame after the keyboard opens. React only
// runs the effect that asks for that frame when an act() ends, so this waits
// in an act() of its own, after the one that opened the keyboard.
async function nextFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

async function renderScroll() {
  const { result } = await renderHook(() => useKeyboardAwareScroll(() => scrollView));
  return result;
}

describe('useKeyboardAwareScroll', () => {
  beforeEach(() => {
    listeners = {};
    scrollView.scrollResponderScrollNativeHandleToKeyboard.mockClear();
    jest.spyOn(Keyboard, 'addListener').mockImplementation((eventName, listener) => {
      listeners[eventName] = listener as Listener;
      return { remove: () => undefined } as ReturnType<typeof Keyboard.addListener>;
    });
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(field);
  });

  afterEach(() => jest.restoreAllMocks());

  it('scrolls a field the keyboard covers to just above it, and adds room below the content', async () => {
    fieldTop = 600;
    const result = await renderScroll();

    await act(async () => {
      result.current.inputEvents.onInputFocus();
      openKeyboard();
    });

    expect(result.current.keyboardHeight).toBe(300);
    await waitFor(() =>
      expect(scrollView.scrollResponderScrollNativeHandleToKeyboard).toHaveBeenCalledWith(
        field,
        scrollViewTop + gapAboveKeyboard,
        true,
      ),
    );
  });

  it('leaves a field alone when it is already above the keyboard with room to spare', async () => {
    fieldTop = keyboardTop - fieldHeight - gapAboveKeyboard;
    const result = await renderScroll();

    await act(async () => {
      result.current.inputEvents.onInputFocus();
      openKeyboard();
    });
    await nextFrame();

    expect(scrollView.scrollResponderScrollNativeHandleToKeyboard).not.toHaveBeenCalled();
  });

  it('reveals the next field straight away when focus moves with the keyboard open', async () => {
    fieldTop = 100;
    const result = await renderScroll();
    await act(async () => {
      result.current.inputEvents.onInputFocus();
      openKeyboard();
    });
    // Lets the check after the keyboard opened run for this first field.
    await nextFrame();

    fieldTop = 480;
    await act(async () => {
      result.current.inputEvents.onInputBlur();
      result.current.inputEvents.onInputFocus();
    });

    expect(scrollView.scrollResponderScrollNativeHandleToKeyboard).toHaveBeenCalledTimes(1);
  });

  it('ignores a field outside this scroll view', async () => {
    fieldTop = 600;
    const result = await renderScroll();

    await act(async () => openKeyboard());
    await nextFrame();

    expect(result.current.keyboardHeight).toBe(300);
    expect(scrollView.scrollResponderScrollNativeHandleToKeyboard).not.toHaveBeenCalled();
  });

  it('removes the added room when the keyboard closes', async () => {
    const result = await renderScroll();
    await act(async () => openKeyboard());

    await act(async () => listeners.keyboardDidHide?.({} as KeyboardEvent));

    expect(result.current.keyboardHeight).toBe(0);
  });
});
