import { RecurrenceType } from '@prisma/client';

export interface Occurrence {
  start: Date;
  end: Date;
}

/**
 * Generates all occurrences of a recurring event within an optional display window.
 *
 * For non-recurring events (recurrenceType === 'none') returns a single occurrence.
 *
 * @param recurrenceType  - none | daily | weekly | monthly
 * @param seriesStart     - start datetime of the first occurrence
 * @param seriesEnd       - end datetime of the first occurrence (duration is preserved)
 * @param repeatUntil     - last date an occurrence may fall on (null → treat as non-recurring)
 * @param windowStart     - optional: only return occurrences that end after this date
 * @param windowEnd       - optional: only return occurrences that start before this date
 */
export function generateOccurrences(
  recurrenceType: RecurrenceType,
  seriesStart: Date,
  seriesEnd: Date,
  repeatUntil: Date | null,
  windowStart?: Date,
  windowEnd?: Date,
): Occurrence[] {
  const durationMs = seriesEnd.getTime() - seriesStart.getTime();

  // Non-recurring: single occurrence
  if (recurrenceType === 'none' || !repeatUntil) {
    const occ = { start: seriesStart, end: seriesEnd };
    if (windowStart && seriesEnd < windowStart) return [];
    if (windowEnd && seriesStart > windowEnd) return [];
    return [occ];
  }

  const occurrences: Occurrence[] = [];
  let current = new Date(seriesStart);

  // Guard: cap at 2 years of occurrences to prevent infinite loops
  const hardStop = new Date(seriesStart);
  hardStop.setFullYear(hardStop.getFullYear() + 2);
  const effectiveUntil = repeatUntil < hardStop ? repeatUntil : hardStop;

  while (current <= effectiveUntil) {
    const occStart = new Date(current);
    const occEnd = new Date(current.getTime() + durationMs);

    const afterWindowEnd = windowEnd && occStart > windowEnd;
    if (afterWindowEnd) break;

    const beforeWindowStart = windowStart && occEnd < windowStart;
    if (!beforeWindowStart) {
      occurrences.push({ start: occStart, end: occEnd });
    }

    // Advance to next occurrence
    switch (recurrenceType) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return occurrences;
}
