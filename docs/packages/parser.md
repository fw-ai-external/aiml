# @fireworks/parser Documentation

## Overview

This package is responsible for parsing AIML (and potentially SCXML) documents. It takes raw text or file streams as input and produces a structured representation, likely an Abstract Syntax Tree (AST), that other components like the language server or runtime can consume.

## Key Features/Functionality

- **AIML Parsing:** Parses standard AIML 1.x/2.x syntax.
- **SCXML Parsing:** May also parse State Chart XML (SCXML) documents if relevant to the project's AIML implementation.
- **AST Generation:** Creates a tree-like data structure representing the parsed document's elements, attributes, and content.
- **Error Reporting:** Identifies and reports syntax errors encountered during parsing.
- **Source Mapping:** Potentially maintains location information (line/column numbers) mapping AST nodes back to the original source text.

## Setup/Usage

This package is likely used as a library by other parts of the system.

```typescript
// Example Usage (Conceptual)
import { parseAIML } from "@fireworks/parser";

const aimlSource = `<aiml><category><pattern>HELLO</pattern><template>Hi there!</template></category></aiml>`;

try {
  const ast = parseAIML(aimlSource);
  console.log(ast);
  // Process the AST...
} catch (error) {
  console.error("Parsing failed:", error);
}
```

Setup usually involves installing it as a dependency in another package/application.

## Key Dependencies

- May use external parsing libraries (e.g., `chevrotain`, `antlr`) or be hand-written.
- Internal: May depend on `@fireworks/shared` for AST node types or interfaces.

## Architecture Notes

- **Parser Type:** Could be a recursive descent, LL(_), LR(_), or parser combinator implementation.
- **Lexer/Tokenizer:** May have a separate lexing phase to break input into tokens before parsing.
- **AST Structure:** Defines the node types and structure for the Abstract Syntax Tree.
- **Error Recovery:** May implement strategies to recover from syntax errors and continue parsing.
