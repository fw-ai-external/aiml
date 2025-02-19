import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Diagnostic,
  DiagnosticSeverity,
  Connection,
} from "vscode-languageserver/node";

import { allElementConfigs } from "@workflow/element-types";
import { z } from "zod";
import { DebugLogger } from "../utils/debug";
import { StateTracker } from "./stateTracker";
import { Token, TokenType } from "../acorn";
import { getOwnerAttributeName, getOwnerTagName } from "../utils/token";

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

  private findStateIds(
    document: TextDocument,
    tokens: Token[],
    text: string
  ): Set<string> {
    const stateIds = new Set<string>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.String) {
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

    // First pass: Find all state IDs
    const stateIds = this.findStateIds(document, tokens, text);
    this.stateTracker.trackStates(document, tokens);

    // Second pass: Validate elements and attributes
    this.validateElements(document, tokens, text, diagnostics, stateIds);

    // Send diagnostics to VSCode
    this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
    this.logger.validation("Completed document validation", {
      uri: document.uri,
      diagnosticsCount: diagnostics.length,
      diagnostics: diagnostics.map((d) => d.message),
    });
    return diagnostics;
  }

  private validateElements(
    document: TextDocument,
    tokens: Token[],
    text: string,
    diagnostics: Diagnostic[],
    stateIds: Set<string>
  ): void {
    this.logger.validation("Starting element validation", {
      tokenCount: tokens.length,
      stateIds: Array.from(stateIds),
    });

    const elementAttributes = new Map<number, Map<string, Token>>();
    let currentElementStart = -1;
    let currentTagName = "";

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case TokenType.StartTag:
          currentElementStart = i;
          elementAttributes.set(currentElementStart, new Map());
          break;

        case TokenType.TagName:
          if (currentElementStart !== -1) {
            currentTagName = text.substring(token.startIndex, token.endIndex);
            this.logger.validation("Processing element", {
              tagName: currentTagName,
            });
          }
          break;

        case TokenType.EndTag:
        case TokenType.SimpleEndTag:
          if (currentElementStart !== -1) {
            this.validateRequiredAttributes(
              document,
              currentTagName,
              elementAttributes.get(currentElementStart) || new Map(),
              diagnostics
            );
          }
          currentElementStart = -1;
          currentTagName = "";
          break;

        case TokenType.AttributeName:
          if (currentElementStart !== -1) {
            const attrName = token.text;
            this.logger.validation("Processing attribute", {
              tagName: currentTagName,
              attrName,
            });
            this.validateAttribute(
              document,
              token,
              text,
              currentTagName,
              elementAttributes.get(currentElementStart) || new Map(),
              diagnostics
            );
          }
          break;

        case TokenType.String:
          const attrNameToken = getOwnerAttributeName(tokens, i);
          const attrName = attrNameToken
            ? text.substring(attrNameToken.startIndex, attrNameToken.endIndex)
            : "";
          const attrValue = text.substring(
            token.startIndex + 1,
            token.endIndex - 1
          );

          this.logger.validation("Processing attribute value", {
            tagName: currentTagName,
            attrName,
            attrValue,
            stateIds: Array.from(stateIds),
          });

          this.validateAttributeValue(
            document,
            token,
            tokens,
            i,
            text,
            diagnostics,
            stateIds
          );
          break;
      }
    }

    this.logger.validation("Completed element validation", {
      diagnosticCount: diagnostics.length,
      diagnostics: diagnostics.map((d) => d.message),
    });
  }

  private validateRequiredAttributes(
    document: TextDocument,
    tagName: string,
    attributes: Map<string, Token>,
    diagnostics: Diagnostic[]
  ): void {
    const elementConfig = allElementConfigs[tagName];
    if (!elementConfig?.propsSchema) {
      return;
    }

    const schema = elementConfig.propsSchema;
    if (!(schema instanceof z.ZodObject)) {
      return;
    }

    const shape = schema.shape as { [key: string]: z.ZodTypeAny };
    for (const [attrName, attrSchema] of Object.entries(shape)) {
      if (!attrSchema.isOptional() && !attributes.has(attrName)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: document.positionAt(0),
            end: document.positionAt(0),
          },
          message: `Required attribute '${attrName}' is missing`,
          source: "scxml-validator",
        });
      }
    }
  }

  private validateAttribute(
    document: TextDocument,
    token: Token,
    text: string,
    tagName: string,
    attributes: Map<string, Token>,
    diagnostics: Diagnostic[]
  ): void {
    const attrName = token.text;

    // Check for duplicate attributes
    if (attributes.has(attrName)) {
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
      return;
    }

    // Check for unknown attributes
    const elementConfig = allElementConfigs[tagName];
    if (elementConfig?.propsSchema instanceof z.ZodObject) {
      const shape = elementConfig.propsSchema.shape as {
        [key: string]: z.ZodTypeAny;
      };
      if (!Object.keys(shape).includes(attrName)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: document.positionAt(token.startIndex),
            end: document.positionAt(token.endIndex),
          },
          message: `Unknown attribute '${attrName}' for element '${tagName}'`,
          source: "scxml-validator",
        });
        return;
      }
    }

    attributes.set(attrName, token);
  }

  private validateAttributeValue(
    document: TextDocument,
    token: Token,
    tokens: Token[],
    tokenIndex: number,
    text: string,
    diagnostics: Diagnostic[],
    stateIds: Set<string>
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
    if (
      !elementConfig?.propsSchema ||
      !(elementConfig.propsSchema instanceof z.ZodObject)
    ) {
      return;
    }

    const schema = elementConfig.propsSchema.shape[attrName];
    if (!schema) {
      return;
    }

    try {
      this.validateAttributeValueByType(
        document,
        tagName,
        attrName,
        attrValue,
        schema,
        stateIds
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.validation("Attribute validation failed", {
        error: errorMessage,
      });

      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(token.startIndex),
          end: document.positionAt(token.endIndex),
        },
        message: `Invalid value for attribute '${attrName}': ${errorMessage}`,
        source: "scxml-validator",
      });
    }
  }

  private validateAttributeValueByType(
    document: TextDocument,
    tagName: string,
    attrName: string,
    attrValue: string,
    schema: z.ZodTypeAny,
    stateIds: Set<string>
  ): void {
    this.logger.validation("Validating attribute value", {
      tagName,
      attrName,
      attrValue,
      schemaType: schema.constructor.name,
    });

    try {
      // First validate against the schema
      schema.parse(attrValue);

      // Then check for transition target
      if (tagName === "transition" && attrName === "target") {
        const trackedStates = this.stateTracker.getStatesForDocument(
          document.uri
        );
        const allStates = new Set([...stateIds, ...trackedStates]);

        this.logger.validation("Available states", {
          stateIds: Array.from(stateIds),
          trackedStates: Array.from(trackedStates),
          allStates: Array.from(allStates),
        });

        if (!allStates.has(attrValue)) {
          this.logger.validation("Invalid transition target", {
            target: attrValue,
            availableStates: Array.from(allStates),
          });
          throw new Error(
            `Target state '${attrValue}' not found. Available states: ${Array.from(
              allStates
            ).join(", ")}`
          );
        }
      }
    } catch (error) {
      this.logger.validation("Validation error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
