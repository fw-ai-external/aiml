import { describe, expect, test } from "bun:test";
import { Project, SyntaxKind } from "ts-morph";
import { ElementBuilder } from "../utils/element-builder";

describe("ElementBuilder", () => {
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
      expect(result.tag).toBe("state");
      expect(result.type).toBe("state");
      expect(result.subType).toBe("other");
      expect(result.children).toHaveLength(0);
    });

    test("should generate UUID for elements without ID", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile("test.tsx", "<Assign />");
      const element = sourceFile.getFirstDescendantByKind(
        SyntaxKind.JsxSelfClosingElement
      );
      if (!element) throw new Error("No element found");

      const result = ElementBuilder.createBaseElement(element, {});

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(result.tag).toBe("assign");
      expect(result.type).toBe("action");
      expect(result.subType).toBeUndefined();
    });

    test("should handle children correctly", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipFileDependencyResolution: true,
      });

      const sourceFile = project.createSourceFile(
        "test.tsx",
        "<State><Assign /></State>"
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
      expect(result.children?.[0].tag).toBe("assign");
      expect(result.children?.[0].type).toBe("action");
      expect(result.children?.[0].subType).toBeUndefined();
    });
  });
});
