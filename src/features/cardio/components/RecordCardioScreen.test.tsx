import { act, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { RecordCardioScreen } from './RecordCardioScreen';

const mockGetPermission = jest.fn();
jest.mock('expo-location/build/ExpoLocation', () => ({
  __esModule: true,
  default: {
    getForegroundPermissionsAsync: () => mockGetPermission(),
    requestForegroundPermissionsAsync: () => mockGetPermission(),
  },
}));
jest.mock('./CardioRecorder', () => {
  const { Text } = jest.requireActual('react-native');
  return { CardioRecorder: () => <Text>Recorder</Text> };
});

const denied = { status: 'denied', granted: false, canAskAgain: false, expires: 'never' };
const granted = { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };

describe('RecordCardioScreen', () => {
  it('opens the recorder when location was allowed in settings and the user comes back', async () => {
    const appStateListeners: ((status: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListeners.push(listener);
      return { remove: () => undefined };
    });
    mockGetPermission.mockResolvedValue(denied);
    await render(<RecordCardioScreen />);

    expect(await screen.findByRole('button', { name: 'Open settings' })).toBeOnTheScreen();

    mockGetPermission.mockResolvedValue(granted);
    await act(async () => {
      appStateListeners.forEach((listener) => listener('background'));
      appStateListeners.forEach((listener) => listener('active'));
    });

    expect(await screen.findByText('Recorder')).toBeOnTheScreen();
  });
});
