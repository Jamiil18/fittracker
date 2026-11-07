import type { TextStyle } from 'react-native';

export type TextVariant = 'display' | 'title' | 'body' | 'bodyStrong' | 'secondary' | 'caption';

// Five sizes from docs/DESIGN.md; body has a regular and a medium weight.
export const textVariants: Record<TextVariant, TextStyle> = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 22, fontWeight: '500' },
  secondary: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
};
