export type RemoveSubstring<T extends string, S extends string> = T extends `${infer Prefix}${S}${infer Suffix}`
  ? `${Prefix}${Suffix}`
  : T;

export function highlightDifferences(str1: string, str2: string): [string, string] {
  let result1 = '';
  let result2 = '';
  let i = 0;

  // Get the longer length to iterate through
  const maxLength = Math.max(str1.length, str2.length);

  while (i < maxLength) {
    if (i >= str1.length) {
      // str2 is longer, highlight remaining chars in str2
      result2 += `\x1b[1;31m${str2.slice(i)}\x1b[0m`;
      break;
    }
    if (i >= str2.length) {
      // str1 is longer, highlight remaining chars in str1
      result1 += `\x1b[1;32m${str1.slice(i)}\x1b[0m`;
      break;
    }

    if (str1[i] !== str2[i]) {
      // Characters differ, highlight them
      result1 += `\x1b[1;32m${str1[i]}\x1b[0m`;
      result2 += `\x1b[1;31m${str2[i]}\x1b[0m`;
    } else {
      // Characters match, no highlighting
      result1 += `\x1b[0m${str1[i]}\x1b[0m`;
      result2 += `\x1b[0m${str2[i]}\x1b[0m`;
    }
    i++;
  }

  return [result1, result2];
}
