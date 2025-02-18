import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { getTokens } from "./token";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createDebugger } from "./utils/debug";
import { StateTracker } from "./services/stateTracker";
import { DocumentValidator } from "./services/validator";
import { CompletionProvider } from "./services/completion";
import { HoverProvider } from "./services/hover";

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize services
const logger = createDebugger(connection);
const stateTracker = new StateTracker(logger);
const validator = new DocumentValidator(connection, logger, stateTracker);
const completionProvider = new CompletionProvider(
  connection,
  logger,
  stateTracker
);
const hoverProvider = new HoverProvider(connection, logger);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

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

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
});

// Handle completions
connection.onCompletion((params: TextDocumentPositionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return completionProvider.getCompletions(doc, params.position);
});

// Handle document changes
documents.onDidChangeContent((change) => {
  const tokens = getTokens(connection, change.document.getText());
  validator.validateDocument(change.document, tokens);
});

// Handle hover requests
connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return hoverProvider.getHover(doc, params.position);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
