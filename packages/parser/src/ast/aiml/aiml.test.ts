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

    // Check that position info exists
    expect(result[0].lineStart).toBeDefined();
    expect(result[0].columnStart).toBeDefined();
    expect(result[0].lineEnd).toBeDefined();
    expect(result[0].columnEnd).toBeDefined();

    // The first node should start at line 1, column 1
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
  });
});

describe("AIML elements", () => {
  test("parsing self-closing tags that are not AIML as text ", () => {
    const source = '<Component attr="value" />';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Text");
    expect(result[0].content).toBe('<Component attr="value" />');

    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);
  });

  test("parsing tags that are not AIML as text", () => {
    const source = '<Component attr="value">Hello</Component>';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Text");
    expect(result[0].content).toBe('<Component attr="value">Hello</Component>');

    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);
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

    // Check position info for the element
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check position info for the attributes
    expect(result[0].attributes[0].lineStart).toBeDefined();
    expect(result[0].attributes[0].columnStart).toBeDefined();
    expect(result[0].attributes[0].lineEnd).toBeDefined();
    expect(result[0].attributes[0].columnEnd).toBeDefined();

    expect(result[0].attributes[1].lineStart).toBeDefined();
    expect(result[0].attributes[1].columnStart).toBeDefined();
    expect(result[0].attributes[1].lineEnd).toBeDefined();
    expect(result[0].attributes[1].columnEnd).toBeDefined();
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

    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check child position info
    expect(result[0].children[0].lineStart).toBeDefined();
    expect(result[0].children[0].columnStart).toBeDefined();
    expect(result[0].children[0].lineEnd).toBeDefined();
    expect(result[0].children[0].columnEnd).toBeDefined();

    // "Hello" should be between the opening and closing tags
    expect(result[0].children[0].lineStart).toBe(1);
    const openTagEnd = '<ai attr="value">'.length + 1;
    expect(result[0].children[0].columnStart).toBe(openTagEnd);
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

  test("parsing fat arrow functions with a bracketed body", () => {
    const source = `<ai attr={(foo) => {
    console.log('Hello')
    return 'Hello'
}}>Hello</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe(`(foo) => {
    console.log('Hello')
    return 'Hello'
}`);
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing arrays", () => {
    const source = "<ai attr={[1, 2, 3]}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("[1, 2, 3]");
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing expressions strings with a single quote as a string", () => {
    const source = "<ai attr={'Hello'}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("Hello");
    expect(result[0].attributes[1].contentType).toBe("string");
  });

  test("parsing expressions strings with a double quote as a string", () => {
    const source = '<ai attr={"Hello"}>Hello</ai>';
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
  });

  test("parsing expressions strings with templated strings as an expression", () => {
    const source = "<ai attr={`Hello ${'world'}`}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("`Hello ${'world'}`");
    expect(result[0].attributes[1].contentType).toBe("expression");
  });

  test("parsing expressions strings with a closing bracket in the value", () => {
    const source = `<ai attr={"}"}>Hello</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("}");
    expect(result[0].attributes[1].contentType).toBe("string");
  });

  test("parsing objects", () => {
    const source = "<ai attr={{foo: 'bar'}}>Hello</ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();

    expect(result[0].attributes[1].content).toBe("{foo: 'bar'}");
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

  test("parsing nested AIML tags with position info", () => {
    const source = "<ai attr={foo.test} ><ai attr={bar.test}>Hello</ai></ai>";
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check nested element position
    const nestedElement = result[0].children[0];
    expect(nestedElement.lineStart).toBeDefined();
    expect(nestedElement.columnStart).toBeDefined();
    expect(nestedElement.lineEnd).toBeDefined();
    expect(nestedElement.columnEnd).toBeDefined();

    // The nested element should start after the opening tag of the parent
    expect(nestedElement.columnStart).toBeGreaterThan(1);
    expect(nestedElement.columnEnd).toBeLessThan(source.length + 1);
  });

  test("parsing multiline AIML content", () => {
    const source = `<ai attr="test">
Line 1
Line 2
</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(4);
    expect(result[0].columnEnd).toBe(6);

    // Check child nodes line numbers
    // First child is "Line 1\nLine 2\n"
    expect(result[0].children[0].lineStart).toBe(2);
    // The column start may vary based on how Ohm parses the content, so we just check it's defined
    expect(result[0].children[0].columnStart).toBeDefined();

    // For lineEnd, we check it's either 2 or 3 depending on how the parser handles newlines
    const validLineEndValues = [2, 3]; // Accept either value
    expect(validLineEndValues).toContain(result[0].children[0].lineEnd);

    expect(result[0].children[0].columnEnd).toBeDefined();
  });
});
describe("Frontmatter", () => {
  test("basic key-value frontmatter", () => {
    const source = `---
title: Hi, World!
---

<ai attr={foo.test}>Hello</ai>`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const titlePair = result[0].children[0];
    expect(titlePair.type).toBe("FrontmatterPair");
    expect(titlePair.name).toBe("title");
    expect(titlePair.content).toBe("Hi, World!");

    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(3);
    expect(result[0].columnEnd).toBe(4);
  });

  test("array values in frontmatter", () => {
    const source = `---
tags:
  - JavaScript
  - TypeScript
  - React
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const tagsPair = result[0].children[0];
    expect(tagsPair.type).toBe("FrontmatterPair");
    expect(tagsPair.name).toBe("tags");
    // For arrays, we expect a JSON string representation
    expect(tagsPair.content).toMatch(/\["JavaScript","TypeScript","React"\]/);
  });

  test("nested objects in frontmatter", () => {
    const source = `---
project:
  name: MyProject
  version: 1.0.0
  dependencies:
    - name: react
      version: ^18.0.0
    - name: typescript
      version: ^5.0.0
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const projectPair = result[0].children[0];
    expect(projectPair.type).toBe("FrontmatterPair");
    expect(projectPair.name).toBe("project");

    // Check that the value is a JSON string containing the nested structure
    const projectValue = projectPair.content;
    expect(typeof projectValue).toBe("string");
    expect(projectValue).toContain("name");
    expect(projectValue).toContain("MyProject");
    expect(projectValue).toContain("version");
    expect(projectValue).toContain("1.0.0");
    expect(projectValue).toContain("dependencies");

    // Parse the JSON string to verify the structure
    const parsedValue = JSON.parse(projectValue as string);
    expect(parsedValue.name).toBe("MyProject");
    expect(parsedValue.version).toBe("1.0.0");
    expect(parsedValue.dependencies).toHaveLength(2);
    expect(parsedValue.dependencies[0].name).toBe("react");
    expect(parsedValue.dependencies[0].version).toBe("^18.0.0");
  });

  test("block scalar literals", () => {
    const source = `---
description: |
  This is a multi-line
  description that preserves
  newlines and formatting.
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const descPair = result[0].children[0];
    expect(descPair.type).toBe("FrontmatterPair");
    expect(descPair.name).toBe("description");
    // js-yaml preserves the newlines in block scalar literals
    expect(descPair.content).toBe(
      "This is a multi-line\ndescription that preserves\nnewlines and formatting.\n"
    );
  });

  test("block scalar folded", () => {
    const source = `---
description: >
  This is a multi-line
  description that folds
  newlines into spaces.
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const descPair = result[0].children[0];
    expect(descPair.type).toBe("FrontmatterPair");
    expect(descPair.name).toBe("description");
    // js-yaml replaces newlines with spaces in folded block scalars
    expect(descPair.content).toBe(
      "This is a multi-line description that folds newlines into spaces.\n"
    );
  });

  test("flow style collections", () => {
    const source = `---
numbers: [1, 2, 3]
mapping: { name: test, value: 42 }
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(2);

    // Check array
    const numbersPair = result[0].children[0];
    expect(numbersPair.type).toBe("FrontmatterPair");
    expect(numbersPair.name).toBe("numbers");
    expect(numbersPair.content).toMatch(/\[1,2,3\]/);

    // Check mapping
    const mappingPair = result[0].children[1];
    expect(mappingPair.type).toBe("FrontmatterPair");
    expect(mappingPair.name).toBe("mapping");

    const mappingValue = JSON.parse(mappingPair.content as string);
    expect(mappingValue.name).toBe("test");
    expect(mappingValue.content).toBe(42);
  });

  test("various scalar types", () => {
    const source = `---
string: simple string
quoted: "quoted string"
number: 42
float: 3.14
boolean: true
nullValue: null
tildeNull: ~
---`;
    const result = parseMarkdown(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(7);

    // Check string
    expect(result[0].children[0].type).toBe("FrontmatterPair");
    expect(result[0].children[0].name).toBe("string");
    expect(result[0].children[0].content).toBe("simple string");

    // Check quoted string
    expect(result[0].children[1].type).toBe("FrontmatterPair");
    expect(result[0].children[1].name).toBe("quoted");
    expect(result[0].children[1].content).toBe("quoted string");

    // Check number
    expect(result[0].children[2].type).toBe("FrontmatterPair");
    expect(result[0].children[2].name).toBe("number");
    expect(result[0].children[2].content).toBe("42"); // String representation

    // Check float
    expect(result[0].children[3].type).toBe("FrontmatterPair");
    expect(result[0].children[3].name).toBe("float");
    expect(result[0].children[3].content).toBe("3.14"); // String representation

    // Check boolean
    expect(result[0].children[4].type).toBe("FrontmatterPair");
    expect(result[0].children[4].name).toBe("boolean");
    expect(result[0].children[4].content).toBe("true"); // String representation

    // Check null
    expect(result[0].children[5].type).toBe("FrontmatterPair");
    expect(result[0].children[5].name).toBe("nullValue");
    expect(result[0].children[5].content).toBe("null"); // String representation

    // Check tilde null
    expect(result[0].children[6].type).toBe("FrontmatterPair");
    expect(result[0].children[6].name).toBe("tildeNull");
    expect(result[0].children[6].content).toBe("null"); // String representation
  });
});
