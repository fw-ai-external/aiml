import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection } from "vscode-languageserver";
import { DebugLogger } from "../../vendor/utils/debug";
import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
// Define a simplified Token interface for testing
interface Token {
  index: number;
  type: string;
  startIndex: number;
  endIndex: number;
  text: string;
  raw: string;
}

// Mock the element-config module before importing HoverProvider
const mockElementConfig = {
  allElementConfigs: {
    state: {
      documentation: "State element documentation",
      propsSchema: {
        shape: {
          id: {
            type: "string",
            description: "State identifier",
            constructor: { name: "Object" },
          },
        },
      },
    },
  },
  isSupportedNodeName: (nodeName: string) => nodeName === "state",
};

// Mock the module using Bun's mocking capabilities
mock.module("@fireworks/element-config", () => mockElementConfig);

// Now import the HoverProvider
import { HoverProvider } from "./hover";

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
  completion: mock(() => {}),
};

// Mock the token-related functions
mock.module("../../vendor/acorn", () => ({
  parseToTokens: (content: string): Token[] => {
    // Simple mock implementation that returns tokens for state element
    if (content.includes("<state")) {
      return [
        {
          index: 0,
          type: "StartTag",
          startIndex: 0,
          endIndex: 1,
          text: "<",
          raw: "<",
        },
        {
          index: 1,
          type: "TagName",
          startIndex: 1,
          endIndex: 6,
          text: "state",
          raw: "state",
        },
        {
          index: 2,
          type: "Whitespace",
          startIndex: 6,
          endIndex: 7,
          text: " ",
          raw: " ",
        },
        {
          index: 3,
          type: "AttributeName",
          startIndex: 7,
          endIndex: 9,
          text: "id",
          raw: "id",
        },
      ];
    }
    return [];
  },
  buildActiveToken: (tokens: Token[], offset: number) => {
    // Find the token at the given offset
    const index = tokens.findIndex(
      (token) => token.startIndex <= offset && token.endIndex >= offset
    );

    return {
      token: index >= 0 ? tokens[index] : null,
      all: tokens,
      index,
    };
  },
  getOwnerTagName: (tokens: Token[], index: number) => {
    // Return the first TagName token
    return tokens.find((token) => token.type === "TagName") || null;
  },
  getOwnerAttributeName: (tokens: Token[], index: number) => {
    // Return the first AttributeName token
    return tokens.find((token) => token.type === "AttributeName") || null;
  },
}));

describe.skip("HoverProvider", () => {
  let provider: HoverProvider;
  let document: TextDocument;

  beforeEach(() => {
    mock.restore();
    // Create a new provider for each test
    provider = new HoverProvider(mockConnection, mockLogger);

    // Monkey patch the getElementConfig method to make it testable
    (provider as any).getElementConfigPublic = function (tagName: string) {
      return (this as any).getElementConfig(tagName);
    };
  });

  afterEach(() => {
    mock.restore();
  });

  // Just test the internal getElementConfig functionality first
  describe("getElementConfig", () => {
    it("should return element config for valid tag", () => {
      const result = (provider as any).getElementConfigPublic("state");
      expect(result).not.toBeNull();
      expect(result.documentation).toBe("State element documentation");
    });

    it("should return null for invalid tag", () => {
      const result = (provider as any).getElementConfigPublic("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getHover", () => {
    it("should provide hover information for elements", () => {
      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='idle'/>"
      );

      // Position over 'state' tag name (between index 1-6)
      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).not.toBeNull();
      expect(hover).not.toBeNull();
      if (hover) {
        expect(typeof hover.contents).toBe("object");
        // @ts-ignore - we know the structure
        expect(hover.contents.kind).toBe("markdown");
        // @ts-ignore - we know the structure
        expect(typeof hover.contents.value).toBe("string");
        // @ts-ignore - we know the structure
        expect(hover.contents.value.includes("**state**")).toBe(true);
      }
      // @ts-ignore - mock has been called
      expect(mockLogger.info.mock.calls.length).toBeGreaterThan(0);
    });

    it("should handle missing tokens", () => {
      const content = "";
      document = TextDocument.create("file:///test.xml", "xml", 1, content);
      const position = { line: 0, character: 0 };

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      // @ts-ignore - mock has been called
      expect(mockLogger.info.mock.calls.length).toBeGreaterThan(0);
    });

    it("should provide hover information for attributes", () => {
      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='test'/>"
      );

      // Position over 'id' attribute
      const position = document.positionAt(8); // Middle of 'id' token
      const hover = provider.getHover(document, position);

      expect(hover).not.toBeNull();
      expect(hover).not.toBeNull();
      if (hover) {
        expect(typeof hover.contents).toBe("object");
        // @ts-ignore - we know the structure
        expect(hover.contents.kind).toBe("markdown");
        // @ts-ignore - we know the structure
        expect(typeof hover.contents.value).toBe("string");
        // @ts-ignore - we know the structure
        expect(hover.contents.value.includes("**state.id**")).toBe(true);
      }
      // @ts-ignore - mock has been called
      expect(mockLogger.info.mock.calls.length).toBeGreaterThan(0);
    });

    it("should handle unknown elements", () => {
      document = TextDocument.create("test.aiml", "aiml", 1, "<unknown/>");

      // Position over 'unknown' tag name (between index 1-8)
      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      // Just check that the logger was called
      // @ts-ignore - mock has been called
      expect(mockLogger.info.mock.calls.length).toBeGreaterThan(0);
    });

    it("should handle errors in getElementConfig", () => {
      document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        "<state id='idle'/>"
      );

      // Mock the getElementConfig method to throw an error
      // Use any to access the private method
      (provider as any).getElementConfig = mock(() => {
        throw new Error("Test error in getElementConfig");
      });

      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      // Just check that the logger was called
      // @ts-ignore - mock has been called
      expect(mockLogger.error.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
