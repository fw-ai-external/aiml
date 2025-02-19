import { TokenType } from "../acorn";
import { ValidationContext, StateCollection } from "../validation/types";
import { DebugLogger } from "../utils/debug";

export class StateCollector {
  constructor(private logger?: DebugLogger) {}

  collect(context: ValidationContext): StateCollection {
    const { tokens } = context;
    const stateIds = new Set<string>();
    const stateElements = new Set(["state", "parallel", "final", "history"]);

    this.logger?.info(`Processing ${tokens.length} tokens`);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      this.logger?.token(token, `Processing token at position ${i}`);

      // Look for start tag
      if (token.type === TokenType.StartTag && i + 1 < tokens.length) {
        const tagNameToken = tokens[i + 1];

        // Check if it's a state-related tag
        if (
          tagNameToken.type === TokenType.TagName &&
          stateElements.has(tagNameToken.text.toLowerCase())
        ) {
          const tagName = tagNameToken.text.toLowerCase();
          let j = i + 2;

          // Look for id attribute and its value
          while (
            j < tokens.length &&
            tokens[j].type !== TokenType.SimpleEndTag &&
            tokens[j].type !== TokenType.EndTag
          ) {
            if (
              tokens[j].type === TokenType.AttributeName &&
              tokens[j].text === "id"
            ) {
              // Skip the equals sign
              j++;
              // Get the attribute value
              if (
                j + 1 < tokens.length &&
                tokens[j + 1].type === TokenType.AttributeString
              ) {
                const stateId = tokens[j + 1].text;
                this.logger?.info(
                  `Found state ID: ${stateId} for tag: ${tagName}`
                );
                stateIds.add(stateId);
                break;
              }
            }
            j++;
          }
        }
      }
    }

    this.logger?.state("Collected state IDs", { count: stateIds.size });
    return { stateIds };
  }
}
