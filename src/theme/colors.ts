export type ColorTokens = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  separator: string;
  border: string;
  accent: string;
  onAccent: string;
  success: string;
  error: string;
  // Dims the screen behind a dialog: black with transparency, stronger in dark
  // mode, where the screen behind is already dark.
  scrim: string;
};

// Values come from docs/DESIGN.md. Dark mode has its own values, not inverted ones.
export const lightColors: ColorTokens = {
  background: '#F2F3F5',
  surface: '#FFFFFF',
  text: '#16181C',
  textMuted: '#5F6670',
  separator: '#DADDE2',
  border: '#80868F',
  accent: '#1F5FBF',
  onAccent: '#FFFFFF',
  success: '#1E7A46',
  error: '#B3261E',
  scrim: '#00000066',
};

export const darkColors: ColorTokens = {
  background: '#111214',
  surface: '#1C1D21',
  text: '#ECEDEF',
  textMuted: '#9AA0A8',
  separator: '#2D2F35',
  border: '#6B7079',
  accent: '#7AA7F0',
  onAccent: '#111214',
  success: '#4CB879',
  error: '#F2716A',
  scrim: '#000000A6',
};
