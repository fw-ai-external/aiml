import { LanguagePlugin, VirtualCode } from "@volar/language-service";
import { PluggableList } from "unified";
import { URI } from "vscode-uri";

import remarkMDX from "remark-mdx";
import remarkParse from "remark-parse";
// Cast the unified import to any
import * as unifiedModule from "unified";
const unified: () => any = unifiedModule.unified as any;
import { VirtualAimlCode } from "./virtual-code";

// Type declarations for imported types
declare namespace Unified {
  type Plugin = any;
  type Pluggable = Plugin | [Plugin, ...any[]];
}

declare namespace Volar {
  interface TypeScriptPlugin {
    extraFileExtensions: {
      extension: string;
      isMixedContent: boolean;
      scriptKind: number;
    }[];
    getServiceScript?: (
      root: any
    ) => { code: any; extension: string; scriptKind: number } | undefined;
    resolveLanguageServiceHost?: (host: any) => any;
  }
}

/**
 * Create a [Volar](https://volarjs.dev) language plugin to support AIML.
 *
 * @param {PluggableList} [plugins]
 *   A list of remark syntax plugins. Only syntax plugins are supported.
 *   Transformers are unused.
 * @param {boolean} checkAiml
 *   If true, check AIML files strictly.
 * @param {string} jsxImportSource
 *   The JSX import source to use in the embedded JavaScript file.
 * @returns {LanguagePlugin<string | URI, VirtualAimlCode>}
 *   A Volar language plugin to support AIML.
 */
export function createAimlLanguagePlugin(
  plugins?: PluggableList,
  checkAiml = false,
  jsxImportSource = "react"
): LanguagePlugin<string | URI, VirtualCode> & {
  typescript: Volar.TypeScriptPlugin;
} {
  const processor = unified().use(remarkParse).use(remarkMDX);

  if (plugins) {
    processor.use(plugins);
  }

  processor.freeze();

  return {
    getLanguageId(fileNameOrUri: string | URI): string | undefined {
      if (String(fileNameOrUri).endsWith(".aiml")) {
        return "aiml";
      }
      return undefined;
    },

    createVirtualCode(
      fileNameOrUri: string | URI,
      languageId: string,
      snapshot: any,
      options?: any
    ): VirtualCode | undefined {
      if (languageId === "aiml") {
        const virtualCode = new VirtualAimlCode(
          snapshot,
          processor,
          checkAiml,
          jsxImportSource
        );

        return virtualCode as VirtualCode;
      }

      return undefined;
    },

    typescript: {
      extraFileExtensions: [
        { extension: "aiml", isMixedContent: true, scriptKind: 7 },
      ],

      getServiceScript(root: any) {
        if (root.embeddedCodes) {
          return {
            code: root.embeddedCodes[0],
            extension: ".jsx",
            scriptKind: 2,
          };
        }
        return undefined;
      },

      resolveLanguageServiceHost(host: any) {
        return {
          ...host,
          getCompilationSettings: () => ({
            ...host.getCompilationSettings(),
            // Always allow JS for type checking.
            allowJs: true,
          }),
        };
      },
    },
  };
}
