import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";

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
  token: mock(() => {}),
  validation: mock(() => {}),
  completion: mock(() => {}),
  state: mock(() => {}),
};

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
  describe.skip("getElementConfig", () => {
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
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state**"),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle missing tokens", () => {
      const content = "";
      document = TextDocument.create("file:///test.xml", "xml", 1, content);
      const position = { line: 0, character: 0 };

      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalled();
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
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state.id**"),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle unknown elements", () => {
      document = TextDocument.create("test.aiml", "aiml", 1, "<unknown/>");

      // Position over 'unknown' tag name (between index 1-8)
      const position = document.positionAt(3);
      const hover = provider.getHover(document, position);

      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("No element config found for tag")
      );
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
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error providing hover information")
      );
    });
  });
});
