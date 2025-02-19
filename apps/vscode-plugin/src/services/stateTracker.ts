import { TextDocument } from "vscode-languageserver-textdocument";
import { DebugLogger } from "../utils/debug";
import { Token } from "../acorn";
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
    const { stateIds } = this.stateCollector.collect({
      document,
      content: document.getText(),
      tokens,
    });
    this.documentStateIds.set(document.uri, stateIds);
  }

  public clearStates(uri: string): void {
    this.documentStateIds.delete(uri);
  }
}
