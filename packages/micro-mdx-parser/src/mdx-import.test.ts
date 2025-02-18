import { describe, expect, test } from "bun:test";
import { parse } from "./index";
import { ElementNode, ImportNode, LexerOptions } from "./types";
import { lexer } from "./lexer";
import {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
} from "./tags";
import { parser } from "./parser";

const defaultOptions: LexerOptions = {
  voidTags,
  closingTags,
  childlessTags,
  closingTagAncestorBreakers,
  includePositions: true,
};

describe("MDX Import", () => {
  test("should parse MDX imports", () => {
    const mdx = `import Button from './Button.mdx'
import { Header, Footer } from '../components/Layout.mdx'

# Welcome

<Container>
  <Button>Click me</Button>
  <Header />
  <Footer />
</Container>`;

    const ast = parse(mdx);
    expect(ast[0].type).toBe("import");
    expect((ast[0] as ImportNode).source).toBe("./Button.mdx");
    expect((ast[0] as ImportNode).specifiers[0].type).toBe("default");
    expect((ast[0] as ImportNode).specifiers[0].local).toBe("Button");

    expect(ast[1].type).toBe("import");
    expect((ast[1] as ImportNode).source).toBe("../components/Layout.mdx");
    expect((ast[1] as ImportNode).specifiers[0].type).toBe("named");
    expect((ast[1] as ImportNode).specifiers[0].local).toBe("Header");
    expect((ast[1] as ImportNode).specifiers[1].type).toBe("named");
    expect((ast[1] as ImportNode).specifiers[1].local).toBe("Footer");

    expect(ast[2].type).toBe("element");
    expect((ast[2] as ElementNode).tagName).toBe("h1");
    expect((ast[2] as ElementNode).children[0].content).toBe("Welcome");

    expect(ast[3].type).toBe("element");
    expect((ast[3] as ElementNode).tagName).toBe("Container");
    console.log("Container children:", (ast[3] as ElementNode).children);
    expect((ast[3] as ElementNode).children).toHaveLength(3);
    expect(((ast[3] as ElementNode).children[0] as ElementNode).tagName).toBe(
      "Button"
    );
    expect(((ast[3] as ElementNode).children[1] as ElementNode).tagName).toBe(
      "Header"
    );
    expect(((ast[3] as ElementNode).children[2] as ElementNode).tagName).toBe(
      "Footer"
    );
  });

  test("should parse MDX imports with aliases", () => {
    const tokens = lexer(
      `import MyButton from './Button.mdx'
import { Header as PageHeader } from '../components/Layout.mdx'

<Container>
  <MyButton>Click me</MyButton>
  <PageHeader />
</Container>`,
      defaultOptions
    );

    const nodes = parser(tokens, defaultOptions);
    expect(nodes[0].type).toBe("import");
    expect((nodes[0] as ImportNode).source).toBe("./Button.mdx");
    expect((nodes[0] as ImportNode).specifiers[0].type).toBe("default");
    expect((nodes[0] as ImportNode).specifiers[0].local).toBe("MyButton");

    expect(nodes[1].type).toBe("import");
    expect((nodes[1] as ImportNode).source).toBe("../components/Layout.mdx");
    expect((nodes[1] as ImportNode).specifiers[0].type).toBe("named");
    expect((nodes[1] as ImportNode).specifiers[0].imported).toBe("Header");
    expect((nodes[1] as ImportNode).specifiers[0].local).toBe("PageHeader");
  });
});
