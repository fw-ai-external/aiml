import { describe, expect, test } from "bun:test";
import { ElementBuilder } from "../utils/element-builder";
import { Project, SyntaxKind } from "ts-morph";
import type { ElementRole } from "@fireworks/types";

describe("ElementBuilder", () => {
  describe("determineRole", () => {
    const testCases: Array<{ tag: string; expected: ElementRole }> = [
      { tag: "State", expected: "state" },
      { tag: "Action", expected: "action" },
      { tag: "UserAction", expected: "action" },
      { tag: "UserInput", expected: "user-input" },
      { tag: "FormInput", expected: "user-input" },
      { tag: "ErrorState", expected: "error" },
      { tag: "ErrorBoundary", expected: "error" },
      { tag: "Output", expected: "output" },
      { tag: "DataOutput", expected: "output" },
      { tag: "CustomComponent", expected: "state" }, // default
    ];

    testCases.forEach(({ tag, expected }) => {
      test(`should determine role '${expected}' for tag '${tag}'`, () => {
        expect(ElementBuilder.determineRole(tag)).toBe(expected);
      });
    });
  });

  describe("parseAttributes", () => {
    test("should parse string attributes", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        '<div id="test" class="main" />'
      );
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      const attributes = element?.getAttributes() || [];

      const result = ElementBuilder.parseAttributes(attributes);
      expect(result).toEqual({
        id: "test",
        class: "main",
      });
    });

    test("should handle boolean attributes", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        "<input required disabled />"
      );
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      const attributes = element?.getAttributes() || [];

      const result = ElementBuilder.parseAttributes(attributes);
      expect(result).toEqual({
        required: "true",
        disabled: "true",
      });
    });

    test("should handle JSX expressions", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        '<div data={"value"} />'
      );
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      const attributes = element?.getAttributes() || [];

      const result = ElementBuilder.parseAttributes(attributes);
      expect(result).toEqual({
        data: "value",
      });
    });
  });

  describe("createBaseElement", () => {
    test("should create element with basic attributes", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        '<State id="test" />'
      );
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      if (!element) throw new Error("No element found");

      const attributes = {
        id: "test",
      };

      const result = ElementBuilder.createBaseElement(element, attributes);

      expect(result.id).toBe("test");
      expect(result.tag).toBe("State");
      expect(result.role).toBe("state");
      expect(result.children).toHaveLength(0);
    });

    test("should generate UUID for elements without ID", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile("test.tsx", "<Action />");
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      if (!element) throw new Error("No element found");

      const result = ElementBuilder.createBaseElement(element, {});

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(result.tag).toBe("Action");
      expect(result.role).toBe("action");
    });

    test("should handle children correctly", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        "<State><Action /></State>"
      );
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxElement
      );
      if (!element) throw new Error("No element found");

      const childElement = ElementBuilder.createBaseElement(
        element.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement)!,
        {}
      );

      const result = ElementBuilder.createBaseElement(element, {}, [
        childElement,
      ]);

      expect(result.children).toHaveLength(1);
      expect(result.children[0].tag).toBe("Action");
      expect(result.children[0].role).toBe("action");
    });
  });
});
