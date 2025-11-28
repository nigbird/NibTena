
import { parse, isWithinInterval, isBefore, isEqual, isAfter } from 'date-fns';

/**
 * Parses a time string (HH:mm) into a Date object for today.
 * @param timeStr - The time string in "HH:mm" format.
 * @returns A Date object.
 */
function parseTime(timeStr: string): Date {
  return parse(timeStr, 'HH:mm', new Date());
}

/**
 * Checks if a given time falls within any of the provided time ranges.
 * @param timeToCheck - The Date object representing the time to check.
 * @param ranges - An array of time slot objects with startTime and endTime.
 * @returns True if the time is within any of the ranges, false otherwise.
 */
export function isTimeInRanges(timeToCheck: Date, ranges: { startTime: string; endTime: string }[]): boolean {
  return ranges.some(range => {
    const start = parseTime(range.startTime);
    const end = parseTime(range.endTime);
    // isWithinInterval is inclusive of start, exclusive of end.
    // So we check for equality with start, and check if it's before end.
    return (isEqual(timeToCheck, start) || isAfter(timeToCheck, start)) && isBefore(timeToCheck, end);
  });
}

/**
 * Checks if two time slots overlap.
 * @param slot1 - The first time slot.
 * @param slot2 - The second time slot.
 * @returns True if the slots overlap, false otherwise.
 */
export function doSlotsOverlap(slot1: { startTime: string; endTime: string }, slot2: { startTime: string; endTime: string }) {
    const start1 = parseTime(slot1.startTime);
    const end1 = parseTime(slot1.endTime);
    const start2 = parseTime(slot2.startTime);
    const end2 = parseTime(slot2.endTime);

    // Overlap occurs if one slot starts before the other ends, and ends after the other starts.
    return isBefore(start1, end2) && isAfter(end1, start2);
}
