/// <reference types="@volar/typescript" />

/**
 * @import {LanguagePlugin} from '@volar/language-service'
 * @import {PluggableList} from 'unified'
 * @import {URI} from 'vscode-uri'
 */

import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
// Cast the unified import to any
import * as unifiedModule from "unified";
const unified: () => any = unifiedModule.unified as any;
import { VirtualMdxCode } from "./virtual-code.js";

// Type declarations for imported types
declare namespace Unified {
  type Plugin = any;
  type Pluggable = Plugin | [Plugin, ...any[]];
  type PluggableList = Pluggable[];
}

declare namespace Volar {
  interface LanguagePlugin<TFileName, TVirtualCode> {
    getLanguageId(fileNameOrUri: TFileName): string | undefined;
    createVirtualCode(
      fileNameOrUri: TFileName,
      languageId: string,
      snapshot: any,
      options?: any
    ): TVirtualCode | undefined;
    typescript?: TypeScriptPlugin;
  }

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

type URI = { toString(): string } | string;

/**
 * Create a [Volar](https://volarjs.dev) language plugin to support MDX.
 *
 * @param {PluggableList} [plugins]
 *   A list of remark syntax plugins. Only syntax plugins are supported.
 *   Transformers are unused.
 * @param {boolean} checkMdx
 *   If true, check MDX files strictly.
 * @param {string} jsxImportSource
 *   The JSX import source to use in the embedded JavaScript file.
 * @returns {LanguagePlugin<string | URI, VirtualMdxCode>}
 *   A Volar language plugin to support MDX.
 */
export function createMdxLanguagePlugin(
  plugins?: any,
  checkMdx = false,
  jsxImportSource = "react"
): Volar.LanguagePlugin<string | URI, VirtualMdxCode> {
  const processor = unified().use(remarkParse).use(remarkMdx);

  if (plugins) {
    processor.use(plugins);
  }

  processor.freeze();

  return {
    getLanguageId(fileNameOrUri: string | URI): string | undefined {
      if (String(fileNameOrUri).endsWith(".mdx")) {
        return "mdx";
      }
      return undefined;
    },

    createVirtualCode(
      fileNameOrUri: string | URI,
      languageId: string,
      snapshot: any,
      options?: any
    ): VirtualMdxCode | undefined {
      if (languageId === "mdx") {
        const virtualCode = new VirtualMdxCode(
          snapshot,
          processor,
          checkMdx,
          jsxImportSource
        );

        return virtualCode;
      }

      return undefined;
    },

    typescript: {
      extraFileExtensions: [
        { extension: "mdx", isMixedContent: true, scriptKind: 7 },
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
