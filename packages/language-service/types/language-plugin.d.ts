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
export function createMdxLanguagePlugin(plugins?: PluggableList, checkMdx?: boolean, jsxImportSource?: string): LanguagePlugin<string | URI, VirtualMdxCode>;
import type { PluggableList } from 'unified';
import type { URI } from 'vscode-uri';
import { VirtualMdxCode } from './virtual-code.js';
import type { LanguagePlugin } from '@volar/language-service';
//# sourceMappingURL=language-plugin.d.ts.map