// Logs only in development, and only an error's name, code and status. Messages
// and request details are left out because they can contain emails, tokens or
// health data.
function describe(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const { code, status } = error as Error & { code?: unknown; status?: unknown };
    return { name: error.name, code, status };
  }
  return { type: typeof error };
}

export const logger = {
  error(context: string, error: unknown): void {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console -- the one place console output is allowed
    console.error(`[${context}]`, describe(error));
  },
};
