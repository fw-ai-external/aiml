---
title: Language Server Documentation
---

## Overview

This package implements a Language Server Protocol (LSP) server specifically for AIML (and potentially SCXML). It provides language intelligence features (like diagnostics, completion, hover info) to LSP-compatible clients, such as the `fireagent-plugin-vscode` VS Code extension.

## Key Features/Functionality

- **LSP Implementation:** Adheres to the Language Server Protocol specification.
- **Diagnostics (Linting):** Analyzes AIML/SCXML documents using the `@aiml/parser` and reports errors or warnings.
- **Autocompletion:** Provides context-aware suggestions for tags, attributes, etc.
- **Hover Information:** Supplies documentation or details for elements under the cursor.
- **Document Symbol Provider:** Enables navigation via outlines or breadcrumbs.
- **(Potential Features):** Go to Definition, Find References, Formatting.

## Setup/Usage

This package is typically not used directly but is run as a separate process invoked by an LSP client (like the VS Code extension). Setup usually involves building the package:

```bash
bun install
bun run build
```

Client applications configure the path to the server's entry point (e.g., `./dist/server.js`).

## Key Dependencies

- **`vscode-languageserver`:** Core LSP library from Microsoft.
- **`vscode-languageserver-textdocument`:** Helper library for managing text documents.
- **Internal:** `@aiml/parser` (for parsing documents), `@aiml/shared` (for common types).

## Architecture Notes

- **LSP Request Handling:** Listens for and responds to LSP messages (requests/notifications) from the client.
- **Document Management:** Maintains state for open documents provided by the client.
- **Parsing Integration:** Uses the `@aiml/parser` to generate Abstract Syntax Trees (ASTs) for analysis.
- **Asynchronous:** Heavily reliant on `async/await` for handling requests and analysis.
