import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking, Text } from 'react-native';

import { PermissionGate, type PermissionState } from './PermissionGate';

async function renderGate(permission: PermissionState, onRequest = jest.fn()) {
  await render(
    <PermissionGate
      permission={permission}
      title="Location for outdoor cardio"
      explanation="FitTracker uses your location only while this session is recording."
      allowLabel="Allow location"
      onRequest={onRequest}
    >
      <Text>Map</Text>
    </PermissionGate>,
  );
  return onRequest;
}

describe('PermissionGate', () => {
  it('shows the feature once allowed', async () => {
    await renderGate({ granted: true, canAskAgain: true });
    expect(screen.getByText('Map')).toBeOnTheScreen();
  });

  it('explains why before asking', async () => {
    const user = userEvent.setup();
    const onRequest = await renderGate({ granted: false, canAskAgain: true });

    expect(
      screen.getByText('FitTracker uses your location only while this session is recording.'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Allow location' }));
    expect(onRequest).toHaveBeenCalled();
    expect(screen.queryByText('Map')).not.toBeOnTheScreen();
  });

  it("points to the phone's settings when it can't ask again", async () => {
    const user = userEvent.setup();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderGate({ granted: false, canAskAgain: false });

    expect(screen.queryByRole('button', { name: 'Allow location' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalled();
  });
});
