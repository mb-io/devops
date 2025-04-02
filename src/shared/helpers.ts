/**
 * Encodes a string to escape special HTML characters.
 * @param str - The string to encode.
 * @returns {string} - The HTML-encoded string.
 */
export function htmlEncode(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Formats a date string into a more readable format.
 * @param date - The date string to format.
 * @returns {string} - The formatted date string.
 */
export function formatUTCDate(date: string | Date): string {
  return new Date(date)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, ' UTC');
}

/**
 * Generates a summary table for the given rows and headers.
 * @param rows - The data rows for the table.
 * @param headers - The headers for the table.
 * @returns {Array} - The generated summary table.
 */
export function geenrateSummaryTable(rows: any[], headers: string[]) {
  return [
    headers.map((header) => ({ data: header, header: true })),
    ...rows.map((row) => row.map((cell: string) => ({ data: cell ?? '-' }))),
  ];
}

/**
 * Truncates a string to a specified length and adds ellipsis if it exceeds the length.
 * @param str - The string to truncate.
 * @param maxLength - The maximum length of the string.
 * @returns {string} - The truncated string with ellipsis if it exceeds the length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}
