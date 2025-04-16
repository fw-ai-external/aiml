# fireagent-plugin-vscode Documentation

## Overview

This VS Code extension provides rich language support for AIML and SCXML files within the editor. It enhances the developer experience by offering features like syntax highlighting, code validation, autocompletion, and potentially other intelligent capabilities.

(The description "SCXML language support..." seems specific to SCXML, but the name suggests AIML focus. Clarification might be needed on the exact scope.)

## Key Features/Functionality

- **Syntax Highlighting:** Provides color coding for AIML/SCXML syntax elements.
- **Code Validation (Linting):** Detects syntax errors and potential issues in AIML/SCXML documents.
- **Autocompletion:** Suggests relevant tags, attributes, or values while typing.
- **Hover Information:** Displays documentation or type information for elements on hover.
- **Snippets:** Offers pre-defined code blocks for common AIML/SCXML structures.
- **Integration with Language Server:** Communicates with the `@fireworks/language-server` package to provide advanced language features.

## Setup/Usage

1.  **Build:** Compile the extension code.
    ```bash
    bun install
    bun run compile # Or similar build script
    ```
2.  **Package:** Create the VSIX installation file.
    ```bash
    bun run package # Or use 'vsce package'
    ```
3.  **Install:** Install the generated `.vsix` file into VS Code using the "Install from VSIX..." command in the Extensions view.

_(Note: Actual commands may vary)_

Usage involves opening AIML or SCXML files in VS Code with the extension installed.

## Key Dependencies

- **VS Code API (`vscode`):** Core dependency for interacting with the editor.
- **`vscode-languageclient`:** Facilitates communication with the language server.
- **Internal:** `@fireworks/language-server` (runtime dependency), possibly `@fireworks/shared`.

## Architecture Notes

- **Extension Structure:** Follows standard VS Code extension structure (`package.json` manifest, activation events, contribution points).
- **Language Client:** Implements the client side of the Language Server Protocol (LSP).
- **Communication:** Uses JSON-RPC over standard I/O (or other transports) to communicate with the language server process.
