import * as path from 'path';
import { type ExtensionContext, languages, window, workspace } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  State,
  TransportKind,
} from 'vscode-languageclient/node';
import { HoverController } from './hover.controller';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Create output channel for logging
  const outputChannel = window.createOutputChannel('SCXML Language Server');

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join('.dist', 'server.js'));

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  outputChannel.appendLine(`Activating extension server: ${serverModule}`);

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for XML documents with workflow root element
    documentSelector: [{ scheme: 'file', language: 'aiml' }],
    // Only activate for XML files that have a workflow root element
    initializationOptions: {
      isWorkflowFile: (text: string) => {
        // Simple check for workflow root element
        return text.includes('<workflow');
      },
    },
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.aiml'),
    },
    outputChannel,
  };

  // Create the language client and start the client.
  client = new LanguageClient('scxml', 'SCXML Language Server', serverOptions, clientOptions);

  // Start the client
  client
    .start()
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`Failed to start language client: ${errorMessage}`);
      window.showErrorMessage('Failed to start SCXML Language Server');
    })
    .then(() => {
      outputChannel.appendLine('SCXML Language Server started successfully');
    });

  // Add state change listener and push to subscriptions
  context.subscriptions.push(
    client.onDidChangeState(({ newState }) => {
      if (newState === State.Running) {
        outputChannel.appendLine('SCXML Language Server is running');
      } else if (newState === State.Stopped) {
        outputChannel.appendLine('SCXML Language Server stopped unexpectedly');
        window.showErrorMessage('SCXML Language Server stopped unexpectedly');
      }
    }),
  );

  const hoverController = new HoverController(client);

  // Register hover provider
  context.subscriptions.push(
    languages.registerHoverProvider(
      { scheme: 'file', language: 'aiml' },
      {
        provideHover: async (document, position, token) => {
          // Check for cancellation
          if (token.isCancellationRequested) {
            outputChannel.appendLine('Hover request cancelled');
            return null;
          }

          try {
            const hover = await hoverController.getHover(document, position);
            if (!hover) {
              outputChannel.appendLine(`No hover information available at ${position.line}:${position.character}`);
              return null;
            }

            outputChannel.appendLine(`Hover information provided at ${position.line}:${position.character}`);
            return hover;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`Error in hover provider: ${errorMessage}`);
            if (error instanceof Error && error.stack) {
              outputChannel.appendLine(error.stack);
            }
            return null;
          }
        },
      },
    ),
  );

  // Push stop callback to subscriptions
  context.subscriptions.push({
    dispose: () => {
      outputChannel.appendLine('Stopping SCXML Language Server');
      if (client) {
        return client.stop();
      }
    },
  });

  // Add output channel to subscriptions for cleanup
  context.subscriptions.push(outputChannel);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
