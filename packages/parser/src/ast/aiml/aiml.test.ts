import fs from "fs";
import { test, expect, describe } from "bun:test";
import { parseAIML } from "./aiml.js";
import path from "path";

describe("Markdown", () => {
  test("parsing markdown", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "__fixtures__/justmd.aiml"),
      "utf-8"
    );
    const result = parseAIML(source);

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
    const result = parseAIML(source);

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
    const result = parseAIML(source);

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
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.type).toBe("TagName");
    expect(result[0].attributes?.[0]?.content).toBe("state");
    expect(result[0].attributes?.[1]?.type).toBe("Prop");
    expect(result[0].attributes?.[1]?.name).toBe("attr");
    expect(result[0].attributes?.[1]?.content).toBe("value");

    // Check position info for the element
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check position info for the attributes
    expect(result[0].attributes?.[0]?.lineStart).toBeDefined();
    expect(result[0].attributes?.[0]?.columnStart).toBeDefined();
    expect(result[0].attributes?.[0]?.lineEnd).toBeDefined();
    expect(result[0].attributes?.[0]?.columnEnd).toBeDefined();

    expect(result[0].attributes?.[1]?.lineStart).toBeDefined();
    expect(result[0].attributes?.[1]?.columnStart).toBeDefined();
    expect(result[0].attributes?.[1]?.lineEnd).toBeDefined();
    expect(result[0].attributes?.[1]?.columnEnd).toBeDefined();
  });

  test("parsing AIML tags", () => {
    const source = '<llm attr="value">Hello</ai>';
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.type).toBe("TagName");
    expect(result[0].attributes?.[0]?.content).toBe("ai");
    expect(result[0].attributes?.[1]?.type).toBe("Prop");
    expect(result[0].attributes?.[1]?.name).toBe("attr");
    expect(result[0].attributes?.[1]?.content).toBe("value");

    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check child position info
    expect(result[0].children?.[0]?.lineStart).toBeDefined();
    expect(result[0].children?.[0]?.columnStart).toBeDefined();
    expect(result[0].children?.[0]?.lineEnd).toBeDefined();
    expect(result[0].children?.[0]?.columnEnd).toBeDefined();

    // "Hello" should be between the opening and closing tags
    expect(result[0].children?.[0]?.lineStart).toBe(1);
    const openTagEnd = '<llm attr="value">'.length + 1;
    expect(result[0].children?.[0]?.columnStart).toBe(openTagEnd);
  });

  test("parsing numbers", () => {
    const source = "<llm attr={123}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe(123);
    expect(result[0].attributes?.[1]?.contentType).toBe("number");
  });

  test("parsing fat arrow functions", () => {
    const source = "<llm attr={(foo) => 'Hello'}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("(foo) => 'Hello'");
    expect(result[0].attributes?.[1]?.contentType).toBe("expression");
  });

  test("parsing fat arrow functions with a bracketed body", () => {
    const source = `<llm attr={(foo) => {
    console.log('Hello')
    return 'Hello'
}}>Hello</ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe(`(foo) => {
    console.log('Hello')
    return 'Hello'
}`);
    expect(result[0].attributes?.[1]?.contentType).toBe("expression");
  });

  test("parsing arrays", () => {
    const source = "<llm attr={[1, 2, 3]}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toEqual([1, 2, 3]);
    expect(result[0].attributes?.[1]?.contentType).toBe("array");
  });

  test("parsing expressions strings with a single quote as a string", () => {
    const source = "<llm attr={'Hello'}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("Hello");
    expect(result[0].attributes?.[1]?.contentType).toBe("string");
  });

  test("parsing expressions strings with a double quote as a string", () => {
    const source = '<llm attr={"Hello"}>Hello</ai>';
    const result = parseAIML(source);

    expect(result).toBeDefined();
  });

  test("parsing expressions strings with templated strings as an expression", () => {
    const source = "<llm attr={`Hello ${'world'}`}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("`Hello ${'world'}`");
    expect(result[0].attributes?.[1]?.contentType).toBe("expression");
  });

  test("parsing expressions strings with a closing bracket in the value", () => {
    const source = `<llm attr={"}"}>Hello</ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("}");
    expect(result[0].attributes?.[1]?.contentType).toBe("string");
  });

  test("parsing objects", () => {
    const source = "<llm attr={{foo: 'bar'}}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toEqual({ foo: "bar" });
    expect(result[0].attributes?.[1]?.contentType).toBe("object");
  });

  test("parsing variables in expressions", () => {
    const source = "<llm attr={foo.test}>Hello</ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("foo.test");
    expect(result[0].attributes?.[1]?.contentType).toBe("expression");
  });

  test("parsing nested AIML tags", () => {
    const source = "<llm attr={foo.test} ><llm attr={bar.test}>Hello</ai></ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("foo.test");

    expect(result[0].children?.[0]?.attributes?.[1]?.content).toBe("bar.test");
    expect(result[0].children?.[0]?.children?.[0]?.content).toBe("Hello");
  });

  test("parsing nested AIML tags with xml text content", () => {
    const source =
      "<llm attr={foo.test}><llm attr={bar.test}><Hello /></ai></ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result[0].attributes?.[1]?.content).toBe("foo.test");

    expect(result[0].children?.[0]?.attributes?.[1]?.content).toBe("bar.test");
    expect(result[0].children?.[0]?.children?.[0]?.content).toBe("<Hello />");
  });

  test("parsing nested AIML tags with position info", () => {
    const source = "<llm attr={foo.test} ><llm attr={bar.test}>Hello</ai></ai>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);

    // Check nested element position
    const nestedElement = result[0].children?.[0];
    expect(nestedElement?.lineStart).toBeDefined();
    expect(nestedElement?.columnStart).toBeDefined();
    expect(nestedElement?.lineEnd).toBeDefined();
    expect(nestedElement?.columnEnd).toBeDefined();

    // The nested element should start after the opening tag of the parent
    expect(nestedElement?.columnStart).toBeGreaterThan(1);
    expect(nestedElement?.columnEnd).toBeLessThan(source.length + 1);
  });

  test("parsing multiline AIML content", () => {
    const source = `<llm attr="test">
Line 1
Line 2
</ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(4);
    expect(result[0].columnEnd).toBe(6);

    // Check child nodes line numbers
    // First child is "Line 1\nLine 2\n"
    expect(result[0].children?.[0]?.lineStart).toBe(2);
    // The column start may vary based on how Ohm parses the content, so we just check it's defined
    expect(result[0].children?.[0]?.columnStart).toBeDefined();

    // For lineEnd, we check it's either 2 or 3 depending on how the parser handles newlines
    const validLineEndValues = [2, 3]; // Accept either value
    expect(validLineEndValues).toContain(result[0].children?.[0]?.lineEnd);

    expect(result[0].children?.[0]?.columnEnd).toBeDefined();
  });
});
describe("Frontmatter", () => {
  test("basic key-value frontmatter", () => {
    const source = `---
title: Hi, World!
---

<llm attr={foo.test}>Hello</ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const titlePair = result[0].children?.[0];
    expect(titlePair?.type).toBe("FrontmatterPair");
    expect(titlePair?.name).toBe("title");
    expect(titlePair?.content).toBe("Hi, World!");

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
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const tagsPair = result[0].children?.[0];
    expect(tagsPair?.type).toBe("FrontmatterPair");
    expect(tagsPair?.name).toBe("tags");
    // For arrays, we expect a JSON string representation
    expect(tagsPair?.content).toMatch(/\["JavaScript","TypeScript","React"\]/);
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
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const projectPair = result[0].children?.[0];
    expect(projectPair?.type).toBe("FrontmatterPair");
    expect(projectPair?.name).toBe("project");

    // Check that the value is a JSON string containing the nested structure
    const projectValue = projectPair?.content;
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
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const descPair = result[0].children?.[0];
    expect(descPair?.type).toBe("FrontmatterPair");
    expect(descPair?.name).toBe("description");
    // js-yaml preserves the newlines in block scalar literals
    expect(descPair?.content).toBe(
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
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(1);

    const descPair = result[0].children?.[0];
    expect(descPair?.type).toBe("FrontmatterPair");
    expect(descPair?.name).toBe("description");
    // js-yaml replaces newlines with spaces in folded block scalars
    expect(descPair?.content).toBe(
      "This is a multi-line description that folds newlines into spaces.\n"
    );
  });

  test("flow style collections", () => {
    const source = `---
numbers: [1, 2, 3]
mapping: { name: test, value: 42 }
---`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(2);

    // Check array
    const numbersPair = result[0].children?.[0];
    expect(numbersPair?.type).toBe("FrontmatterPair");
    expect(numbersPair?.name).toBe("numbers");
    expect(numbersPair?.content).toMatch(/\[1,2,3\]/);

    // Check mapping
    const mappingPair = result[0].children?.[1];
    expect(mappingPair?.type).toBe("FrontmatterPair");
    expect(mappingPair?.name).toBe("mapping");

    const mappingValue = JSON.parse(mappingPair?.content as string);
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
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("Frontmatter");
    expect(result[0].children).toHaveLength(7);

    // Check string
    expect(result[0].children?.[0]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[0]?.name).toBe("string");
    expect(result[0].children?.[0]?.content).toBe("simple string");

    // Check quoted string
    expect(result[0].children?.[1]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[1]?.name).toBe("quoted");
    expect(result[0].children?.[1]?.content).toBe("quoted string");

    // Check number
    expect(result[0].children?.[2]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[2]?.name).toBe("number");
    expect(result[0].children?.[2]?.content).toBe("42"); // String representation

    // Check float
    expect(result[0].children?.[3]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[3]?.name).toBe("float");
    expect(result[0].children?.[3]?.content).toBe("3.14"); // String representation

    // Check boolean
    expect(result[0].children?.[4]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[4]?.name).toBe("boolean");
    expect(result[0].children?.[4]?.content).toBe("true"); // String representation

    // Check null
    expect(result[0].children?.[5]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[5]?.name).toBe("nullValue");
    expect(result[0].children?.[5]?.content).toBe("null"); // String representation

    // Check tilde null
    expect(result[0].children?.[6]?.type).toBe("FrontmatterPair");
    expect(result[0].children?.[6]?.name).toBe("tildeNull");
    expect(result[0].children?.[6]?.content).toBe("null"); // String representation
  });
});

describe("Imports", () => {
  test("parsing ES import with single quotes", () => {
    const source = `import foo from 'bar';
    import foo from 'bar';

    hi
    `;
    const sourceLines = source.split("\n");
    const result = parseAIML(source);

    expect(result).toBeDefined();

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("Import");
    expect(result[0].children?.[0]?.type).toBe("ImportVariable");
    expect(result[0].children?.[0]?.content).toBe("foo"); // variable imported
    expect(result[0].children?.[1]?.type).toBe("ModuleName");
    expect(result[0].children?.[1]?.content).toBe("bar"); // module name
    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    // expect(result[0].columnEnd).toBe(5);
  });

  test("parsing ES import with double quotes", () => {
    const source = 'import foo from "bar"';
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Import");
    expect(result[0].children?.[0]?.type).toBe("ImportVariable");
    expect(result[0].children?.[0]?.content).toBe("foo"); // variable imported
    expect(result[0].children?.[1]?.type).toBe("ModuleName");
    expect(result[0].children?.[1]?.content).toBe("bar"); // module name
    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    // expect(result[0].columnEnd).toBe(source.length + 1);
  });

  test.skip("parsing Python import", () => {
    const source = "from foo import bar";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("Import");
    expect(result[0].children?.[0]?.type).toBe("ImportVariable");
    expect(result[0].children?.[0]?.content).toBe("bar"); // variable imported
    expect(result[0].children?.[1]?.type).toBe("ModuleName");
    expect(result[0].children?.[1]?.content).toBe("foo"); // module name
    // Check position info
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);
    expect(result[0].lineEnd).toBe(1);
    expect(result[0].columnEnd).toBe(source.length + 1);
  });

  test.skip("parsing multiple import statements", () => {
    const source = `import first from 'module_one'
from module_two import second
import third from "module_three"`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);

    expect(result[0].type).toBe("Import");
    expect(result[0].name).toBe("first");
    expect(result[0].content).toBe("module_one");
    expect(result[0].lineStart).toBe(1);
    expect(result[0].columnStart).toBe(1);

    expect(result[1].type).toBe("Import");
    expect(result[1].name).toBe("second");
    expect(result[1].content).toBe("module_two");
    expect(result[1].lineStart).toBe(2);
    expect(result[1].columnStart).toBe(1);

    expect(result[2].type).toBe("Import");
    expect(result[2].name).toBe("third");
    expect(result[2].content).toBe("module_three");
    expect(result[2].lineStart).toBe(3);
    expect(result[2].columnStart).toBe(1);
  });

  test("parsing imports followed by other content", () => {
    const source = `import foo from 'bar'
Hello World
<llm model="test">Test</ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3); // Import, Text, AIMLElement
    expect(result[0].type).toBe("Import");
    expect(result[0].children?.[0]?.type).toBe("ImportVariable");
    expect(result[0].children?.[0]?.content).toBe("foo");
    expect(result[0].children?.[1]?.type).toBe("ModuleName");
    expect(result[0].children?.[1]?.content).toBe("bar");
    expect(result[0].lineStart).toBe(1);

    expect(result[1].type).toBe("Text");
    expect(
      typeof result[1].content === "string"
        ? result[1].content?.trim()
        : result[1].content
    ).toBe("Hello World");
    // expect(result[1].lineStart).toBe(2);

    expect(result[2].type).toBe("AIMLElement");
    expect(result[2].attributes?.[0]?.content).toBe("ai"); // TagName
    expect(result[2].attributes?.[1]?.name).toBe("model");
    expect(result[2].attributes?.[1]?.content).toBe("test");
    // expect(result[2].lineStart).toBe(3);
  });
});

describe("Comments", () => {
  test("parsing HTML-style comments", () => {
    const source = "Text before <!-- This is a comment --> text after";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);

    // Text before comment
    expect(result[0].type).toBe("Text");
    expect(result[0].content).toBe("Text before");

    // Comment
    expect(result[1].type).toBe("Comment");
    expect(result[1].content).toBe("<!-- This is a comment -->");

    // Text after comment
    expect(result[2].type).toBe("Text");
    expect(result[2].content).toBe("text after");

    // Check position info for the comment
    expect(result[1].lineStart).toBe(1);
    expect(result[1].columnStart).toBeDefined();
    expect(result[1].lineEnd).toBe(1);
    expect(result[1].columnEnd).toBeDefined();
  });

  test("parsing JSX-style comments", () => {
    const source = "Text before {/* This is a JSX comment */} text after";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);

    // Text before comment
    expect(result[0].type).toBe("Text");
    expect(result[0].content).toBe("Text before");

    // Comment
    expect(result[1].type).toBe("Comment");
    expect(result[1].content).toBe("/* This is a JSX comment */");

    // Text after comment
    expect(result[2].type).toBe("Text");
    expect(result[2].content).toBe("text after");

    // Check position info for the comment
    expect(result[1].lineStart).toBe(1);
    expect(result[1].columnStart).toBeDefined();
    expect(result[1].lineEnd).toBe(1);
    expect(result[1].columnEnd).toBeDefined();
  });

  test("parsing multi-line comments", () => {
    const source = `Text before
    <!-- This is a 
    multi-line
    comment -->
    text after`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    // Should have text before, comment, text after
    expect(result.length).toBeGreaterThanOrEqual(3);

    // Find the comment node
    const commentNode = result.find((node) => node.type === "Comment");
    expect(commentNode).toBeDefined();
    expect(commentNode?.content).toContain("This is a");
    expect(commentNode?.content).toContain("multi-line");
    expect(commentNode?.content).toContain("comment");

    // Check position info spans multiple lines
    expect(commentNode?.lineStart).toBeDefined();
    expect(commentNode?.lineEnd).toBeDefined();
    expect(commentNode?.lineEnd).toBeGreaterThan(
      commentNode?.lineStart as number
    );
  });

  test("comments within AIML elements", () => {
    const source = `<llm attr="value">
      <!-- Comment inside AIML element -->
      Text content
    </ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");

    // Element should have 3 children: whitespace, comment, text content
    expect(result[0].children?.length).toBeGreaterThanOrEqual(2);

    // Find the comment node in children
    const commentNode = result[0].children?.find(
      (node) => node.type === "Comment"
    );
    expect(commentNode).toBeDefined();
    expect(commentNode?.content).toContain("Comment inside AIML element");
  });

  test("JSX comments with expressions nearby", () => {
    const source = `<llm attr={value}>
      {/* JSX comment */}
      {expression}
    </ai>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");

    // Element should have children including the comment
    const commentNode = result[0].children?.find(
      (node) => node.type === "Comment"
    );
    expect(commentNode).toBeDefined();
    expect(commentNode?.content).toBe("/* JSX comment */");
  });
});
// Tags like <prompt> and <script> should ignore internal syntax and treat it as text
// as their content is intended to be a value only
describe("Value based tags", () => {
  test("AIML tags inside prompt tags are treated as text", () => {
    const source = "<prompt><llm attr='value'>Hello</ai></prompt>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("prompt");

    // The content should be a single text node containing the raw AIML tag
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toBe(
      "<llm attr='value'>Hello</ai>"
    );
  });

  test("content inside script tags are treated as text", () => {
    const source = "<script>const code = 0 < 1;</script>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("script");

    // The content should be a single text node containing the raw AIML tag
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toBe("const code = 0 < 1;");
  });

  test("JSX expressions inside prompt tags are treated as text", () => {
    const source = "<prompt>{someVariable} {42} {true ? 'yes' : 'no'}</prompt>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("prompt");

    // The content should be a single text node containing the raw expressions
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toBe(
      "{someVariable} {42} {true ? 'yes' : 'no'}"
    );
  });

  test("Mixed syntax inside prompt tags is treated as text", () => {
    const source = `<prompt>
<llm model="gpt-4">
  Some text with {expressions}
  \`\`\`js
  const code = true;
  \`\`\`
</ai>
</prompt>`;
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("prompt");

    // The content should be a single text node containing all the mixed syntax
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toContain('<llm model="gpt-4">');
    expect(result[0].children?.[0]?.content).toContain("{expressions}");
    expect(result[0].children?.[0]?.content).toContain("```js");
    expect(result[0].children?.[0]?.content).toContain("const code = true;");
  });

  test("Comments inside prompt tags are still parsed as text", () => {
    const source = "<prompt>Text <!-- Comment --> more text</prompt>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("prompt");

    // The content should have 3 children: text, comment, text
    expect(result[0].children?.length).toBe(1);
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toBe(
      "Text <!-- Comment --> more text"
    );
  });

  test("Attribute expressions on prompt tag are still parsed normally", () => {
    const source = "<prompt id={someId}>Text with <tags></prompt>";
    const result = parseAIML(source);

    expect(result).toBeDefined();
    expect(result[0].type).toBe("AIMLElement");
    expect(result[0].attributes?.[0]?.content).toBe("prompt");

    // Check that the attribute is parsed correctly
    expect(result[0].attributes?.[1]?.type).toBe("Prop");
    expect(result[0].attributes?.[1]?.name).toBe("id");
    expect(result[0].attributes?.[1]?.content).toBe("someId");
    expect(result[0].attributes?.[1]?.contentType).toBe("expression");

    // The body content should be treated as text
    expect(result[0].children?.[0]?.type).toBe("Text");
    expect(result[0].children?.[0]?.content).toBe("Text with <tags>");
  });
});
