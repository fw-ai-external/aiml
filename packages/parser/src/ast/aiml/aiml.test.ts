import fs from "fs";
import { test, expect, describe } from "bun:test";
import { parseMarkdown } from "./aiml.js";
import path from "path";

describe("Markdown", () => {
  test("parsing markdown", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "__fixtures__/justmd.aiml"),
      "utf-8"
    );
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(
      Array.isArray(result) ? result.every((r) => r.type === "Text") : true
    ).toBe(true);
    expect(result.reduce((acc, r) => acc + r.content + "\n", "")).toBe(source);
  });
});

describe("AIML elements", () => {
  test("parsing self-closing tags that are not AIML as text ", () => {
    const source = '<Component attr="value" />';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Text");

    expect(result[0].content).toBe('<Component attr="value" />');
  });

  test("parsing tags that are not AIML as text", () => {
    const source = '<Component attr="value">Hello</Component>';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Text");
    expect(result[0].content).toBe('<Component attr="value">Hello</Component>');
  });

  test("parsing self-closing AIML tags", () => {
    const source = '<state attr="value" />';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes[0].type).toBe("TagName");
    expect(result[0].attributes[0].content).toBe("state");
    expect(result[0].attributes[1].type).toBe("Prop");
    expect(result[0].attributes[1].name).toBe("attr");
    expect(result[0].attributes[1].content).toBe("value");
  });

  test("parsing AIML tags", () => {
    const source = '<ai attr="value">Hello</ai>';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes[0].type).toBe("TagName");
    expect(result[0].attributes[0].content).toBe("ai");
    expect(result[0].attributes[1].type).toBe("Prop");
    expect(result[0].attributes[1].name).toBe("attr");
    expect(result[0].attributes[1].content).toBe("value");
  });

  test("parsing numbers", () => {
    const source = "<ai attr={123}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("123");
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing fat arrow functions", () => {
    const source = "<ai attr={(foo) => 'Hello'}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("(foo) => 'Hello'");
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing variables in expressions", () => {
    const source = "<ai attr={foo.test}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("foo.test");
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing nested AIML tags", () => {
    const source = "<ai attr={foo.test} ><ai attr={bar.test}>Hello</ai></ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("foo.test");

    expect(result[0].children[0].attributes[1].content).toBe("bar.test");
    expect(result[0].children[0].children[0].content).toBe("Hello");
  });

  test("parsing nested AIML tags with xml text content", () => {
    const source =
      "<ai attr={foo.test}><ai attr={bar.test}><Hello /></ai></ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("foo.test");

    expect(result[0].children[0].attributes[1].content).toBe("bar.test");
    expect(result[0].children[0].children[0].content).toBe("<Hello />");
  });
});
describe("Frontmatter", () => {
  test("basics", () => {
    const source = `---
key1=value1
---

<ai attr={foo.test}>Hello</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children[0].type).toBe("FrontmatterPair");
    expect(result[0].children[0].name).toBe("key1");
    expect(result[0].children[0].value).toBe("value1");

    expect(result[1].type).toBe("AIMLElement");
    expect(result[1].attributes[1].content).toBe("foo.test");
  });

  test.skip("multiple frontmatter pairs", () => {
    const source = `---
key1=value1
key2=value2


<ai attr={foo.test}>Hello</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("foo.test");

    expect(result[0].children[0].attributes[1].content).toBe("bar.test");
    expect(result[0].children[0].children[0].content).toBe("<Hello />");
  });
});
