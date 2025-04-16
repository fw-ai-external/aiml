/* eslint-disable unicorn/prefer-structured-clone -- Casting to JSON drops instance stuff. */

/**
 * @import {Node, Program} from 'estree'
 * @import {CompileContext, Handle, HtmlExtension} from 'micromark-util-types'
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import acornJsx from 'acorn-jsx'
import {Parser} from 'acorn'
import {visit} from 'estree-util-visit'
import {mdxExpression} from 'micromark-extension-mdx-expression'
import {aimlJsx} from 'micromark-extension-aiml-jsx'
import {micromark} from 'micromark'

const acorn = Parser.extend(acornJsx())

/** @type {HtmlExtension} */
const html = {
  enter: {mdxJsxFlowTag: start, mdxJsxTextTag: start},
  exit: {mdxJsxFlowTag: end, mdxJsxTextTag: end}
}

/**
 * @this {CompileContext}
 * @type {Handle}
 */
function start() {
  this.buffer()
}

/**
 * @this {CompileContext}
 * @type {Handle}
 */
function end() {
  this.resume()
  this.setData('slurpOneLineEnding', true)
}

test('core', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('micromark-extension-aiml-jsx')).sort(),
      ['mdxJsx']
    )
  })

  await t.test('should crash on `acorn` w/o `parse`', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that a runtime error is thrown.
      aimlJsx({acorn: true})
    }, /Expected a proper `acorn` instance passed in as `options\.acorn`/)
  })

  await t.test('should crash on `acornOptions` w/o `acorn`', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that a runtime error is thrown.
      aimlJsx({acornOptions: {}})
    }, /Expected an `acorn` instance passed in as `options\.acorn`/)
  })

  await t.test('should crash on `addResult` w/o `acorn`', async function () {
    assert.throws(function () {
      aimlJsx({addResult: true})
    }, /Expected an `acorn` instance passed in as `options\.acorn`/)
  })

  await t.test('should support a self-closing element', async function () {
    assert.equal(
      micromark('a <b/> c.', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a  c.</p>'
    )
  })

  await t.test('should support a closed element', async function () {
    assert.equal(
      micromark('a <b></b> c.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a  c.</p>'
    )
  })

  await t.test('should support fragments', async function () {
    assert.equal(
      micromark('a <></> c.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a  c.</p>'
    )
  })

  await t.test('should support markdown inside elements', async function () {
    assert.equal(
      micromark('a <b>*b*</b> c.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a <em>b</em> c.</p>'
    )
  })
})

test('text (agnostic)', async function (t) {
  await t.test('should support a self-closing element', async function () {
    assert.equal(
      micromark('a <b /> c', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a  c</p>'
    )
  })

  await t.test('should support a closed element', async function () {
    assert.equal(
      micromark('a <b> c </b> d', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a  c  d</p>'
    )
  })

  await t.test('should support an unclosed element', async function () {
    assert.equal(
      micromark('a <b> c', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a  c</p>'
    )
  })

  await t.test('should support an attribute expression', async function () {
    assert.equal(
      micromark('a <b {1 + 1} /> c', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test(
    'should support an attribute value expression',
    async function () {
      assert.equal(
        micromark('a <b c={1 + 1} /> d', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a  d</p>'
      )
    }
  )
})

test('text (gnostic)', async function (t) {
  await t.test('should support a self-closing element', async function () {
    assert.equal(
      micromark('a <b /> c', {
        extensions: [aimlJsx({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test('should support a closed element', async function () {
    assert.equal(
      micromark('a <b> c </b> d', {
        extensions: [aimlJsx({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c  d</p>'
    )
  })

  await t.test('should support an unclosed element', async function () {
    assert.equal(
      micromark('a <b> c', {
        extensions: [aimlJsx({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test('should support an attribute expression', async function () {
    assert.equal(
      micromark('a <b {...c} /> d', {
        extensions: [aimlJsx({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )
  })

  await t.test(
    'should support more complex attribute expression (1)',
    async function () {
      assert.equal(
        micromark('a <b {...{c: 1, d: Infinity, e: false}} /> f', {
          extensions: [aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  f</p>'
      )
    }
  )

  await t.test(
    'should support more complex attribute expression (2)',
    async function () {
      assert.equal(
        micromark('a <b {...[1, Infinity, false]} /> d', {
          extensions: [aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  d</p>'
      )
    }
  )

  await t.test(
    'should support an attribute value expression',
    async function () {
      assert.equal(
        micromark('a <b c={1 + 1} /> d', {
          extensions: [aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  d</p>'
      )
    }
  )

  await t.test(
    'should crash on an empty attribute value expression',
    async function () {
      assert.throws(function () {
        micromark('a <b c={} /> d', {extensions: [aimlJsx({acorn})]})
      }, /Unexpected empty expression/)
    }
  )

  await t.test(
    'should crash on a non-spread attribute expression',
    async function () {
      assert.throws(function () {
        micromark('a <b {1 + 1} /> c', {extensions: [aimlJsx({acorn})]})
      }, /Could not parse expression with acorn/)
    }
  )

  await t.test(
    'should crash on invalid JS in an attribute value expression',
    async function () {
      assert.throws(function () {
        micromark('a <b c={?} /> d', {extensions: [aimlJsx({acorn})]})
      }, /Could not parse expression with acorn/)
    }
  )

  await t.test(
    'should crash on invalid JS in an attribute expression',
    async function () {
      assert.throws(function () {
        micromark('a <b {?} /> c', {extensions: [aimlJsx({acorn})]})
      }, /Could not parse expression with acorn/)
    }
  )

  await t.test(
    'should crash on invalid JS in an attribute expression (2)',
    async function () {
      assert.throws(function () {
        micromark('a <b{c=d}={}/> f', {extensions: [aimlJsx({acorn})]})
      }, /Unexpected `ExpressionStatement` in code: expected an object spread/)
    }
  )

  await t.test('should support parenthesized expressions', async function () {
    assert.equal(
      micromark('a <b c={(2)} d={<e />} /> f', {
        extensions: [aimlJsx({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  f</p>'
    )
  })
})

test('text (complete)', async function (t) {
  await t.test('should support an unclosed element', async function () {
    assert.equal(
      micromark('a <b> c', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a  c</p>'
    )
  })

  await t.test('should support an unclosed fragment', async function () {
    assert.equal(
      micromark('a <> c', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a  c</p>'
    )
  })

  await t.test(
    'should *not* support whitespace in the opening tag (fragment)',
    async function () {
      assert.equal(
        micromark('a < \t>b</>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a &lt; \t&gt;b</p>'
      )
    }
  )

  await t.test(
    'should *not* support whitespace in the opening tag (named)',
    async function () {
      assert.equal(
        micromark('a < \nb\t>b</b>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a &lt;\nb\t&gt;b</p>'
      )
    }
  )

  await t.test(
    'should crash on a nonconforming start identifier',
    async function () {
      assert.throws(function () {
        micromark('a <!> b', {extensions: [aimlJsx()]})
      }, /Unexpected character `!` \(U\+0021\) before name, expected a character that can start a name, such as a letter, `\$`, or `_`/)
    }
  )

  await t.test(
    'should crash on a nonconforming start identifier in a closing tag',
    async function () {
      assert.throws(function () {
        micromark('a <a></(> b.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\(` \(U\+0028\) before name, expected a character that can start a name, such as a letter, `\$`, or `_`/)
    }
  )

  await t.test(
    'should support non-ascii identifier start characters',
    async function () {
      assert.equal(
        micromark('a <π /> b.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a  b.</p>'
      )
    }
  )

  await t.test(
    'should crash on non-conforming non-ascii identifier start characters',
    async function () {
      assert.throws(function () {
        micromark('a <© /> b.', {extensions: [aimlJsx()]})
      }, /Unexpected character `©` \(U\+00A9\) before name, expected a character that can start a name, such as a letter, `\$`, or `_`/)
    }
  )

  await t.test(
    'should crash nicely on what might be a comment',
    async function () {
      assert.throws(function () {
        micromark('a <!--b-->', {extensions: [aimlJsx()]})
      }, /Unexpected character `!` \(U\+0021\) before name, expected a character that can start a name, such as a letter, `\$`, or `_` \(note: to create a comment in MDX, use `{\/\* text \*\/}`\)/)
    }
  )

  await t.test(
    'should crash nicely JS line comments inside tags (1)',
    async function () {
      assert.throws(function () {
        micromark('a <// b\nc/>', {extensions: [aimlJsx()]})
      }, /Unexpected character `\/` \(U\+002F\) before name, expected a character that can start a name, such as a letter, `\$`, or `_` \(note: JS comments in JSX tags are not supported in MDX\)/)
    }
  )

  await t.test(
    'should crash nicely JS line comments inside tags (2)',
    async function () {
      assert.throws(function () {
        micromark('a <b// c\nd/>', {extensions: [aimlJsx()]})
      }, /Unexpected character `\/` \(U\+002F\) after self-closing slash, expected `>` to end the tag \(note: JS comments in JSX tags are not supported in MDX\)/)
    }
  )

  await t.test(
    'should crash nicely JS multiline comments inside tags (1)',
    async function () {
      assert.throws(function () {
        micromark('a </*b*/c>', {extensions: [aimlJsx()]})
      }, /Unexpected character `\*` \(U\+002A\) before name, expected a character that can start a name, such as a letter, `\$`, or `_` \(note: JS comments in JSX tags are not supported in MDX\)/)
    }
  )

  await t.test(
    'should crash nicely JS multiline comments inside tags (2)',
    async function () {
      assert.throws(function () {
        micromark('a <b/*c*/>', {extensions: [aimlJsx()]})
      }, /Unexpected character `\*` \(U\+002A\) after self-closing slash, expected `>` to end the tag \(note: JS comments in JSX tags are not supported in MDX\)/)
    }
  )

  await t.test(
    'should support non-ascii identifier continuation characters',
    async function () {
      assert.equal(
        micromark('a <a\u200Cb /> b.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a  b.</p>'
      )
    }
  )

  await t.test(
    'should crash on non-conforming non-ascii identifier continuation characters',
    async function () {
      assert.throws(function () {
        micromark('a <a¬ /> b.', {extensions: [aimlJsx()]})
      }, /Unexpected character `¬` \(U\+00AC\) in name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash nicely on what might be an email link',
    async function () {
      assert.throws(function () {
        micromark('a <b@c.d>', {extensions: [aimlJsx()]})
      }, /Unexpected character `@` \(U\+0040\) in name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag \(note: to create a link in MDX, use `\[text]\(url\)`\)/)
    }
  )

  await t.test('should support dashes in names', async function () {
    assert.equal(
      micromark('a <a-->b</a-->.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a b.</p>'
    )
  })

  await t.test(
    'should crash on nonconforming identifier continuation characters',
    async function () {
      assert.throws(function () {
        micromark('a <a?> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\?` \(U\+003F\) in name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should support dots in names for method names',
    async function () {
      assert.equal(
        micromark('a <abc . def.ghi>b</abc.def . ghi>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a b.</p>'
      )
    }
  )

  await t.test(
    'should crash nicely on what might be an email link in member names',
    async function () {
      assert.throws(function () {
        micromark('a <b.c@d.e>', {extensions: [aimlJsx()]})
      }, /Unexpected character `@` \(U\+0040\) in member name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag \(note: to create a link in MDX, use `\[text]\(url\)`\)/)
    }
  )

  await t.test(
    'should support colons in names for local names',
    async function () {
      assert.equal(
        micromark('a <svg: rect>b</  svg :rect>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a b.</p>'
      )
    }
  )

  await t.test(
    'should crash on a nonconforming character to start a local name',
    async function () {
      assert.throws(function () {
        micromark('a <a:+> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\+` \(U\+002B\) before local name, expected a character that can start a name, such as a letter, `\$`, or `_` \(note: to create a link in MDX, use `\[text]\(url\)`\)/)
    }
  )

  await t.test(
    'should crash nicely on what might be a protocol in local names',
    async function () {
      assert.throws(function () {
        micromark('a <http://example.com>', {extensions: [aimlJsx()]})
      }, /Unexpected character `\/` \(U\+002F\) before local name, expected a character that can start a name, such as a letter, `\$`, or `_` \(note: to create a link in MDX, use `\[text]\(url\)`\)/)
    }
  )

  await t.test(
    'should crash nicely on what might be a protocol in local names',
    async function () {
      assert.throws(function () {
        micromark('a <http: >', {extensions: [aimlJsx()]})
      }, /Unexpected character `>` \(U\+003E\) before local name, expected a character that can start a name, such as a letter, `\$`, or `_`/)
    }
  )

  await t.test(
    'should crash on a nonconforming character in a local name',
    async function () {
      assert.throws(function () {
        micromark('a <a:b|> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\|` \(U\+007C\) in local name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character to start a member name',
    async function () {
      assert.throws(function () {
        micromark('a <a..> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\.` \(U\+002E\) before member name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character in a member name',
    async function () {
      assert.throws(function () {
        micromark('a <a.b,> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `,` \(U\+002C\) in member name, expected a name character such as letters, digits, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character after a local name',
    async function () {
      assert.throws(function () {
        micromark('a <a:b .> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\.` \(U\+002E\) after local name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character after a member name',
    async function () {
      assert.throws(function () {
        micromark('a <a.b :> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `:` \(U\+003A\) after member name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character after name',
    async function () {
      assert.throws(function () {
        micromark('a <a => c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `=` \(U\+003D\) after name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test('should support attribute expressions', async function () {
    assert.equal(
      micromark('a <b {...props} {...rest}>c</b>.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a c.</p>'
    )
  })

  await t.test(
    'should support nested balanced braces in attribute expressions',
    async function () {
      assert.equal(
        micromark('a <b {...{"a": "b"}}>c</b>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a c.</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions directly after a name',
    async function () {
      assert.equal(
        micromark('<a{...b}/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions directly after a member name',
    async function () {
      assert.equal(
        micromark('<a.b{...c}/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions directly after a local name',
    async function () {
      assert.equal(
        micromark('<a:b{...c}/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions directly after boolean attributes',
    async function () {
      assert.equal(
        micromark('a <b c{...d}/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a .</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions directly after boolean qualified attributes',
    async function () {
      assert.equal(
        micromark('a <b c:d{...e}/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a .</p>'
      )
    }
  )

  await t.test(
    'should support attribute expressions and normal attributes',
    async function () {
      assert.equal(
        micromark('a <b a {...props} b>c</b>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a c.</p>'
      )
    }
  )

  await t.test('should support attributes', async function () {
    assert.equal(
      micromark('a <b c     d="d"\t\tefg=\'e\'>c</b>.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a c.</p>'
    )
  })

  await t.test(
    'should crash on a nonconforming character before an attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <b {...p}~>c</b>.', {extensions: [aimlJsx()]})
      }, /Unexpected character `~` \(U\+007E\) before attribute name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a missing closing brace in attribute expression',
    async function () {
      assert.throws(function () {
        micromark('a <b {...', {extensions: [aimlJsx()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash on a nonconforming character in attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <a b@> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `@` \(U\+0040\) in attribute name, expected an attribute name character such as letters, digits, `\$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test('should support prefixed attributes', async function () {
    assert.equal(
      micromark('a <b xml :\tlang\n= "de-CH" foo:bar>c</b>.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a c.</p>'
    )
  })

  await t.test(
    'should support prefixed and normal attributes',
    async function () {
      assert.equal(
        micromark('a <b a b : c d : e = "f" g/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a .</p>'
      )
    }
  )

  await t.test(
    'should crash on a nonconforming character after an attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <a b 1> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `1` \(U\+0031\) after attribute name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; `=` to initialize a value; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character to start a local attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <a b:#> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `#` \(U\+0023\) before local attribute name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`/)
    }
  )

  await t.test(
    'should crash on a nonconforming character in a local attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <a b:c%> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `%` \(U\+0025\) in local attribute name, expected an attribute name character such as letters, digits, `\$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should crash on a nonconforming character after a local attribute name',
    async function () {
      assert.throws(function () {
        micromark('a <a b:c ^> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\^` \(U\+005E\) after local attribute name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; `=` to initialize a value; or the end of the tag/)
    }
  )

  await t.test('should support attribute value expressions', async function () {
    assert.equal(
      micromark('a <b c={1 + 1}>c</b>.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a c.</p>'
    )
  })

  await t.test(
    'should support nested balanced braces in attribute value expressions',
    async function () {
      assert.equal(
        micromark('a <b c={1 + ({a: 1}).a}>c</b>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a c.</p>'
      )
    }
  )

  await t.test(
    'should crash on a nonconforming character before an attribute value',
    async function () {
      assert.throws(function () {
        micromark('a <a b=``> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `` ` `` \(U\+0060\) before attribute value, expected a character that can start an attribute value, such as `"`, `'`, or `{`/)
    }
  )

  await t.test(
    'should crash nicely on what might be a fragment, element as prop value',
    async function () {
      assert.throws(function () {
        micromark('a <a b=<c />> d.', {extensions: [aimlJsx()]})
      }, /Unexpected character `<` \(U\+003C\) before attribute value, expected a character that can start an attribute value, such as `"`, `'`, or `{` \(note: to use an element or fragment as a prop value in MDX, use `{<element \/>}`\)/)
    }
  )

  await t.test(
    'should crash on a missing closing quote in double quoted attribute value',
    async function () {
      assert.throws(function () {
        micromark('a <a b="> c.', {extensions: [aimlJsx()]})
      }, /Unexpected end of file in attribute value, expected a corresponding closing quote `"`/)
    }
  )

  await t.test(
    'should crash on a missing closing quote in single quoted attribute value',
    async function () {
      assert.throws(function () {
        micromark("a <a b='> c.", {extensions: [aimlJsx()]})
      }, /Unexpected end of file in attribute value, expected a corresponding closing quote `'`/)
    }
  )

  await t.test(
    'should crash on a missing closing brace in an attribute value expression',
    async function () {
      assert.throws(function () {
        micromark('a <a b={> c.', {extensions: [aimlJsx()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash on a nonconforming character after an attribute value',
    async function () {
      assert.throws(function () {
        micromark('a <a b=""*> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `\*` \(U\+002A\) before attribute name, expected a character that can start an attribute name, such as a letter, `\$`, or `_`; whitespace before attributes; or the end of the tag/)
    }
  )

  await t.test(
    'should support an attribute directly after a value',
    async function () {
      assert.equal(
        micromark('<a b=""c/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support an attribute directly after an attribute expression',
    async function () {
      assert.equal(
        micromark('<a{...b}c/>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should crash on a nonconforming character after a self-closing slash',
    async function () {
      assert.throws(function () {
        micromark('a <a/b> c.', {extensions: [aimlJsx()]})
      }, /Unexpected character `b` \(U\+0062\) after self-closing slash, expected `>` to end the tag/)
    }
  )

  await t.test(
    'should support whitespace directly after closing slash',
    async function () {
      assert.equal(
        micromark('<a/ \t>.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should *not* crash on closing angle in text',
    async function () {
      assert.doesNotThrow(function () {
        micromark('a > c.', {extensions: [aimlJsx()], htmlExtensions: [html]})
      })
    }
  )

  await t.test(
    'should *not* crash on opening angle in tick code in an element',
    async function () {
      assert.doesNotThrow(function () {
        micromark('a <>`<`</> c.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        })
      })
    }
  )

  await t.test(
    'should *not* crash on ticks in tick code in an element',
    async function () {
      assert.doesNotThrow(function () {
        micromark('a <>`` ``` ``</>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        })
      })
    }
  )

  await t.test(
    'should support a closing tag w/o open elements',
    async function () {
      assert.equal(
        micromark('a </> c.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a  c.</p>'
      )
    }
  )

  await t.test('should support mismatched tags (1)', async function () {
    assert.equal(
      micromark('a <></b>', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (2)', async function () {
    assert.equal(
      micromark('a <b></>', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (3)', async function () {
    assert.equal(
      micromark('a <a.b></a>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (4)', async function () {
    assert.equal(
      micromark('a <a></a.b>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (5)', async function () {
    assert.equal(
      micromark('a <a.b></a.c>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (6)', async function () {
    assert.equal(
      micromark('a <a:b></a>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (7)', async function () {
    assert.equal(
      micromark('a <a></a:b>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (8)', async function () {
    assert.equal(
      micromark('a <a:b></a:c>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support mismatched tags (9)', async function () {
    assert.equal(
      micromark('a <a:b></a.b>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a </p>'
    )
  })

  await t.test('should support a closing self-closing tag', async function () {
    assert.equal(
      micromark('a <a>b</a/>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a b</p>'
    )
  })

  await t.test('should support a closing tag w/ attributes', async function () {
    assert.equal(
      micromark('a <a>b</a b>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a b</p>'
    )
  })

  await t.test('should support nested tags', async function () {
    assert.equal(
      micromark('a <>b <>c</> d</>.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a b c d.</p>'
    )
  })

  await t.test(
    'should support character references in attribute values',
    async function () {
      assert.equal(
        micromark(
          '<x y="Character references can be used: &quot;, &apos;, &lt;, &gt;, &#x7B;, and &#x7D;, they can be named, decimal, or hexadecimal: &copy; &#8800; &#x1D306;" />.',
          {extensions: [aimlJsx()], htmlExtensions: [html]}
        ),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support character references in text',
    async function () {
      assert.equal(
        micromark(
          '<x>Character references can be used: &quot;, &apos;, &lt;, &gt;, &#x7B;, and &#x7D;, they can be named, decimal, or hexadecimal: &copy; &#8800; &#x1D306;</x>.',
          {extensions: [aimlJsx()], htmlExtensions: [html]}
        ),
        "<p>Character references can be used: &quot;, ', &lt;, &gt;, {, and }, they can be named, decimal, or hexadecimal: © ≠ 𝌆.</p>"
      )
    }
  )

  await t.test(
    'should support as text if the closing tag is not the last thing',
    async function () {
      assert.equal(
        micromark('<x />.', {extensions: [aimlJsx()], htmlExtensions: [html]}),
        '<p>.</p>'
      )
    }
  )

  await t.test(
    'should support as text if the opening is not the first thing',
    async function () {
      assert.equal(
        micromark('a <x />', {extensions: [aimlJsx()], htmlExtensions: [html]}),
        '<p>a </p>'
      )
    }
  )

  await t.test(
    'should not care about precedence between attention (emphasis)',
    async function () {
      assert.equal(
        micromark('a *open <b> close* </b> c.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a <em>open  close</em>  c.</p>'
      )
    }
  )

  await t.test(
    'should not care about precedence between attention (strong)',
    async function () {
      assert.equal(
        micromark('a **open <b> close** </b> c.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a <strong>open  close</strong>  c.</p>'
      )
    }
  )

  await t.test(
    'should not care about precedence between label (link)',
    async function () {
      assert.equal(
        micromark('a [open <b> close](c) </b> d.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a <a href="c">open  close</a>  d.</p>'
      )
    }
  )

  await t.test(
    'should not care about precedence between label (image)',
    async function () {
      assert.equal(
        micromark('a ![open <b> close](c) </b> d.', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>a <img src="c" alt="open  close" />  d.</p>'
      )
    }
  )

  await t.test('should support line endings in elements', async function () {
    assert.equal(
      micromark('> a <b>\n> c </b> d.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n<p>a c  d.</p>\n</blockquote>'
    )
  })

  await t.test(
    'should support line endings in attribute values',
    async function () {
      assert.equal(
        micromark('> a <b c="d\ne" /> f', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<blockquote>\n<p>a  f</p>\n</blockquote>'
      )
    }
  )

  await t.test(
    'should support line endings in attribute value expressions',
    async function () {
      assert.equal(
        micromark('> a <b c={d\ne} /> f', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<blockquote>\n<p>a  f</p>\n</blockquote>'
      )
    }
  )

  await t.test(
    'should support line endings in attribute expressions',
    async function () {
      assert.equal(
        micromark('> a <b {c\nd} /> e', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<blockquote>\n<p>a  e</p>\n</blockquote>'
      )
    }
  )

  await t.test(
    'should allow `<` followed by markdown whitespace as text in markdown',
    async function () {
      assert.equal(
        micromark('1 < 3', {extensions: [aimlJsx()], htmlExtensions: [html]}),
        '<p>1 &lt; 3</p>'
      )
    }
  )

  await t.test('should allow line endings in whitespace', async function () {
    assert.equal(
      micromark('a <b \n c> d.', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>a  d.</p>'
    )
  })
})

test('flow (agnostic)', async function (t) {
  await t.test('should support a self-closing element', async function () {
    assert.equal(
      micromark('<a />', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      ''
    )
  })

  await t.test('should support a closed element', async function () {
    assert.equal(
      micromark('<a></a>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      ''
    )
  })

  await t.test('should support an element w/ content', async function () {
    assert.equal(
      micromark('<a>\nb\n</a>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>b</p>\n'
    )
  })

  await t.test(
    'should support an element w/ containers as content',
    async function () {
      assert.equal(
        micromark('<a>\n- b\n</a>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<ul>\n<li>b</li>\n</ul>\n'
      )
    }
  )

  await t.test('should support attributes', async function () {
    assert.equal(
      micromark('<a b c:d e="" f={/* g */} {...h} />', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      ''
    )
  })
})

// Flow is mostly the same as `text`, so we only test the relevant
// differences.
test('flow (essence)', async function (t) {
  await t.test('should support an element', async function () {
    assert.equal(
      micromark('<a />', {extensions: [aimlJsx()], htmlExtensions: [html]}),
      ''
    )
  })

  await t.test(
    'should support an element around a container',
    async function () {
      assert.equal(
        micromark('<a>\n- b\n</a>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<ul>\n<li>b</li>\n</ul>\n'
      )
    }
  )

  await t.test(
    'should support a dangling `>` in a tag (not a block quote)',
    async function () {
      assert.equal(
        micromark('<x\n  y\n>  \nb\n  </x>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>b</p>\n'
      )
    }
  )

  await t.test(
    'should support trailing initial and final whitespace around tags',
    async function () {
      assert.equal(
        micromark('<a>  \nb\n  </a>', {
          extensions: [aimlJsx()],
          htmlExtensions: [html]
        }),
        '<p>b</p>\n'
      )
    }
  )

  await t.test('should support tags after tags', async function () {
    assert.equal(
      micromark('<a> <b>\t\nc\n  </b> </a>', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<p>c</p>\n'
    )
  })

  await t.test('should not support lazy flow (1)', async function () {
    assert.throws(function () {
      micromark('> <X\n/>', {extensions: [aimlJsx()]})
    }, /Unexpected lazy line in container/)
  })

  await t.test('should not support lazy flow (2)', async function () {
    assert.throws(function () {
      micromark('> a\n> <X\n/>', {extensions: [aimlJsx()]})
    }, /Unexpected lazy line in container/)
  })

  await t.test('should not support lazy flow (3)', async function () {
    assert.deepEqual(
      micromark('> a\n<X />', {
        extensions: [aimlJsx()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n<p>a</p>\n</blockquote>\n'
    )
  })
})

test('positional info', async function (t) {
  await t.test(
    'should use correct positional info when tabs are used',
    function () {
      const example = '<a {...`\n\t`}/>'
      /** @type {Program | undefined} */
      let program

      acorn.parseExpressionAt(example, 0, {
        ecmaVersion: 'latest',
        locations: true,
        ranges: true
      })

      micromark(example, {
        extensions: [aimlJsx({acorn, addResult: true})],
        htmlExtensions: [
          {enter: {mdxJsxFlowTagExpressionAttribute: expression}}
        ]
      })

      assert(program)
      removeOffsets(program)
      const micromarkStatement = program.body[0]
      assert(micromarkStatement.type === 'ExpressionStatement')
      const micromarkExpression = micromarkStatement.expression
      assert(micromarkExpression.type === 'ObjectExpression')
      const micromarkProperty = micromarkExpression.properties[0]
      assert(micromarkProperty.type === 'SpreadElement')
      const micromarkArgument = micromarkProperty.argument

      assert.deepEqual(JSON.parse(JSON.stringify(micromarkArgument)), {
        type: 'TemplateLiteral',
        start: 7,
        end: 11,
        loc: {start: {line: 1, column: 7}, end: {line: 2, column: 2}},
        expressions: [],
        quasis: [
          {
            type: 'TemplateElement',
            start: 8,
            end: 10,
            loc: {start: {line: 1, column: 8}, end: {line: 2, column: 1}},
            value: {raw: '\n', cooked: '\n'},
            tail: true,
            range: [8, 10]
          }
        ],
        range: [7, 11]
      })

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )

  await t.test(
    'should use correct positional when there are virtual spaces due to a block quote',
    function () {
      /** @type {Program | undefined} */
      let program

      micromark('> <a b={`\n>\t`}/>', {
        extensions: [aimlJsx({acorn, addResult: true})],
        htmlExtensions: [
          {enter: {mdxJsxFlowTagAttributeValueExpression: expression}}
        ]
      })

      assert(program)
      removeOffsets(program)

      assert.deepEqual(
        JSON.parse(JSON.stringify(program)),
        JSON.parse(
          JSON.stringify({
            type: 'Program',
            start: 8,
            end: 13,
            body: [
              {
                type: 'ExpressionStatement',
                expression: {
                  type: 'TemplateLiteral',
                  start: 8,
                  end: 13,
                  loc: {start: {line: 1, column: 8}, end: {line: 2, column: 3}},
                  expressions: [],
                  quasis: [
                    {
                      type: 'TemplateElement',
                      start: 9,
                      end: 12,
                      loc: {
                        start: {line: 1, column: 9},
                        end: {line: 2, column: 2}
                      },
                      value: {raw: '\n', cooked: '\n'},
                      tail: true,
                      range: [9, 12]
                    }
                  ],
                  range: [8, 13]
                },
                start: 8,
                end: 13,
                loc: {start: {line: 1, column: 8}, end: {line: 2, column: 3}},
                range: [8, 13]
              }
            ],
            sourceType: 'module',
            comments: [],
            loc: {start: {line: 1, column: 8}, end: {line: 2, column: 3}},
            range: [8, 13]
          })
        )
      )

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )
})

test('indent', async function (t) {
  await t.test(
    'should keep the correct number of spaces in a blockquote',
    function () {
      /** @type {Program | undefined} */
      let program

      micromark(
        '> <a b={`\n> alpha\n>  bravo\n>   charlie\n>    delta\n> `}/>',
        {
          extensions: [aimlJsx({acorn, addResult: true})],
          htmlExtensions: [
            {enter: {mdxJsxFlowTagAttributeValueExpression: expression}}
          ]
        }
      )

      assert(program)
      removeOffsets(program)
      const statement = program.body[0]
      assert(statement.type === 'ExpressionStatement')
      assert(statement.expression.type === 'TemplateLiteral')
      const quasi = statement.expression.quasis[0]
      assert(quasi)
      const value = quasi.value.cooked
      assert.equal(value, '\nalpha\nbravo\ncharlie\n delta\n')

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )
})

test('interleaving w/ expressions', async function (t) {
  await t.test(
    'should support tags and expressions (unaware)',
    async function () {
      assert.deepEqual(
        micromark('<div>\n{1}\n</div>', {
          extensions: [mdxExpression(), aimlJsx()],
          htmlExtensions: [html]
        }),
        '\n'
      )
    }
  )

  await t.test(
    'should support tags and expressions (aware)',
    async function () {
      assert.deepEqual(
        micromark("<div>\n{'}'}\n</div>", {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '\n'
      )
    }
  )

  await t.test(
    'should support tags and expressions with text before (text)',
    async function () {
      assert.deepEqual(
        micromark('x<em>{1}</em>', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support tags and expressions with text between, early (text)',
    async function () {
      assert.deepEqual(
        micromark('<em>x{1}</em>', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support tags and expressions with text between, late (text)',
    async function () {
      assert.deepEqual(
        micromark('<em>{1}x</em>', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support tags and expressions with text after (text)',
    async function () {
      assert.deepEqual(
        micromark('<em>{1}</em>x', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support a tag and then an expression (flow)',
    async function () {
      assert.deepEqual(
        micromark('<x/>{1}', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        ''
      )
    }
  )

  await t.test(
    'should support a tag, an expression, then text (text)',
    async function () {
      assert.deepEqual(
        micromark('<x/>{1}x', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support text, a tag, then an expression (text)',
    async function () {
      assert.deepEqual(
        micromark('x<x/>{1}', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support an expression and then a tag (flow)',
    async function () {
      assert.deepEqual(
        micromark('{1}<x/>', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        ''
      )
    }
  )

  await t.test(
    'should support an expression, a tag, then text (text)',
    async function () {
      assert.deepEqual(
        micromark('{1}<x/>x', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should support text, an expression, then a tag (text)',
    async function () {
      assert.deepEqual(
        micromark('x{1}<x/>', {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '<p>x</p>'
      )
    }
  )

  await t.test(
    'should nicely interleaf (micromark/micromark-extension-aiml-jsx#9)',
    async function () {
      assert.equal(
        micromark("<x>{[\n'',\n{c:''}\n]}</x>", {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }),
        '\n\n'
      )
    }
  )

  await t.test('should nicely interleaf (mdx-js/mdx#1945)', async function () {
    assert.equal(
      micromark(
        `
<style>{\`
  .foo {}
  .bar {}
\`}</style>
    `,
        {
          extensions: [mdxExpression({acorn}), aimlJsx({acorn})],
          htmlExtensions: [html]
        }
      ),
      '\n\n'
    )
  })
})

/**
 * @param {Node} node
 * @returns {undefined}
 */
function removeOffsets(node) {
  visit(node, function (d) {
    assert(d.loc, 'expected `loc`')
    // @ts-expect-error: we add offsets, as we have them.
    delete d.loc.start.offset
    // @ts-expect-error: we add offsets.
    delete d.loc.end.offset
  })
}
