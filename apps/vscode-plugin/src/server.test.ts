import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  Position,
} from "vscode-languageserver/node";
import {
  buildActiveToken,
  TokenType,
  getOwnerAttributeName,
  getOwnerTagName,
} from "./token";
import { allElementConfigs } from "@workflow/element-types";
import { z } from "zod";

// Mock the connection with required methods
const mockConnection: Connection = {
  console: { log: () => {} },
  listen: () => {},
  onRequest: () => () => {},
  sendRequest: () => Promise.resolve(null),
  onNotification: () => () => {},
  sendNotification: () => {},
  onProgress: () => () => {},
  sendProgress: () => {},
  onInitialize: () => () => {},
  onInitialized: () => () => {},
  onDidChangeConfiguration: () => () => {},
  onDidChangeWatchedFiles: () => () => {},
  onCompletion: () => () => {},
  onCompletionResolve: () => () => {},
  onHover: () => () => {},
  workspace: {
    getConfiguration: () => Promise.resolve({}),
  },
  client: {
    register: () => Promise.resolve(),
  },
  sendDiagnostics: () => {},
} as unknown as Connection;

// Helper to create a text document with content
function createTextDocument(content: string): TextDocument {
  return TextDocument.create("file:///test.scxml", "scxml", 1, content);
}

// Helper to get completion items at a specific position
async function getCompletionsAt(content: string, position: Position) {
  const doc = createTextDocument(content);
  const offset = doc.offsetAt(position);
  const token = buildActiveToken(mockConnection, doc, content, offset);

  // Get the tag name if we're inside an element
  let tagName = "";
  for (let i = token.index; i >= 0; i--) {
    const t = token.all[i];
    if (t.type === TokenType.TagName) {
      tagName = content.substring(t.startIndex, t.endIndex);
      break;
    }
  }

  // Element completions
  if (
    !token.token ||
    token.token.type === TokenType.Name ||
    token.prevToken?.type === TokenType.StartTag ||
    token.prevToken?.type === TokenType.StartEndTag
  ) {
    return Object.entries(allElementConfigs).map(([name, config]) => ({
      label: name,
      kind: CompletionItemKind.Class,
      documentation: config.documentation || `${name} element`,
    }));
  }

  // Attribute completions
  if (tagName && token.prevToken?.type === TokenType.Whitespace) {
    const elementConfig = allElementConfigs[tagName];
    if (elementConfig) {
      return Object.keys(elementConfig.propsSchema.shape).map((attr) => ({
        label: attr,
        kind: CompletionItemKind.Property,
        documentation: `Attribute for ${tagName} element`,
      }));
    }
  }

  // Attribute value completions
  if (token.prevToken?.type === TokenType.Equal) {
    const attrNameToken = token.all
      .slice(0, token.index)
      .reverse()
      .find((t) => t.type === TokenType.AttributeName);

    if (attrNameToken) {
      const attrName = content.substring(
        attrNameToken.startIndex,
        attrNameToken.endIndex
      );
      const elementConfig = allElementConfigs[tagName];

      if (elementConfig) {
        const schema = elementConfig.propsSchema.shape[attrName];

        // Special handling for transition target
        if (tagName === "transition" && attrName === "target") {
          // Find all state IDs in the document
          const stateIds = new Set<string>();
          for (let i = 0; i < token.all.length; i++) {
            const t = token.all[i];
            if (t.type === TokenType.String) {
              const attrNameToken = getOwnerAttributeName(token.all, i);
              const tagNameToken = getOwnerTagName(token.all, i);

              if (attrNameToken && tagNameToken) {
                const tagName = content.substring(
                  tagNameToken.startIndex,
                  tagNameToken.endIndex
                );
                const attrName = content.substring(
                  attrNameToken.startIndex,
                  attrNameToken.endIndex
                );
                const attrValue = content.substring(
                  t.startIndex + 1,
                  t.endIndex - 1
                );

                if (tagName === "state" && attrName === "id") {
                  stateIds.add(attrValue);
                }
              }
            }
          }
          return Array.from(stateIds).map((id) => ({
            label: id,
            kind: CompletionItemKind.Reference,
            documentation: `Reference to state with id="${id}"`,
          }));
        }

        // Handle other attribute types
        if (schema) {
          if (schema instanceof z.ZodEnum) {
            return schema._def.values.map((value: string) => ({
              label: value,
              kind: CompletionItemKind.EnumMember,
              documentation: `Valid value for ${attrName}`,
            }));
          } else if (schema instanceof z.ZodBoolean) {
            return [
              { label: "true", kind: CompletionItemKind.Value },
              { label: "false", kind: CompletionItemKind.Value },
            ];
          }
        }
      }
    }
  }

  return [];
}

// Helper to validate a document
async function validateDocument(content: string) {
  const doc = createTextDocument(content);
  const diagnostics: any[] = [];

  // Simulate the validation logic
  const tokens = buildActiveToken(mockConnection, doc, content, 0).all;
  const stateIds = new Set<string>();

  // Track element boundaries and attributes
  let currentElement: {
    tagName: string;
    attributes: Set<string>;
    start: number;
  } | null = null;

  // Process tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Handle element start
    if (
      token.type === TokenType.TagName &&
      tokens[i - 1]?.type === TokenType.StartTag
    ) {
      const tagName = content.substring(token.startIndex, token.endIndex);
      currentElement = {
        tagName,
        attributes: new Set(),
        start: i,
      };
    }
    // Handle element end
    else if (
      token.type === TokenType.SimpleEndTag ||
      token.type === TokenType.EndTag
    ) {
      currentElement = null;
    }
    // Handle attributes
    else if (token.type === TokenType.AttributeName && currentElement) {
      const attrName = content.substring(token.startIndex, token.endIndex);
      if (currentElement.attributes.has(attrName)) {
        diagnostics.push({
          message: `Duplicate attribute '${attrName}' found. Attributes can only appear once per element.`,
          range: {
            start: doc.positionAt(token.startIndex),
            end: doc.positionAt(token.endIndex),
          },
        });
      }
      currentElement.attributes.add(attrName);
    }
    // Handle attribute values
    else if (token.type === TokenType.String) {
      const attrNameToken = getOwnerAttributeName(tokens, i);
      const tagNameToken = getOwnerTagName(tokens, i);

      if (attrNameToken && tagNameToken) {
        const tagName = content.substring(
          tagNameToken.startIndex,
          tagNameToken.endIndex
        );
        const attrName = content.substring(
          attrNameToken.startIndex,
          attrNameToken.endIndex
        );
        const attrValue = content.substring(
          token.startIndex + 1,
          token.endIndex - 1
        );

        if (tagName === "state" && attrName === "id") {
          stateIds.add(attrValue);
        }

        // Look up the element config and schema
        const elementConfig = allElementConfigs[tagName];
        if (elementConfig?.propsSchema.shape[attrName]) {
          const schema = elementConfig.propsSchema.shape[attrName];

          try {
            // Special handling for transition target
            if (tagName === "transition" && attrName === "target") {
              if (!stateIds.has(attrValue)) {
                throw new Error(
                  `Target state '${attrValue}' not found. Available states: ${Array.from(stateIds).join(", ")}`
                );
              }
            }
            // Validate enum values
            else if (schema instanceof z.ZodEnum) {
              if (!schema._def.values.includes(attrValue)) {
                throw new Error(
                  `Value must be one of: ${schema._def.values.join(", ")}`
                );
              }
            }
            // Validate boolean values
            else if (schema instanceof z.ZodBoolean) {
              if (attrValue !== "true" && attrValue !== "false") {
                throw new Error("Value must be 'true' or 'false'");
              }
            }
            // Validate string values
            else if (schema instanceof z.ZodString) {
              schema.parse(attrValue);
            }
          } catch (error) {
            diagnostics.push({
              message: `Invalid value for attribute '${attrName}': ${error instanceof Error ? error.message : "Unknown error"}`,
              range: {
                start: doc.positionAt(token.startIndex),
                end: doc.positionAt(token.endIndex),
              },
            });
          }
        }
      }
    }
  }

  return diagnostics;
}

describe("SCXML Language Server", () => {
  describe("Autocompletion", () => {
    it("suggests elements after <", async () => {
      const content = "<";
      const completions = await getCompletionsAt(content, {
        line: 0,
        character: 1,
      } as Position);

      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some((c: CompletionItem) => c.label === "state")).toBe(
        true
      );
      expect(
        completions.some((c: CompletionItem) => c.label === "transition")
      ).toBe(true);
      expect(completions[0].kind).toBe(CompletionItemKind.Class);
    });

    it("suggests elements while typing element name", async () => {
      const content = "<sta";
      const completions = await getCompletionsAt(content, {
        line: 0,
        character: 4,
      } as Position);

      expect(completions.some((c: CompletionItem) => c.label === "state")).toBe(
        true
      );
      expect(completions[0].kind).toBe(CompletionItemKind.Class);
    });

    it("suggests attributes for state element", async () => {
      const content = "<state ";
      const completions = await getCompletionsAt(content, {
        line: 0,
        character: 7,
      } as Position);

      expect(completions.some((c: CompletionItem) => c.label === "id")).toBe(
        true
      );
      expect(completions[0].kind).toBe(CompletionItemKind.Property);
    });

    it("suggests state IDs for transition target", async () => {
      const content = `<state id="idle"/><transition target=`;
      const completions = await getCompletionsAt(content, {
        line: 0,
        character: 37,
      } as Position);

      expect(completions.some((c: CompletionItem) => c.label === "idle")).toBe(
        true
      );
      expect(completions[0].kind).toBe(CompletionItemKind.Reference);
    });

    it("suggests initial attribute value", async () => {
      const content = "<state initial=";
      const completions = await getCompletionsAt(content, {
        line: 0,
        character: 15,
      } as Position);

      expect(completions.length).toBeGreaterThan(0);
      expect(completions[0].kind).toBe(CompletionItemKind.EnumMember);
    });
  });

  describe("Validation", () => {
    it("detects invalid transition targets", async () => {
      const content = '<state id="idle"/><transition target="nonexistent"/>';
      const diagnostics = await validateDocument(content);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain(
        "Target state 'nonexistent' not found"
      );
    });

    it("detects duplicate attributes", async () => {
      const content = '<state id="idle" id="busy"/>';
      const diagnostics = await validateDocument(content);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain("Duplicate attribute");
    });

    it("validates string values", async () => {
      const content = '<state initial="123" />';
      const diagnostics = await validateDocument(content);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain("Invalid value for attribute");
    });
  });
});
