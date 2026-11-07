import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  TextInput,
  type HostInstance,
  type MeasureInWindowOnSuccessCallback,
} from 'react-native';

import { spacing } from '@/theme/layout';

import type { KeyboardScrollEvents } from './KeyboardScrollContext';

// What a scroll view offers for this: its place on screen, and React Native's
// helper that scrolls a field to the keyboard. A ScrollView ref has both, and
// so does the scroll view inside a FlatList (from getNativeScrollRef), though
// React Native's types don't say so; hence the check rather than a cast.
type KeyboardScrollTarget = {
  measureInWindow: (callback: MeasureInWindowOnSuccessCallback) => void;
  scrollResponderScrollNativeHandleToKeyboard: (
    input: HostInstance,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
};

function isKeyboardScrollTarget(node: unknown): node is KeyboardScrollTarget {
  return (
    typeof node === 'object' &&
    node !== null &&
    'measureInWindow' in node &&
    'scrollResponderScrollNativeHandleToKeyboard' in node
  );
}

// Space left between the focused field and the top of the keyboard.
export const gapAboveKeyboard = spacing.lg;

// Keeps the focused text field of a scroll view in sight above the keyboard.
// Since Expo SDK 54, Android apps draw edge to edge, so the screen no longer
// shrinks when the keyboard opens, and ScrollView's own
// automaticallyAdjustKeyboardInsets only works on iOS. While the keyboard is
// open, the scroll view adds `keyboardHeight` of space after its content, so
// even the last field can move up; a field the keyboard would cover is then
// scrolled to just above it. Fields report focus through the returned
// `inputEvents` (see KeyboardScrollContext).
export function useKeyboardAwareScroll(getScrollView: () => unknown): {
  keyboardHeight: number;
  inputEvents: KeyboardScrollEvents;
} {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardTop = useRef<number | null>(null);
  // Only a field inside this scroll view should make it scroll.
  const focusInside = useRef(false);

  const revealFocusedInput = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput();
    const scrollView = getScrollView();
    if (!focusInside.current || top === null || !input || !isKeyboardScrollTarget(scrollView)) {
      return;
    }
    input.measureInWindow((_x, inputY, _width, inputHeight) => {
      if (inputY + inputHeight + gapAboveKeyboard <= top) return;
      // React Native's helper lines the field's bottom up with the keyboard's
      // top as if the scroll view began at the top of the window, so the
      // offset adds where it really begins (below the header), plus the gap.
      scrollView.measureInWindow((_scrollX, scrollViewY) => {
        scrollView.scrollResponderScrollNativeHandleToKeyboard(
          input,
          scrollViewY + gapAboveKeyboard,
          true,
        );
      });
    });
  }, [getScrollView]);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // Waits a frame so the added space is laid out and there is room to scroll.
  useEffect(() => {
    if (keyboardHeight === 0) return;
    const frame = requestAnimationFrame(revealFocusedInput);
    return () => cancelAnimationFrame(frame);
  }, [keyboardHeight, revealFocusedInput]);

  const inputEvents = useMemo(
    () => ({
      // When the keyboard is already open (moving from one field to the
      // next), the field is revealed straight away; otherwise it happens once
      // the keyboard has opened.
      onInputFocus: () => {
        focusInside.current = true;
        revealFocusedInput();
      },
      onInputBlur: () => {
        focusInside.current = false;
      },
    }),
    [revealFocusedInput],
  );

  return { keyboardHeight, inputEvents };
}
