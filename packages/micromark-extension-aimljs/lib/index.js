/**
 * @import {Options} from 'micromark-extension-aimljs'
 * @import {Extension} from 'micromark-util-types'
 */

import {Parser} from 'acorn'
import acornJsx from 'acorn-jsx'
import {mdxExpression} from 'micromark-extension-mdx-expression'
import {aimlJsx} from 'micromark-extension-aiml-jsx'
import {mdxMd} from 'micromark-extension-mdx-md'
import {mdxjsEsm} from 'micromark-extension-mdxjs-esm'
import {combineExtensions} from 'micromark-util-combine-extensions'

/**
 * Create an extension for `micromark` to enable MDX syntax.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   syntax.
 */
export function aimljs(options) {
  const settings = Object.assign(
    {
      acorn: Parser.extend(acornJsx()),
      acornOptions: {ecmaVersion: 2024, sourceType: 'module'},
      addResult: true
    },
    options
  )

  return combineExtensions([
    mdxjsEsm(settings),
    mdxExpression(settings),
    aimlJsx(settings),
    mdxMd()
  ])
}
