/**
 * Gets unique items from an array based on a specific field
 * @param array Array of objects
 * @param field Field name to use for uniqueness comparison
 * @returns Array with unique items (first occurrence is kept)
 */
export function getUniqueByField<T extends Record<string, any>>(
  array: T[],
  field: keyof T
): T[] {
  const seen = new Set<string | number | undefined>();
  const result: T[] = [];

  for (const item of array) {
    const value = item[field];
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }

  return result;
}

