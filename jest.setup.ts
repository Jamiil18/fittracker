import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

// The real modules need native code or measurements that don't exist under
// Jest; these mocks are published by the libraries for exactly this purpose.
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
// Reanimated runs animation code on a separate native runtime from its
// worklets library; the worklets mock runs that code on the JavaScript thread
// instead, which lets the real Reanimated work under Jest. Gesture Handler's
// setup replaces its native gesture views, used by swipe actions and dragging.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
require('react-native-gesture-handler/jestSetup');

// Expo UI's bottom sheet is a native view. This stand-in keeps its contract:
// nothing renders until present(), and dismiss() hides it and calls onDismiss.
type MockSheetProps = {
  ref?: import('react').Ref<{ present: () => void; dismiss: () => void }>;
  onDismiss?: () => void;
  children: import('react').ReactNode;
};
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { useImperativeHandle, useState } = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  function BottomSheetModal({ ref, onDismiss, children }: MockSheetProps) {
    const [open, setOpen] = useState(false);
    useImperativeHandle(ref, () => ({
      present: () => setOpen(true),
      dismiss: () => {
        setOpen((wasOpen: boolean) => {
          if (wasOpen) onDismiss?.();
          return false;
        });
      },
    }));
    return open ? children : null;
  }
  return { BottomSheetModal, BottomSheetScrollView: ScrollView };
});
