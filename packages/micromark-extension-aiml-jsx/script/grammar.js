/**
 * @import {Root} from 'mdast'
 */

import fs from 'node:fs/promises'
import {zone} from 'mdast-zone'

const syntax = await fs.readFile(
  new URL('grammar.html', import.meta.url),
  'utf8'
)

export default function grammar() {
  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return function (tree) {
    zone(tree, 'grammar', function (start, _, end) {
      return [
        start,
        {type: 'html', value: '<pre><code>' + syntax + '</code></pre>'},
        end
      ]
    })
  }
}
