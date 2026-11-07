import { render, screen, userEvent } from '@testing-library/react-native';

import { SegmentedControl } from './SegmentedControl';

const units = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
] as const;

describe('SegmentedControl', () => {
  it('marks only the selected option as checked', async () => {
    await render(
      <SegmentedControl
        options={units}
        value="kg"
        onChange={jest.fn()}
        accessibilityLabel="Weight unit"
      />,
    );

    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'lb' })).not.toBeChecked();
  });

  it('reports the pressed option', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <SegmentedControl
        options={units}
        value="kg"
        onChange={onChange}
        accessibilityLabel="Weight unit"
      />,
    );

    await user.press(screen.getByRole('radio', { name: 'lb' }));

    expect(onChange).toHaveBeenCalledWith('lb');
  });
});
