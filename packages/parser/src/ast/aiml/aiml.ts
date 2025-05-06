import * as ohm from "ohm-js";

type Node = {
  type: string;
  contentType?: "string" | "expression";
  content?: string;
  children?: Node[];
  name?: string;
  attributes?: Node[];
};

const TextNode = (content: string) => ({
  type: "Text",
  content: content,
  children: undefined,
});

const AIMLNode = (attributes?: Node[], children?: Node[]) => {
  return {
    type: "AIMLElement",
    children: children,
    attributes: attributes,
  };
};

const PropNode = (name: string, value: string | Node) => {
  return {
    type: "Prop",
    name: name,
    contentType:
      typeof value === "string" ? ("string" as const) : ("expression" as const),
    content:
      typeof value === "string"
        ? value
        : value.content?.startsWith("{") && value.content?.endsWith("}")
          ? value.content.slice(1, -1)
          : value.content,
  };
};

const ExprNode = (content: string) => {
  return {
    type: "Expression",
    content: content,
    children: undefined,
  };
};

const FrontmatterNode = (pairs: Node[]) => {
  return {
    type: "Frontmatter",
    children: pairs,
  };
};

const elementNames = ["state", "ai"];

function parseMarkdownBlocks(str: string): ohm.Node[] {
  const parser = {
    grammar: ohm.grammar(`
AIML {
  Document    = Frontmatter? Node*
  Node        = Element | Expression | Text

  Text        = (~("<" &TagName | "</" &TagName | "{" | "---") any)+  -- text
  Expression  = "{" (~"}" any)* "}"                      -- expr
  Comment     = "{" (~"}" ("/*" (~"*/" any)* "*/") "}")
  Element     = SelfClosing     -- selfClosing
              | Normal          -- normal

  SelfClosing = "<" &TagName TagName Prop* "/>"
  Normal      = "<" &TagName TagName Prop* ">" Document "</" TagName ">"

  Prop        = (letter | digit | "_")* "=" (String | Expression)

  TagName     = "${elementNames.join('" | "')}"

  Frontmatter = "---" nl? FrontmatterPair+ nl? "---"
  
  FrontmatterPair = (~nl (PropName "=" Value))  -- withNewline
                  | PropName "=" Value          -- withoutNewline
  nl = "\\n"   // new line
  sp = " "
  blank = sp* nl  // blank line has only newline
  endline = (~nl any)+ end
  Value = (~(nl | "---") any)*

  String      = "\\"" (~"\\"" any)* "\\""
  PropName    = letter (letter | digit | "_")* &"="
}
  `),
    semantics: null as ohm.Semantics | null,
  };

  parser.semantics = parser.grammar.createSemantics();
  parser.semantics.addOperation<string | Node[] | Node>("blocks", {
    _terminal() {
      return this.sourceString;
    },
    _iter(...children) {
      return children.map((c) => c.blocks());
    },
    Document: (a, b) => {
      return [
        ...a.children.map((c) => c.blocks()),
        ...b.children.map((c) => c.blocks()),
      ];
    },

    Frontmatter: (openDashes, nl, pairs, nl2, closeDashes) => {
      return FrontmatterNode(pairs.blocks());
    },

    FrontmatterPair_withNewline: (a, b, c) => {
      return {
        type: "FrontmatterPair",
        name: a.sourceString,
        value: c.sourceString,
      };
    },
    FrontmatterPair_withoutNewline: (a, b, c) => {
      return {
        type: "FrontmatterPair",
        name: a.sourceString,
        value: c.sourceString,
      };
    },
    Text: (a) => TextNode(a.sourceString),
    Expression: (a) => ExprNode(a.sourceString),
    PropName: (a, b, c) => a.sourceString,
    Element: function (a) {
      return a.children.map((c) => c.blocks())?.[0];
    },
    String: function (a, b, c) {
      return b.sourceString;
    },
    Prop: function (a, b, c) {
      return PropNode(a.sourceString, c.blocks());
    },
    SelfClosing: function (a, b, c, d, e) {
      const tagName = b.sourceString;

      const attributes = d.children.map((attr) => attr.blocks());
      return AIMLNode([
        {
          type: "TagName",
          content: tagName,
        },
        ...attributes,
      ]);
    },
    Normal: function (a, b, c, d, e, f, g, h, i) {
      const tagName = b.blocks();

      const attributes = d.children.map((attr) => attr.blocks());
      const children = f.blocks();

      return AIMLNode(
        [
          {
            type: "TagName",
            content: tagName,
          },
          ...attributes,
        ],
        [...children]
      );
    },
  });
  const match = parser.grammar.match(str);

  if (match.failed()) {
    console.error(match.message);
    return [];
  }

  return parser.semantics(match).blocks();
}
function parseMarkdownContent(block: ohm.Node) {
  const parser = {
    grammar: ohm.grammar(`
      MarkdownInner {
        block = text*
        text = ( ~( "*" | "\`" | "[" | "__") any)+
      }
    `),
    semantics: null as ohm.Semantics | null,
  };
  parser.semantics = parser.grammar.createSemantics();
  parser.semantics.addOperation<string | string[]>("content", {
    _terminal() {
      return this.sourceString;
    },
    block: (ps) => ps.children.map((c) => c.content()),
    text(a) {
      return a.children.map((c) => c.content()).join("");
    },
  });
  const match = parser.grammar.match(block.content);
  if (match.failed()) {
    block.content = block.content;
  } else {
    block.content = parser.semantics(match).content().join("");
  }
  return block;
}

export function parseMarkdown(raw_markdown: string) {
  const blocks = parseMarkdownBlocks(raw_markdown);

  return blocks.map((block) => {
    if (block.type === "text") return parseMarkdownContent(block);
    return block;
  });
}
