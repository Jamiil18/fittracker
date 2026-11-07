import { useCallback, useState } from 'react';

import { Dialog, type DialogAction } from './Dialog';

type DialogContent = {
  title: string;
  message: string;
  actions: DialogAction[];
};

const noContent: DialogContent = { title: '', message: '', actions: [] };

// Shows a Dialog from an event handler, the way Alert.alert is called:
// showDialog({ title, message, actions }). The screen renders `dialog`.
export function useDialog() {
  const [content, setContent] = useState<DialogContent>(noContent);
  const [visible, setVisible] = useState(false);

  // The content stays set while the dialog fades out, so its text doesn't
  // disappear before it does.
  const dialog = (
    <Dialog
      visible={visible}
      title={content.title}
      message={content.message}
      actions={content.actions}
      onDismiss={() => setVisible(false)}
    />
  );

  // Stable across renders, so effects can depend on it.
  const showDialog = useCallback((next: DialogContent) => {
    setContent(next);
    setVisible(true);
  }, []);

  return { dialog, showDialog };
}
