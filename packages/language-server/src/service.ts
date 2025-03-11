import {
  DocumentSelector,
  LanguageServiceContext,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
} from "@volar/language-server";
import { TextDocument } from "vscode-languageserver-textdocument";
import { PassThrough } from "node:stream";
import { engine, Options as EngineOptions } from "unified-engine";
import { pathToFileURL } from "node:url";
import { VFile } from "vfile";
import { loadPlugin } from "load-plugin";
import { URI } from "vscode-uri";

export const service = {
  name: "aiml",
  capabilities: {
    codeActionProvider: {
      resolveProvider: true,
      codeActionKinds: ["quickfix", "refactor"],
    },
    completionProvider: {
      triggerCharacters: [".", "/", "#"],
    },
    definitionProvider: true,
    diagnosticProvider: {
      interFileDependencies: false,
      workspaceDiagnostics: false,
    },
    documentHighlightProvider: true,
    documentLinkProvider: {
      resolveProvider: true,
    },
    documentSymbolProvider: true,
    foldingRangeProvider: true,
    hoverProvider: true,
    referencesProvider: true,
    fileReferencesProvider: true,
    renameProvider: {
      prepareProvider: true,
    },
    fileRenameEditsProvider: true,
    selectionRangeProvider: true,
    workspaceSymbolProvider: {},
  },
  create(context: LanguageServiceContext): LanguageServicePluginInstance {
    const files: VFile[] = [];
    const aimlLS: any = new Promise((resolve) => {
      engine(
        {
          alwaysStringify: false,
          cwd: process.cwd(),
          files: [],
          ignoreName: ".aimlignore",
          ignoreUnconfigured: false,
          packageField: "aiml",
          pluginPrefix: "aiml",
          plugins: [],
          processor: processWorkspace(process.cwd(), [], false, false) as any,
          quiet: false,
          rcName: ".aimlrc",
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

    return {
      dispose() {
        aimlLS.dispose();
      },

      provide: {
        "aiml/languageService": () => aimlLS,
      },

      provideCodeActions(document, range, context, token) {
        if (prepare(document)) {
          return [];
        }
      },

      async resolveCodeAction(codeAction, token) {
        return codeAction;
      },

      async provideCompletionItems(document, position, _context, token) {
        if (prepare(document)) {
          const items = await aimlLS.getCompletionItems(
            document,
            position,
            {},
            token
          );
          return {
            isIncomplete: false,
            items,
          };
        }
      },

      async provideDefinition(document, position, token) {
        if (prepare(document)) {
          let locations = await aimlLS.getDefinition(document, position, token);

          if (!locations) {
            return;
          }

          if (!Array.isArray(locations)) {
            locations = [locations];
          }

          return locations.map((location: any) => ({
            targetUri: location.uri,
            targetRange: location.range,
            targetSelectionRange: location.range,
          }));
        }
      },

      async provideDiagnostics(document, token) {
        if (prepare(document)) {
          const configuration = context.env.getConfiguration?.("aiml.validate");
          if (configuration) {
            return aimlLS.computeDiagnostics(document, configuration, token);
          }
        }
      },

      provideDocumentHighlights(document, position, token) {
        if (prepare(document)) {
          return aimlLS.getDocumentHighlights(document, position, token);
        }
      },

      async provideDocumentLinks(document, token) {
        if (prepare(document)) {
          return await aimlLS.getDocumentLinks(document, token);
        }
      },

      provideDocumentSymbols(document, token) {
        if (prepare(document)) {
          return aimlLS.getDocumentSymbols(
            document,
            { includeLinkDefinitions: true },
            token
          );
        }
      },

      provideFileReferences(document, token) {
        if (prepare(document)) {
          return aimlLS.getFileReferences(URI.parse(document.uri), token);
        }
      },

      provideFoldingRanges(document, token) {
        if (prepare(document)) {
          return aimlLS.getFoldingRanges(document, token);
        }
      },

      provideHover(document, position, token) {
        if (prepare(document)) {
          return aimlLS.getHover(document, position, token);
        }
      },

      provideReferences(document, position, referenceContext, token) {
        if (prepare(document)) {
          return aimlLS.getReferences(
            document,
            position,
            referenceContext,
            token
          );
        }
      },

      provideRenameEdits(document, position, newName, token) {
        if (prepare(document)) {
          return aimlLS.getRenameEdit(document, position, newName, token);
        }
      },

      provideRenameRange(document, position, token) {
        if (prepare(document)) {
          return aimlLS.prepareRename(document, position, token);
        }
      },

      async provideFileRenameEdits(oldUri, newUri, token) {
        const result = await aimlLS.getRenameFilesInWorkspaceEdit(
          [{ oldUri, newUri }],
          token
        );
        return result?.edit;
      },

      provideSelectionRanges(document, positions, token) {
        if (prepare(document)) {
          return aimlLS.getSelectionRanges(document, positions, token);
        }
      },

      provideWorkspaceSymbols(query, token) {
        return aimlLS.getWorkspaceSymbols(query, token);
      },

      async resolveDocumentLink(link, token) {
        return (await aimlLS.resolveDocumentLink(link, token)) ?? link;
      },
    };
  },
} satisfies LanguageServicePlugin;

function prepare(document: TextDocument) {
  if (matchDocument(["aiml"], { languageId: document.languageId })) {
    // if (firedDocumentChanges.get(document.uri) !== document.version) {
    //   firedDocumentChanges.set(document.uri, document.version);
    //   workspace.onDidChangeMarkdownDocument.fire(document);
    // }
    return true;
  }
  return false;
}

function matchDocument(
  selector: DocumentSelector,
  document: { languageId: string }
) {
  for (const sel of selector) {
    if (
      sel === document.languageId ||
      (typeof sel === "object" && sel.language === document.languageId)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Convert language server protocol text document to a vfile.
 */
function lspDocumentToVfile(document: TextDocument, cwd: string) {
  return new VFile({
    cwd,
    path: document.uri,
    value: document.getText(),
    data: { lspDocumentUri: document.uri },
  });
}

async function processWorkspace(
  cwd: string,
  files: VFile[],
  alwaysStringify: boolean,
  ignoreUnconfigured: boolean
): Promise<VFile[]> {
  let processor: EngineOptions["processor"];

  try {
    processor = (await loadPlugin("aiml", {
      from: pathToFileURL(cwd + "/").toString(),
      key: "aiml-processor",
    })) as EngineOptions["processor"];
  } catch (error) {
    const exception: NodeJS.ErrnoException = error as NodeJS.ErrnoException;

    // Pass other funky errors through.
    /* c8 ignore next 3 */
    if (exception.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }
  }

  return new Promise((resolve) => {
    engine(
      {
        alwaysStringify,
        cwd,
        files,
        ignoreName: ".aimlignore",
        ignoreUnconfigured,
        packageField: "aiml",
        pluginPrefix: "aiml",
        plugins: [],
        processor,
        quiet: false,
        rcName: ".aimlrc",
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
