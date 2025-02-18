import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Diagnostic,
  DiagnosticSeverity,
  Connection,
} from "vscode-languageserver/node";
import {
  Token,
  TokenType,
  getOwnerAttributeName,
  getOwnerTagName,
} from "../token";
import { allElementConfigs } from "@workflow/element-types";
import { z } from "zod";
import { DebugLogger } from "../utils/debug";
import { StateTracker } from "./stateTracker";

export class DocumentValidator {
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

  public validateDocument(document: TextDocument, tokens: Token[]): void {
    const text = document.getText();
    const diagnostics: Diagnostic[] = [];

    this.logger.validation("Starting document validation", {
      uri: document.uri,
    });

    // Track state IDs for the document
    this.stateTracker.trackStates(document, tokens, text);

    // Validate elements and attributes
    this.validateElements(document, tokens, text, diagnostics);

    // Send diagnostics to VSCode
    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    this.logger.validation("Completed document validation", {
      uri: document.uri,
      diagnosticsCount: diagnostics.length,
    });
  }

  private validateElements(
    document: TextDocument,
    tokens: Token[],
    text: string,
    diagnostics: Diagnostic[]
  ): void {
    const elementAttributes = new Map<number, Set<string>>();
    let currentElementStart = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case TokenType.StartTag:
          currentElementStart = i;
          elementAttributes.set(currentElementStart, new Set());
          break;

        case TokenType.EndTag:
        case TokenType.SimpleEndTag:
          currentElementStart = -1;
          break;

        case TokenType.AttributeName:
          this.validateAttribute(
            document,
            token,
            text,
            currentElementStart,
            elementAttributes,
            diagnostics
          );
          break;

        case TokenType.String:
          this.validateAttributeValue(
            document,
            token,
            tokens,
            i,
            text,
            diagnostics
          );
          break;
      }
    }
  }

  private validateAttribute(
    document: TextDocument,
    token: Token,
    text: string,
    currentElementStart: number,
    elementAttributes: Map<number, Set<string>>,
    diagnostics: Diagnostic[]
  ): void {
    if (currentElementStart !== -1) {
      const seenAttributes = elementAttributes.get(currentElementStart);
      const attrName = text.substring(token.startIndex, token.endIndex);

      if (seenAttributes?.has(attrName)) {
        this.logger.validation("Found duplicate attribute", { attrName });
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: document.positionAt(token.startIndex),
            end: document.positionAt(token.endIndex),
          },
          message: `Duplicate attribute '${attrName}' found. Attributes can only appear once per element.`,
          source: "scxml-validator",
        });
      } else {
        seenAttributes?.add(attrName);
      }
    }
  }

  private validateAttributeValue(
    document: TextDocument,
    token: Token,
    tokens: Token[],
    tokenIndex: number,
    text: string,
    diagnostics: Diagnostic[]
  ): void {
    const attrNameToken = getOwnerAttributeName(tokens, tokenIndex);
    const tagNameToken = getOwnerTagName(tokens, tokenIndex);

    if (!attrNameToken || !tagNameToken) {
      return;
    }

    const tagName = text.substring(
      tagNameToken.startIndex,
      tagNameToken.endIndex
    );
    const attrName = text.substring(
      attrNameToken.startIndex,
      attrNameToken.endIndex
    );
    const attrValue = text.substring(token.startIndex + 1, token.endIndex - 1);

    this.logger.validation("Validating attribute value", {
      tagName,
      attrName,
      attrValue,
    });

    const elementConfig = allElementConfigs[tagName];
    if (!elementConfig?.propsSchema.shape[attrName]) {
      return;
    }

    try {
      this.validateAttributeValueByType(
        tagName,
        attrName,
        attrValue,
        elementConfig.propsSchema.shape[attrName]
      );
    } catch (error) {
      this.logger.validation("Attribute validation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(token.startIndex),
          end: document.positionAt(token.endIndex),
        },
        message: `Invalid value for attribute '${attrName}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        source: "scxml-validator",
      });
    }
  }

  private validateAttributeValueByType(
    tagName: string,
    attrName: string,
    attrValue: string,
    schema: z.ZodTypeAny
  ): void {
    if (tagName === "transition" && attrName === "target") {
      const stateIds = this.stateTracker.getStatesForDocument(tagName);
      if (!stateIds.has(attrValue)) {
        throw new Error(
          `Target state '${attrValue}' not found. Available states: ${Array.from(
            stateIds
          ).join(", ")}`
        );
      }
    } else if (schema instanceof z.ZodEnum) {
      if (!schema._def.values.includes(attrValue)) {
        throw new Error(
          `Value must be one of: ${schema._def.values.join(", ")}`
        );
      }
    } else if (schema instanceof z.ZodBoolean) {
      if (attrValue !== "true" && attrValue !== "false") {
        throw new Error("Value must be 'true' or 'false'");
      }
    } else if (schema instanceof z.ZodString) {
      schema.parse(attrValue);
    }
  }
}
