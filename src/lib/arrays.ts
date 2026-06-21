/** Returns only the non-empty, trimmed string entries of an array (or [] if not an array). */
export function normalizeProfileList(values?: string[]): string[] {
  return Array.isArray(values)
    ? values.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];
}
