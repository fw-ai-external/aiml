import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, Connection } from "vscode-languageserver/node";

import { DebugLogger } from "../utils/debug";
import { Token, TokenType } from "../acorn";
import { getOwnerAttributeName, getOwnerTagName } from "../utils/token";
import { BaseElement } from "@fireworks/shared";
import { parseMDXToAIML } from "@fireworks/parser";

/**
 * Validates the document for errors and warnings.
 *
 * This is a multi-pass validator that ensures that once convered to BaseElement, the workflow tree is valid.
 * The issue here being that the workflow tree is not valid until it is built and the document might contain
 * only partial syntax as the user is typing the spec.
 *
 *
 */
export class DocumentValidator {
  private connection: Connection;
  private logger: DebugLogger;
  private stateIds: Set<string> = new Set();

  constructor(connection: Connection, logger: DebugLogger) {
    this.connection = connection;
    this.logger = logger;
  }

  private findStateIds(
    document: TextDocument,
    tokens: Token[],
    text: string
  ): Set<string> {
    const stateIds = new Set<string>();

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

    this.stateIds = stateIds;
    this.logger.validation("Found state IDs", {
      count: stateIds.size,
      ids: Array.from(stateIds),
    });

    return stateIds;
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

  async documentToElementTree(
    document: TextDocument,
    tokens: Token[]
  ): Promise<BaseElement> {
    const result = await parseMDXToAIML(document.getText());
    return result.nodes[0] as BaseElement;
  }

  /**
   * Ensures that elements are only used as children where the parent has defined that it is a supported child element.
   * If issues are found, send a diagnostic to the user.
   */
  private validateElementChildren(
    elementTree: BaseElement,
    stateIds: Set<string>
  ) {}

  /**
   * Ensures that elements have the correct attributes and that values are valid.
   * Do this using zod, and then errors should be cleaned up and formatted nicely for the user.
   * If issues are found, send a diagnostic to the user.
   */
  private validateElementAttributes(
    elementTree: BaseElement,
    stateIds: Set<string>
  ) {}
  /**
   * Ensures that state IDs are unique and that they are valid.
   * If issues are found, send a diagnostic to the user.
   */

  private validateStateIds(elementTree: BaseElement, stateIds: Set<string>) {}

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
    elementTree: BaseElement,
    stateIds: Set<string>
  ) {}

  /**
   * Ensures that there are no infinite loops without the possibility of a conditional transition to exit the loop
   * If issues are found, send a diagnostic to the user.
   */
  private validateForInfiniteLoops(
    elementTree: BaseElement,
    stateIds: Set<string>
  ) {}
}
