import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  Position,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  buildActiveToken,
  getOwnerAttributeName,
  IActiveToken,
  getOwnerTagName,
} from "../utils/token";
import { allElementConfigs } from "@workflow/element-types";
import { z } from "zod";
import { DebugLogger } from "../utils/debug";
import { StateTracker } from "./stateTracker";
import { parseToTokens, Token, TokenType } from "../acorn";

export class CompletionProvider {
  private connection: Connection;
  private logger: DebugLogger;
  private stateTracker: StateTracker;

  constructor(
    connection: Connection,
    logger: DebugLogger,
    stateTracker: StateTracker
  ) {
    this.connection = connection;
    this.logger = logger;
    this.stateTracker = stateTracker;
  }

  public getCompletions(
    document: TextDocument,
    position: Position
  ): CompletionItem[] {
    try {
      const offset = document.offsetAt(position);
      const content = document.getText();
      const tokens = parseToTokens(content);
      const tokenContext = buildActiveToken(tokens, offset);

      this.logger.completion("Getting completions", {
        offset,
        tokenContext: {
          token: tokenContext.token,
          prevToken: tokenContext.prevToken,
        },
      });

      // Check completion context
      if (this.shouldProvideElementCompletions(tokenContext)) {
        this.logger.completion("Providing element completions");
        return this.getElementCompletions();
      }

      // Get the current tag name
      const tagNameToken = getOwnerTagName(
        tokens,
        tokenContext.token?.index ?? tokens.length - 1
      );

      // If we have a tag name, check for attribute completions
      if (tagNameToken) {
        const tagName = content.substring(
          tagNameToken.startIndex,
          tagNameToken.endIndex
        );

        if (this.shouldProvideAttributeValueCompletions(tokenContext)) {
          this.logger.completion("Providing attribute value completions");
          return this.getAttributeValueCompletions(
            document,
            tagName,
            content,
            tokens,
            tokenContext.token?.index ?? tokens.length - 1
          );
        }

        if (this.shouldProvideAttributeCompletions(tokenContext)) {
          this.logger.completion("Providing attribute completions", {
            tagName,
          });
          return this.getAttributeCompletions(tagName);
        }
      }

      // If no tag name or not providing attribute completions, check for element completions
      if (this.shouldProvideElementCompletions(tokenContext)) {
        this.logger.completion("Providing element completions");
        return this.getElementCompletions();
      }

      return [];
    } catch (error) {
      this.logger.error("Error getting completions", error as Error);
      return [];
    }
  }

  private shouldProvideElementCompletions(tokenContext: IActiveToken): boolean {
    if (!tokenContext.token) {
      return true;
    }

    if (tokenContext.token.type === TokenType.Name) {
      return true;
    }

    if (tokenContext.prevToken) {
      return (
        tokenContext.prevToken.type === TokenType.StartTag ||
        tokenContext.prevToken.type === TokenType.StartEndTag ||
        tokenContext.prevToken.type === TokenType.None
      );
    }

    return true;
  }

  private getElementCompletions(): CompletionItem[] {
    this.logger.completion("Providing element completions");
    return Object.entries(allElementConfigs).map(([name, config]) => ({
      label: name,
      kind: CompletionItemKind.Class,
      documentation: config.documentation || `${name} element`,
    }));
  }

  private shouldProvideAttributeCompletions(
    tokenContext: IActiveToken
  ): boolean {
    if (tokenContext.prevToken) {
      if (
        tokenContext.prevToken.type === TokenType.TagName ||
        tokenContext.prevToken.type === TokenType.Whitespace
      ) {
        this.logger.completion("Providing attribute name completions");

        return true;
      }
    }

    if (tokenContext.token) {
      return tokenContext.token.type === TokenType.Name;
    }

    return false;
  }

  private getAttributeCompletions(tagName: string): CompletionItem[] {
    this.logger.completion("Providing attribute completions", { tagName });
    const elementConfig = allElementConfigs[tagName];
    if (!elementConfig) {
      return [];
    }

    return Object.keys(elementConfig.propsSchema.shape).map((attr) => ({
      label: attr,
      kind: CompletionItemKind.Property,
      documentation: `Attribute for ${tagName} element`,
    }));
  }

  private shouldProvideAttributeValueCompletions(
    tokenContext: IActiveToken
  ): boolean {
    this.logger.completion(
      "Checking if should provide attribute value completions",
      {
        token: tokenContext.token,
        prevToken: tokenContext.prevToken,
      }
    );

    if (!tokenContext.prevToken) {
      return false;
    }

    // Handle both standard = and JSX { cases
    if (tokenContext.prevToken.type === TokenType.Equal) {
      return true;
    }

    // For JSX style, check if we're right after the {
    if (tokenContext.token?.type === TokenType.AttributeValue) {
      return true;
    }

    return false;
  }

  private getAttributeValueCompletions(
    document: TextDocument,
    tagName: string,
    content: string,
    tokens: Token[],
    currentIndex: number
  ): CompletionItem[] {
    const attrNameToken = getOwnerAttributeName(tokens, currentIndex);
    if (!attrNameToken) {
      return [];
    }

    const attrName = content.substring(
      attrNameToken.startIndex,
      attrNameToken.endIndex
    );

    const elementConfig = allElementConfigs[tagName];
    if (!elementConfig) {
      return [];
    }

    const schema = elementConfig.propsSchema.shape[attrName];
    if (!schema) {
      return [];
    }

    // Handle transition target attribute
    if (tagName === "transition" && attrName === "target") {
      const stateIds = this.stateTracker.getStatesForDocument(document.uri);
      return Array.from(stateIds).map((id) => ({
        label: id,
        kind: CompletionItemKind.Reference,
        documentation: `Reference to state with id="${id}"`,
      }));
    }

    // For boolean attributes
    if (schema instanceof z.ZodBoolean) {
      return [
        { label: "true", kind: CompletionItemKind.Value },
        { label: "false", kind: CompletionItemKind.Value },
      ];
    }

    // For enum attributes
    if (schema._def?.typeName === "ZodEnum") {
      return schema._def.values.map((value: string) => ({
        label: value,
        kind: CompletionItemKind.Property,
        documentation: `Valid value for ${attrName}`,
      }));
    }

    return [];
  }
}
