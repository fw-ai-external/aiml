/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  type Diagnostic,
  ProposedFeatures,
  type InitializeParams,
  DidChangeConfigurationNotification,
  type CompletionItem,
  type TextDocumentPositionParams,
  TextDocumentSyncKind,
  type InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  DiagnosticSeverity,
  type Hover,
  MarkupKind,
  type Range,
  type WorkspaceSymbol,
  SymbolKind,
  type DocumentSymbol,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { parse } from "@aiml/parser";
import { allElementConfigs } from "@aiml/shared";
import { provideCompletionItems } from "./completion-provider";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      // Add hover provider
      hoverProvider: true,
      // Add document symbol provider
      documentSymbolProvider: true,
      // Add workspace symbol provider
      workspaceSymbolProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The example settings
interface Settings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Settings = { maxNumberOfProblems: 1000 };
let globalSettings: Settings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<Settings>>();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = change.settings.languageServerExample || defaultSettings;
  }
  // Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
  // We could optimize things here and re-fetch the setting first can compare it
  // to the existing setting, but this is out of scope for this example.
  connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<Settings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "aiml",
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document !== undefined) {
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: await validateTextDocument(document),
    } satisfies DocumentDiagnosticReport;
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    return {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    } satisfies DocumentDiagnosticReport;
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(
  textDocument: TextDocument
): Promise<Diagnostic[]> {
  try {
    // In this simple example we get the settings for every validate run.
    const settings = await getDocumentSettings(textDocument.uri);

    // The validator creates diagnostics for all uppercase words length 2 and more
    const text = textDocument.getText();

    const { diagnostics } = await parse(text);

    return diagnostics.map((diagnostic): Diagnostic => {
      // Convert the parser's diagnostic to a valid LSP diagnostic
      return {
        message: diagnostic.message,
        severity: mapSeverity(diagnostic.severity),
        code: diagnostic.code,
        source: diagnostic.source,
        range: {
          start: {
            line: diagnostic.range.start.line,
            character: diagnostic.range.start.column,
          },
          end: {
            line: diagnostic.range.end.line,
            character: diagnostic.range.end.column,
          },
        },
      };
    });
  } catch (error) {
    // Handle parser errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);

    return [
      {
        message: `Parse error: ${errorMessage}`,
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        source: "aiml-parser",
      },
    ];
  }
}

// Map severity from parser to LSP's DiagnosticSeverity
function mapSeverity(severity: any): DiagnosticSeverity {
  // Map from parser's string-based severity to LSP's numeric severity
  switch (severity) {
    case "error":
      return DiagnosticSeverity.Error;
    case "warning":
      return DiagnosticSeverity.Warning;
    case "information":
      return DiagnosticSeverity.Information;
    case "hint":
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Error; // Default to Error
  }
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received a file change event");
});

// This handler provides the completion items for AIML elements and attributes
connection.onCompletion(
  (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // Add debug logging
    connection.console.log(
      `Completion requested at position: ${textDocumentPosition.position.line}:${textDocumentPosition.position.character}`
    );

    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      connection.console.log("Document not found");
      return [];
    }

    connection.console.log("Calling provideCompletionItems");
    const completions = provideCompletionItems(
      document,
      textDocumentPosition.position
    );
    connection.console.log(`Returning ${completions.length} completion items`);

    return completions;
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  // We don't need to add any additional information since we already
  // provide all details when creating the completion items
  return item;
});

// Provide hover information for AIML elements and attributes
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Find element or attribute at cursor position
  const wordRange = getWordRangeAtPosition(document, params.position);
  if (!wordRange) {
    return null;
  }

  const word = document.getText(wordRange);

  // Check if it's an AIML element
  const elementDocs = getElementHoverInfo(word);
  if (elementDocs) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: elementDocs,
      },
      range: wordRange,
    };
  }

  return null;
});

// Provide document symbols for outline view
connection.onDocumentSymbol((params): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const symbols: DocumentSymbol[] = [];
  const text = document.getText();

  // Define symbol patterns for different AIML elements
  const symbolPatterns = [
    {
      regex: /<workflow[^>]*\sid\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Module,
      prefix: "workflow",
    },
    {
      regex: /<state[^>]*\sid\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Class,
      prefix: "state",
    },
    {
      regex: /<data[^>]*\sid\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Variable,
      prefix: "data",
    },
    {
      regex: /<transition[^>]*\starget\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Event,
      prefix: "transition →",
    },
    {
      regex: /<llm[^>]*\smodel\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Function,
      prefix: "llm",
    },
    {
      regex: /<script[^>]*\slang(?:uage)?\s*=\s*["']([^"']+)["'][^>]*>/g,
      kind: SymbolKind.Method,
      prefix: "script",
    },
  ];

  // Extract symbols for each pattern
  for (const pattern of symbolPatterns) {
    let match: RegExpExecArray | null;
    pattern.regex.lastIndex = 0; // Reset regex state

    while ((match = pattern.regex.exec(text)) !== null) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);

      symbols.push({
        name: `${pattern.prefix}: ${match[1]}`,
        kind: pattern.kind,
        range: { start, end },
        selectionRange: { start, end },
      });
    }
  }

  // Sort symbols by position in document
  symbols.sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    return a.range.start.character - b.range.start.character;
  });

  return symbols;
});

// Provide workspace symbols for search
connection.onWorkspaceSymbol((params): WorkspaceSymbol[] => {
  // For now, return empty array - could implement cross-file symbol search
  return [];
});

// Helper functions
function getWordRangeAtPosition(
  document: TextDocument,
  position: any
): Range | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find word boundaries
  let start = offset;
  let end = offset;

  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }

  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }

  if (start === end) {
    return null;
  }

  return {
    start: document.positionAt(start),
    end: document.positionAt(end),
  };
}

function getElementHoverInfo(elementName: string): string | null {
  // Use schema-based documentation when available
  const config =
    allElementConfigs[elementName as keyof typeof allElementConfigs];
  if (config) {
    let markdown = `**${elementName}** - ${
      config.description || `${config.type} element`
    }\n\n`;

    // Add type information
    markdown += `**Type:** ${config.type}\n\n`;

    // Add attributes from schema
    if (
      config.propsSchema &&
      typeof config.propsSchema === "object" &&
      "shape" in config.propsSchema
    ) {
      const shape = config.propsSchema.shape as Record<string, any>;
      const attributes = Object.keys(shape);

      if (attributes.length > 0) {
        markdown += `**Attributes:**\n`;
        for (const attr of attributes) {
          const attrSchema = shape[attr];
          let attrInfo = `- \`${attr}\``;

          // Add type information if available
          if (attrSchema && typeof attrSchema === "object") {
            if ("_def" in attrSchema && attrSchema._def) {
              const def = attrSchema._def;
              if (def.typeName) {
                attrInfo += ` (${def.typeName.toLowerCase()})`;
              }
              if (def.description) {
                attrInfo += `: ${def.description}`;
              }
            }
          }

          markdown += `${attrInfo}\n`;
        }
      }
    }

    return markdown;
  }

  // Fallback to hardcoded docs for unknown elements
  const fallbackDocs: Record<string, string> = {
    workflow: `**workflow** - Defines an AIML workflow with states and transitions
    
**Type:** container

**Attributes:**
- \`id\`: Unique identifier
- \`name\`: Human-readable name
- \`initial\`: Initial state
- \`version\`: Workflow version`,

    state: `**state** - Defines a state in the workflow
    
**Type:** state

**Attributes:**
- \`id\`: Unique identifier
- \`name\`: Human-readable name
- \`initial\`: Initial child state`,
  };

  return fallbackDocs[elementName] || null;
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
