import { createContext, useContext } from 'react';

export type KeyboardScrollEvents = {
  onInputFocus: () => void;
  onInputBlur: () => void;
};

// Lets a text field tell the scroll view around it when it gains or loses
// focus, so the scroll view can keep it above the keyboard
// (useKeyboardAwareScroll). Fields outside such a scroll view get null.
export const KeyboardScrollContext = createContext<KeyboardScrollEvents | null>(null);

export function useKeyboardScrollEvents(): KeyboardScrollEvents | null {
  return useContext(KeyboardScrollContext);
}
