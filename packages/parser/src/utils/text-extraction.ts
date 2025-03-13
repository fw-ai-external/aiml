/**
 * Extract text content from a node, recursively including children
 */
export function extractTextFromNode(node: any): string | null {
  if (node.type === "mdxJsxTextElement" || node.type === "mdxJsxFlowElement") {
    return serializeJsxToText(node);
  }

  // For text nodes, simply return the value
  if (node.type === "text") {
    return node.value || "";
  }

  // For code blocks, return with markdown code formatting
  if (node.type === "code") {
    return `\`\`\`${node.lang || ""}\n${node.value || ""}\n\`\`\``;
  }

  // For inline code, return with backticks
  if (node.type === "inlineCode") {
    return `\`${node.value || ""}\``;
  }

  // For headings, add the appropriate number of # characters
  if (node.type === "heading") {
    const prefix = "#".repeat(node.depth) + " ";
    let text = prefix;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text;
  }

  // For paragraphs, handle nested content
  if (node.type === "paragraph") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        // Skip mdxTextExpression nodes in text extraction
        if (child.type === "mdxTextExpression") {
          text += "{...}"; // Placeholder for expressions
        } else {
          const childText = extractTextFromNode(child);
          if (childText) {
            text += childText;
          }
        }
      }
    }

    return text;
  }

  // For lists, convert to text representation
  if (node.type === "list") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const prefix = node.ordered ? `${i + 1}. ` : "- ";
        const childText = extractTextFromNode(node.children[i]);
        if (childText) {
          text += prefix + childText + "\n";
        }
      }
    }

    return text;
  }

  // For list items, process children
  if (node.type === "listItem") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text;
  }

  // For links, convert to markdown link format
  if (node.type === "link") {
    let linkText = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          linkText += childText;
        }
      }
    }

    return `[${linkText}](${node.url || ""})`;
  }

  // For images, convert to markdown image format
  if (node.type === "image") {
    return `![${node.alt || ""}](${node.url || ""})`;
  }

  // For emphasis, add asterisks
  if (node.type === "emphasis") {
    let text = "*";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text + "*";
  }

  // For strong emphasis, add double asterisks
  if (node.type === "strong") {
    let text = "**";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text + "**";
  }

  // For blockquotes, add > prefix
  if (node.type === "blockquote") {
    let text = "> ";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText.replace(/\n/g, "\n> ");
        }
      }
    }

    return text;
  }

  // For horizontal rules
  if (node.type === "thematicBreak") {
    return "---";
  }

  // For other nodes with children, recursively extract text
  if (node.children && node.children.length > 0) {
    let text = "";

    for (const child of node.children) {
      const childText = extractTextFromNode(child);
      if (childText) {
        text += childText;
      }
    }

    return text;
  }

  return null;
}

/**
 * Serialize a JSX node to text representation
 */
export function serializeJsxToText(node: any): string {
  if (!node) return "";

  // Start with opening tag
  let result = `<${node.name}`;

  // Add attributes
  if (node.attributes && Array.isArray(node.attributes)) {
    for (const attr of node.attributes) {
      if (attr.type === "mdxJsxAttribute") {
        if (typeof attr.value === "string") {
          result += ` ${attr.name}="${attr.value}"`;
        } else if (
          attr.value &&
          attr.value.type === "mdxJsxAttributeValueExpression"
        ) {
          result += ` ${attr.name}={${attr.value.value}}`;
        } else if (attr.value === null) {
          // Boolean attribute
          result += ` ${attr.name}`;
        }
      }
    }
  }

  // Check if it's a self-closing tag
  if (!node.children || node.children.length === 0) {
    result += " />";
    return result;
  }

  // Close opening tag
  result += ">";

  // Add children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.type === "text") {
        result += child.value || "";
      } else {
        const childText = extractTextFromNode(child);
        if (childText) {
          result += childText;
        }
      }
    }
  }

  // Add closing tag
  result += `</${node.name}>`;

  return result;
}
