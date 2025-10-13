
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
