import { userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { AppErrorFallback } from './AppErrorFallback';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(async () => {}) }));

let shouldThrow = true;

function BrokenScreen() {
  if (shouldThrow) throw new Error('render failed');
  return <Text>Working screen</Text>;
}

describe('AppErrorFallback', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React reports every caught render error; that noise is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('replaces a screen that throws, and renders it again on Try again', async () => {
    const user = userEvent.setup();
    await renderRouter(
      {
        _layout: { default: () => <Slot />, ErrorBoundary: AppErrorFallback },
        index: BrokenScreen,
      },
      { initialUrl: '/' },
    );

    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.queryByText('render failed')).not.toBeOnTheScreen();

    shouldThrow = false;
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Working screen')).toBeOnTheScreen();
  });
});
