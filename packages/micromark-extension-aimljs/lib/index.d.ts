/**
 * Create an extension for `micromark` to enable MDX syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   syntax.
 */
import type {Extension} from 'micromark-util-types'
import type {Options} from '../index.d.ts.js'

export function aimljs(options?: Options | null | undefined): Extension
