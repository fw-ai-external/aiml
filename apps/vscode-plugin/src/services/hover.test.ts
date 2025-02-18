import { TextDocument } from "vscode-languageserver-textdocument";
import { HoverProvider } from "./hover";
import { TokenType } from "../token";
import { Connection } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, mock } from "bun:test";

// Mock token utilities
const mockBuildActiveToken = mock(() => ({
  token: { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
  prevToken: {
    type: TokenType.StartTag,
    startIndex: 0,
    endIndex: 1,
    index: 0,
  },
  all: [
    { type: TokenType.StartTag, startIndex: 0, endIndex: 1, index: 0 },
    { type: TokenType.TagName, startIndex: 1, endIndex: 6, index: 1 },
  ],
  index: 1,
}));

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

mock.module("../../token", () => ({
  TokenType,
  buildActiveToken: mockBuildActiveToken,
  getOwnerAttributeName: mock(() => null),
  getOwnerTagName: mock(() => ({
    type: TokenType.TagName,
    startIndex: 1,
    endIndex: 6,
    index: 1,
  })),
}));

// Mock element configs
mock.module("@workflow/element-types", () => ({
  allElementConfigs: {
    state: {
      documentation: "State element documentation",
      propsSchema: {
        shape: {
          id: {
            constructor: { name: "ZodString" },
          },
        },
      },
    },
  },
}));

describe("HoverProvider", () => {
  let provider: HoverProvider;
  let document: TextDocument;

  beforeEach(() => {
    provider = new HoverProvider(mockConnection, mockLogger);
    document = TextDocument.create(
      "test.aiml",
      "aiml",
      1,
      "<state id='idle'/>"
    );
    mock.restore();
  });

  describe("getHover", () => {
    it("should provide hover information for elements", () => {
      const position = { line: 0, character: 3 };
      const hover = provider.getHover(document, position);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state**"),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should provide hover information for attributes", () => {
      const position = { line: 0, character: 8 };

      // Mock attribute token
      mock.module("../../token", () => ({
        TokenType,
        buildActiveToken: mockBuildActiveToken,
        getOwnerAttributeName: mock(() => ({
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 9,
          index: 2,
        })),
        getOwnerTagName: mock(() => ({
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 6,
          index: 1,
        })),
      }));

      const hover = provider.getHover(document, position);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state.id**"),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle missing tokens", () => {
      const position = { line: 0, character: 0 };

      // Mock no token
      mock.module("../../token", () => ({
        TokenType,
        buildActiveToken: mock(() => ({
          token: undefined,
          prevToken: undefined,
          all: [],
          index: -1,
        })),
        getOwnerAttributeName: mock(() => null),
        getOwnerTagName: mock(() => null),
      }));

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "No token found at position"
      );
    });

    it("should handle unknown elements", () => {
      const position = { line: 0, character: 3 };

      // Mock unknown element
      mock.module("@workflow/element-types", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: { shape: {} },
          },
        },
      }));

      // Mock tag name token for unknown element
      mock.module("../../token", () => ({
        TokenType,
        buildActiveToken: mockBuildActiveToken,
        getOwnerAttributeName: mock(() => null),
        getOwnerTagName: mock(() => ({
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 8,
          index: 1,
        })),
      }));

      document = TextDocument.create("test.aiml", "aiml", 1, "<unknown/>");

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No element config found for tag")
      );
    });

    it("should handle errors gracefully", () => {
      const position = { line: 0, character: 3 };

      // Mock error in buildActiveToken
      mock.module("../../token", () => ({
        TokenType,
        buildActiveToken: mock(() => {
          throw new Error("Test error");
        }),
        getOwnerAttributeName: mock(() => null),
        getOwnerTagName: mock(() => null),
      }));

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error providing hover information")
      );
    });

    it("should handle unknown attributes", () => {
      const position = { line: 0, character: 8 };

      // Mock unknown attribute
      mock.module("../../token", () => ({
        TokenType,
        buildActiveToken: mockBuildActiveToken,
        getOwnerAttributeName: mock(() => ({
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 9,
          index: 2,
        })),
        getOwnerTagName: mock(() => ({
          type: TokenType.TagName,
          startIndex: 1,
          endIndex: 6,
          index: 1,
        })),
      }));

      mock.module("@workflow/element-types", () => ({
        allElementConfigs: {
          state: {
            documentation: "State element documentation",
            propsSchema: {
              shape: {},
            },
          },
        },
      }));

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No schema found for attribute")
      );
    });
  });
});
