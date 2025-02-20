import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, Connection } from "vscode-languageserver/node";

import { DebugLogger } from "../utils/debug";
import { Token, TokenType } from "../acorn";
import { getOwnerAttributeName, getOwnerTagName } from "../utils/token";
import { DotObject } from "../utils/object";

export class DocumentValidator {
  private connection: Connection;
  private logger: DebugLogger;

  private stateIds = new DotObject({});

  constructor(connection: Connection, logger: DebugLogger) {
    this.connection = connection;
    this.logger = logger;
  }

  private findStateIds(
    document: TextDocument,
    tokens: Token[],
    text: string
  ): Set<string> {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.AttributeString) {
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

          this.logger.validation("Processing token", {
            tagName,
            attrName,
            attrValue,
            tokenType: token.type,
          });

          if (tagName === "state" && attrName === "id") {
            this.logger.validation("Found state ID", { id: attrValue });
            stateIds.add(attrValue);
          }
        }
      }
    }

    this.logger.validation("Found state IDs", {
      count: this.stateIds.size,
      ids: Array.from(this.stateIds.get("")),
    });

    return this.stateIds;
  }

  public validateDocument(
    document: TextDocument,
    tokens: Token[]
  ): Diagnostic[] {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];

    this.logger.validation("Starting document validation", {
      uri: document.uri,
      tokenCount: tokens.length,
    });

    // First pass: Find all state IDs, and save a map based on depth for later validation
    const stateIds = this.findStateIds(document, tokens, text);
    console.error("stateIds", stateIds);

    // Send diagnostics to VSCode
    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    this.logger.validation("Completed document validation", {
      uri: document.uri,
      diagnosticsCount: diagnostics.length,
      diagnostics: diagnostics.map((d) => d.message),
    });
    return diagnostics;
  }

  /**
   * Ensures that elements are only used as children where the parent has defined that it is a supported child element.
   * If issues are found, send a diagnostic to the user.
   */
  private validateElementChildren(
    document: TextDocument,
    tokens: Token[],
    text: string,
    stateIds: Set<string>
  ) {}

  /**
   * Ensures that elements have the correct attributes and that values are valid.
   * Do this using zod, and then errors should be cleaned up and formatted nicely for the user.
   * If issues are found, send a diagnostic to the user.
   */
  private validateElementAttributes(
    document: TextDocument,
    tokens: Token[],
    text: string,
    stateIds: Set<string>
  ) {}
  /**
   * Ensures that state IDs are unique and that they are valid.
   * If issues are found, send a diagnostic to the user.
   */

  private validateStateIds(
    document: TextDocument,
    tokens: Token[],
    text: string,
    stateIds: Set<string>
  ) {}

  /**
   * Ensures that transition IDs are unique and that they are valid.
   * Invalid means any of the following:
   * - that the transition ID is a state ID that does not exist
   * - that the transition ID is the grandchild or great grandchild of the current state
   * - that the transition ID is the child of a sibling of the current state,
   * - that the transition ID is the child of a sibling to an ancestor of the current state
   * - that the transition ID is the current state
   * - that the transition ID is the child of a parallel element
   *
   * If issues are found, send a diagnostic to the user.
   */
  private validateTransitionIds(
    document: TextDocument,
    tokens: Token[],
    text: string,
    stateIds: Set<string>
  ) {}

  /**
   * Ensures that there are no infinite loops without the possibility of a conditional transition to exit the loop
   * If issues are found, send a diagnostic to the user.
   */
  private validateForInfiniteLoops(
    document: TextDocument,
    tokens: Token[],
    text: string,
    stateIds: Set<string>
  ) {}
}
