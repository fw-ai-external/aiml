/**
 * @import {Pluggable, PluggableList, Plugin} from 'unified'
 */
/**
 * Resolve remark plugins from TypeScript’s parsed command line options.
 *
 * @param {unknown} mdxConfig
 *   The parsed command line options from which to resolve plugins.
 * @param {(name: string) => Plugin | PromiseLike<Plugin>} resolvePlugin
 *   A function which takes a plugin name, and resolvs it to a remark plugin.
 * @returns {Promise<PluggableList | undefined>}
 *   An array of resolved plugins, or `undefined` in case of an invalid
 *   configuration.
 */
export function resolveRemarkPlugins(mdxConfig: unknown, resolvePlugin: (name: string) => Plugin | PromiseLike<Plugin>): Promise<PluggableList | undefined>;
import type { Plugin } from 'unified';
import type { PluggableList } from 'unified';
//# sourceMappingURL=tsconfig.d.ts.map