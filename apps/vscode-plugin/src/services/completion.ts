import {
  CompletionItem,
  CompletionItemKind,
  Connection,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Token,
  TokenType,
  buildActiveToken,
  getOwnerAttributeName,
  IActiveToken,
} from "../token";
import { allElementConfigs } from "@workflow/element-types";
import { z } from "zod";
import { DebugLogger } from "../utils/debug";
import { StateTracker } from "./stateTracker";

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
    position: { line: number; character: number }
  ): CompletionItem[] {
    const offset = document.offsetAt(position);
    const content = document.getText();
    console.log("Content", content);
    const token = buildActiveToken(this.connection, document, content, offset);

    this.logger.completion("Getting completions", {
      uri: document.uri,
      offset,
      tokenType: token.token ? TokenType[token.token.type] : "none",
    });

    if (this.shouldProvideElementCompletions(token)) {
      console.log("Providing element completions");
      return this.getElementCompletions();
    }

    const tagName = this.getContextTagName(token, content);
    console.log("Tag name", tagName);
    if (!tagName) {
      return [];
    }

    if (this.shouldProvideAttributeCompletions(token)) {
      console.log("Providing attribute completions", { tagName });
      return this.getAttributeCompletions(tagName);
    }

    if (this.shouldProvideAttributeValueCompletions(token)) {
      return this.getAttributeValueCompletions(
        document,
        tagName,
        content,
        token.all,
        token.index
      );
    }

    return [];
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
        tokenContext.prevToken.type === TokenType.StartEndTag
      );
    }

    return false;
  }

  private getElementCompletions(): CompletionItem[] {
    this.logger.completion("Providing element completions");
    return Object.entries(allElementConfigs).map(([name, config]) => ({
      label: name,
      kind: CompletionItemKind.Constructor,
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
    this.logger.completion("Providing attribute value completions");

    if (!tokenContext.prevToken) {
      return false;
    }
    return tokenContext.prevToken.type === TokenType.Equal;
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

    this.logger.completion("Providing attribute value completions", {
      tagName,
      attrName,
    });

    // Special handling for transition target
    if (tagName === "transition" && attrName === "target") {
      const stateIds = this.stateTracker.getStatesForDocument(document.uri);
      return Array.from(stateIds).map((id) => ({
        label: id,
        kind: CompletionItemKind.Reference,
        documentation: `Reference to state with id="${id}"`,
      }));
    }

    // Handle other attribute types
    const elementConfig = allElementConfigs[tagName];
    if (!elementConfig) {
      return [];
    }

    const schema = elementConfig.propsSchema.shape[attrName];
    if (!schema) {
      return [];
    }

    if (schema instanceof z.ZodEnum) {
      return schema._def.values.map((value: string) => ({
        label: value,
        kind: CompletionItemKind.EnumMember,
        documentation: `Valid value for ${attrName}`,
      }));
    }

    if (schema instanceof z.ZodBoolean) {
      return [
        { label: "true", kind: CompletionItemKind.Value },
        { label: "false", kind: CompletionItemKind.Value },
      ];
    }

    return [];
  }

  private getContextTagName(
    tokenContext: IActiveToken,
    content: string
  ): string {
    /* the token context for... `<llm responseFormat="`
    {
  all: [
    {
      index: 0,
      type: 10,
      startIndex: 0,
      endIndex: 1,
    }, {
      index: 1,
      type: 6,
      startIndex: 1,
      endIndex: 6,
    }, {
      index: 2,
      type: 2,
      startIndex: 6,
      endIndex: 7,
    }, {
      index: 3,
      type: 7,
      startIndex: 7,
      endIndex: 9,
    }, {
      index: 4,
      type: 14,
      startIndex: 9,
      endIndex: 10,
    }, {
      index: 5,
      type: 1,
      startIndex: 10,
      endIndex: 11,
    }, {
      index: 6,
      type: 5,
      startIndex: 11,
      endIndex: 15,
    }, {
      index: 7,
      type: 1,
      startIndex: 15,
      endIndex: 16,
    }, {
      index: 8,
      type: 11,
      startIndex: 16,
      endIndex: 18,
    }
  ],
  index: 0,
  activeEndToken: undefined,
  prevToken: undefined,
  token: {
    index: 0,
    type: 10,
    startIndex: 0,
    endIndex: 1,
  }
    */
    // in this case, the returned value should be `llm`
    console.log("Token context", content);
    for (let i = tokenContext.index; i >= 0; i--) {
      const t = tokenContext.all[i];
      if (t.type === TokenType.TagName) {
        return content.substring(t.startIndex, t.endIndex);
      }
    }
    return "";
  }
}
