import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useDialog } from './useDialog';

// Asks before leaving a form with unsaved changes, whether by the back button,
// Android's back gesture or the header. The screen renders the returned
// `dialog`, and calls `allowLeave` just before navigating away after a
// successful save, so that exit isn't questioned.
export function useConfirmLeave(hasUnsavedChanges: boolean, message: string) {
  const navigation = useNavigation();
  const { dialog, showDialog } = useDialog();
  const leaveAllowed = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return navigation.addListener('beforeRemove', (event) => {
      if (leaveAllowed.current) return;
      event.preventDefault();
      showDialog({
        title: 'Discard changes?',
        message,
        actions: [
          { label: 'Keep editing' },
          {
            label: 'Discard changes',
            destructive: true,
            onPress: () => navigation.dispatch(event.data.action),
          },
        ],
      });
    });
  }, [navigation, hasUnsavedChanges, message, showDialog]);

  return {
    dialog,
    allowLeave: () => {
      leaveAllowed.current = true;
    },
  };
}
