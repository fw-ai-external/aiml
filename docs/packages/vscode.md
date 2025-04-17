---
title: VSCode Plugin Documentation
---

## Overview

This package likely provides foundational language support features or shared utilities specifically for AIML within the VS Code environment. It might define language configurations (e.g., brackets, comments), basic syntax definitions (if not handled solely by the extension), or utilities used by both the extension (`apps/vscode-plugin`) and potentially the language server.

Clarification Needed: The exact relationship and division of responsibilities between this package (`packages/vscode`) and the application (`apps/vscode-plugin`) should be clarified. Is this package consumed by the plugin, or does it represent an older/alternative approach?

## Key Features/Functionality

- **Language Configuration:** Defines settings like comment toggles, bracket pairs, auto-closing pairs (`language-configuration.json`).
- **Basic Syntax:** Could contain a TextMate grammar (`.tmLanguage`) file for basic syntax highlighting if not fully delegated to the extension or language server.
- **Shared Utilities:** VS Code specific utilities that might be useful for both the extension client and potentially the language server (if it needs VS Code context, though less common).

## Setup/Usage

This package is likely intended to be imported or consumed by `apps/vscode-plugin`.

```typescript
// Example Usage (Conceptual - if it exports utilities)
import { someVscodeUtil } from "vscode-aiml";
```

Setup involves installing it as a dependency in `apps/vscode-plugin`.

## Key Dependencies

- May have minimal dependencies, potentially including types from `@types/vscode`.
- Internal: `@fireworks/shared` could be a dependency.

## Architecture Notes

- **Focus:** Provides static configurations or shared helper functions related to the VS Code environment for AIML.
- **Relationship to Plugin:** Needs clear definition of how it interacts with or is used by `apps/vscode-plugin`.
