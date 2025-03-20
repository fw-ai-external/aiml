import { describe, expect, it, mock } from "bun:test";
import {
  generateElementHover,
  generateAttributeHover,
  getTextFromToken,
} from "./hover-utils";
import { Token, TokenType } from "../acorn";

// Create a mock logger
const mockLogger = {
  info: mock(() => {}),
  error: mock(() => {}),
  token: mock(() => {}),
  validation: mock(() => {}),
  completion: mock(() => {}),
  state: mock(() => {}),
};

describe.skip("hover-utils", () => {
  describe("generateElementHover", () => {
    it("should generate markdown hover content for an element", () => {
      // Arrange
      const tagName = "state";
      const elementConfig = {
        documentation: "State element documentation",
        propsSchema: { shape: {} },
      };
      const range = {
        start: { line: 0, character: 1 },
        end: { line: 0, character: 6 },
      };

      // Act
      const hover = generateElementHover(
        tagName,
        elementConfig,
        range,
        mockLogger
      );

      // Assert
      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: "**state**\n\nState element documentation",
      });
      expect(hover?.range).toBe(range);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generating hover for element: state"
      );
    });

    it("should use tag name as fallback when documentation is missing", () => {
      // Arrange
      const tagName = "state";
      const elementConfig = {
        documentation: "",
        propsSchema: { shape: {} },
      };
      const range = {
        start: { line: 0, character: 1 },
        end: { line: 0, character: 6 },
      };

      // Act
      const hover = generateElementHover(
        tagName,
        elementConfig,
        range,
        mockLogger
      );

      // Assert
      expect(hover).not.toBeNull();
      expect(hover?.contents).toEqual({
        kind: "markdown",
        value: "**state**\n\nstate element",
      });
    });
  });

  describe.skip("generateAttributeHover", () => {
    it.skip("should generate markdown hover content for an attribute", () => {
      // Arrange
      const tagName = "state";
      const attrName = "id";
      const elementConfig = {
        documentation: "State element documentation",
        propsSchema: { shape: {} },
      };
      const schema = {
        type: "string",
        description: "State identifier",
        constructor: { name: "Object" },
      };
      const range = {
        start: { line: 0, character: 7 },
        end: { line: 0, character: 9 },
      };

      // Act
      const hover = generateAttributeHover(
        tagName,
        attrName,
        elementConfig,
        schema,
        range,
        mockLogger
      );

      // Assert
      expect(hover).not.toBeNull();
      if (
        hover &&
        typeof hover.contents === "object" &&
        "kind" in hover.contents
      ) {
        expect(hover.contents.kind).toBe("markdown");
        expect(hover.contents.value).toContain("**state.id**");
        expect(hover.contents.value).toContain("State element documentation");
        expect(hover.contents.value).toContain("Attribute type: Object");
      }
      expect(hover?.range).toBe(range);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generating hover for attribute: state.id"
      );
    });

    it("should return null for missing schema", () => {
      // Arrange
      const tagName = "state";
      const attrName = "unknown";
      const elementConfig = {
        documentation: "State element documentation",
        propsSchema: { shape: {} },
      };
      const schema = null;
      const range = {
        start: { line: 0, character: 7 },
        end: { line: 0, character: 9 },
      };

      // Act
      const hover = generateAttributeHover(
        tagName,
        attrName,
        elementConfig,
        schema,
        range,
        mockLogger
      );

      // Assert
      expect(hover).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "No schema found for attribute: unknown"
      );
    });

    it("should handle missing constructor safely", () => {
      // Arrange
      const tagName = "state";
      const attrName = "id";
      const elementConfig = {
        documentation: "State element documentation",
        propsSchema: { shape: {} },
      };
      const schema = {
        type: "string",
        description: "State identifier",
        // No constructor property
      };
      const range = {
        start: { line: 0, character: 7 },
        end: { line: 0, character: 9 },
      };

      // Act
      const hover = generateAttributeHover(
        tagName,
        attrName,
        elementConfig,
        schema,
        range,
        mockLogger
      );

      // Assert
      expect(hover).not.toBeNull();
      if (
        hover &&
        typeof hover.contents === "object" &&
        "kind" in hover.contents
      ) {
        expect(hover.contents.value).toContain("Attribute type: Object");
      }
    });
  });

  describe("getTextFromToken", () => {
    it("should extract text from document content using token bounds", () => {
      // Arrange
      const content = "<state id='test'/>";
      const mockToken = {
        type: TokenType.TagName,
        startIndex: 1,
        endIndex: 6,
        text: "state",
        index: 0,
        raw: "state",
      } as unknown as Token;

      // Act
      const text = getTextFromToken(content, mockToken);

      // Assert
      expect(text).toBe("state");
    });

    it("should handle errors gracefully", () => {
      // Arrange - create an invalid token
      const content = "<state id='test'/>";
      const mockToken = {
        type: TokenType.TagName,
        startIndex: -1, // Invalid index
        endIndex: 50, // Out of bounds
        text: "state",
        index: 0,
        raw: "state",
      } as unknown as Token;

      // Spy on console.error
      const originalConsoleError = console.error;
      console.error = mock(() => {});

      try {
        // Act
        const text = getTextFromToken(content, mockToken);

        // Assert
        expect(text).toBe("");
        expect(console.error).toHaveBeenCalled();
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });
  });
});
