import * as ts from "typescript";

export enum TokenType {
  None = "None",
  Invalid = "Invalid",
  Whitespace = "Whitespace",
  Heading = "Heading",
  Paragraph = "Paragraph",
  Comment = "Comment",
  Name = "Name",
  TagName = "TagName",
  AttributeName = "AttributeName",
  AttributeString = "AttributeString",
  AttributeExpression = "AttributeExpression",
  AttributeBoolean = "AttributeBoolean",
  AttributeNumber = "AttributeNumber",
  AttributeObject = "AttributeObject",
  AttributeArray = "AttributeArray",
  AttributeFunction = "AttributeFunction",
  StartTag = "StartTag",
  SimpleEndTag = "SimpleEndTag",
  EndTag = "EndTag",
  StartEndTag = "StartEndTag",
  Equal = "Equal",
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

export function parse(
  code: string
): ts.SourceFile & { type?: string; body?: any[] } {
  // Wrap JSX in a TypeScript expression if needed
  const wrappedCode = code.trim().startsWith("<") ? `(${code})` : code;

  const sourceFile = ts.createSourceFile(
    "temp.tsx",
    wrappedCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  ) as ts.SourceFile & { type?: string; body?: any[] };

  // Add acorn-compatible properties
  sourceFile.type = "Program";
  sourceFile.body = Array.from(sourceFile.statements);

  // Find the first statement and check if it's an ExpressionStatement
  if (sourceFile.statements.length > 0) {
    const firstStatement = sourceFile.statements[0];
    if (ts.isExpressionStatement(firstStatement)) {
      firstStatement.kind = ts.SyntaxKind.ExpressionStatement;
    }
  }

  return sourceFile;
}

export function parseToTokens(code: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const originalLength = code.length;

  try {
    // Handle incomplete or invalid JSX
    if (code.includes("<") && !code.includes(">")) {
      return [
        {
          index: 0,
          type: TokenType.Invalid,
          startIndex: 0,
          endIndex: code.length,
          raw: code,
          text: code,
          error: "Incomplete JSX",
        },
      ];
    }

    const sourceFile = parse(code);

    function addToken(
      type: TokenType,
      start: number,
      end: number,
      raw?: string
    ) {
      if (start < originalLength) {
        // Adjust positions to account for the wrapping parentheses
        const adjustedStart = Math.max(0, start - 1);
        const adjustedEnd = Math.min(end - 1, originalLength);
        const tokenText = raw || code.slice(adjustedStart, adjustedEnd);

        tokens.push({
          index: index++,
          type,
          startIndex: adjustedStart,
          endIndex: adjustedEnd,
          raw: tokenText,
          text:
            type === TokenType.AttributeString
              ? tokenText.slice(1, -1)
              : type === TokenType.AttributeBoolean
                ? tokenText.replace(/[{}]/g, "").trim()
                : type === TokenType.AttributeExpression
                  ? tokenText.replace(/[{}]/g, "").trim()
                  : type === TokenType.AttributeObject
                    ? tokenText.replace(/[{}]/g, "").trim()
                    : type === TokenType.AttributeArray
                      ? tokenText.replace(/[{}]/g, "").trim()
                      : tokenText,
        });
      }
    }

    function scanJsxElement(
      node: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment
    ) {
      if (ts.isJsxSelfClosingElement(node)) {
        // Opening tag
        addToken(TokenType.StartTag, node.getStart(), node.getStart() + 1, "<");

        // Tag name
        const tagName = node.tagName.getText();
        addToken(
          TokenType.TagName,
          node.tagName.getStart(),
          node.tagName.getEnd(),
          tagName
        );

        // Attributes
        scanAttributes(node.attributes);

        // Self-closing tag
        const closeStart = node.getEnd() - 2;
        if (closeStart > node.tagName.getEnd()) {
          addToken(
            TokenType.Whitespace,
            node.tagName.getEnd(),
            closeStart,
            " "
          );
        }
        addToken(TokenType.SimpleEndTag, closeStart, node.getEnd(), "/>");
      } else if (ts.isJsxFragment(node)) {
        // Opening fragment
        addToken(
          TokenType.StartTag,
          node.openingFragment.getStart(),
          node.openingFragment.getStart() + 1,
          "<"
        );
        addToken(
          TokenType.EndTag,
          node.openingFragment.getEnd() - 1,
          node.openingFragment.getEnd(),
          ">"
        );

        // Children
        node.children.forEach((child) => {
          if (
            ts.isJsxElement(child) ||
            ts.isJsxSelfClosingElement(child) ||
            ts.isJsxFragment(child)
          ) {
            scanJsxElement(child);
          } else if (ts.isJsxText(child)) {
            const text = child.getText().trim();
            if (text) {
              addToken(
                TokenType.AttributeString,
                child.getStart(),
                child.getEnd(),
                `"${text}"`
              );
            }
          } else if (ts.isJsxExpression(child)) {
            scanJsxExpression(child);
          }
        });

        // Closing fragment
        addToken(
          TokenType.StartEndTag,
          node.closingFragment.getStart(),
          node.closingFragment.getStart() + 2,
          "</"
        );
        addToken(
          TokenType.EndTag,
          node.closingFragment.getEnd() - 1,
          node.closingFragment.getEnd(),
          ">"
        );
      } else {
        // Opening tag
        const openingElement = node.openingElement;
        addToken(
          TokenType.StartTag,
          openingElement.getStart(),
          openingElement.getStart() + 1,
          "<"
        );

        // Tag name
        const tagName = openingElement.tagName.getText();
        addToken(
          TokenType.TagName,
          openingElement.tagName.getStart(),
          openingElement.tagName.getEnd(),
          tagName
        );

        // Attributes
        scanAttributes(openingElement.attributes);

        // End of opening tag
        addToken(
          TokenType.EndTag,
          openingElement.getEnd() - 1,
          openingElement.getEnd(),
          ">"
        );

        // Children
        node.children.forEach((child) => {
          if (
            ts.isJsxElement(child) ||
            ts.isJsxSelfClosingElement(child) ||
            ts.isJsxFragment(child)
          ) {
            scanJsxElement(child);
          } else if (ts.isJsxText(child)) {
            const text = child.getText().trim();
            if (text) {
              addToken(
                TokenType.AttributeString,
                child.getStart(),
                child.getEnd(),
                `"${text}"`
              );
            }
          } else if (ts.isJsxExpression(child)) {
            scanJsxExpression(child);
          }
        });

        // Closing tag
        const closingElement = node.closingElement;
        addToken(
          TokenType.StartEndTag,
          closingElement.getStart(),
          closingElement.getStart() + 2,
          "</"
        );
        addToken(
          TokenType.TagName,
          closingElement.tagName.getStart(),
          closingElement.tagName.getEnd(),
          tagName
        );
        addToken(
          TokenType.EndTag,
          closingElement.getEnd() - 1,
          closingElement.getEnd(),
          ">"
        );
      }
    }

    function scanAttributes(attributes: ts.JsxAttributes) {
      attributes.properties.forEach((prop) => {
        if (ts.isJsxAttribute(prop)) {
          // Attribute name
          addToken(
            TokenType.AttributeName,
            prop.name.getStart(),
            prop.name.getEnd(),
            prop.name.getText()
          );

          if (prop.initializer) {
            // Equals sign
            addToken(
              TokenType.Equal,
              prop.name.getEnd(),
              prop.name.getEnd() + 1,
              "="
            );

            if (ts.isStringLiteral(prop.initializer)) {
              // String literal
              addToken(
                TokenType.AttributeString,
                prop.initializer.getStart(),
                prop.initializer.getEnd(),
                prop.initializer.getText()
              );
            } else if (ts.isJsxExpression(prop.initializer)) {
              scanJsxExpression(prop.initializer);
            }
          }
        }
      });
    }

    function scanJsxExpression(node: ts.JsxExpression) {
      if (!node.expression) return;

      const start = node.getStart();
      const end = node.getEnd();
      const expressionText = node.expression.getText();
      const raw = node.getText();

      if (
        ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression)
      ) {
        // Handle string literals and template literals
        const quote = expressionText.startsWith("'") ? "'" : '"';
        addToken(
          TokenType.AttributeString,
          start,
          end,
          `${quote}${expressionText.slice(1, -1)}${quote}`
        );
      } else if (expressionText === "true" || expressionText === "false") {
        // Handle boolean literals
        addToken(TokenType.AttributeBoolean, start, end, raw);
      } else if (ts.isObjectLiteralExpression(node.expression)) {
        // Handle object literals
        addToken(TokenType.AttributeObject, start, end, raw);
      } else if (ts.isArrayLiteralExpression(node.expression)) {
        // Handle array literals
        addToken(TokenType.AttributeArray, start, end, raw);
      } else if (
        ts.isArrowFunction(node.expression) ||
        ts.isFunctionExpression(node.expression)
      ) {
        // Handle function expressions
        addToken(TokenType.AttributeFunction, start, end, expressionText);
      } else {
        // Handle other expressions
        addToken(TokenType.AttributeExpression, start, end, expressionText);
      }
    }

    // Find all JSX elements
    function findJsxElements(node: ts.Node): ts.Node[] {
      const elements: ts.Node[] = [];
      if (
        ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node)
      ) {
        elements.push(node);
      }
      ts.forEachChild(node, (child) => {
        elements.push(...findJsxElements(child));
      });
      return elements;
    }

    // Check for multiple root elements
    const jsxElements = findJsxElements(sourceFile);
    if (jsxElements.length > 1) {
      return [
        {
          index: 0,
          type: TokenType.Invalid,
          startIndex: 0,
          endIndex: code.length,
          raw: code,
          text: code,
          error: "Multiple root elements are not allowed",
        },
      ];
    }

    // Process JSX elements
    jsxElements.forEach((element) => {
      if (
        ts.isJsxElement(element) ||
        ts.isJsxSelfClosingElement(element) ||
        ts.isJsxFragment(element)
      ) {
        scanJsxElement(element);
      }
    });

    // Handle invalid syntax
    if (tokens.length === 0 && code.trim().length > 0) {
      return [
        {
          index: 0,
          type: TokenType.Invalid,
          startIndex: 0,
          endIndex: code.length,
          raw: code,
          text: code,
          error: "Invalid JSX syntax",
        },
      ];
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
    ];
  }
}
