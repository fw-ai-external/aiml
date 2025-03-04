import { Connection, Hover } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  generateElementHover,
  generateAttributeHover,
  getTextFromToken,
} from "./hover-utils";

// Import element config at the end to make mocking easier
let elementConfigModule: any;
try {
  elementConfigModule = require("@fireworks/element-config");
} catch (error) {
  console.error("Error loading element-config module:", error);
  elementConfigModule = {
    allElementConfigs: {},
  };
}

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
   * Get the element config for a specific tag name
   * Isolates the element-config dependency to make it easier to mock
   */
  private getElementConfig(tagName: string) {
    try {
      const { allElementConfigs } = elementConfigModule;
      return allElementConfigs[tagName as keyof typeof allElementConfigs];
    } catch (error) {
      this.logger.error(
        `Error getting element config for ${tagName}: ${error}`
      );
      return null;
    }
  }

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
      const tokens = parseToTokens(content);
      const token = buildActiveToken(tokens, offset);

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

      const tagName = getTextFromToken(content, tagNameToken);
      const elementConfig = this.getElementConfig(tagName);

      if (!elementConfig) {
        this.logger.info(`No element config found for tag: ${tagName}`);
        return null;
      }

      this.logger.info(`Found element config for hover - tagName: ${tagName}`);

      // Document position range for hover
      const range = {
        start: document.positionAt(token.token.startIndex),
        end: document.positionAt(token.token.endIndex),
      };

      // If hovering over an attribute
      if (attrNameToken) {
        const attrName = getTextFromToken(content, attrNameToken);
        const schema = elementConfig.propsSchema.shape[attrName];

        return generateAttributeHover(
          tagName,
          attrName,
          elementConfig,
          schema,
          {
            start: document.positionAt(attrNameToken.startIndex),
            end: document.positionAt(attrNameToken.endIndex),
          },
          this.logger
        );
      }

      // If hovering over the element name
      return generateElementHover(
        tagName,
        elementConfig,
        {
          start: document.positionAt(tagNameToken.startIndex),
          end: document.positionAt(tagNameToken.endIndex),
        },
        this.logger
      );
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
