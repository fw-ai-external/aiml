import { JSXPreprocessError } from "../types";

export class JSXPreprocessor {
  // Marker used to preserve whitespace in empty elements
  private static readonly WHITESPACE_MARKER = "__EMPTY_ELEMENT_MARKER__";

  /**
   * Validates and preprocesses JSX input
   * Trims outer whitespace and validates the input is valid JSX
   */
  static validateAndPreprocess(input: string): string {
    const processed = input.trim();
    // Simple check: if there's a '<' followed by an alphabet character
    if (!processed.match(/<\s*[A-Za-z]/)) {
      throw new JSXPreprocessError("No JSX element found in MDX file");
    }
    return processed;
  }

  /**
   * Normalizes JSX syntax while preserving meaningful whitespace
   * Handles special cases from test scenarios and applies a series of
   * transformations to ensure proper JSX formatting
   */
  static normalizeSyntax(input: string): string {
    // Regular processing for other cases
    // First normalize all whitespace to single spaces
    let result = input.replace(/\s+/g, " ");

    // Mark empty elements with whitespace for later restoration
    result = this.markEmptyElements(result);

    // Handle self-closing tags
    result = this.processSelfClosingTags(result);

    // Clean up spaces between elements
    result = this.cleanupSpacesBetweenElements(result);

    // Trim whitespace inside elements with text content
    result = this.trimTextContent(result);

    // Restore whitespace in empty elements
    result = result.replace(new RegExp(this.WHITESPACE_MARKER, "g"), "  ");

    return result;
  }

  /**
   * Creates minimal JSX runtime
   */
  static createJSXRuntime(): string {
    return `
      const Fragment = { type: "Fragment" };
      function createElement(type, props) {
        const children = [];
        let i = 2;
        while (i < arguments.length) {
          const child = arguments[i];
          if (child != null) {
            if (typeof child === "object" && child.type) {
              children.push(child);
            } else if (typeof child === "string" || typeof child === "number") {
              children.push({ type: "text", props: { value: String(child) } });
            }
          }
          i++;
        }
        return {
          type: typeof type === "string" ? type : type.type,
          props: props || {},
          children
        };
      }
    `;
  }

  /**
   * Combines all preprocessing steps
   */
  static process(input: string): string {
    try {
      // Handle empty or whitespace-only input
      if (!input.trim()) {
        throw new JSXPreprocessError("No JSX element found in MDX file");
      }

      const validated = this.validateAndPreprocess(input);
      const normalized = this.normalizeSyntax(validated);
      const runtime = this.createJSXRuntime();
      return `${runtime}${normalized}`;
    } catch (error) {
      if (error instanceof Error) {
        throw new JSXPreprocessError(error.message);
      }
      throw new JSXPreprocessError("Unknown error during JSX preprocessing");
    }
  }

  /**
   * Marks empty elements with a special token for preservation
   */
  private static markEmptyElements(input: string): string {
    return input.replace(
      /<([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*)??)>\s+<\/\1>/g,
      (match, tagName, attrs) => {
        return `<${tagName}${attrs}>${this.WHITESPACE_MARKER}</${tagName}>`;
      }
    );
  }

  /**
   * Processes self-closing tags
   */
  private static processSelfClosingTags(input: string): string {
    // TODO any tag can be self closing
    const selfClosingTags = Array.from(this.SELF_CLOSING_TAGS);
    const selfClosingRegex = new RegExp(
      `<(${selfClosingTags.join("|")})((?:\\s[^>]*)?)>(?!\/)`,
      "g"
    );
    return input.replace(selfClosingRegex, "<$1$2/>");
  }

  /**
   * Cleans up spaces between elements
   */
  private static cleanupSpacesBetweenElements(input: string): string {
    let result = input;

    // Between opening tags
    result = result.replace(/(<[^\/][^>]*>)\s+(<[^\/])/g, "$1$2");

    // After closing tags
    result = result.replace(/(<\/[^>]+>)\s+(<)/g, "$1$2");

    // Before closing tags, but not if it contains our marker
    result = result.replace(
      new RegExp(
        `(<[^\/][^>]*>)\\s+(<\\/(?!.*${this.WHITESPACE_MARKER}))`,
        "g"
      ),
      "$1$2"
    );

    return result;
  }

  /**
   * Trims whitespace inside elements with text content
   */
  private static trimTextContent(input: string): string {
    return input.replace(
      /<([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*)?)>([^<]+)<\/\1>/g,
      (match, tagName, attrs, content) => {
        if (content.trim() && content !== this.WHITESPACE_MARKER) {
          return `<${tagName}${attrs}>${content.trim()}</${tagName}>`;
        }
        return match;
      }
    );
  }
}
