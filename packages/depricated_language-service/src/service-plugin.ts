/**
 * @import {DataTransferItem, LanguageServicePlugin, WorkspaceEdit} from '@volar/language-service'
 */

import path from "node:path/posix";
import { toMarkdown } from "mdast-util-to-markdown";
import { fromPlace } from "unist-util-lsp";
import { URI, Utils } from "vscode-uri";
import { toggleSyntax } from "./commands";
import { VirtualAimlCode } from "./virtual-code";

// Define simplified interfaces to avoid type conflicts
interface WorkspaceEdit {
  [key: string]: any;
}

interface DataTransferItem {
  id: string;
  uri?: string;
  value?: any;
  asString?: () => Promise<string>;
  asFile?: () => { name: string; uri?: string; data: Uint8Array };
}

// Type for document position
interface Position {
  line: number;
  character: number;
}

// Type for document range
interface Range {
  start: Position;
  end: Position;
}

// Type for document
interface Document {
  uri: string;
  [key: string]: any;
}

// Type for VFileMessage (error message from unified/remark processing)
interface VFileMessage {
  message: string;
  source?: string;
  ruleId?: string;
  url?: string;
  place?: any;
  [key: string]: any;
}

/**
 * @callback ApplyEdit
 * @param {WorkspaceEdit} edit
 *   The workspace edit to apply.
 * @returns {PromiseLike<unknown>}
 */

/**
 * @typedef createAimlServicePlugin.Options
 * @property {ApplyEdit} applyEdit
 *   A function to apply workspace edits.
 */

// Define TypeScript types for the callback and options
type ApplyEdit = (edit: WorkspaceEdit) => Promise<unknown>;

interface ServicePluginOptions {
  applyEdit: ApplyEdit;
}

// https://github.com/microsoft/vscode/blob/1.83.1/extensions/markdown-language-features/src/languageFeatures/copyFiles/shared.ts#L29-L41
const imageExtensions = new Set([
  ".bmp",
  ".gif",
  ".ico",
  ".jpe",
  ".jpeg",
  ".jpg",
  ".png",
  ".psd",
  ".svg",
  ".tga",
  ".tif",
  ".tiff",
  ".webp",
]);

/**
 * Create a [Volar](https://volarjs.dev) language service plugin for AIML files.
 *
 * Supports the following formatting commands:
 *
 * - `aiml.toggleDelete`: Toggle `~~strikethrough~~` text.
 * - `aiml.toggleEmphasis`: Toggle `*emphasis*` text.
 * - `aiml.toggleInlineCode`: Toggle `` `inlineCode` `` text.
 * - `aiml.toggleStrong`: Toggle `**strong**` text.
 *
 * @param {createAimlServicePlugin.Options} options
 *   Options to configure the AIML language service.
 * @returns {LanguageServicePlugin}
 *   The Volar service plugin for AIML files.
 */
export function createAimlServicePlugin(options: ServicePluginOptions): any {
  return {
    name: "aiml",

    capabilities: {
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      executeCommandProvider: {
        commands: [
          "aiml.toggleDelete",
          "aiml.toggleEmphasis",
          "aiml.toggleInlineCode",
          "aiml.toggleStrong",
        ],
      },
      documentDropEditsProvider: true,
    },

    create(context: any) {
      return {
        executeCommand(command: string, args: any[]) {
          switch (command) {
            case "aiml.toggleDelete": {
              return toggleSyntax(
                context,
                options,
                "delete",
                "~~",
                args[0],
                args[1]
              );
            }

            case "aiml.toggleEmphasis": {
              return toggleSyntax(
                context,
                options,
                "emphasis",
                "*",
                args[0],
                args[1]
              );
            }

            case "aiml.toggleInlineCode": {
              return toggleSyntax(
                context,
                options,
                "inlineCode",
                "`",
                args[0],
                args[1]
              );
            }

            case "aiml.toggleStrong": {
              return toggleSyntax(
                context,
                options,
                "strong",
                "**",
                args[0],
                args[1]
              );
            }

            default: {
              throw new Error("Unknown command: " + command);
            }
          }
        },

        async provideDocumentDropEdits(
          document: Document,
          position: Position,
          dataTransfer: DataTransferItem[]
        ) {
          const documentUri = URI.parse(document.uri);

          /** @type {DataTransferItem | undefined} */
          let textItem;

          /** @type {DataTransferItem | undefined} */
          let uriListItem;

          for (const item of dataTransfer) {
            const mime = item.id;

            if (mime === "text/plain") {
              textItem = item;
              continue;
            }

            if (mime === "text/uri-list") {
              uriListItem = item;
              continue;
            }

            if (!mime.startsWith("image/")) {
              continue;
            }

            const file = item.asFile?.();
            if (!file) {
              continue;
            }

            return {
              insertText: toMarkdown({ type: "image", url: file.name }).trim(),
              insertTextFormat: 1,
              createDataTransferFile: [
                {
                  kind: "create",
                  uri: String(Utils.joinPath(documentUri, "..", file.name)),
                  contentsMimeType: mime,
                  options: {
                    ignoreIfExists: true,
                  },
                },
              ],
            };
          }

          if (uriListItem) {
            const value = (await uriListItem.asString?.()) || "";
            const uris = value.split(/\r?\n/);
            /** @type {string[]} */
            const content: string[] = [];

            for (const line of uris) {
              try {
                const uri = URI.parse(line, true);
                const value =
                  uri.scheme === documentUri.scheme
                    ? path.relative(path.dirname(documentUri.path), uri.path)
                    : line;

                content.push(
                  toMarkdown(
                    imageExtensions.has(path.extname(uri.path))
                      ? { type: "image", url: value }
                      : { type: "text", value }
                  ).trim()
                );
              } catch {
                continue;
              }
            }

            return {
              insertText: content.join(" "),
              insertTextFormat: 1,
            };
          }

          if (textItem) {
            const string = (await textItem.asString?.()) || "";
            return {
              insertText: string,
              insertTextFormat: 1,
            };
          }

          return undefined;
        },

        provideDiagnostics(document: Document) {
          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );
          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const virtualCode =
            decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1]);

          if (!(virtualCode instanceof VirtualAimlCode)) {
            return;
          }

          const error = virtualCode.error as VFileMessage;

          if (error) {
            return [
              {
                message: error.message,
                code: error.source
                  ? error.source + ":" + error.ruleId
                  : error.ruleId,
                codeDescription: {
                  href:
                    error.url ||
                    "https://docs.fireworks.ai/troubleshooting-aiml/",
                },
                range: error.place
                  ? fromPlace(error.place)
                  : {
                      start: { line: 0, character: 0 },
                      end: { line: 0, character: 0 },
                    },
                severity: 1,
                source: "AIML",
              },
            ];
          }

          return undefined;
        },
      };
    },
  };
}
