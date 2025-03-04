/**
 * Toggle prose syntax based on the AST.
 *
 * @param {LanguageServiceContext} context
 *   The Volar service context.
 * @param {createMdxServicePlugin.Options} options
 *   The options to use for applying workspace edits.
 * @param {Nodes['type']} type
 *   The type of the mdast node to toggle.
 * @param {string} separator
 *   The mdast node separator to insert.
 * @param {string} uri
 *   The URI of the document the request is for.
 * @param {Range} range
 *   The range that is selected by the user.
 * @returns {Promise<undefined>}
 */
export function toggleSyntax(context: LanguageServiceContext, options: createMdxServicePlugin.Options, type: Nodes["type"], separator: string, uri: string, range: Range): Promise<undefined>;
import type { LanguageServiceContext } from '@volar/language-service';
import type { createMdxServicePlugin } from './service-plugin.js';
import type { Nodes } from 'mdast';
import type { Range } from '@volar/language-service';
//# sourceMappingURL=commands.d.ts.map