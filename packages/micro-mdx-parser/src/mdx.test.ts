import { describe, expect, test } from "bun:test";
import { parse, parseToJson } from "./index";
import { ElementNode } from "./types";

describe("MDX Parser", () => {
  test("should parse MDX to AST", () => {
    const mdx = `# Hello

<Container>
  This is *markdown* inside a **component**.
  <Button>Click me</Button>
</Container>`;

    const ast = parse(mdx);
    expect(ast[0].type).toBe("element");
    expect((ast[0] as ElementNode).tagName).toBe("h1");
    expect((ast[0] as ElementNode).children[0].content).toBe("Hello");
    expect(ast[1].type).toBe("element");
    expect((ast[1] as ElementNode).tagName).toBe("Container");
    expect((ast[1] as ElementNode).children).toHaveLength(3);
    expect((ast[1] as ElementNode).children[0].type).toBe("text");
    expect((ast[1] as ElementNode).children[1].type).toBe("element");
    expect(((ast[1] as ElementNode).children[1] as ElementNode).tagName).toBe(
      "Button"
    );
    expect((ast[1] as ElementNode).children[2].type).toBe("text");
  });

  test("should parse MDX to JSON", () => {
    const mdx = "<Button primary>Click me</Button>";
    const json = parseToJson(mdx, true);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("element");
    expect(parsed[0].tagName).toBe("Button");
    expect(parsed[0].props).toHaveProperty("primary");
    expect(parsed[0].children[0].content).toBe("Click me");
  });

  test("should parse MDX to minified JSON", () => {
    const mdx = "<Button primary>Click me</Button>";
    const json = parseToJson(mdx);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("element");
    expect(parsed[0].tagName).toBe("Button");
    expect(parsed[0].props).toHaveProperty("primary");
    expect(parsed[0].children[0].content).toBe("Click me");
  });

  test("should handle nested components in JSON", () => {
    const mdx = `<Container>
  <Button primary>
    Click me
  </Button>
</Container>`;

    const json = parseToJson(mdx, true);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].tagName).toBe("Container");
    expect(parsed[0].children[0].type).toBe("element");
    expect(parsed[0].children[0].tagName).toBe("Button");
    expect(parsed[0].children[0].props).toHaveProperty("primary");
  });

  test("should preserve position information in JSON", () => {
    const mdx = "<Button>Click me</Button>";
    const json = parseToJson(mdx, true);
    const parsed = JSON.parse(json);

    expect(parsed[0].position).toBeDefined();
    expect(parsed[0].position.start).toHaveProperty("line");
    expect(parsed[0].position.start).toHaveProperty("column");
    expect(parsed[0].position.end).toHaveProperty("line");
    expect(parsed[0].position.end).toHaveProperty("column");
  });
});
