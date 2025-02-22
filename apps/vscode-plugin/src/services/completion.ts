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
import { allElementConfigs } from "@fireworks/element-config";
import { DebugLogger } from "../utils/debug";
import { parseToTokens, Token, TokenType } from "../acorn";

type StateTracker = any;
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
  ): {
    completions: CompletionItem[];
    type: "attribute_value" | "attribute_name" | "tag_name" | "none";
    context?: {
      tagName?: string;
      attributeName?: string;
      parentTagName?: string;
    };
  } {
    try {
      const content = document.getText();

      // Return empty completions for empty documents
      if (!content.trim()) {
        return { completions: [], type: "tag_name" };
      }

      const offset = document.offsetAt(position);
      const tokens = parseToTokens(content);
      if (tokens.length === 0) {
        return { completions: [], type: "tag_name" };
      }
      const tokenContext = buildActiveToken(tokens, offset);

      this.logger.completion("Getting completions", {
        offset,
        tokenContext: {
          token: tokenContext.token,
          prevToken: tokenContext.prevToken,
        },
      });

      // Get the current tag name
      const tagNameToken = getOwnerTagName(
        tokens,
        tokenContext.token?.index ?? tokens.length - 1
      );

      // First check for attribute value completions
      if (this.shouldProvideAttributeValueCompletions(tokenContext)) {
        this.logger.completion("Providing attribute value completions");
        if (tagNameToken) {
          const tagName = tagNameToken.text;
          const attributeValueCompletions = this.getAttributeValueCompletions(
            document,
            tagName,
            content,
            tokens,
            tokenContext.token?.index ?? tokens.length - 1
          );
          const attrNameToken = getOwnerAttributeName(
            tokens,
            tokenContext.token?.index ?? tokens.length - 1
          );
          const attrName = attrNameToken?.text;
          return {
            completions: attributeValueCompletions,
            type: "attribute_value",
            context: {
              tagName,
              attributeName: attrName,
            },
          };
        }
        return { completions: [], type: "attribute_value" };
      }

      // Then check for attribute completions
      if (
        tagNameToken &&
        this.shouldProvideAttributeCompletions(tokenContext)
      ) {
        const tagName = tagNameToken.text;
        this.logger.completion("Providing attribute completions", {
          tagName,
        });
        return {
          completions: this.getAttributeCompletions(tagName),
          type: "attribute_name",
          context: {
            tagName,
          },
        };
      }

      // Finally check for element completions
      if (this.shouldProvideElementCompletions(tokenContext)) {
        this.logger.completion("Providing element completions");
        // Get parent tag name for element completions
        const parentTagNameToken =
          tokens.length > 1
            ? getOwnerTagName(tokens, tokens.length - 2)
            : undefined;
        const parentTagName = parentTagNameToken?.text;

        return {
          completions: this.getElementCompletions(),
          type: "tag_name",
          context: {
            parentTagName,
          },
        };
      }

      // If we have no context or empty document, return empty completions with tag_name type
      return { completions: [], type: "tag_name" };
    } catch (error) {
      this.logger.error("Error getting completions", error as Error);
      return { completions: [], type: "tag_name" };
    }
  }

  private shouldProvideElementCompletions(tokenContext: IActiveToken): boolean {
    // Don't provide element completions if we're in an attribute value context
    if (
      tokenContext.prevToken?.type === TokenType.Equal ||
      tokenContext.token?.type === TokenType.AttributeExpression ||
      tokenContext.token?.type === TokenType.AttributeString
    ) {
      return false;
    }

    // Provide element completions after < or </
    return (
      tokenContext.prevToken?.type === TokenType.StartTag ||
      tokenContext.prevToken?.type === TokenType.StartEndTag ||
      false
    );
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
    // Provide attribute completions after tag name or when inside an attribute name
    if (
      tokenContext.token?.type === TokenType.Whitespace &&
      tokenContext.prevToken?.type === TokenType.TagName
    ) {
      return true;
    }

    if (
      tokenContext.token?.type === TokenType.Name ||
      tokenContext.token?.type === TokenType.AttributeName
    ) {
      return true;
    }

    return false;
  }

  private getAttributeCompletions(tagName: string): CompletionItem[] {
    this.logger.completion("Providing attribute completions", { tagName });
    const elementConfig =
      allElementConfigs[tagName as keyof typeof allElementConfigs];
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

    // We should provide completions if:
    // 1. We're in a string attribute value
    // 2. We're in a JSX expression
    // 3. We just typed =
    const shouldProvide =
      tokenContext.token?.type === TokenType.AttributeString ||
      tokenContext.token?.type === TokenType.AttributeExpression ||
      tokenContext.prevToken.type === TokenType.Equal;

    this.logger.completion("Should provide attribute value completions", {
      tokenType: tokenContext.token?.type,
      prevTokenType: tokenContext.prevToken.type,
      shouldProvide,
    });

    return shouldProvide;
  }

  private getAttributeValueCompletions(
    document: TextDocument,
    tagName: string,
    content: string,
    tokens: Token[],
    currentIndex: number
  ): CompletionItem[] {
    // For attribute values, we need to look back from the current token
    const attrNameToken = getOwnerAttributeName(tokens, currentIndex);
    this.logger.completion("Looking for attribute name token", {
      currentIndex,
      attrNameToken,
      tokens: tokens.map((t) => ({ type: t.type, text: t.text })),
    });
    if (!attrNameToken) {
      this.logger.completion("No attribute name token found", { currentIndex });
      return [];
    }

    const attrName = attrNameToken.text;

    const elementConfig =
      allElementConfigs[tagName as keyof typeof allElementConfigs];
    if (!elementConfig) {
      this.logger.completion("No element config found", { tagName });
      return [];
    }

    const schema = elementConfig.propsSchema.shape[attrName];
    if (!schema) {
      this.logger.completion("No schema found", { attrName });
      return [];
    }

    this.logger.completion("Found schema", {
      tagName,
      attrName,
      typeName: schema._def?.typeName,
      values: schema._def?.values,
    });

    // Handle transition target attribute first
    if (tagName === "transition" && attrName === "target") {
      const stateIds = this.stateTracker.getStatesForDocument(document.uri);
      return Array.from(stateIds).map((id) => ({
        label: id,
        kind: CompletionItemKind.Reference,
        documentation: `Reference to state with id="${id}"`,
      })) as CompletionItem[];
    }

    // For boolean attributes
    if (schema._def?.typeName === "ZodBoolean") {
      return [
        { label: "true", kind: CompletionItemKind.Value },
        { label: "false", kind: CompletionItemKind.Value },
      ];
    }

    // For enum attributes
    if (schema._def?.typeName === "ZodEnum") {
      const values = schema._def?.values || [];
      return values.map((value: string) => ({
        label: value,
        kind: CompletionItemKind.Property,
        documentation: `Valid value for ${attrName}`,
      }));
    }

    return [];
  }
}
