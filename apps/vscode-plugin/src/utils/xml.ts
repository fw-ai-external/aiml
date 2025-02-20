/**
 * Heals partial or malformed XML by:
 * 1. Closing unclosed tags
 * 2. Adding missing closing tags
 * 3. Fixing malformed attributes
 * 4. Escaping special characters
 *
 * @param xml Potentially malformed XML string
 * @returns Healed XML string
 */
function escapeXMLText(text: string): string {
  return text.replace(/[<>&]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return c;
    }
  });
}

interface TagInfo {
  name: string;
  isClosing: boolean;
  isSelfClosing: boolean;
  content: string;
  needsClosing: boolean;
}

function parseTag(content: string, tagEnd: number): TagInfo | null {
  const match = content.match(/^<\/?([a-zA-Z0-9_-]+)/);
  if (!match) return null;

  const [, name] = match;
  const isClosing = content.startsWith("</");
  const isSelfClosing = content.includes("/>");
  const needsClosing = !isClosing && !isSelfClosing;

  return {
    name,
    isClosing,
    isSelfClosing,
    content: content.endsWith(">") ? content : content + ">",
    needsClosing,
  };
}

function extractXMLContent(xml: string, firstTag: number): string {
  const lastTag = xml.lastIndexOf(">");
  if (lastTag >= 0) {
    return xml.slice(firstTag, lastTag + 1);
  }
  return xml.slice(firstTag);
}

export function healXML(xml: string): string {
  if (!xml.trim()) return "";

  // Find XML boundaries
  const firstTag = xml.indexOf("<");
  if (firstTag === -1) return "";

  // Extract XML portion
  const xmlContent = extractXMLContent(xml, firstTag);

  // Process XML content
  const tagStack: TagInfo[] = [];
  let result = "";
  let pos = 0;
  let textContent = "";
  let inTag = false;
  let lastTagEnd = -1;

  while (pos < xmlContent.length) {
    const tagStart = xmlContent.indexOf("<", pos);
    if (tagStart === -1) {
      // Add remaining text content if inside a tag
      if (inTag) {
        textContent += xmlContent.slice(pos);
        result += escapeXMLText(textContent);
      }
      break;
    }

    // Add text content before this tag
    if (tagStart > pos) {
      textContent += xmlContent.slice(pos, tagStart);
      if (inTag) {
        result += escapeXMLText(textContent);
      }
      textContent = "";
    }

    // Find tag end
    let tagEnd = xmlContent.indexOf(">", tagStart);
    if (tagEnd === -1) {
      // Look for self-closing tag marker
      const selfClose = xmlContent.indexOf("/>", tagStart);
      if (selfClose !== -1) {
        tagEnd = selfClose + 1;
      }
    }

    const tagContent = xmlContent.slice(
      tagStart,
      tagEnd === -1 ? undefined : tagEnd + 1
    );

    const tagInfo = parseTag(tagContent, tagEnd);
    if (tagInfo) {
      if (tagInfo.isClosing) {
        // Find matching opening tag
        let found = false;
        for (let i = tagStack.length - 1; i >= 0; i--) {
          if (tagStack[i].name === tagInfo.name) {
            found = true;
            // Close all tags up to the matching one
            for (let j = tagStack.length - 1; j > i; j--) {
              const tag = tagStack[j];
              if (tag.needsClosing) {
                result += `</${tag.name}>`;
              }
            }
            tagStack.length = i; // Remove all processed tags
            break;
          }
        }
        if (found) {
          result += tagInfo.content;
        }
      } else {
        result += tagInfo.content;
        if (!tagInfo.isSelfClosing) {
          tagStack.push(tagInfo);
          inTag = true;
          if (tagEnd === -1) {
            // For unclosed tags, close all previous tags
            const reversedStack = [...tagStack].reverse();
            for (const tag of reversedStack) {
              if (tag.needsClosing) {
                result += `</${tag.name}>`;
              }
            }
            tagStack.length = 0;
            inTag = false;
          }
        }
      }
    }

    lastTagEnd = tagEnd;
    pos = tagEnd === -1 ? xmlContent.length : tagEnd + 1;
  }

  // Close any remaining open tags that need closing
  if (tagStack.length > 0) {
    const reversedStack = [...tagStack].reverse();
    for (const tag of reversedStack) {
      if (tag.needsClosing) {
        result += `</${tag.name}>`;
      }
    }
  }

  return result;
}
