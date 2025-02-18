export function getTextBetweenChars(
  text: string,
  start: number,
  end: number
): string {
  return text.slice(start, end);
}

export function startsWith(
  str: string,
  searchString: string,
  position?: number
): boolean {
  return str.substr(position || 0, searchString.length) === searchString;
}

export function endsWith(
  str: string,
  searchString: string,
  position?: number
): boolean {
  const index = (position || str.length) - searchString.length;
  const lastIndex = str.lastIndexOf(searchString, index);
  return lastIndex !== -1 && lastIndex === index;
}

export function stringIncludes(
  str: string,
  searchString: string,
  position?: number
): boolean {
  return str.indexOf(searchString, position || 0) !== -1;
}

export function isRealNaN(x: unknown): boolean {
  return typeof x === "number" && isNaN(x);
}

export function arrayIncludes<T>(
  array: T[],
  searchElement: T,
  position?: number
): boolean {
  const len = array.length;
  if (len === 0) return false;

  const lookupIndex = position !== undefined ? position | 0 : 0;
  const isNaNElement = isRealNaN(searchElement);
  let searchIndex = lookupIndex >= 0 ? lookupIndex : len + lookupIndex;
  while (searchIndex < len) {
    const element = array[searchIndex++];
    if (element === searchElement) return true;
    if (isNaNElement && isRealNaN(element)) return true;
  }

  return false;
}
