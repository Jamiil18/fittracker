import { EmptyState } from './EmptyState';

type ErrorStateProps = {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
};

// Laid out like an empty state, but announced to screen readers as an alert.
export function ErrorState({ title, message, retryLabel = 'Try again', onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      title={title}
      message={message}
      actionLabel={retryLabel}
      onAction={onRetry}
      accessibilityRole="alert"
    />
  );
}
