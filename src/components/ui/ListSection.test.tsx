import { render, screen, userEvent } from '@testing-library/react-native';

import { ListRow } from './ListRow';
import { ListSection } from './ListSection';

describe('ListSection', () => {
  it('shows the title as a header and separates rows', async () => {
    await render(
      <ListSection title="Units" footer="Used across the app.">
        <ListRow title="Weight" value="kg" />
        <ListRow title="Distance" value="km" />
        <ListRow title="Height" value="cm" />
      </ListSection>,
    );

    expect(screen.getByRole('header', { name: 'Units' })).toBeOnTheScreen();
    expect(screen.getByText('Used across the app.')).toBeOnTheScreen();
    expect(screen.getAllByTestId('list-separator')).toHaveLength(2);
  });
});

describe('ListRow', () => {
  it('is a button when it has an action', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<ListRow title="Sign out" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is plain text when it has no action', async () => {
    await render(<ListRow title="Email" value="a@b.co" />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    expect(screen.getByText('a@b.co')).toBeOnTheScreen();
  });
});
