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
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { parse } from "@aiml/parser";
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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
