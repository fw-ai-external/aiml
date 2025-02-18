import { Connection, Hover } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DebugLogger } from "../utils/debug";
import {
  buildActiveToken,
  getOwnerAttributeName,
  getOwnerTagName,
} from "../token";
import { allElementConfigs } from "@workflow/element-types";

/**
 * Server-side hover provider that generates hover content for SCXML elements.
 * Works with LSP types and provides hover information for elements and attributes.
 */
export class HoverProvider {
  constructor(
    private connection: Connection,
    private logger: DebugLogger
  ) {}

  /**
   * Gets hover information for a given position in a document.
   * @param document The LSP text document
   * @param position The position in the document
   * @returns Hover information or null if none available
   */
  public getHover(
    document: TextDocument,
    position: { line: number; character: number }
  ): Hover | null {
    try {
      const offset = document.offsetAt(position);
      const content = document.getText();
      const token = buildActiveToken(
        this.connection,
        document,
        content,
        offset
      );

      this.logger.info(
        `Processing hover request - uri: ${document.uri}, offset: ${offset}, position: ${JSON.stringify(position)}`
      );

      if (!token.token) {
        this.logger.info("No token found at position");
        return null;
      }

      // Get element and attribute info
      const tagNameToken = getOwnerTagName(token.all, token.index);
      const attrNameToken = getOwnerAttributeName(token.all, token.index);

      if (!tagNameToken) {
        this.logger.info("No tag name found at position");
        return null;
      }

      const tagName = content.substring(
        tagNameToken.startIndex,
        tagNameToken.endIndex
      );
      const elementConfig = allElementConfigs[tagName];

      if (!elementConfig) {
        this.logger.info(`No element config found for tag: ${tagName}`);
        return null;
      }

      this.logger.info(`Found element config for hover - tagName: ${tagName}`);

      // If hovering over an attribute
      if (attrNameToken) {
        const attrName = content.substring(
          attrNameToken.startIndex,
          attrNameToken.endIndex
        );
        const schema = elementConfig.propsSchema.shape[attrName];

        if (schema) {
          this.logger.info(
            `Found attribute schema for hover - attrName: ${attrName}`
          );
          return {
            contents: {
              kind: "markdown",
              value: `**${tagName}.${attrName}**\n\n${elementConfig.documentation || ""}\n\nAttribute type: ${schema.constructor.name}`,
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
          kind: "markdown",
          value: `**${tagName}**\n\n${elementConfig.documentation || `${tagName} element`}`,
        },
        range: {
          start: document.positionAt(tagNameToken.startIndex),
          end: document.positionAt(tagNameToken.endIndex),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error providing hover information: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
      return null;
    }
  }
}
