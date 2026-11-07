import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { TabNavigator } from './TabNavigator';

describe('TabNavigator', () => {
  it('opens on the Train tab, whose settings button opens Settings', async () => {
    const user = userEvent.setup();
    await renderRouter(
      {
        _layout: () => <Stack />,
        '(tabs)/_layout': TabNavigator,
        '(tabs)/index': () => <Text>Train screen</Text>,
        '(tabs)/history': () => <Text>History screen</Text>,
        '(tabs)/library': () => <Text>Library screen</Text>,
        '(tabs)/progress': () => <Text>Progress screen</Text>,
        '(tabs)/profile': () => <Text>Profile screen</Text>,
        settings: () => <Text>Settings screen</Text>,
      },
      { initialUrl: '/' },
    );

    expect(await screen.findByText('Train screen')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Train, tab, 1 of 5' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByText('Settings screen')).toBeOnTheScreen();
  });

  it('opens the exercise library from its own tab', async () => {
    const user = userEvent.setup();
    await renderRouter(
      {
        _layout: () => <Stack />,
        '(tabs)/_layout': TabNavigator,
        '(tabs)/index': () => <Text>Train screen</Text>,
        '(tabs)/history': () => <Text>History screen</Text>,
        '(tabs)/library': () => <Text>Library screen</Text>,
        '(tabs)/progress': () => <Text>Progress screen</Text>,
        '(tabs)/profile': () => <Text>Profile screen</Text>,
      },
      { initialUrl: '/' },
    );

    await user.press(await screen.findByRole('button', { name: 'Library, tab, 3 of 5' }));

    expect(await screen.findByText('Library screen')).toBeOnTheScreen();
  });
});
