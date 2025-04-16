/**
 * Create an extension for `micromark` to enable MDX syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   syntax.
 */
export function aimljs(options?: Options | null | undefined): Extension;
import type { Options } from 'micromark-extension-mdxjs';
import type { Extension } from 'micromark-util-types';
