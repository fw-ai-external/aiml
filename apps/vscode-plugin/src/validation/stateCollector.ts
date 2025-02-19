import { TokenType, Token } from "../acorn";
import { ValidationContext, StateCollection } from "../validation/types";
import { DebugLogger } from "../utils/debug";

export class StateCollector {
  constructor(private debug?: DebugLogger) {}

  private findOwnerTagName(tokens: Token[], index: number): Token | null {
    // Walk backwards through tokens to find the tag name
    while (index >= 1) {
      const token = tokens[index];
      const prevToken = tokens[index - 1];

      if (token.type === TokenType.SimpleEndTag) {
        return null;
      } else if (
        (token.type === TokenType.TagName || token.type === TokenType.Name) &&
        prevToken.type === TokenType.StartTag
      ) {
        return token;
      } else if (
        (token.type === TokenType.TagName || token.type === TokenType.Name) &&
        prevToken.type === TokenType.StartEndTag
      ) {
        return null;
      }
      index--;
    }
    return null;
  }

  private findOwnerAttributeName(tokens: Token[], index: number): Token | null {
    // Walk backwards through tokens to find the attribute name
    while (index >= 1) {
      const token = tokens[index];
      const prevToken = tokens[index - 1];

      if (
        prevToken.type === TokenType.AttributeName ||
        prevToken.type === TokenType.Name
      ) {
        return prevToken;
      } else if (
        prevToken.type === TokenType.StartTag ||
        prevToken.type === TokenType.EndTag ||
        prevToken.type === TokenType.StartEndTag ||
        prevToken.type === TokenType.SimpleEndTag
      ) {
        break;
      }
      index--;
    }
    return null;
  }

  collect(context: ValidationContext): StateCollection {
    const { tokens, content } = context;
    const stateIds = new Set<string>();

    this.debug?.info(`Processing ${tokens.length} tokens`);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      this.debug?.token(token, `Processing token at position ${i}`);

      // Only process string tokens (attribute values)
      if (token.type === TokenType.String) {
        const attrNameToken = this.findOwnerAttributeName(tokens, i);
        const tagNameToken = this.findOwnerTagName(tokens, i);

        if (attrNameToken && tagNameToken) {
          // Get the actual tag name and attribute name from the content
          const tagName = content
            .substring(tagNameToken.startIndex, tagNameToken.endIndex)
            .toLowerCase();
          const attrName = content
            .substring(attrNameToken.startIndex, attrNameToken.endIndex)
            .toLowerCase();

          // Remove quotes from attribute value
          const attrValue = content.substring(
            token.startIndex + 1,
            token.endIndex - 1
          );

          this.debug?.info(
            `Found attribute: ${attrName} with value: ${attrValue} for tag: ${tagName}`
          );

          // Only collect IDs from state elements
          if (tagName === "state" && attrName === "id") {
            this.debug?.state(`Found state ID: ${attrValue}`, {
              position: token.startIndex,
              tagName,
              attrName,
            });
            stateIds.add(attrValue);
          }
        }
      }
    }

    this.debug?.state("Collected state IDs", { count: stateIds.size });
    return { stateIds };
  }
}
