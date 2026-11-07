import { useCallback, useRef } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { KeyboardScrollContext } from './KeyboardScrollContext';
import { useKeyboardAwareScroll } from './useKeyboardAwareScroll';

// A ScrollView whose focused text field stays above the keyboard. Every
// scrolling screen with text fields uses it, through Screen or directly.
export function KeyboardAwareScrollView({ children, ...scrollProps }: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const getScrollView = useCallback(() => scrollRef.current, []);
  const { keyboardHeight, inputEvents } = useKeyboardAwareScroll(getScrollView);

  return (
    <KeyboardScrollContext.Provider value={inputEvents}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" {...scrollProps}>
        {children}
        {keyboardHeight > 0 ? <View style={{ height: keyboardHeight }} /> : null}
      </ScrollView>
    </KeyboardScrollContext.Provider>
  );
}
