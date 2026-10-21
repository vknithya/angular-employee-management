/** Formats a Date as a local ISO date string (YYYY-MM-DD) without timezone shifts. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as a local date (new Date('YYYY-MM-DD') would be UTC). */
export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toIsoDate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Number of working days (Mon–Fri) between two ISO dates, inclusive. */
export function countWorkingDays(start: string, end: string): number {
  let cursor = parseIsoDate(start);
  const last = parseIsoDate(end);
  let count = 0;
  while (cursor <= last) {
    if (!isWeekend(cursor)) count++;
    cursor = addDays(cursor, 1);
  }
  return count;
}

export function ageOn(dateOfBirth: string, on = new Date()): number {
  const dob = parseIsoDate(dateOfBirth);
  const age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    on.getMonth() < dob.getMonth() ||
    (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  return beforeBirthday ? age - 1 : age;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
