import { TextDocument } from "vscode-languageserver-textdocument";
import { HoverProvider } from "./hover";
import { Connection } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import { TokenType, parseToTokens } from "../acorn";
import { buildActiveToken, getOwnerAttributeName } from "../utils/token";

// Mock dependencies
const mockConnection = {
  console: {
    log: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
    info: mock(() => {}),
  },
} as unknown as Connection;

const mockLogger: DebugLogger = {
  info: mock(() => {}),
  error: mock(() => {}),
  token: mock(() => {}),
  validation: mock(() => {}),
  completion: mock(() => {}),
  state: mock(() => {}),
};

describe("HoverProvider", () => {
  let provider: HoverProvider;
  let document: TextDocument;

  beforeEach(() => {
    mock.restore();
    // Create a new provider for each test
    provider = new HoverProvider(mockConnection, mockLogger);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("getHover", () => {
    it("should provide hover information for elements", () => {
      // Set up element types mock
      mock.module("@fireworks/element-config", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: { shape: {} },
          },
        },
      }));

      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='idle'/>"
      );

      // Position over 'state' tag name (between index 1-6)
      const position = document.positionAt(3);
      // Debug token positions
      const content = document.getText();
      const tokens = parseToTokens(content);
      console.log(
        "Tokens:",
        tokens.map((t) => ({
          type: TokenType[t.type],
          text: t.text,
          start: t.startIndex,
          end: t.endIndex,
        }))
      );

      const hover = provider.getHover(document, position);
      console.log("Hover result:", hover);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state**"),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should provide hover information for attributes", () => {
      mock.module("@fireworks/element-config", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: {
              shape: {
                id: {
                  type: "string",
                  description: "State identifier (unique within a workflow)",
                },
              },
            },
          },
        },
      }));

      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='test'/>"
      );

      // Position over 'id' attribute
      const position = document.positionAt(8); // Middle of 'id' token
      // Debug token positions
      const content = document.getText();
      const tokens = parseToTokens(content);
      console.log(
        "Tokens for attribute test:",
        tokens.map((t) => ({
          type: TokenType[t.type],
          text: t.text,
          start: t.startIndex,
          end: t.endIndex,
        }))
      );

      // Debug active token
      const activeToken = buildActiveToken(tokens, 8);
      console.log("Active token:", {
        index: activeToken.index,
        token: activeToken.token
          ? {
              type: TokenType[activeToken.token.type],
              text: activeToken.token.text,
              start: activeToken.token.startIndex,
              end: activeToken.token.endIndex,
            }
          : null,
      });

      // Debug attribute token
      const attrToken = getOwnerAttributeName(tokens, activeToken.index);
      console.log(
        "Attribute token:",
        attrToken
          ? {
              type: TokenType[attrToken.type],
              text: attrToken.text,
              start: attrToken.startIndex,
              end: attrToken.endIndex,
            }
          : null
      );

      const hover = provider.getHover(document, position);
      console.log("Hover result for attribute:", hover);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: `**state.id**\n\nState element documentation\n\nAttribute type: Object`,
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle missing tokens", () => {
      document = TextDocument.create("test.aiml", "aiml", 1, "");
      const position = { line: 0, character: 0 };
      // Debug token positions
      const content = document.getText();
      const tokens = parseToTokens(content);
      console.log(
        "Tokens:",
        tokens.map((t) => ({
          type: TokenType[t.type],
          text: t.text,
          start: t.startIndex,
          end: t.endIndex,
        }))
      );

      const hover = provider.getHover(document, position);
      console.log("Hover result:", hover);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "No token found at position"
      );
    });

    it("should handle unknown elements", () => {
      mock.module("@fireworks/element-config", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: { shape: {} },
          },
        },
      }));

      document = TextDocument.create("test.aiml", "aiml", 1, "<unknown/>");

      // Position over 'unknown' tag name (between index 1-8)
      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No element config found for tag")
      );
    });

    it("should handle errors gracefully", () => {
      mock.module("@fireworks/element-config", () => ({
        get allElementConfigs() {
          throw new Error("Test error");
        },
      }));

      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='idle'/>"
      );

      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error providing hover information")
      );
    });

    it("should handle unknown attributes", () => {
      mock.module("@fireworks/element-config", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: {
              shape: {}, // Empty shape means no known attributes
            },
          },
        },
      }));

      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state unknown='value'/>"
      );

      // Position over 'unknown' attribute
      const position = document.positionAt(8); // Middle of attribute name
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No schema found for attribute")
      );
    });
  });
});
