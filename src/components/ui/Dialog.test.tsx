import { render, screen, userEvent } from '@testing-library/react-native';

import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('shows its title and message, and closes before running the chosen action', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    await render(
      <Dialog
        visible
        title="Delete routine?"
        message={'"Push A" will be deleted.'}
        actions={[
          { label: 'Cancel' },
          { label: 'Delete routine', destructive: true, onPress: () => calls.push('delete') },
        ]}
        onDismiss={() => calls.push('dismiss')}
      />,
    );

    expect(screen.getByText('"Push A" will be deleted.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Delete routine' }));
    expect(calls).toEqual(['dismiss', 'delete']);
  });

  it('only closes for an action without its own handler', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    await render(
      <Dialog
        visible
        title="Discard changes?"
        message="Your changes haven't been saved."
        actions={[{ label: 'Keep editing' }, { label: 'Discard changes', destructive: true }]}
        onDismiss={onDismiss}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
