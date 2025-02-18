import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Token,
  TokenType,
  getOwnerAttributeName,
  getOwnerTagName,
} from "../token";
import { DebugLogger } from "../utils/debug";

export class StateTracker {
  private documentStateIds: Map<string, Set<string>> = new Map();
  private logger: DebugLogger;

  constructor(logger: DebugLogger) {
    this.logger = logger;
  }

  public getStatesForDocument(uri: string): Set<string> {
    return this.documentStateIds.get(uri) || new Set<string>();
  }

  public trackStates(
    document: TextDocument,
    tokens: Token[],
    text: string
  ): void {
    const stateIds = new Set<string>();
    this.logger.state("Starting state tracking for document", {
      uri: document.uri,
    });

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.String) {
        const attrNameToken = getOwnerAttributeName(tokens, i);
        const tagNameToken = getOwnerTagName(tokens, i);

        if (attrNameToken && tagNameToken) {
          const tagName = text.substring(
            tagNameToken.startIndex,
            tagNameToken.endIndex
          );
          const attrName = text.substring(
            attrNameToken.startIndex,
            attrNameToken.endIndex
          );
          const attrValue = text.substring(
            token.startIndex + 1,
            token.endIndex - 1
          );

          if (tagName === "state" && attrName === "id") {
            this.logger.state("Found state ID", { id: attrValue });
            stateIds.add(attrValue);
          }
        }
      }
    }

    this.documentStateIds.set(document.uri, stateIds);
    this.logger.state("Completed state tracking", {
      uri: document.uri,
      stateCount: stateIds.size,
      states: Array.from(stateIds),
    });
  }

  public clearStates(uri: string): void {
    this.documentStateIds.delete(uri);
    this.logger.state("Cleared states for document", { uri });
  }
}
