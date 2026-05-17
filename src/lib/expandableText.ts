interface ExpandableTextOptions {
  minCharacters?: number;
  minLineBreaks?: number;
}

export function shouldShowExpandableText(
  text: string,
  options: ExpandableTextOptions = {},
) {
  const { minCharacters = 60, minLineBreaks = 1 } = options;
  const normalized = text.replace(/\s+/g, " ").trim();
  const lineBreakCount = (text.match(/\n/g) ?? []).length;

  if (!normalized) return false;

  return (
    normalized.length > minCharacters || lineBreakCount >= minLineBreaks
  );
}
