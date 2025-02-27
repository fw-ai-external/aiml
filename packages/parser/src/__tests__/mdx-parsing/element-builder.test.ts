import { describe, it, expect } from "bun:test";
import { ElementBuilder } from "../../utils/element-builder";

describe("ElementBuilder", () => {
  describe("determineRole", () => {
    it("should determine role based on tag name", () => {
      expect(ElementBuilder.determineRole("action")).toBe("action");
      expect(ElementBuilder.determineRole("userAction")).toBe("action");
      expect(ElementBuilder.determineRole("input")).toBe("user-input");
      expect(ElementBuilder.determineRole("userInput")).toBe("user-input");
      expect(ElementBuilder.determineRole("error")).toBe("error");
      expect(ElementBuilder.determineRole("errorHandler")).toBe("error");
      expect(ElementBuilder.determineRole("output")).toBe("output");
      expect(ElementBuilder.determineRole("dataOutput")).toBe("output");

      // Default role is "state"
      expect(ElementBuilder.determineRole("workflow")).toBe("state");
      expect(ElementBuilder.determineRole("state")).toBe("state");
      expect(ElementBuilder.determineRole("customTag")).toBe("state");
    });
  });

  describe("Integration with tag handling", () => {
    it("should handle custom tag names", () => {
      const customTags = [
        "customTag",
        "invalidElement",
        "notDefined",
        "randomTag",
        "htmlTag",
      ];

      // All custom tags should get a role (default to "state")
      for (const tag of customTags) {
        const role = ElementBuilder.determineRole(tag);
        expect(role).toBe("state");
      }
    });
  });
});
