import { Text as NativeText } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ErrorState } from './ErrorState';
import { OfflineBanner } from './OfflineBanner';
import { Screen } from './Screen';
import { Skeleton } from './Skeleton';

describe('ErrorState', () => {
  it('offers a retry when given one', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <ErrorState
        title="Couldn't load your profile"
        message="Check your connection."
        onRetry={onRetry}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no button without a retry', async () => {
    await render(<ErrorState title="Something went wrong" message="Restart the app." />);

    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('OfflineBanner', () => {
  it('shows its message', async () => {
    await render(<OfflineBanner message="You're offline." />);

    expect(screen.getByText("You're offline.")).toBeOnTheScreen();
  });
});

describe('Skeleton', () => {
  it('is hidden from screen readers', async () => {
    await render(<Skeleton width={120} height={16} />);

    const skeleton = screen.root;
    expect(skeleton).not.toBeNull();
    expect(skeleton?.props.accessibilityElementsHidden).toBe(true);
    expect(skeleton?.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('Screen', () => {
  it.each([false, true])('renders its content (scroll: %s)', async (scroll) => {
    await render(
      <Screen scroll={scroll}>
        <NativeText>Settings</NativeText>
      </Screen>,
    );

    expect(screen.getByText('Settings')).toBeOnTheScreen();
  });
});
