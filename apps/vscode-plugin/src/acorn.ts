import * as acorn from "acorn";
import jsx from "acorn-jsx";

export enum TokenType {
  None = "None",
  Invalid = "Invalid",
  Whitespace = "Whitespace",
  Heading = "Heading",
  Paragraph = "Paragraph", // markdown paragraph as a child of a tag, or a standalone paragraph outside of a tag
  Comment = "Comment", // <!-- ... -->
  Name = "Name", // any element or attribute name (for example, `svg`, `rect`, `width`)
  TagName = "TagName", // any element or attribute name (for example, `svg`, `rect`, `width`)
  AttributeName = "AttributeName", // any attribute name (for example, `id`, `class`, `style`)
  AttributeString = "AttributeString", // any attribute value (for example, `attribute="100"`, `attribute="red"`, `attribute="100px"`)
  AttributeExpression = "AttributeExpression", // any attribute value (for example, `attribute={true ? "yes" : "no"}`, `attribute={false}`, `attribute={100}`,
  AttributeBoolean = "AttributeBoolean", // `attribute={true}`, `attribute={false}`
  AttributeNumber = "AttributeNumber", // `attribute={100}`
  AttributeObject = "AttributeObject", // `attribute={{a: 1, b: 2}}`
  AttributeArray = "AttributeArray", // `attribute={[1, 2, 3]}`
  AttributeFunction = "AttributeFunction", // `attribute={() => {}}` or multiple lines of code between `{` and `}`)
  StartTag = "StartTag", // <
  SimpleEndTag = "SimpleEndTag", // />
  EndTag = "EndTag", // >
  StartEndTag = "StartEndTag", // </
  Equal = "Equal", // =
}

export interface Token {
  index: number;
  type: TokenType;
  startIndex: number;
  endIndex: number;
  raw: string;
  text: string;
  error?: string | { code: number; message: string };
  children?: Token[];
}

export function parse(code: string): acorn.Program {
  // Handle incomplete JSX by adding a closing tag if needed

  try {
    return acorn.Parser.extend(jsx()).parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
  } catch (error) {
    // TODO: handle error
    console.error(error);
    throw error;
  }
}

interface NodePosition {
  start: number;
  end: number;
}

interface JSXNamespacedName extends NodePosition {
  type: "JSXNamespacedName";
  namespace: { type: "JSXIdentifier"; name: string };
  name: { type: "JSXIdentifier"; name: string };
}

interface JSXIdentifier extends NodePosition {
  type: "JSXIdentifier";
  name: string;
}

interface JSXAttribute extends NodePosition {
  type: "JSXAttribute";
  name: JSXIdentifier | JSXNamespacedName;
  value: {
    type: "JSXExpressionContainer" | "Literal";
    start: number;
    end: number;
    expression?: NodePosition;
    value?: string;
  } | null;
}

interface JSXElement extends NodePosition {
  type: "JSXElement";
  openingElement: {
    type: "JSXOpeningElement";
    start: number;
    end: number;
    name: NodePosition;
    attributes: JSXAttribute[];
    selfClosing: boolean;
  };
  children: Array<
    | JSXElement
    | (NodePosition & { type: "JSXText"; value: string })
    | (NodePosition & {
        type: "JSXExpressionContainer";
        expression: NodePosition;
      })
  >;
  closingElement?: {
    type: "JSXClosingElement";
    start: number;
    end: number;
    name: NodePosition;
  };
}

interface ExpressionStatement extends NodePosition {
  type: "ExpressionStatement";
  expression: JSXElement;
}

export function parseToTokens(code: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const originalLength = code.length;

  function addToken(
    type: TokenType,
    node: NodePosition,
    raw?: string,
    text?: string
  ) {
    // Only add tokens that are within the original code bounds
    if (node.start < originalLength) {
      tokens.push({
        index: index++,
        type,
        startIndex: node.start,
        endIndex: Math.min(node.end, originalLength),
        raw: raw || code.slice(node.start, Math.min(node.end, originalLength)),
        text:
          text || code.slice(node.start, Math.min(node.end, originalLength)),
      });
    }
  }

  function processJSXElement(node: JSXElement) {
    // Opening tag
    addToken(
      TokenType.StartTag,
      {
        start: node.openingElement.start,
        end: node.openingElement.start + 1,
      },
      "<",
      "<"
    );

    // Tag name
    const nameNode = node.openingElement.name;
    addToken(TokenType.TagName, nameNode);

    // Attributes
    let lastEnd = nameNode.end;
    for (const attr of node.openingElement.attributes) {
      if (attr.type === "JSXAttribute") {
        // Add attribute name
        const nameNode = attr.name;
        const nameRaw =
          nameNode.type === "JSXNamespacedName"
            ? `${nameNode.namespace.name}:${nameNode.name.name}`
            : nameNode.name;
        addToken(TokenType.AttributeName, nameNode, nameRaw, nameRaw);

        if (attr.value) {
          // Add equals sign
          addToken(
            TokenType.Equal,
            { start: attr.name.end, end: attr.name.end + 1 },
            "=",
            "="
          );

          if (
            attr.value.type === "JSXExpressionContainer" &&
            attr.value.expression
          ) {
            const expressionText = code
              .slice(attr.value.expression.start, attr.value.expression.end)
              .trim();
            const raw = code.slice(attr.value.start, attr.value.end);

            // Check for different types of expressions
            if (expressionText.match(/^(['"`])(.*)\1$/)) {
              // String literals
              const content = expressionText.slice(1, -1);
              const quote = expressionText[0];
              addToken(
                TokenType.AttributeString,
                attr.value,
                `${quote}${content}${quote}`,
                content
              );
            } else if (
              expressionText === "true" ||
              expressionText === "false"
            ) {
              // Boolean literals
              addToken(
                TokenType.AttributeBoolean,
                attr.value,
                raw,
                expressionText
              );
            } else if (
              expressionText.startsWith("{") &&
              expressionText.endsWith("}")
            ) {
              // Object literals
              addToken(
                TokenType.AttributeObject,
                attr.value,
                raw,
                expressionText
              );
            } else if (
              expressionText.startsWith("[") &&
              expressionText.endsWith("]")
            ) {
              // Array literals
              addToken(
                TokenType.AttributeArray,
                attr.value,
                raw,
                expressionText
              );
            } else if (
              expressionText.includes("=>") ||
              expressionText.startsWith("function")
            ) {
              // Function expressions
              const expression = attr.value;

              const raw = code.slice(expression.start, expression.end);
              const expressionText = raw.slice(1, -1); // Remove curly braces

              addToken(
                TokenType.AttributeFunction,
                attr.value,
                raw,
                expressionText
              );
            } else {
              // Other expressions
              addToken(
                TokenType.AttributeExpression,
                attr.value,
                raw,
                expressionText
              );
            }
          } else if (attr.value.type === "Literal") {
            const raw = code.slice(attr.value.start, attr.value.end);
            const text = raw.slice(1, -1); // Remove quotes
            addToken(TokenType.AttributeString, attr.value, raw, text);
          }
        }
        lastEnd = attr.end;
      }
    }

    // Check for whitespace before closing
    const wsStart = lastEnd;
    const wsEnd = node.openingElement.selfClosing
      ? node.openingElement.end - 2
      : node.openingElement.end - 1;
    if (wsEnd > wsStart && wsEnd < originalLength) {
      const ws = code.slice(wsStart, wsEnd);
      if (/\s+/.test(ws)) {
        addToken(TokenType.Whitespace, { start: wsStart, end: wsEnd }, ws, ws);
      }
    }

    // Closing of opening tag
    if (node.openingElement.selfClosing) {
      if (node.openingElement.end <= originalLength) {
        addToken(
          TokenType.SimpleEndTag,
          {
            start: node.openingElement.end - 2,
            end: node.openingElement.end,
          },
          "/>",
          "/>"
        );
      }
    } else {
      if (node.openingElement.end <= originalLength) {
        addToken(
          TokenType.EndTag,
          {
            start: node.openingElement.end - 1,
            end: node.openingElement.end,
          },
          ">",
          ">"
        );
      }
    }

    // Only process children and closing tag if they're within original bounds
    if (node.end <= originalLength) {
      // Children
      for (const child of node.children) {
        if (child.type === "JSXElement") {
          processJSXElement(child);
        } else if (child.type === "JSXText") {
          const text = child.value.trim();
          if (text) {
            addToken(TokenType.AttributeString, child, child.value, text);
          }
        } else if (child.type === "JSXExpressionContainer") {
          addToken(TokenType.AttributeExpression, child);
        }
      }

      // Closing tag if not self-closing
      if (!node.openingElement.selfClosing && node.closingElement) {
        addToken(
          TokenType.StartEndTag,
          {
            start: node.closingElement.start,
            end: node.closingElement.start + 2,
          },
          "</",
          "</"
        );
        addToken(TokenType.TagName, node.closingElement.name);
        addToken(
          TokenType.EndTag,
          {
            start: node.closingElement.end - 1,
            end: node.closingElement.end,
          },
          ">",
          ">"
        );
      }
    }
  }

  try {
    const ast = parse(code);

    // Process the AST
    for (const node of ast.body) {
      if (
        node.type === "ExpressionStatement" &&
        "expression" in node &&
        ((node as any).expression.type === "JSXElement" ||
          (node as any).expression.type === "JSXFragment")
      ) {
        const expr = (node as any).expression;
        if (expr.type === "JSXElement") {
          processJSXElement(expr);
        } else if (expr.type === "JSXFragment") {
          for (const child of expr.children) {
            if (child.type === "JSXElement") {
              processJSXElement(child);
            }
          }
        }
      }
    }

    // Post-process tokens to fix raw values
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.AttributeString) {
        // Fix string literals to include quotes
        const quote = token.raw.startsWith("'") ? "'" : '"';
        token.raw = `${quote}${token.text}${quote}`;
      } else if (token.type === TokenType.AttributeBoolean) {
        // Fix boolean literals to not include braces
        token.text = token.text.replace(/[{}]/g, "");
      }
    }

    return tokens;
  } catch (error) {
    return [
      {
        index: 0,
        type: TokenType.Invalid,
        startIndex: 0,
        endIndex: code.length,
        raw: code,
        text: code,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      },
    ];
  }
}
