interface ParsedContent {
  textContent: string[];
  xmlContent?: Record<string, any>;
}

export function parseCustomContent(mixedString: string): ParsedContent {
  const result: ParsedContent = {
    textContent: [],
    xmlContent: {},
  };

  // Regular expression to match content within tags
  const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(mixedString)) !== null) {
    // Add any text content before this match
    if (match.index > lastIndex) {
      result.textContent.push(mixedString.slice(lastIndex, match.index).trim());
    }

    const [_, tagName, content] = match;
    // Parse the content recursively
    const parsedContent = parseContentRecursively(content);
    result.xmlContent = { [tagName]: parsedContent };
    lastIndex = tagRegex.lastIndex;
  }

  // Add any remaining text content after the last match
  if (lastIndex < mixedString.length) {
    result.textContent.push(mixedString.slice(lastIndex).trim());
  }

  return result;
}

function parseContentRecursively(content: string): any {
  const result: Record<string, any> = {};
  const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match;

  const tagOccurrences: Record<string, any[]> = {};

  while ((match = tagRegex.exec(content)) !== null) {
    const [_, tagName, tagContent] = match;
    let parsedValue;

    // Check if there are nested tags
    if (/<\w+>/.test(tagContent)) {
      parsedValue = parseContentRecursively(tagContent);
    } else {
      parsedValue = tagContent.trim();
    }

    // If the tag doesn't exist in tagOccurrences, initialize it with an empty array
    if (!tagOccurrences[tagName]) {
      tagOccurrences[tagName] = [];
    }

    // Add the parsed value to the tag's occurrences
    tagOccurrences[tagName].push(parsedValue);
  }

  // Process tag occurrences
  for (const [tagName, values] of Object.entries(tagOccurrences)) {
    if (values.length === 1) {
      result[tagName] = values[0];
    } else {
      result[tagName] = values;
    }
  }

  // If no tags were found, return the content as is
  return Object.keys(result).length === 0 ? content.trim() : result;
}
