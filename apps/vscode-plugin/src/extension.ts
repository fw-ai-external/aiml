import * as path from "path";
import { ExtensionContext, languages, window, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  State,
} from "vscode-languageclient/node";
import { HoverController } from "./hover.controller";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join(".dist", "server.js"));

  // The debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  console.warn("Activating extension server", serverModule);
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
    documentSelector: [{ scheme: "file", language: "aiml" }],
    // Only activate for XML files that have a workflow root element
    initializationOptions: {
      isWorkflowFile: (text: string) => {
        // Simple check for workflow root element
        return text.includes("<workflow");
      },
    },

    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/*.aiml"),
    },
    outputChannel: window.createOutputChannel("SCXML Language Server"),
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "scxml",
    "SCXML Language Server",
    serverOptions,
    clientOptions
  );

  // Start the client
  client
    .start()
    .catch((error) => {
      console.error("Failed to start language client:", error);
    })
    .then(() => {
      console.log("SCXML Language Server started");
    });

  // Add state change listener and push to subscriptions
  context.subscriptions.push(
    client.onDidChangeState(({ newState }) => {
      if (newState === State.Running) {
        console.log("SCXML Language Server is running");
      } else if (newState === State.Stopped) {
        console.error("SCXML Language Server stopped unexpectedly");
      }
    })
  );
  const hoverController = new HoverController(client);

  languages.registerHoverProvider(
    { scheme: "file", language: "aiml" },
    {
      provideHover: (document, position, token) => {
        console.log("provideHover", document, position, token);
        return hoverController.getHover(document as any, position);
      },
    }
  );

  // Push stop callback to subscriptions
  context.subscriptions.push({
    dispose: () => {
      if (client) {
        return client.stop();
      }
    },
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
