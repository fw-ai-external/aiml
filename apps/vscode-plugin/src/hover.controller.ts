import { Hover, type MarkdownString, type Position, Range, type TextDocument } from 'vscode';
import type { BaseLanguageClient } from 'vscode-languageclient';
import type { TextDocumentIdentifier } from 'vscode-languageserver-protocol';

/**
 * Client-side hover controller that bridges VSCode and the language server.
 * Handles conversion between VSCode types and LSP types, and communicates
 * with the language server via LSP protocol.
 */
export class HoverController {
  constructor(private client: BaseLanguageClient) {}

  /**
   * Gets hover information for a given position in a document.
   * @param document The VSCode document
   * @param position The position in the document
   * @returns Hover information or null if none available
   */
  public async getHover(document: TextDocument, position: Position): Promise<Hover | null> {
    // Convert VSCode document to LSP document identifier
    const documentIdentifier: TextDocumentIdentifier = {
      uri: document.uri.toString(),
    };

    // Convert VSCode position to offset
    const offset = document.offsetAt(position);

    try {
      interface HoverResponse {
        contents: string;
        range?: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      }

      const hoverResponse = await this.client.sendRequest<HoverResponse>('scxml.hoverRequest', {
        textDocument: documentIdentifier,
        position: offset,
      });

      if (!hoverResponse) {
        this.client.info('No hover information available');
        return null;
      }

      // Create hover content
      const content = {
        value: hoverResponse.contents,
        isTrusted: true,
      } as MarkdownString;

      // Convert LSP range to VSCode Range if present
      const range = hoverResponse.range
        ? new Range(
            hoverResponse.range.start.line,
            hoverResponse.range.start.character,
            hoverResponse.range.end.line,
            hoverResponse.range.end.character,
          )
        : undefined;

      return new Hover(content, range);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.client.error(`Error getting hover information: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.client.error(error.stack);
      }
      return null;
    }
  }
}
