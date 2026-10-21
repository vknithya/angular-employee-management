import { ageOn, countWorkingDays, parseIsoDate, rangesOverlap, toIsoDate } from './date.utils';

describe('date utils', () => {
  it('round-trips ISO dates without timezone shifts', () => {
    expect(toIsoDate(parseIsoDate('2026-03-09'))).toBe('2026-03-09');
  });

  it('counts working days inclusively and skips weekends', () => {
    // Fri 2026-10-23 to Mon 2026-10-26
    expect(countWorkingDays('2026-10-23', '2026-10-26')).toBe(2);
    expect(countWorkingDays('2026-10-24', '2026-10-25')).toBe(0);
  });

  it('calculates age before and after the birthday', () => {
    expect(ageOn('2000-06-15', new Date(2026, 5, 14))).toBe(25);
    expect(ageOn('2000-06-15', new Date(2026, 5, 15))).toBe(26);
  });

  it('detects overlapping ranges', () => {
    expect(rangesOverlap('2026-01-01', '2026-01-05', '2026-01-05', '2026-01-08')).toBe(true);
    expect(rangesOverlap('2026-01-01', '2026-01-04', '2026-01-05', '2026-01-08')).toBe(false);
  });
});
