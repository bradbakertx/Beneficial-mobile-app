/**
 * Date utility functions to handle dates consistently without timezone issues
 * 
 * The problem: When working with date-only values (no time), JavaScript's Date object
 * and libraries like date-fns can cause timezone conversion issues.
 * 
 * Solution: Always use local timezone methods for date-only operations.
 */

/**
 * Format a Date object as YYYY-MM-DD string using local timezone
 * This prevents timezone conversion issues when working with date-only values
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string as a Date object in local timezone
 * This prevents timezone conversion issues when working with date-only values
 */
export function parseDateLocal(dateString: string): Date {
  // Adding T00:00:00 tells JavaScript to parse as local midnight, not UTC
  return new Date(dateString + 'T00:00:00');
}
