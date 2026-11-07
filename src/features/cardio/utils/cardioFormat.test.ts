import { cardioSummaryText, formatPace } from './cardioFormat';

describe('formatPace', () => {
  it('shows minutes and seconds per kilometre or mile', () => {
    expect(formatPace(330, 'km')).toBe('5:30 /km');
    expect(formatPace(330, 'mi')).toBe('8:51 /mi');
  });

  it('shows a dash before there is a pace', () => {
    expect(formatPace(null, 'km')).toBe('–');
  });
});

describe('cardioSummaryText', () => {
  it('shows the distance and the average pace', () => {
    expect(cardioSummaryText(4210, 2759, 'km')).toBe('4.21 km, 10:55 /km');
  });

  it('leaves out the pace for a session too short to give one', () => {
    expect(cardioSummaryText(12, 30, 'km')).toBe('0.01 km');
    expect(cardioSummaryText(500, 0, 'km')).toBe('0.5 km');
  });
});
