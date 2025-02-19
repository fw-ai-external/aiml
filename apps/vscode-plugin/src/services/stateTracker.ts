import { TextDocument } from "vscode-languageserver-textdocument";
import { getOwnerAttributeName, getOwnerTagName } from "../utils/token";
import { DebugLogger } from "../utils/debug";
import { Token, TokenType } from "../acorn";

export class StateTracker {
  private documentStateIds: Map<string, Set<string>> = new Map();
  private logger: DebugLogger;

  constructor(logger: DebugLogger) {
    this.logger = logger;
  }

  public getStatesForDocument(uri: string): Set<string> {
    return this.documentStateIds.get(uri) || new Set<string>();
  }

  public trackStates(document: TextDocument, tokens: Token[]): void {
    const stateIds = new Set<string>();
    const text = document.getText();
    this.logger.state("Starting state tracking for document", {
      uri: document.uri,
      content: text,
    });

    this.logger.state("All tokens", {
      tokens: tokens.map((t) => ({
        type: t.type,
        content: text.substring(t.startIndex, t.endIndex),
        startIndex: t.startIndex,
        endIndex: t.endIndex,
        index: t.index,
      })),
    });

    // Log the full text for debugging
    this.logger.state("Full text", { text });

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.String) {
        const attrNameToken = getOwnerAttributeName(tokens, i);
        const tagNameToken = getOwnerTagName(tokens, i);

        if (attrNameToken && tagNameToken) {
          const tagName = text
            .substring(tagNameToken.startIndex, tagNameToken.endIndex)
            .toLowerCase();
          const attrName = text
            .substring(attrNameToken.startIndex, attrNameToken.endIndex)
            .toLowerCase();
          const attrValue = text.substring(
            token.startIndex + 1,
            token.endIndex - 1
          );

          this.logger.state("Found potential state", {
            token: text.substring(token.startIndex, token.endIndex),
            attrName,
            attrValue,
            tagName,
          });

          // Track all elements with role="state": state, parallel, final, history
          const stateElements = new Set([
            "state",
            "parallel",
            "final",
            "history",
          ]);

          this.logger.state("Processing token", {
            tagName,
            attrName,
            attrValue,
            tokenType: token.type,
          });

          if (stateElements.has(tagName) && attrName === "id") {
            this.logger.state("Found state ID", { id: attrValue, tagName });
            stateIds.add(attrValue);
          }
        }
      }
    }

    this.documentStateIds.set(document.uri, stateIds);
    this.logger.state("Completed state tracking", {
      uri: document.uri,
      content: document.getText(),
      stateCount: stateIds.size,
      states: Array.from(stateIds),
    });
  }

  public clearStates(uri: string): void {
    this.documentStateIds.delete(uri);
    this.logger.state("Cleared states for document", { uri });
  }
}
