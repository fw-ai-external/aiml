---
title: AIML Runtime Library Documentation
---

## Overview

This package provides the core runtime engine for executing AIML logic. It takes a parsed AIML structure (likely from `@fireworks/parser`) and manages the state, processes inputs, matches patterns, and generates responses according to the AIML specification.

## Key Features/Functionality

- **AIML Interpretation:** Executes the logic defined in AIML documents.
- **State Management:** Maintains the conversational state, including predicates and variables.
- **Pattern Matching:** Implements the AIML pattern matching algorithm.
- **Input Processing:** Handles user inputs and prepares them for matching.
- **Template Processing:** Executes AIML template-side tags (e.g., `<star/>`, `<get/>`, `<set/>`, `<srai/>`).
- **Extensibility:** May provide hooks or mechanisms for adding custom tags or functions.

## Setup/Usage

This package is likely used as a library by backend applications (like `apps/server`) or testing tools.

```typescript
// Example Usage (Conceptual)
import { AimlRuntime } from "@fireworks/runtime";
import { parseAIML } from "@fireworks/parser"; // Assuming parser is used

// Load/parse AIML files
const ast = parseAIML(aimlSource);

const runtime = new AimlRuntime();
runtime.loadAst(ast);

const userInput = "HELLO BOT";
const response = await runtime.getResponse(userInput);
console.log("Bot:", response);
```

Setup involves installing it as a dependency.

## Key Dependencies

- Internal: `@fireworks/parser` (to get the AST), `@fireworks/shared` (for common types/structures).
- May have dependencies related to specific features (e.g., libraries for date formatting, external calls if supported).

## Architecture Notes

- **Interpreter Pattern:** Likely implements an interpreter for the AIML language.
- **State Machine:** May internally use state machine concepts for handling conversation flow (especially if integrating SCXML).
- **Graph-Based Matching:** The pattern matching might involve graph traversal or similar efficient algorithms.
- **Modular Design:** Core functions (matching, template processing, state) might be separate modules.
