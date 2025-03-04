import { VFileMessage } from "vfile-message";
import { Options as EngineOptions } from "unified-engine";

type EngineFields = Pick<
  EngineOptions,
  "ignoreName" | "packageField" | "pluginPrefix" | "plugins" | "rcName"
>;
type LanguageServerFields = {
  processorName: string;
  /**
   * The package ID of the expected processor (example: `'remark'`).
   * Will be loaded from the local workspace.
   */
  processorSpecifier?: string;
  /**
   *   The specifier to get the processor on the resolved module.
   *   For example, remark uses the specifier `remark` to expose its processor and
   *   a default export can be requested by passing `'default'` (the default).
   */
  defaultProcessor?: EngineOptions["processor"];
  /**
   *   Optional fallback processor to use if `processorName` can’t be found
   *   locally in `node_modules`.
   *   This can be used to ship a processor with your package, to be used if no
   *   processor is found locally.
   *   If this isn’t passed, a warning is shown if `processorName` can’t be found.
   */
  configurationSection: string;
};
/*
 *   This option will be used to give the client a hint of which configuration
 *   section to use.
 *   For example VSCode extensions use this to pick only settings that use this
 *   as a prefix in order to prevent conflicts and reduce the amount of data
 *   sent to the language server.
 */
type Options = EngineFields & LanguageServerFields;

type UnifiedLanguageServerSettings = {
  /**
   *   If true, files will only be checked if a configuration file is present.
   */
  requireConfig?: boolean;
};

import path from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findUp, pathExists } from "find-up";
import { loadPlugin } from "load-plugin";
import { engine } from "unified-engine";
import { fromPoint, fromPosition } from "unist-util-lsp";
import { VFile } from "vfile";
import {
  createConnection,
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  Position,
  ProposedFeatures,
  Range,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { TextDocumentPositionParams } from "vscode-languageserver/node";

/**
 * Convert a vfile message to a language server protocol diagnostic.
 */
function vfileMessageToDiagnostic(message: VFileMessage) {
  const diagnostic = Diagnostic.create(
    message.place
      ? "start" in message.place
        ? fromPosition(message.place)
        : { start: fromPoint(message.place), end: fromPoint(message.place) }
      : Range.create(0, 0, 0, 0),
    message.reason,
    message.fatal === true
      ? DiagnosticSeverity.Error
      : message.fatal === false
        ? DiagnosticSeverity.Warning
        : DiagnosticSeverity.Information,
    message.ruleId || undefined,
    message.source || undefined
  );
  if (message.url) {
    diagnostic.codeDescription = { href: message.url };
  }

  if (message.expected) {
    // type-coverage:ignore-next-line
    diagnostic.data = {
      expected: message.expected,
    };
  }

  if (
    typeof message.cause === "object" &&
    message.cause &&
    "stack" in message.cause
  ) {
    diagnostic.message += "\n" + message.cause.stack;
  }

  if (message.note) {
    diagnostic.message += "\n" + message.note;
  }

  return diagnostic;
}

/**
 * Convert language server protocol text document to a vfile.
 */
function lspDocumentToVfile(document: TextDocument, cwd: string) {
  return new VFile({
    cwd,
    path: new URL(document.uri),
    value: document.getText(),
    data: { lspDocumentUri: document.uri },
  });
}

export function createUnifiedLanguageServer({
  configurationSection,
  ignoreName,
  packageField,
  pluginPrefix,
  plugins,
  processorName,
  processorSpecifier = "default",
  defaultProcessor,
  rcName,
}: Options) {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  const workspaces = new Set<string>();
  const globalSettings: UnifiedLanguageServerSettings = {
    requireConfig: false,
  };
  const documentSettings = new Map<
    string,
    Promise<UnifiedLanguageServerSettings>
  >();
  let hasWorkspaceFolderCapability = false;
  let hasConfigurationCapability = false;

  async function getDocumentSettings(
    scopeUri: string
  ): Promise<UnifiedLanguageServerSettings> {
    if (!hasConfigurationCapability) {
      return globalSettings;
    }

    let result = documentSettings.get(scopeUri);
    if (!result) {
      result = connection.workspace
        .getConfiguration({ scopeUri, section: configurationSection })
        .then(
          /** @param {Record<string, unknown>} raw */
          (raw) => ({ requireConfig: Boolean(raw.requireConfig) })
        );
      documentSettings.set(scopeUri, result);
    }

    return result;
  }

  /**
   * @param {string} cwd
   * @param {VFile[]} files
   * @param {boolean} alwaysStringify
   * @param {boolean} ignoreUnconfigured
   * @returns {Promise<VFile[]>}
   */
  async function processWorkspace(
    cwd: string,
    files: VFile[],
    alwaysStringify: boolean,
    ignoreUnconfigured: boolean
  ): Promise<VFile[]> {
    let processor: EngineOptions["processor"];

    try {
      processor = (await loadPlugin(processorName, {
        from: pathToFileURL(cwd + "/"),
        key: processorSpecifier,
      })) as EngineOptions["processor"];
    } catch (error) {
      const exception: NodeJS.ErrnoException = error as NodeJS.ErrnoException;

      // Pass other funky errors through.
      /* c8 ignore next 3 */
      if (exception.code !== "ERR_MODULE_NOT_FOUND") {
        throw error;
      }

      if (!defaultProcessor) {
        connection.window.showInformationMessage(
          "Cannot turn on language server without `" +
            processorName +
            "` locally. Run `npm install " +
            processorName +
            "` to enable it"
        );
        return [];
      }

      connection.console.log(
        "Cannot find `" +
          processorName +
          "` locally but using `defaultProcessor`, original error:\n" +
          exception.stack
      );

      processor = defaultProcessor;
    }

    return new Promise((resolve) => {
      engine(
        {
          alwaysStringify,
          cwd,
          files,
          ignoreName,
          ignoreUnconfigured,
          packageField,
          pluginPrefix,
          plugins,
          processor,
          quiet: false,
          rcName,
          silentlyIgnore: true,
          streamError: new PassThrough(),
          streamOut: new PassThrough(),
        },
        (error) => {
          // An error never occured and can’t be reproduced. This is an internal
          // error in unified-engine. If a plugin throws, it’s reported as a
          // vfile message.
          if (error) {
            for (const file of files) {
              file.message(error).fatal = true;
            }
          }

          resolve(files);
        }
      );
    });
  }

  /**
   * Process various LSP text documents using unified and send back the
   * resulting messages as diagnostics.
   **/
  async function processDocuments(
    textDocuments: TextDocument[],
    alwaysStringify = false
  ): Promise<VFile[]> {
    // LSP uses `file:` URLs (hrefs), `unified-engine` expects a paths.
    // `process.cwd()` does not add a final slash, but `file:` URLs often do.
    const workspacesAsPaths = [...workspaces]
      .map((d) => d.replace(/[/\\]?$/, ""))
      // Sort the longest (closest to the file) first.
      .sort((a, b) => b.length - a.length);
    const workspacePathToFiles = new Map<string, VFile[]>();
    const workspacePathToFilesRequireConfig = new Map<string, VFile[]>();

    await Promise.all(
      textDocuments.map(async (textDocument) => {
        let cwd: string | undefined;
        if (workspaces.size === 0) {
          cwd = await findUp(
            async (directory) => {
              const packageExists = await pathExists(
                path.join(directory, "package.json")
              );
              if (packageExists) {
                return directory;
              }

              const gitExists = await pathExists(path.join(directory, ".git"));
              if (gitExists) {
                return directory;
              }
            },
            {
              cwd: path.dirname(fileURLToPath(textDocument.uri)),
              type: "directory",
            }
          );
        } else {
          // Because the workspaces are sorted longest to shortest, the first
          // match is closest to the file.
          const ancestor = workspacesAsPaths.find((d) =>
            textDocument.uri.startsWith(d + "/")
          );
          if (ancestor) {
            cwd = fileURLToPath(ancestor);
          }
        }

        if (!cwd) return;

        const configuration = await getDocumentSettings(textDocument.uri);

        const file = lspDocumentToVfile(textDocument, cwd);

        const filesMap = configuration.requireConfig
          ? workspacePathToFilesRequireConfig
          : workspacePathToFiles;
        const files = filesMap.get(cwd) || [];
        files.push(file);
        filesMap.set(cwd, files);
      })
    );

    const promises: Promise<VFile[]>[] = [];

    for (const [cwd, files] of workspacePathToFiles) {
      promises.push(processWorkspace(cwd, files, alwaysStringify, false));
    }

    for (const [cwd, files] of workspacePathToFilesRequireConfig) {
      promises.push(processWorkspace(cwd, files, alwaysStringify, true));
    }

    const listsOfFiles = await Promise.all(promises);
    return listsOfFiles.flat();
  }

  /**
   * Process various LSP text documents using unified and send back the
   * resulting messages as diagnostics.
   */
  async function checkDocuments(...textDocuments: TextDocument[]) {
    const documentVersions = new Map(
      textDocuments.map((document) => [document.uri, document.version])
    );
    const files = await processDocuments(textDocuments);

    for (const file of files) {
      // All the vfiles we create have a `lspDocumentUri`.
      const uri = file.data.lspDocumentUri as string;

      connection.sendDiagnostics({
        uri,
        version: documentVersions.get(uri),
        diagnostics: file.messages.map((message) =>
          vfileMessageToDiagnostic(message)
        ),
      });
    }
  }

  connection.onInitialize((event) => {
    if (event.workspaceFolders) {
      for (const workspace of event.workspaceFolders) {
        workspaces.add(workspace.uri);
      }
    }

    if (workspaces.size === 0 && event.rootUri) {
      workspaces.add(event.rootUri);
    }

    hasConfigurationCapability = Boolean(
      event.capabilities.workspace && event.capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = Boolean(
      event.capabilities.workspace &&
        event.capabilities.workspace.workspaceFolders
    );

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        documentFormattingProvider: true,
        codeActionProvider: {
          codeActionKinds: [CodeActionKind.QuickFix],
          resolveProvider: true,
        },
        hoverProvider: true,
        completionProvider: {
          resolveProvider: true,
        },
        definitionProvider: true,
        workspace: hasWorkspaceFolderCapability
          ? { workspaceFolders: { supported: true, changeNotifications: true } }
          : undefined,
      },
    };
  });

  connection.onInitialized(() => {
    if (hasConfigurationCapability) {
      connection.client.register(DidChangeConfigurationNotification.type);
    }

    if (hasWorkspaceFolderCapability) {
      connection.workspace.onDidChangeWorkspaceFolders((event) => {
        for (const workspace of event.removed) {
          workspaces.delete(workspace.uri);
        }

        for (const workspace of event.added) {
          workspaces.add(workspace.uri);
        }

        checkDocuments(...documents.all());
      });
    }
  });

  connection.onDocumentFormatting(async (event) => {
    const document = documents.get(event.textDocument.uri);

    // This might happen if a client calls this function without synchronizing
    // the document first.
    if (!document) {
      return;
    }

    const [file] = await processDocuments([document], true);

    if (!file) {
      return;
    }

    const result = String(file);
    const text = document.getText();
    if (result === text) {
      return;
    }

    const start = Position.create(0, 0);
    const end = document.positionAt(text.length);

    return [TextEdit.replace(Range.create(start, end), result)];
  });

  documents.onDidChangeContent((event) => {
    checkDocuments(event.document);
  });

  // Send empty diagnostics for closed files.
  documents.onDidClose((event) => {
    const { uri, version } = event.document;
    connection.sendDiagnostics({
      uri,
      version,
      diagnostics: [],
    });
    documentSettings.delete(uri);
  });

  // Check everything again if the file system watched by the client changes.
  connection.onDidChangeWatchedFiles(() => {
    checkDocuments(...documents.all());
  });

  connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
      // Reset all cached document settings
      documentSettings.clear();
    } else {
      globalSettings.requireConfig = Boolean(
        (
          change as Omit<typeof change, "settings"> & {
            settings: Record<string, unknown>;
          }
        ).settings.requireConfig
      );
    }

    // Revalidate all open text documents
    checkDocuments(...documents.all());
  });

  // Handle hover requests
  connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    //return hoverProvider.getHover(doc, params.position);
  });

  // Handle completions
  connection.onCompletion((params: TextDocumentPositionParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    //return completionProvider.getCompletions(doc, params.position);
  });

  connection.onCodeAction((event) => {
    const codeActions: CodeAction[] = [];

    const document = documents.get(event.textDocument.uri);

    // This might happen if a client calls this function without synchronizing
    // the document first.
    if (!document) {
      return;
    }

    for (const diagnostic of event.context.diagnostics) {
      // type-coverage:ignore-next-line
      const data = diagnostic.data as { expected?: unknown[] };
      if (typeof data !== "object" || !data) {
        continue;
      }

      const { expected } = data;

      if (!Array.isArray(expected)) {
        continue;
      }

      const { end, start } = diagnostic.range;
      const actual = document.getText(diagnostic.range);

      for (const replacement of expected) {
        if (typeof replacement !== "string") {
          continue;
        }

        const codeAction = CodeAction.create(
          replacement
            ? start.line === end.line && start.character === end.character
              ? "Insert `" + replacement + "`"
              : "Replace `" + actual + "` with `" + replacement + "`"
            : "Remove `" + actual + "`",
          {
            changes: {
              [document.uri]: [TextEdit.replace(diagnostic.range, replacement)],
            },
          },
          CodeActionKind.QuickFix
        );

        if (expected.length === 1) {
          codeAction.isPreferred = true;
        }

        codeActions.push(codeAction);
      }
    }

    return codeActions;
  });

  documents.listen(connection);
  connection.listen();
}
