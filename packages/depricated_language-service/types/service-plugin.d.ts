/**
 * Create an Volar service plugin for MDX files.
 *
 * The service supports:
 *
 * - Reporting diagnostics for parsing errors.
 * - Document drop support for images.
 * - Custom commands for toggling `delete`, `emphasis`, `inlineCode`, and
 *   `strong` text.
 *
 * @param {createMdxServicePlugin.Options} options
 *   Options to configure the MDX language service.
 * @returns {LanguageServicePlugin}
 *   The Volar service plugin for MDX files.
 */
export function createMdxServicePlugin(options: createMdxServicePlugin.Options): LanguageServicePlugin;
export namespace createMdxServicePlugin {
    type Options = {
        /**
         *   A function to apply workspace edits.
         */
        applyEdit: ApplyEdit;
    };
}
export type ApplyEdit = (edit: WorkspaceEdit) => PromiseLike<unknown>;
import type { LanguageServicePlugin } from '@volar/language-service';
import type { WorkspaceEdit } from '@volar/language-service';
//# sourceMappingURL=service-plugin.d.ts.map