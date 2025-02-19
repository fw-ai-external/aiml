import { TokenType } from "../acorn";
import { ValidationContext, StateCollection } from "../validation/types";
import { DebugLogger } from "../utils/debug";

export class StateCollector {
  constructor(private logger?: DebugLogger) {}

  collect(context: ValidationContext): StateCollection {
    const { tokens } = context;
    const stateIds = new Set<string>();
    const invalidTargets = new Set<string>();
    const stateElements = new Set(["state", "parallel", "final", "history"]);

    this.logger?.info(`Processing ${tokens.length} tokens`);

    // First pass: collect state IDs
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      this.logger?.token(token, `Processing token at position ${i}`);

      // Look for string tokens that might be attribute values
      if (token.type === TokenType.AttributeString) {
        // Look back for attribute name and tag name
        let j = i - 1;
        let foundAttrName = false;
        let foundTagName = false;
        let tagName = "";

        while (j >= 0 && !(foundAttrName && foundTagName)) {
          const currentToken = tokens[j];

          if (!foundAttrName && currentToken.type === TokenType.AttributeName) {
            if (currentToken.text === "id") {
              foundAttrName = true;
            } else {
              // If we find an attribute name that's not "id", stop looking
              break;
            }
          }

          if (!foundTagName && currentToken.type === TokenType.TagName) {
            tagName = currentToken.text.toLowerCase();
            if (stateElements.has(tagName)) {
              foundTagName = true;
            } else {
              // If we find a tag that's not a state element, stop looking
              break;
            }
          }

          j--;
        }

        if (foundAttrName && foundTagName) {
          const stateId = token.text;
          this.logger?.info(`Found state ID: ${stateId} for tag: ${tagName}`);
          stateIds.add(stateId);
        }
      }
    }

    // Second pass: validate transition targets
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.AttributeString) {
        let j = i - 1;
        let foundAttrName = false;
        let foundTagName = false;

        while (j >= 0 && !(foundAttrName && foundTagName)) {
          const currentToken = tokens[j];

          if (!foundAttrName && currentToken.type === TokenType.AttributeName) {
            if (currentToken.text === "target") {
              foundAttrName = true;
            } else {
              break;
            }
          }

          if (!foundTagName && currentToken.type === TokenType.TagName) {
            if (currentToken.text.toLowerCase() === "transition") {
              foundTagName = true;
            } else {
              break;
            }
          }

          j--;
        }

        if (foundAttrName && foundTagName) {
          const targetId = token.text;
          if (!stateIds.has(targetId)) {
            this.logger?.info(`Found invalid target: ${targetId}`);
            invalidTargets.add(targetId);
          }
        }
      }
    }

    this.logger?.state("Collected state IDs and validated targets", {
      stateCount: stateIds.size,
      invalidTargetCount: invalidTargets.size,
    });
    return { stateIds, invalidTargets };
  }
}
