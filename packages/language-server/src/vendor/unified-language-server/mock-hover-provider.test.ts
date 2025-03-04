import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection } from "vscode-languageserver";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach, mock } from "bun:test";
import { MockHoverProvider } from "./mock-hover-provider";

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

describe("MockHoverProvider", () => {
  let provider: MockHoverProvider;
  let document: TextDocument;

  beforeEach(() => {
    mock.restore();
    // Create a new provider for each test
    provider = new MockHoverProvider(mockConnection, mockLogger);
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

      console.log("Element hover result:", hover);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state**"),
      });
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

      console.log("Attribute hover result:", hover);

      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: expect.stringContaining("**state.id**"),
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
  });
});
