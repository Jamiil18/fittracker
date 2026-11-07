import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { KeyboardScrollContext } from './KeyboardScrollContext';
import { NumberField } from './NumberField';
import { TableInput } from './TableInput';
import { TextField } from './TextField';

describe('TextField', () => {
  it('uses the label as the accessible name and passes typed text up', async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(<TextField label="Email" onChangeText={onChangeText} />);

    await user.type(screen.getByLabelText('Email'), 'a@b.co');

    expect(onChangeText).toHaveBeenLastCalledWith('a@b.co');
  });

  it('shows the error message and exposes it as the hint', async () => {
    await render(<TextField label="Email" error="Enter a valid email address." />);

    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe(
      'Enter a valid email address.',
    );
  });

  it('shows no error text when there is no error', async () => {
    await render(<TextField label="Email" />);

    expect(screen.queryByText(/valid email/)).not.toBeOnTheScreen();
  });
});

describe('NumberField', () => {
  it('shows the unit and opens the decimal keypad', async () => {
    await render(<NumberField label="Bodyweight" unit="kg" value="81.4" />);

    expect(screen.getByText('kg')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bodyweight').props.keyboardType).toBe('decimal-pad');
    expect(screen.getByDisplayValue('81.4')).toBeOnTheScreen();
  });

  it('tells the scroll view around it when it gains and loses focus, as the table cells do', async () => {
    const events = { onInputFocus: jest.fn(), onInputBlur: jest.fn() };
    await render(
      <KeyboardScrollContext.Provider value={events}>
        <TextField label="Name" />
        <TableInput accessibilityLabel="Set 1 reps" width={56} maxFontSizeMultiplier={1.3} />
      </KeyboardScrollContext.Provider>,
    );

    for (const label of ['Name', 'Set 1 reps']) {
      fireEvent(screen.getByLabelText(label), 'focus');
      fireEvent(screen.getByLabelText(label), 'blur');
    }

    expect(events.onInputFocus).toHaveBeenCalledTimes(2);
    expect(events.onInputBlur).toHaveBeenCalledTimes(2);
  });
});
