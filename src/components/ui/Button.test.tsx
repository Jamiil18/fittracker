import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from './Button';

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and reports itself disabled when disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Save' });
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('ignores presses and reports itself busy while loading', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Save" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Save' });
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });

  // A see-through button shows whatever is behind it, which flickered in dark
  // mode. Every state must be drawn with solid colours instead.
  it.each([
    ['normal', {}],
    ['disabled', { disabled: true }],
    ['loading', { loading: true }],
  ])('stays fully opaque when %s', async (_state, props) => {
    await render(<Button label="Save" onPress={jest.fn()} {...props} />);

    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Save' }).props.style);
    expect(style.opacity ?? 1).toBe(1);
  });
});
