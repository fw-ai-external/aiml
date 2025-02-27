import { AIMLNode, ElementType, aimlElements } from "@fireworks/types";
import { Node, SyntaxList } from "ts-morph";

/**
 * Convert a ts-morph AST to an AIML AST
 * Handles arrays of nodes or SyntaxLists from ts-morph
 */
export function tsToAIML(ast: Array<SyntaxList | Node>): AIMLNode[] {
  console.log("Inside tsToAIML");

  // Return early if no nodes
  if (!ast || ast.length === 0) {
    console.log("Empty AST, returning []");
    return [];
  }

  // Extract the MDX content from the AST
  const mdxContent = extractMdxContent(ast);
  if (!mdxContent) {
    console.log("No MDX content found");
    return [];
  }

  // Process the MDX content to extract AIML nodes
  return parseMdxToAiml(mdxContent);
}

/**
 * Extract MDX content from the AST
 */
function extractMdxContent(ast: Array<SyntaxList | Node>): string | undefined {
  // Get the full text of the AST
  let fullText = "";
  for (const node of ast) {
    fullText += node.getText();
  }

  // Look for content between JSX fragment tags or function return
  const jsxFragmentMatch = /return\s+<>\s*([\s\S]*?)\s*<\/>/m.exec(fullText);
  if (jsxFragmentMatch) {
    return jsxFragmentMatch[1];
  }

  return undefined;
}

/**
 * Parse MDX content to AIML nodes
 */
function parseMdxToAiml(mdxContent: string): AIMLNode[] {
  const result: AIMLNode[] = [];

  // Extract frontmatter if present
  const frontmatterMatch = /---\s*\n([\s\S]*?)\n\s*---/.exec(mdxContent);
  if (frontmatterMatch) {
    console.log("Found frontmatter in MDX content");
    const frontmatterContent = frontmatterMatch[1].trim();

    // Create header node
    const headerNode: AIMLNode = {
      type: "header",
      key: "frontmatter",
      children: parseFrontmatter(frontmatterContent),
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    };

    result.push(headerNode);

    // Remove frontmatter from content for further processing
    mdxContent = mdxContent.replace(frontmatterMatch[0], "");
  }

  // Process the remaining content
  const sections = splitContentSections(mdxContent);

  for (const section of sections) {
    if (section.type === "text") {
      // Process text content for expressions
      const textAndExpressions = extractTextAndExpressions(section.content);
      result.push(...textAndExpressions);
    } else if (section.type === "element") {
      // Process JSX element
      const elementNode = processJsxElement(section.content);
      if (elementNode) {
        result.push(elementNode);
      }
    }
  }

  return result;
}

/**
 * Split MDX content into text and element sections
 */
function splitContentSections(
  content: string
): Array<{ type: "text" | "element"; content: string }> {
  const result: Array<{ type: "text" | "element"; content: string }> = [];

  // Regular expression to match JSX elements
  const regex =
    /<([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*?)?>[\s\S]*?<\/\1>|<([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*?)?\/>/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before element
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index).trim();
      if (textBefore) {
        result.push({
          type: "text",
          content: textBefore,
        });
      }
    }

    // Add element
    result.push({
      type: "element",
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      result.push({
        type: "text",
        content: textAfter,
      });
    }
  }

  return result;
}

/**
 * Extract text and expressions from content
 */
function extractTextAndExpressions(content: string): AIMLNode[] {
  const result: AIMLNode[] = [];

  // Regular expression to match expressions like {userInput.message.content}
  const regex = /\{([^{}]+)\}/g;

  // Find all expressions
  const expressions: { start: number; end: number; value: string }[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    expressions.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[1],
    });
  }

  // If no expressions, just add the text content
  if (expressions.length === 0) {
    const textContent = content.trim();
    if (textContent) {
      result.push({
        type: "text",
        key: "text-content",
        value: textContent,
        lineStart: 0,
        lineEnd: 0,
        columnStart: 0,
        columnEnd: 0,
      });
    }
    return result;
  }

  // Process text and expressions
  let lastIndex = 0;

  for (const expr of expressions) {
    // Add text before expression
    if (expr.start > lastIndex) {
      const textBefore = content.substring(lastIndex, expr.start).trim();
      if (textBefore) {
        result.push({
          type: "text",
          key: "text-content",
          value: textBefore,
          lineStart: 0,
          lineEnd: 0,
          columnStart: lastIndex,
          columnEnd: expr.start,
        });
      }
    }

    // Add expression
    result.push({
      type: "expression",
      key: "expression",
      value: expr.value,
      lineStart: 0,
      lineEnd: 0,
      columnStart: expr.start,
      columnEnd: expr.end,
    });

    lastIndex = expr.end;
  }

  // Add text after last expression
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      result.push({
        type: "text",
        key: "text-content",
        value: textAfter,
        lineStart: 0,
        lineEnd: 0,
        columnStart: lastIndex,
        columnEnd: content.length,
      });
    }
  }

  return result;
}

/**
 * Process a JSX element string to an AIML node
 */
function processJsxElement(content: string): AIMLNode | undefined {
  // Extract the tag name from the content
  const tagMatch = /<([a-zA-Z][a-zA-Z0-9]*)/.exec(content);
  if (!tagMatch) {
    return undefined;
  }

  const tagName = tagMatch[1].toLowerCase();

  // Check if this tag is a valid AIML element
  const isValidElement = aimlElements.includes(tagName as ElementType);

  if (isValidElement) {
    // This is a valid element, process it

    // Check if it's a self-closing tag or a regular tag
    const isSelfClosing = /\/>$/.test(content);

    let attributesStr = "";
    if (isSelfClosing) {
      // Extract attributes from self-closing tag
      const selfClosingMatch = new RegExp(
        `<${tagName}\\s+([^>]*)\\s*/>`,
        "i"
      ).exec(content);
      if (selfClosingMatch) {
        attributesStr = selfClosingMatch[1];
      }
    } else {
      // Extract attributes from opening tag
      const openingTagMatch = new RegExp(`<${tagName}\\s+([^>]*)>`, "i").exec(
        content
      );
      if (openingTagMatch) {
        attributesStr = openingTagMatch[1];
      }
    }

    // Extract attributes
    const attributes = extractAttributes(attributesStr);

    // Create element node
    return {
      type: "element",
      key: `${tagName}${attributes.id ? `-${attributes.id}` : ""}`,
      tag: tagName,
      attributes,
      children: [],
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    };
  } else {
    // This is not a valid element, treat it as text
    return {
      type: "text",
      key: "text-content",
      value: content,
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    };
  }
}

/**
 * Extract attributes from a string
 */
function extractAttributes(attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  // Regular expression to match attributes
  const regex = /([a-zA-Z][a-zA-Z0-9]*)\s*=\s*["']([^"']*)["']/g;

  let match;
  while ((match = regex.exec(attributesStr)) !== null) {
    const name = match[1];
    const value = match[2];
    attributes[name] = value;
  }

  return attributes;
}

/**
 * Parse YAML frontmatter into header fields
 */
function parseFrontmatter(content: string): AIMLNode[] {
  const headerFields: AIMLNode[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Look for key-value pairs (name: value)
    const match = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();

      if (key && value) {
        headerFields.push({
          type: "headerField",
          key: `header-field-${key}`,
          id: key,
          value: value,
          lineStart: 0,
          lineEnd: 0,
          columnStart: 0,
          columnEnd: 0,
        });
      }
    }
  }

  return headerFields;
}
