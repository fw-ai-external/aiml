import { ExecuteCommandSignature, LabsInfo } from "@volar/vscode";
import { ExtensionContext } from "vscode";

import * as languageServerProtocol from "@volar/language-server/protocol.js";
import {
  activateAutoInsertion,
  activateDocumentDropEdit,
  createLabsInfo,
  getTsdk,
} from "@volar/vscode";
import {
  extensions,
  window,
  workspace,
  Disposable,
  ProgressLocation,
} from "vscode";
import { LanguageClient, TransportKind } from "@volar/vscode/node.js";

let client: LanguageClient;

let disposable: Disposable;

export async function activate(context: ExtensionContext): Promise<LabsInfo> {
  extensions.getExtension("vscode.typescript-language-features")?.activate();

  const { tsdk } = (await getTsdk(context)) ?? { tsdk: "" };

  client = new LanguageClient(
    "AIML",
    {
      module: context.asAbsolutePath("dist/language-server.js"),
      transport: TransportKind.ipc,
    },
    {
      documentSelector: [{ language: "aiml" }],
      initializationOptions: {
        typescript: { tsdk },
      },
      markdown: {
        isTrusted: true,
        supportHtml: true,
      },
      middleware: { executeCommand },
    }
  );

  tryRestartServer();

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("aiml.server.enable")) {
        tryRestartServer();
      }
    })
  );

  const volarLabs = createLabsInfo(languageServerProtocol);
  volarLabs.addLanguageClient(client);

  return volarLabs.extensionExports;

  async function tryRestartServer() {
    await stopServer();
    if (workspace.getConfiguration("aiml").get("server.enable")) {
      await startServer();
    }
  }
}

/**
 * Deactivate the extension.
 */
export async function deactivate() {
  await stopServer();
}

async function stopServer() {
  if (client?.needsStop()) {
    disposable.dispose();

    await client.stop();
  }
}

/**
 * Start the language server and client integrations.
 */
async function startServer() {
  if (client.needsStart()) {
    await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: "Starting AIML Language Server…",
      },
      async () => {
        await client.start();

        disposable = Disposable.from(
          activateAutoInsertion("aiml", client),
          activateDocumentDropEdit("aiml", client)
        );
      }
    );
  }
}

async function executeCommand(
  command: string,
  args: unknown[],
  next: ExecuteCommandSignature
) {
  switch (command) {
    case "aiml.toggleDelete":
    case "aiml.toggleEmphasis":
    case "aiml.toggleInlineCode":
    case "aiml.toggleStrong": {
      const editor = window.activeTextEditor;
      if (!editor) {
        return;
      }

      return next(command, [
        String(editor.document.uri),
        client.code2ProtocolConverter.asRange(editor.selection),
      ]);
    }

    default: {
      return next(command, args);
    }
  }
}
