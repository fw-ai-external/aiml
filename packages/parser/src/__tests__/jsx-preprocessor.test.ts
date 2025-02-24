import { describe, expect, test } from "bun:test";
import { JSXPreprocessor } from "../utils/jsx-preprocessor";
import { JSXPreprocessError } from "../types";

describe("JSXPreprocessor", () => {
  describe("validateAndPreprocess", () => {
    test("should trim whitespace", () => {
      const input = "  <div></div>  ";
      expect(JSXPreprocessor.validateAndPreprocess(input)).toBe("<div></div>");
    });

    test("should throw error for non-JSX content", () => {
      const input = "Just some text";
      expect(() => JSXPreprocessor.validateAndPreprocess(input)).toThrow(
        JSXPreprocessError
      );
    });
  });

  describe("normalizeSyntax", () => {
    test("should close self-closing tags", () => {
      const input = "<input><br><img>";
      expect(JSXPreprocessor.normalizeSyntax(input)).toBe(
        "<input/><br/><img/>"
      );
    });

    test("should normalize whitespace between elements", () => {
      // Test empty elements
      expect(JSXPreprocessor.normalizeSyntax("<span>  </span>")).toBe(
        "<span>  </span>"
      );
      expect(JSXPreprocessor.normalizeSyntax("<span>\n</span>")).toBe(
        "<span>  </span>"
      );
      expect(JSXPreprocessor.normalizeSyntax("<span>    </span>")).toBe(
        "<span>  </span>"
      );

      // Test nested empty elements
      expect(
        JSXPreprocessor.normalizeSyntax(
          "<div>  \n  <span>  </span>  \n  </div>"
        )
      ).toBe("<div><span>  </span></div>");

      // Test elements with content
      expect(JSXPreprocessor.normalizeSyntax("<span>text</span>")).toBe(
        "<span>text</span>"
      );
      expect(JSXPreprocessor.normalizeSyntax("<span>  text  </span>")).toBe(
        "<span>text</span>"
      );
    });

    test("should not modify already valid JSX", () => {
      const input = "<div><input/></div>";
      expect(JSXPreprocessor.normalizeSyntax(input)).toBe(input);
    });
  });

  describe("createJSXRuntime", () => {
    test("should create valid JSX runtime code", () => {
      const runtime = JSXPreprocessor.createJSXRuntime();
      expect(runtime).toContain('const Fragment = { type: "Fragment" }');
      expect(runtime).toContain("function createElement(type, props)");
    });
  });

  describe("process", () => {
    test("should combine all preprocessing steps", () => {
      const input = "  <div>  <input>  </div>  ";
      const result = JSXPreprocessor.process(input);

      // Should contain runtime
      expect(result).toContain("createElement");
      expect(result).toContain("Fragment");

      // Should be preprocessed
      expect(result).toContain("<div><input/></div>");
    });

    test("should handle complex nested structures", () => {
      const input = `
        <div>
          <span>
            <input>
            <br>
          </span>
        </div>
      `;
      const result = JSXPreprocessor.process(input);
      expect(result).toContain("<div><span><input/><br/></span></div>");
    });

    test("should throw error for invalid input", () => {
      const input = "Not JSX";
      expect(() => JSXPreprocessor.process(input)).toThrow(JSXPreprocessError);
    });
  });
});
