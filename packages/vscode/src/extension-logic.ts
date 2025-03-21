import type { ExecuteCommandSignature, LabsInfo } from '@volar/vscode';
import type { ExtensionContext } from 'vscode';

import * as languageServerProtocol from '@volar/language-server/protocol.js';
import { activateAutoInsertion, activateDocumentDropEdit, createLabsInfo, getTsdk } from '@volar/vscode';
import { LanguageClient, TransportKind } from '@volar/vscode/node.js';
import { Disposable, ProgressLocation, extensions, window, workspace } from 'vscode';

export class AimlExtension {
  private client!: LanguageClient;
  private disposable: Disposable | undefined;
  private volarLabs: ReturnType<typeof createLabsInfo>;
  private subscriptions: Disposable[] = [];

  dispose() {
    this.subscriptions.forEach((d) => d.dispose());
    this.subscriptions = [];
  }

  constructor(private context: ExtensionContext) {
    this.volarLabs = createLabsInfo(languageServerProtocol);
  }

  async initialize(): Promise<LabsInfo> {
    extensions.getExtension('vscode.typescript-language-features')?.activate();

    const { tsdk } = (await getTsdk(this.context)) ?? { tsdk: '' };

    this.client = new LanguageClient(
      'AIML',
      {
        module: this.context.asAbsolutePath('dist/language-server.js'),
        transport: TransportKind.ipc,
      },
      {
        documentSelector: [{ language: 'aiml' }],
        initializationOptions: {
          typescript: { tsdk },
        },
        markdown: {
          isTrusted: true,
          supportHtml: true,
        },
        middleware: { executeCommand: this.executeCommand.bind(this) },
      },
    );

    await this.tryRestartServer();

    const configListener = workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('aiml.server.enable')) {
        this.tryRestartServer();
      }
    });

    this.subscriptions.push(configListener);

    this.volarLabs.addLanguageClient(this.client);

    return this.volarLabs.extensionExports;
  }

  async tryRestartServer() {
    await this.stopServer();
    if (workspace.getConfiguration('aiml').get('server.enable')) {
      await this.startServer();
    }
  }

  async stopServer() {
    if (this.client?.needsStop()) {
      if (this.disposable) {
        this.disposable.dispose();
        this.disposable = undefined;
      }

      await this.client.stop();
    }
  }

  async startServer() {
    if (this.client.needsStart()) {
      await window.withProgress(
        {
          location: ProgressLocation.Window,
          title: 'Starting AIML Language Server…',
        },
        async () => {
          await this.client.start();

          this.disposable = Disposable.from(
            activateAutoInsertion('aiml', this.client),
            activateDocumentDropEdit('aiml', this.client),
          );
        },
      );
    }
  }

  async executeCommand(command: string, args: unknown[], next: ExecuteCommandSignature) {
    switch (command) {
      case 'aiml.toggleDelete':
      case 'aiml.toggleEmphasis':
      case 'aiml.toggleInlineCode':
      case 'aiml.toggleStrong': {
        const editor = window.activeTextEditor;
        if (!editor) {
          return;
        }

        return next(command, [
          String(editor.document.uri),
          this.client.code2ProtocolConverter.asRange(editor.selection),
        ]);
      }

      default: {
        return next(command, args);
      }
    }
  }
}
