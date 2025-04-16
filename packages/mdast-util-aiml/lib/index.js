/**
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-aiml-jsx').ToMarkdownOptions} ToMarkdownOptions
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 */

import {
  mdxExpressionFromMarkdown,
  mdxExpressionToMarkdown
} from 'mdast-util-mdx-expression'
import {aimlJsxFromMarkdown, aimlJsxToMarkdown} from 'mdast-util-aiml-jsx'
import {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from 'mdast-util-mdxjs-esm'

/**
 * Create an extension for `mdast-util-from-markdown` to enable MDX (ESM, JSX,
 * expressions).
 *
 * @returns {Array<FromMarkdownExtension>}
 *   Extension for `mdast-util-from-markdown` to enable MDX (ESM, JSX,
 *   expressions).
 *
 *   When using the syntax extensions with `addResult`, ESM and expression
 *   nodes will have `data.estree` fields set to ESTree `Program` node.
 */
export function aimlFromMarkdown() {
  return [
    mdxExpressionFromMarkdown(),
    aimlJsxFromMarkdown(),
    mdxjsEsmFromMarkdown()
  ]
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable MDX (ESM, JSX,
 * expressions).
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable MDX (ESM, JSX,
 *   expressions).
 */
export function aimlToMarkdown(options) {
  return {
    extensions: [
      mdxExpressionToMarkdown(),
      aimlJsxToMarkdown(options),
      mdxjsEsmToMarkdown()
    ]
  }
}
