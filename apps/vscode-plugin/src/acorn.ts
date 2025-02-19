import {
  Project,
  Node,
  SyntaxKind,
  JsxElement,
  JsxOpeningElement,
} from "ts-morph";

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

export function parseToTokens(code: string): Token[] {
  const project = new Project();
  const sourceFile = project.createSourceFile("temp.tsx", `<>${code}</>`);
  const tokens: Token[] = [];
  let index = 0;

  function addToken(
    type: TokenType,
    start: number,
    end: number,
    raw: string,
    text: string
  ) {
    console.log("adding token", type, raw, text);
    tokens.push({
      index: index++,
      type,
      startIndex: start,
      endIndex: end,
      raw,
      text,
    });
  }

  function processJsxElement(element: JsxElement) {
    // Handle JSX fragments
    if (
      element.getKindName() === "JsxOpeningFragment" ||
      element.getKindName() === "JsxClosingFragment"
    ) {
      return;
    }
    if (element.getKindName() === "SyntaxList") {
      element.getChildren().forEach((child) => {
        if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
          processJsxElement(child as JsxElement);
        }
      });
      return;
    }

    const openingElement = Node.isJsxSelfClosingElement(element)
      ? element
      : element.getOpeningElement();
    const tagName = Node.isJsxSelfClosingElement(element)
      ? element.getTagNameNode()
      : (openingElement as JsxOpeningElement).getTagNameNode();

    // Opening tag
    addToken(
      TokenType.StartTag,
      openingElement.getStart(),
      openingElement.getStart() + 1,
      "<",
      "<"
    );

    // Tag name
    addToken(
      TokenType.TagName,
      tagName.getStart(),
      tagName.getEnd(),
      tagName.getText(),
      tagName.getText()
    );

    // Handle whitespace between attributes
    let lastEnd = tagName.getEnd();

    // Process attributes
    for (const attribute of openingElement.getAttributes()) {
      if (Node.isJsxAttribute(attribute)) {
        // Add whitespace token if there's space before the attribute
        if (attribute.getStart() > lastEnd) {
          addToken(
            TokenType.Whitespace,
            lastEnd,
            attribute.getStart(),
            " ",
            " "
          );
        }

        const nameNode = attribute.getNameNode();
        addToken(
          TokenType.AttributeName,
          nameNode.getStart(),
          nameNode.getEnd(),
          nameNode.getText(),
          nameNode.getText()
        );

        const initializer = attribute.getInitializer();
        if (initializer) {
          // Add equals sign
          addToken(
            TokenType.Equal,
            nameNode.getEnd(),
            nameNode.getEnd() + 1,
            "=",
            "="
          );

          if (Node.isStringLiteral(initializer)) {
            const value = initializer.getText();
            // Keep quotes in raw value but remove from text
            addToken(
              TokenType.AttributeString,
              initializer.getStart(),
              initializer.getEnd(),
              value,
              value.slice(1, -1)
            );
          } else if (Node.isJsxExpression(initializer)) {
            const expression = initializer.getExpression();
            if (expression) {
              const expressionText = expression.getText();
              const raw = initializer.getText();
              const kindName = expression.getKindName();

              if (kindName === "TrueKeyword" || kindName === "FalseKeyword") {
                addToken(
                  TokenType.AttributeBoolean,
                  initializer.getStart(),
                  initializer.getEnd(),
                  raw,
                  expressionText
                );
              } else if (Node.isObjectLiteralExpression(expression)) {
                addToken(
                  TokenType.AttributeObject,
                  initializer.getStart(),
                  initializer.getEnd(),
                  raw,
                  expressionText
                );
              } else if (Node.isArrayLiteralExpression(expression)) {
                addToken(
                  TokenType.AttributeArray,
                  initializer.getStart(),
                  initializer.getEnd(),
                  raw,
                  expressionText
                );
              } else if (
                Node.isArrowFunction(expression) ||
                Node.isFunctionExpression(expression)
              ) {
                addToken(
                  TokenType.AttributeFunction,
                  initializer.getStart(),
                  initializer.getEnd(),
                  raw,
                  expressionText
                );
              } else {
                addToken(
                  TokenType.AttributeExpression,
                  initializer.getStart(),
                  initializer.getEnd(),
                  raw,
                  expressionText
                );
              }
            }
          }
        }
        lastEnd = attribute.getEnd();
      }
    }

    // Add whitespace before closing if needed
    if (openingElement.getEnd() > lastEnd + 1) {
      addToken(
        TokenType.Whitespace,
        lastEnd,
        openingElement.getEnd() -
          (Node.isJsxSelfClosingElement(element) ? 2 : 1),
        " ",
        " "
      );
    }

    // Closing of opening tag
    if (Node.isJsxSelfClosingElement(element)) {
      addToken(
        TokenType.SimpleEndTag,
        openingElement.getEnd() - 2,
        openingElement.getEnd(),
        "/>",
        "/>"
      );
    } else {
      addToken(
        TokenType.EndTag,
        openingElement.getEnd() - 1,
        openingElement.getEnd(),
        ">",
        ">"
      );
    }

    // Process children
    for (const child of element.getChildren()) {
      if (Node.isJsxElement(child)) {
        processJsxElement(child);
      } else if (Node.isJsxText(child)) {
        const text = child.getText();
        const trimmed = text.trim();
        if (trimmed) {
          addToken(
            TokenType.AttributeString,
            child.getStart(),
            child.getEnd(),
            text,
            trimmed
          );
        } else if (text.includes("\n") || text.includes(" ")) {
          addToken(
            TokenType.Whitespace,
            child.getStart(),
            child.getEnd(),
            text,
            text
          );
        }
      } else if (Node.isJsxExpression(child)) {
        addToken(
          TokenType.AttributeExpression,
          child.getStart(),
          child.getEnd(),
          child.getText(),
          child.getText()
        );
      }
    }

    if (Node.isJsxSelfClosingElement(element)) {
      return;
    }
    // Closing tag
    const closingElement = element.getClosingElement();
    if (closingElement) {
      addToken(
        TokenType.StartEndTag,
        closingElement.getStart(),
        closingElement.getStart() + 2,
        "</",
        "</"
      );

      const closingTagName = closingElement.getTagNameNode();
      addToken(
        TokenType.TagName,
        closingTagName.getStart(),
        closingTagName.getEnd(),
        closingTagName.getText(),
        closingTagName.getText()
      );

      addToken(
        TokenType.EndTag,
        closingElement.getEnd() - 1,
        closingElement.getEnd(),
        ">",
        ">"
      );
    }
  }

  try {
    const jsxFragment = sourceFile.getDescendantsOfKind(
      SyntaxKind.JsxFragment
    )[0];
    if (!jsxFragment) {
      throw new Error("Invalid JSX: No root element found");
    }

    const children = jsxFragment.getChildren();
    const jsxElements = children.filter(
      (child) => Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)
    );

    if (jsxElements.length === 0) {
      throw new Error("Invalid JSX: No elements found");
    }

    if (jsxElements.length > 1) {
      throw new Error("Invalid JSX: Multiple root elements are not allowed");
    }

    processJsxElement(jsxElements[0] as JsxElement);
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
        error: error instanceof Error ? error.message : "Invalid JSX syntax",
      },
    ];
  }
}
