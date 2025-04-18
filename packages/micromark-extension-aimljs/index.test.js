import assert from 'node:assert/strict'
import {describe, it} from 'bun:test'
import {micromark} from 'micromark'
import {aimljs} from './index.js'

describe('markdown -> html (micromark)', async () => {
  it('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('./index.js')).sort(), ['aimljs'])
  })

  it('should be gnostic', async function () {
    assert.equal(
      micromark('<x {...{"{": 1}} />\n{1 + /*}*/ + 2}', {
        extensions: [aimljs()]
      }),
      '\n'
    )
  })
})
