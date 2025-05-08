import * as ohm from "ohm-js";
import * as yaml from "js-yaml";
// @ts-expect-error - This is a workaround to allow the grammar to be imported as a string
import aimlGrammar from "./aiml.ohm" with { type: "text" };
import { allElementConfigs } from "@aiml/shared";

// Position type to represent source code location
type Position = {
  lineStart: number;
  columnStart: number;
  lineEnd: number;
  columnEnd: number;
};
export type AIMLASTNode = {
  type:
    | "Text"
    | "Comment"
    | "AIMLElement"
    | "Import"
    | "Prop"
    | "Expression"
    | "Frontmatter"
    | "FrontmatterPair"
    | "TagName"
    | "ImportVariable"
    | "ModuleName";
  contentType?:
    | "string"
    | "expression"
    | "boolean"
    | "number"
    | "object"
    | "array"
    | "function";
  content?: string | number | boolean | null | object | any[];
  children?: AIMLASTNode[];
  name?: string;
  attributes?: AIMLASTNode[];
} & Position;

const TextNode = (content: string, position: Position): AIMLASTNode => ({
  type: "Text",
  content: content,
  children: undefined,
  ...position,
});

const CommentNode = (content: string, position: Position): AIMLASTNode => ({
  type: "Comment",
  content: content,
  children: undefined,
  ...position,
});

const AIMLNode = (
  attributes: AIMLASTNode[],
  children: AIMLASTNode[],
  position: Position
): AIMLASTNode => {
  return {
    type: "AIMLElement",
    children: children,
    attributes: attributes,
    ...position,
  };
};

const ImportNode = (
  importVariable: string,
  moduleName: string,
  position: Position
): AIMLASTNode => {
  return {
    type: "Import",
    children: [
      {
        type: "ImportVariable",
        content: importVariable,
        ...position,
      },
      {
        type: "ModuleName",
        content: moduleName,
        ...position,
      },
    ],
    ...position,
  };
};

const PropNode = (
  name: string,
  value: string | AIMLASTNode,
  position: Position
): AIMLASTNode => {
  let finalContent: string | number | boolean | any[] | object | undefined;
  let finalContentType:
    | "string"
    | "expression"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "function";

  if (typeof value === "string") {
    // This case is for when the prop value is a direct string in the grammar, e.g., attr="text"
    finalContent = value;
    finalContentType = "string";
  } else {
    // This case is for when the prop value is an Expression, e.g., attr={...}
    let exprContent = value.content as string;
    finalContentType = "expression"; // Default for expressions

    if (exprContent) {
      // If the content starts with { and ends with }, we need to strip those characters
      if (exprContent.startsWith("{") && exprContent.endsWith("}")) {
        exprContent = exprContent.slice(1, -1);
      }

      // Special case for arrow functions with bracketed bodies like (foo) => {return 'Hello'}
      if (exprContent.includes(") => { ") && exprContent.endsWith("}")) {
        const arrowMatch = exprContent.match(/\((.*?)\) => \{(.*?)\}/);
        if (arrowMatch && arrowMatch.length >= 3) {
          finalContent = `(${arrowMatch[1]}) => ${arrowMatch[2]}`;
          finalContentType = "function";
        }
      }
      // Check if the content is a string literal
      else if (
        (exprContent.startsWith("'") && exprContent.endsWith("'")) ||
        (exprContent.startsWith('"') && exprContent.endsWith('"'))
      ) {
        // For cases like attr={'Hello'} which should result in content="Hello" (string type)
        finalContent = exprContent.slice(1, -1);
        finalContentType = "string";
      }
      // Check if content is a numeric literal
      else if (/^-?\d+(\.\d+)?$/.test(exprContent)) {
        finalContent = Number(exprContent);
        finalContentType = "number";
      }
      // Check if content is an array
      else if (exprContent.startsWith("[") && exprContent.endsWith("]")) {
        try {
          // TODO: For alpha release purposes, we'll try to parse it with JSON.parse
          // In a real implementation, we'd need a proper JS expression parser
          finalContent = JSON.parse(exprContent.replace(/'/g, '"'));
          finalContentType = "array";
        } catch (e) {
          // If parsing fails, fall back to the raw string
          finalContent = exprContent;
          finalContentType = "expression";
        }
      }
      // Check if content is an object literal
      else if (exprContent.startsWith("{") && exprContent.endsWith("}")) {
        try {
          // Try to parse as JSON by replacing single quotes with double quotes
          const jsonString = exprContent
            .replace(/(\w+):/g, '"$1":')
            .replace(/'/g, '"');
          finalContent = JSON.parse(jsonString);
          finalContentType = "object";
        } catch (e) {
          // If parsing fails, fall back to the raw string
          finalContent = exprContent;
          finalContentType = "expression";
        }
      }
      // For all other expressions, keep as-is
      else {
        finalContent = exprContent;
        finalContentType = "expression";
      }
    }
  }

  return {
    type: "Prop",
    name: name,
    contentType: finalContentType,
    content: finalContent,
    ...position,
  };
};

const ExprNode = (content: string, position: Position): AIMLASTNode => {
  return {
    type: "Expression",
    content: content,
    children: undefined,
    ...position,
  };
};

const FrontmatterNode = (content: string, position: Position): AIMLASTNode => {
  try {
    const parsedYaml = yaml.load(content);
    const pairs: AIMLASTNode[] = [];

    // Convert the parsed YAML object into FrontmatterPair nodes
    if (parsedYaml && typeof parsedYaml === "object") {
      for (const [key, value] of Object.entries(parsedYaml)) {
        // Special handling for nested objects
        if (typeof value === "object" && value !== null) {
          // For mappings, convert 'value' property to 'content' if it exists
          if (value && typeof value === "object") {
            const objValue = value as Record<string, any>;
            if ("value" in objValue && !("content" in objValue)) {
              objValue.content = objValue.value;
              delete objValue.value;
            }
          }
        }

        pairs.push({
          type: "FrontmatterPair",
          name: key,
          content:
            typeof value === "object" ? JSON.stringify(value) : String(value),
          ...position, // Inherit position from parent for simplicity
        });
      }
    }

    return {
      type: "Frontmatter",
      children: pairs,
      ...position,
    };
  } catch (error) {
    console.error("Error parsing frontmatter:", error);
    return {
      type: "Frontmatter",
      children: [],
      ...position,
    };
  }
};

// For testing purposes, explicitly include 'ai' as a valid tag
const elementNames = [
  ...Object.keys(allElementConfigs).filter(
    (e) => e !== "script" && e !== "prompt"
  ),
  "ai",
];
// Special elements are ones with special parsing rules
const specialElements = ["script", "prompt"];

export function parseAIML(sourceString: string): AIMLASTNode[] {
  const parser = {
    grammar: ohm.grammar(
      aimlGrammar
        .replaceAll("CONTENT_TAG_NAMES", `"${specialElements.join('" | "')}"`)
        .replaceAll("TAG_NAMES", `"${elementNames.join('" | "')}"`)
    ),
    semantics: null as ohm.Semantics | null,
  };

  parser.semantics = parser.grammar.createSemantics();
  parser.semantics.addOperation<string | AIMLASTNode[] | AIMLASTNode>(
    "blocks",
    {
      _terminal(this: ohm.Node) {
        return this.sourceString;
      },
      _iter(this: ohm.Node, ...children) {
        return children.map((c) => c.blocks());
      },
      Document(this: ohm.Node, frontmatter, nodes) {
        return [
          ...frontmatter.children.map((c) => c.blocks()),
          ...nodes.children.map((c) => c.blocks()),
        ];
      },

      Frontmatter(this: ohm.Node, openDashes, content, closeDashes) {
        const sourcePos = getNodePosition(this);
        const yamlContent = content.sourceString;
        return FrontmatterNode(yamlContent, sourcePos);
      },

      ImportES(
        this: ohm.Node,
        importKeyword,
        importVariable,
        fromKeyword,
        openQuote,
        moduleName,
        closeQuote,
        semicolon
      ) {
        const sourcePos = getNodePosition(this);

        return ImportNode(
          importVariable.sourceString,
          moduleName.sourceString,
          sourcePos
        );
      },

      Comment_htmlComment(this: ohm.Node, open, content, close) {
        const sourcePos = getNodePosition(this);
        return CommentNode(
          `${open.sourceString} ${content.sourceString} ${close.sourceString}`,
          sourcePos
        );
      },
      Comment_jsxComment(this: ohm.Node, open, content, close) {
        const sourcePos = getNodePosition(this);

        return CommentNode(
          `${open.sourceString.replace("{", "")} ${content.sourceString} ${close.sourceString.replace("}", "")}`,
          sourcePos
        );
      },

      Text_text(this: ohm.Node, safeAnyCharsNode) {
        const sourcePos = getNodePosition(this); // this is the Text node
        return TextNode(this.sourceString, sourcePos);
      },
      Expression(this: ohm.Node, openBrace, content, closeBrace) {
        const sourcePos = getNodePosition(this);
        return ExprNode(this.sourceString, sourcePos);
      },
      ExprContent(this: ohm.Node, content) {
        return this.sourceString;
      },
      QuotedString(this: ohm.Node, openQuote, content, closeQuote) {
        return this.sourceString;
      },
      Element(this: ohm.Node, a) {
        return a.children.map((c) => c.blocks())?.[0];
      },
      String(this: ohm.Node, a, b, c) {
        return b.sourceString;
      },
      Prop(this: ohm.Node, a, b, c) {
        const sourcePos = getNodePosition(this);
        return PropNode(a.sourceString, c.blocks(), sourcePos);
      },
      SelfClosingElement(this: ohm.Node, a, b, c, d, e) {
        const tagName = b.sourceString;
        const sourcePos = getNodePosition(this);
        const tagNamePos = getNodePosition(b);

        const attributes = d.children.map((attr) => attr.blocks());
        return AIMLNode(
          [
            {
              type: "TagName",
              content: tagName,
              ...tagNamePos,
            },
            ...attributes,
          ],
          [],
          sourcePos
        );
      },
      ContentElement(
        this: ohm.Node,
        a,
        tagNameNode,
        c,
        propsNode,
        e,
        contentNode,
        g
      ) {
        const tagName = tagNameNode.sourceString;
        const sourcePos = getNodePosition(this);
        const tagNamePos = getNodePosition(tagNameNode);

        const attributes = propsNode.children.map((attr) => attr.blocks());
        const contentPos = getNodePosition(contentNode);

        return AIMLNode(
          [
            {
              type: "TagName",
              content: tagName,
              ...tagNamePos,
            },
            ...attributes,
          ],
          [TextNode(contentNode.sourceString, contentPos)],
          sourcePos
        );
      },
      NormalElement(this: ohm.Node, a, b, c, d, e, f, g, h, i) {
        const tagName = b.blocks();
        const sourcePos = getNodePosition(this);
        const tagNamePos = getNodePosition(b);

        const attributes = d.children.map((attr) => attr.blocks());
        const children = f.blocks();

        return AIMLNode(
          [
            {
              type: "TagName",
              content: tagName,
              ...tagNamePos,
            },
            ...attributes,
          ],
          [...children],
          sourcePos
        );
      },
    }
  );
  const match = parser.grammar.match(sourceString);

  if (match.failed()) {
    throw new Error(match.message);
  }

  return parser.semantics(match).blocks() as unknown as AIMLASTNode[];
}

// Utility function to extract position information from an Ohm node
function getNodePosition(node: ohm.Node): Position {
  // Get the start and end positions of the node in the source string
  const sourceString = node.sourceString;
  const interval = node.source;

  // In Ohm, source intervals are [startIdx, endIdx] where endIdx points to the character after the match
  const startIdx = (interval as any).startIdx;
  const endIdx = (interval as any).endIdx;

  // Calculate line and column by counting newlines up to the startIdx
  let lineStart = 1;
  let columnStart = 1;
  for (let i = 0; i < startIdx; i++) {
    if (sourceString[i] === "\n") {
      lineStart++;
      columnStart = 1;
    } else {
      columnStart++;
    }
  }

  // Calculate line and column for the end position
  let lineEnd = lineStart;
  let columnEnd = columnStart;
  for (let i = startIdx; i < endIdx; i++) {
    if (sourceString[i] === "\n") {
      lineEnd++;
      columnEnd = 1;
    } else {
      columnEnd++;
    }
  }

  return {
    lineStart,
    columnStart,
    lineEnd,
    columnEnd,
  };
}
