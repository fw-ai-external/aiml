import { describe, expect, test } from "bun:test";
import { valideCodeStringExpressions } from "./codeString";

describe("valideCodeStringExpressions - template strings", () => {
  const templateStringTestCases: Array<[string, boolean]> = [
    ["${chatHistory.map(msg => msg.content)}", true],
    ["${chatHistory.map((msg) => msg.content)}", true],
    ["${input}", true],
    ["${input.foo.bar}", true],
    ["${input + 5}", true],
    ["${a && b}", false], // fails because neither 'a' nor 'b' are in ALLOWED_VARS
    ["${input && chatHistory}", true],
    ["${foo ? bar : baz}", false], // fails because no allowed vars
    ["${input.toString()}", true],
    ['${input.toString() || "default"}', true],
    ['${input.toString() + "default"} and ${input.toString()}', true],
    ['${eval("alert(1)"))}', false],
    ["${function() { return evil; }}", false],
    ["${msg => { return evil; }}", false],
    ["${window.location}", false],
    ["${input; output}", false],
    ["${/* comment */input}", true],
    ['${input.foo["bar"]}', true],
    ['${input.foo["bar"]["baz"]}', true],
    ["${input += 5}", true],
    ["${new Date()}", true],
    ['${new String("test")}', true],
    ["${new Number(123)}", true],
    ["${new Boolean(true)}", true],
    ["${new Object()}", true],
    ["${new Array([])}", true],
    ["${new Error()}", false], // not in allowed constructors
    ["${process.env}", false],
    ["${`template`}", false], // should have at least one allowed var
    ['${console.log("hello")}', false],
    ['${console.log("hello")}', false],
    ['console.log("hello")', true], // looks like code, but is just a string
  ];
  test.each(templateStringTestCases)(
    "should %s template: %s",
    (template, expected) => {
      if (expected === false) {
        // strings are error messages
        expect(
          typeof valideCodeStringExpressions(
            template,
            new Set(["input", "chatHistory"])
          )
        ).toBe("string");
      } else {
        expect(
          valideCodeStringExpressions(
            template,
            new Set(["input", "chatHistory"])
          )
        ).toBe(true);
      }
    }
  );
});

describe("valideCodeStringExpressions - code strings", () => {
  const codeStringTestCases: Array<[string, boolean]> = [
    ['console.log("hello")', false],
    ['console.log("hello")', false],
    ['${"console.log("hello")"}', false], // should be false, but is true because it's a template string that is not wrapped in ${...}
    ["input", true],
    [
      `input.map(i => {
      return i + 1;
    })`,
      true,
    ],
  ];
  test.each(codeStringTestCases)(
    "should %s code string: %s",
    (code, expected) => {
      if (expected === false) {
        // strings are error messages
        expect(
          typeof valideCodeStringExpressions(
            code,
            new Set(["input", "chatHistory"]),
            false
          )
        ).toBe("string");
      } else {
        expect(
          valideCodeStringExpressions(
            code,
            new Set(["input", "chatHistory"]),
            false
          )
        ).toBe(true);
      }
    }
  );
});
