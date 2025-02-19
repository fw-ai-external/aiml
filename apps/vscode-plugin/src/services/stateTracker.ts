import { TextDocument } from "vscode-languageserver-textdocument";
import { DebugLogger } from "../utils/debug";
import { Token, TokenType } from "../acorn";
import { StateCollector } from "../validation/stateCollector";

export class StateTracker {
  private documentStateIds: Map<string, Set<string>> = new Map();
  private stateCollector: StateCollector;

  constructor(private logger: DebugLogger) {
    this.stateCollector = new StateCollector(logger);
  }

  public getStatesForDocument(uri: string): Set<string> {
    return this.documentStateIds.get(uri) || new Set<string>();
  }

  public trackStates(document: TextDocument, tokens: Token[]): void {
    this.logger.state("Starting state tracking for document", {
      uri: document.uri,
      content: document.getText(),
    });

    const stateIds = new Set<string>();
    // Log all attribute name tokens
    tokens.forEach((token, index) => {
      if (token.type === TokenType.AttributeName) {
        this.logger.state("Found AttributeName token", {
          text: token.text,
          position: token.startIndex,
          index,
        });
      }
    });

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
