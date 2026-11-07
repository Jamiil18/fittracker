// 4pt grid from docs/DESIGN.md.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
} as const;

export const screenPadding = spacing.lg;

// Android's minimum touch target; iOS asks for 44, so 48 satisfies both.
export const minTouchTarget = 48;
