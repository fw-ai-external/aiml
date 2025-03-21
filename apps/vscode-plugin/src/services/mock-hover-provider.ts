import type { Connection, Hover } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parseToTokens } from '../acorn';
import type { DebugLogger } from '../utils/debug';
import { buildActiveToken, getOwnerAttributeName, getOwnerTagName } from '../utils/token';

/**
 * Mock implementation of the hover provider for testing.
 * This version doesn't depend on the element-config module.
 */
export class MockHoverProvider {
  private mockElementConfigs = {
    state: {
      documentation: 'State element documentation',
      propsSchema: {
        shape: {
          id: {
            type: 'string',
            description: 'State identifier (unique within a workflow)',
            constructor: { name: 'Object' },
          },
        },
      },
    },
  };

  constructor(
    private connection: Connection,
    private logger: DebugLogger,
  ) {}

  /**
   * Gets hover information for a given position in a document.
   * @param document The LSP text document
   * @param position The position in the document
   * @returns Hover information or null if none available
   */
  public getHover(document: TextDocument, position: { line: number; character: number }): Hover | null {
    try {
      const offset = document.offsetAt(position);
      const content = document.getText();
      const tokens = parseToTokens(content);
      const token = buildActiveToken(tokens, offset);

      this.logger.info(
        `Processing hover request - uri: ${document.uri}, offset: ${offset}, position: ${JSON.stringify(position)}`,
      );

      if (!token.token) {
        this.logger.info('No token found at position');
        return null;
      }

      // Get element and attribute info
      const tagNameToken = getOwnerTagName(token.all, token.index);
      const attrNameToken = getOwnerAttributeName(token.all, token.index);

      if (!tagNameToken) {
        this.logger.info('No tag name found at position');
        return null;
      }

      const tagName = content.substring(tagNameToken.startIndex, tagNameToken.endIndex);
      const elementConfig = this.mockElementConfigs[tagName as keyof typeof this.mockElementConfigs];

      if (!elementConfig) {
        this.logger.info(`No element config found for tag: ${tagName}`);
        return null;
      }

      this.logger.info(`Found element config for hover - tagName: ${tagName}`);

      // If hovering over an attribute
      if (attrNameToken) {
        const attrName = content.substring(attrNameToken.startIndex, attrNameToken.endIndex);
        const schema = elementConfig.propsSchema.shape[attrName as keyof typeof elementConfig.propsSchema.shape];

        if (schema) {
          this.logger.info(`Found attribute schema for hover - attrName: ${attrName}`);
          return {
            contents: {
              kind: 'markdown',
              value: `**${tagName}.${attrName}**\n\n${elementConfig.documentation || ''}\n\nAttribute type: ${schema.constructor.name}`,
            },
            range: {
              start: document.positionAt(attrNameToken.startIndex),
              end: document.positionAt(attrNameToken.endIndex),
            },
          };
        }

        this.logger.info(`No schema found for attribute: ${attrName}`);
        return null;
      }

      // If hovering over the element name
      return {
        contents: {
          kind: 'markdown',
          value: `**${tagName}**\n\n${elementConfig.documentation || `${tagName} element`}`,
        },
        range: {
          start: document.positionAt(tagNameToken.startIndex),
          end: document.positionAt(tagNameToken.endIndex),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error providing hover information: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
      return null;
    }
  }
}
