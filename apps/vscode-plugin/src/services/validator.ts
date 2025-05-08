import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Connection, Diagnostic } from 'vscode-languageserver/node';

import { parse } from '@aiml/parser';
import type { SerializedBaseElement } from '@aiml/shared';
import { type Token, TokenType } from '../acorn';
import type { DebugLogger } from '../utils/debug';
import { getOwnerAttributeName, getOwnerTagName } from '../utils/token';

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

  private findStateIds(document: TextDocument, tokens: Token[], text: string): Set<string> {
    const stateIds = new Set<string>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.AttributeString) {
        const attrNameToken = getOwnerAttributeName(tokens, i);
        const tagNameToken = getOwnerTagName(tokens, i);

        if (attrNameToken && tagNameToken) {
          const tagName = text.substring(tagNameToken.startIndex, tagNameToken.endIndex);
          const attrName = text.substring(attrNameToken.startIndex, attrNameToken.endIndex);
          const attrValue = text.substring(token.startIndex + 1, token.endIndex - 1);

          this.logger.validation('Processing token', {
            tagName,
            attrName,
            attrValue,
            tokenType: token.type,
          });

          if (tagName === 'state' && attrName === 'id') {
            this.logger.validation('Found state ID', { id: attrValue });
            stateIds.add(attrValue);
          }
        }
      }
    }

    this.stateIds = stateIds;
    this.logger.validation('Found state IDs', {
      count: stateIds.size,
      ids: Array.from(stateIds),
    });

    return stateIds;
  }

  public validateDocument(document: TextDocument, tokens: Token[]): Diagnostic[] {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];

    this.logger.validation('Starting document validation', {
      uri: document.uri,
      tokenCount: tokens.length,
    });

    // First pass: Find all state IDs, and save a map based on depth for later validation
    const stateIds = this.findStateIds(document, tokens, text);
    console.error('stateIds', stateIds);

    // Send diagnostics to VSCode
    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    this.logger.validation('Completed document validation', {
      uri: document.uri,
      diagnosticsCount: diagnostics.length,
      diagnostics: diagnostics.map((d) => d.message),
    });
    return diagnostics;
  }

  async documentToElementTree(document: TextDocument, tokens: Token[]): Promise<SerializedBaseElement> {
    const result = await parse(document.getText());
    return result.nodes[0] as SerializedBaseElement;
  }
}
