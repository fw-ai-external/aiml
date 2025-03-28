/**
 * Simple fuzzy search to check if a tag name is in the allowed elements array
 */
export function fuzzyMatch(
  tagName: string,
  allowedElements: string[],
  threshold = 0.8
): boolean {
  const tag = tagName.toLowerCase();

  for (const element of allowedElements) {
    const elem = element.toLowerCase();

    // Quick exact match check
    if (tag === elem) return true;

    // Simple similarity score
    const maxLength = Math.max(tag.length, elem.length);
    if (maxLength === 0) continue;

    let matchingChars = 0;
    const minLength = Math.min(tag.length, elem.length);

    for (let i = 0; i < minLength; i++) {
      if (tag[i] === elem[i]) matchingChars++;
    }

    const similarity = matchingChars / maxLength;
    if (similarity >= threshold) return true;
  }

  return false;
}
