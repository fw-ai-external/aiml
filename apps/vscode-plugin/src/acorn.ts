import * as acorn from "acorn";
import jsx from "acorn-jsx";

export enum TokenType {
  None,
  Invalid,
  Whitespace,
  String, // "..."
  Comment, // <!-- ... -->
  Name, // any element or attribute name (for example, `svg`, `rect`, `width`)
  TagName, // any element or attribute name (for example, `svg`, `rect`, `width`)
  AttributeName, // any attribute name (for example, `id`, `class`, `style`)
  AttributeValue, // any attribute value (for example, `"100"`, `"red"`, `"100px"`,`{true ? "yes" : "no"}`, `{false}`, `{100}`, or multiple lines of code between `{` and `}`)
  StartTag, // <
  SimpleEndTag, // />
  EndTag, // >
  StartEndTag, // </
  Equal, // =
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
  return acorn.Parser.extend(jsx()).parse(code, {
    ecmaVersion: "latest",
  });
}

export function parseToTokens(code: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let pos = 0;

  try {
    while (pos < code.length) {
      let char = code[pos];

      // Skip whitespace between tokens
      if (/\s/.test(char)) {
        while (pos < code.length && /\s/.test(code[pos])) pos++;
        continue;
      }

      // Handle comments <!-- -->
      if (char === "<" && code.slice(pos, pos + 4) === "<!--") {
        const start = pos;
        pos += 4;
        while (pos < code.length && code.slice(pos - 3, pos) !== "-->") pos++;
        tokens.push({
          index: index++,
          type: TokenType.Comment,
          startIndex: start,
          endIndex: pos,
          raw: code.slice(start, pos),
          text: code.slice(start + 4, pos - 3).trim(),
        });
        continue;
      }

      // Handle opening tags
      if (char === "<") {
        const start = pos;
        pos++;

        // Check for closing tag
        if (code[pos] === "/") {
          tokens.push({
            index: index++,
            type: TokenType.StartEndTag,
            startIndex: start,
            endIndex: pos + 1,
            raw: "</",
            text: "</",
          });
          pos++;
        } else {
          tokens.push({
            index: index++,
            type: TokenType.StartTag,
            startIndex: start,
            endIndex: pos,
            raw: "<",
            text: "<",
          });
        }

        // Get tag name
        const nameStart = pos;
        while (pos < code.length && /[a-zA-Z0-9_-]/.test(code[pos])) pos++;
        if (pos > nameStart) {
          tokens.push({
            index: index++,
            type: TokenType.TagName,
            startIndex: nameStart,
            endIndex: pos,
            raw: code.slice(nameStart, pos),
            text: code.slice(nameStart, pos),
          });
        }

        // Handle attributes
        while (pos < code.length && code[pos] !== ">" && code[pos] !== "/") {
          // Skip whitespace
          while (pos < code.length && /\s/.test(code[pos])) pos++;
          if (pos >= code.length || code[pos] === ">" || code[pos] === "/")
            break;

          // Get attribute name
          const attrNameStart = pos;
          while (pos < code.length && /[a-zA-Z0-9_-]/.test(code[pos])) pos++;
          if (pos > attrNameStart) {
            tokens.push({
              index: index++,
              type: TokenType.AttributeName,
              startIndex: attrNameStart,
              endIndex: pos,
              raw: code.slice(attrNameStart, pos),
              text: code.slice(attrNameStart, pos),
            });

            // Skip whitespace before =
            while (pos < code.length && /\s/.test(code[pos])) pos++;

            // Handle =
            if (code[pos] === "=") {
              tokens.push({
                index: index++,
                type: TokenType.Equal,
                startIndex: pos,
                endIndex: pos + 1,
                raw: "=",
                text: "=",
              });
              pos++;

              // Skip whitespace after =
              while (pos < code.length && /\s/.test(code[pos])) pos++;

              // Handle attribute value
              if (code[pos] === "{") {
                // JSX expression
                const exprStart = pos;
                pos++; // Skip {
                let braceCount = 1;
                while (pos < code.length && braceCount > 0) {
                  if (code[pos] === "{") braceCount++;
                  if (code[pos] === "}") braceCount--;
                  pos++;
                }
                tokens.push({
                  index: index++,
                  type: TokenType.AttributeValue,
                  startIndex: exprStart,
                  endIndex: pos,
                  raw: code.slice(exprStart, pos),
                  text: code.slice(exprStart + 1, pos - 1),
                });
              } else if (code[pos] === '"' || code[pos] === "'") {
                // String literal
                const quote = code[pos];
                const valueStart = pos;
                pos++; // Skip opening quote
                while (pos < code.length && code[pos] !== quote) pos++;
                pos++; // Skip closing quote
                tokens.push({
                  index: index++,
                  type: TokenType.String,
                  startIndex: valueStart,
                  endIndex: pos,
                  raw: code.slice(valueStart, pos),
                  text: code.slice(valueStart + 1, pos - 1),
                });
              }
            }
          }
        }

        // Handle tag end
        if (code[pos] === "/" && code[pos + 1] === ">") {
          // Check for whitespace before />
          const wsStart = pos - 1;
          if (/\s/.test(code[wsStart])) {
            tokens.push({
              index: index++,
              type: TokenType.Whitespace,
              startIndex: wsStart,
              endIndex: pos,
              raw: code.slice(wsStart, pos),
              text: code.slice(wsStart, pos),
            });
          }
          tokens.push({
            index: index++,
            type: TokenType.SimpleEndTag,
            startIndex: pos,
            endIndex: pos + 2,
            raw: "/>",
            text: "/>",
          });
          pos += 2;
        } else if (code[pos] === ">") {
          tokens.push({
            index: index++,
            type: TokenType.EndTag,
            startIndex: pos,
            endIndex: pos + 1,
            raw: ">",
            text: ">",
          });
          pos++;
        }
      } else {
        // Handle text content
        const textStart = pos;
        while (pos < code.length && code[pos] !== "<") pos++;
        if (pos > textStart) {
          const rawText = code.slice(textStart, pos);
          const trimmedText = rawText.trim();
          if (trimmedText) {
            tokens.push({
              index: index++,
              type: TokenType.String,
              startIndex: textStart,
              endIndex: pos,
              raw: rawText,
              text: trimmedText,
            });
          }
        }
      }
    }
    // Validate XML structure
    let tagStack = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === TokenType.StartTag) {
        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.TagName) {
          tagStack.push(tokens[i + 1].text);
        }
      } else if (token.type === TokenType.StartEndTag) {
        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.TagName) {
          const closingTag = tokens[i + 1].text;
          const lastOpenTag = tagStack.pop();
          if (lastOpenTag !== closingTag) {
            return [
              {
                index: 0,
                type: TokenType.Invalid,
                startIndex: 0,
                endIndex: code.length,
                raw: code,
                text: code,
                error: `Mismatched tags: expected </${lastOpenTag}> but found </${closingTag}>`,
              },
            ];
          }
        }
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
