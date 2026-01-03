/**
 * Format numbers for display in stat boxes
 * Numbers >= 1000 are formatted as "1.2k" with max 1 decimal place
 * Numbers < 1000 are displayed as-is
 * 
 * Examples:
 * - 999 -> "999"
 * - 1000 -> "1k"
 * - 1260 -> "1.2k"
 * - 1299 -> "1.2k"
 * - 1300 -> "1.3k"
 * - 10500 -> "10.5k"
 */
export function formatStatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  const thousands = num / 1000;
  
  // Round down to 1 decimal place
  const rounded = Math.floor(thousands * 10) / 10;
  
  // If it's a whole number, don't show decimal
  if (rounded % 1 === 0) {
    return `${Math.floor(rounded)}k`;
  }
  
  return `${rounded.toFixed(1)}k`;
}
