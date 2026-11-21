/**
 * Masks a string value, showing only the last four characters preceded by four asterisks.
 * Returns '****' if the value has 4 or fewer characters.
 */
export function maskField(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return '****' + value.slice(-4);
}
