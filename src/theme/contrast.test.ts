import { darkColors, lightColors, type ColorTokens } from './colors';
import { contrastRatio, relativeLuminance } from './contrast';

describe('contrastRatio', () => {
  it('matches the WCAG reference values for black and white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('is the same whichever colour comes first', () => {
    expect(contrastRatio('#1F5FBF', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1F5FBF'));
  });

  it('rejects colours that are not six-digit hex', () => {
    expect(() => relativeLuminance('blue')).toThrow();
    expect(() => relativeLuminance('#FFF')).toThrow();
  });
});

// AA needs 4.5:1 for normal text, and 3:1 for the outlines of controls and
// for graphical marks such as the completed-set tick.
const textPairs: [keyof ColorTokens, keyof ColorTokens][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['onAccent', 'accent'],
  // The text on swipe action buttons.
  ['onAccent', 'textMuted'],
  ['onAccent', 'error'],
  // The tick in a completed set's box.
  ['onAccent', 'success'],
  ['error', 'background'],
  ['error', 'surface'],
];

const nonTextPairs: [keyof ColorTokens, keyof ColorTokens][] = [
  ['border', 'background'],
  ['border', 'surface'],
  ['success', 'surface'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s colour tokens', (_scheme, colors) => {
  it.each(textPairs)('%s on %s meets 4.5:1 for text', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(nonTextPairs)('%s on %s meets 3:1 for controls', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(3);
  });
});
