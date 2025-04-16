import assert from 'bun:assert/strict'
import test from 'bun:test'
import {aimljs} from 'micromark-extension-aimljs'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {mdxFromMarkdown, mdxToMarkdown} from 'mdast-util-mdx'
import {toMarkdown} from 'mdast-util-to-markdown'

test('core', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('mdast-util-mdx')).sort(), [
      'mdxFromMarkdown',
      'mdxToMarkdown'
    ])
  })
})

test('mdxFromMarkdown()', async function (t) {
  await t.test('should support esm', async function () {
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          fromMarkdown('import a from "b"', {
            extensions: [aimljs()],
            mdastExtensions: [mdxFromMarkdown()]
          })
        )
      ),
      {
        type: 'root',
        children: [
          {
            type: 'mdxjsEsm',
            value: 'import a from "b"',
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 18, offset: 17}
            },
            data: {
              estree: {
                type: 'Program',
                start: 0,
                end: 17,
                body: [
                  {
                    type: 'ImportDeclaration',
                    start: 0,
                    end: 17,
                    specifiers: [
                      {
                        type: 'ImportDefaultSpecifier',
                        start: 7,
                        end: 8,
                        local: {
                          type: 'Identifier',
                          start: 7,
                          end: 8,
                          name: 'a',
                          loc: {
                            start: {line: 1, column: 7, offset: 7},
                            end: {line: 1, column: 8, offset: 8}
                          },
                          range: [7, 8]
                        },
                        loc: {
                          start: {line: 1, column: 7, offset: 7},
                          end: {line: 1, column: 8, offset: 8}
                        },
                        range: [7, 8]
                      }
                    ],
                    source: {
                      type: 'Literal',
                      start: 14,
                      end: 17,
                      value: 'b',
                      raw: '"b"',
                      loc: {
                        start: {line: 1, column: 14, offset: 14},
                        end: {line: 1, column: 17, offset: 17}
                      },
                      range: [14, 17]
                    },
                    loc: {
                      start: {line: 1, column: 0, offset: 0},
                      end: {line: 1, column: 17, offset: 17}
                    },
                    range: [0, 17]
                  }
                ],
                sourceType: 'module',
                comments: [],
                loc: {
                  start: {line: 1, column: 0, offset: 0},
                  end: {line: 1, column: 17, offset: 17}
                },
                range: [0, 17]
              }
            }
          }
        ],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 1, column: 18, offset: 17}
        }
      }
    )
  })

  await t.test('should support jsx', async function () {
    assert.deepEqual(
      fromMarkdown('<x/>', {
        extensions: [aimljs()],
        mdastExtensions: [mdxFromMarkdown()]
      }),
      {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'x',
            attributes: [],
            children: [],
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 5, offset: 4}
            }
          }
        ],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 1, column: 5, offset: 4}
        }
      }
    )
  })

  await t.test('should support expressions', async function () {
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          fromMarkdown('{1 + 1}', {
            extensions: [aimljs()],
            mdastExtensions: [mdxFromMarkdown()]
          })
        )
      ),
      {
        type: 'root',
        children: [
          {
            type: 'mdxFlowExpression',
            value: '1 + 1',
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 8, offset: 7}
            },
            data: {
              estree: {
                type: 'Program',
                start: 1,
                end: 6,
                body: [
                  {
                    type: 'ExpressionStatement',
                    expression: {
                      type: 'BinaryExpression',
                      start: 1,
                      end: 6,
                      left: {
                        type: 'Literal',
                        start: 1,
                        end: 2,
                        value: 1,
                        raw: '1',
                        loc: {
                          start: {line: 1, column: 1, offset: 1},
                          end: {line: 1, column: 2, offset: 2}
                        },
                        range: [1, 2]
                      },
                      operator: '+',
                      right: {
                        type: 'Literal',
                        start: 5,
                        end: 6,
                        value: 1,
                        raw: '1',
                        loc: {
                          start: {line: 1, column: 5, offset: 5},
                          end: {line: 1, column: 6, offset: 6}
                        },
                        range: [5, 6]
                      },
                      loc: {
                        start: {line: 1, column: 1, offset: 1},
                        end: {line: 1, column: 6, offset: 6}
                      },
                      range: [1, 6]
                    },
                    start: 1,
                    end: 6,
                    loc: {
                      start: {line: 1, column: 1, offset: 1},
                      end: {line: 1, column: 6, offset: 6}
                    },
                    range: [1, 6]
                  }
                ],
                sourceType: 'module',
                comments: [],
                loc: {
                  start: {line: 1, column: 1, offset: 1},
                  end: {line: 1, column: 6, offset: 6}
                },
                range: [1, 6]
              }
            }
          }
        ],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 1, column: 8, offset: 7}
        }
      }
    )
  })

  await t.test('should add proper positions on estree (1)', async function () {
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          fromMarkdown(
            "<Stuff>\n  {{\n    template: /* Comment */ '',\n  }}\n</Stuff>",
            {
              extensions: [aimljs()],
              mdastExtensions: [mdxFromMarkdown()]
            }
          )
        )
      ),
      {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Stuff',
            attributes: [],
            children: [
              {
                type: 'mdxFlowExpression',
                value: "{\n    template: /* Comment */ '',\n  }",
                position: {
                  start: {line: 2, column: 3, offset: 10},
                  end: {line: 4, column: 5, offset: 49}
                },
                data: {
                  estree: {
                    type: 'Program',
                    start: 11,
                    end: 48,
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'ObjectExpression',
                          start: 11,
                          end: 48,
                          properties: [
                            {
                              type: 'Property',
                              start: 17,
                              end: 43,
                              method: false,
                              shorthand: false,
                              computed: false,
                              key: {
                                type: 'Identifier',
                                start: 17,
                                end: 25,
                                name: 'template',
                                loc: {
                                  start: {line: 3, column: 4, offset: 17},
                                  end: {line: 3, column: 12, offset: 25}
                                },
                                range: [17, 25]
                              },
                              value: {
                                type: 'Literal',
                                start: 41,
                                end: 43,
                                value: '',
                                raw: "''",
                                loc: {
                                  start: {line: 3, column: 28, offset: 41},
                                  end: {line: 3, column: 30, offset: 43}
                                },
                                range: [41, 43]
                              },
                              kind: 'init',
                              loc: {
                                start: {line: 3, column: 4, offset: 17},
                                end: {line: 3, column: 30, offset: 43}
                              },
                              range: [17, 43]
                            }
                          ],
                          loc: {
                            start: {line: 2, column: 3, offset: 11},
                            end: {line: 4, column: 3, offset: 48}
                          },
                          range: [11, 48]
                        },
                        start: 11,
                        end: 48,
                        loc: {
                          start: {line: 2, column: 3, offset: 11},
                          end: {line: 4, column: 3, offset: 48}
                        },
                        range: [11, 48]
                      }
                    ],
                    sourceType: 'module',
                    comments: [
                      {
                        type: 'Block',
                        value: ' Comment ',
                        start: 27,
                        end: 40,
                        loc: {
                          start: {line: 3, column: 14, offset: 27},
                          end: {line: 3, column: 27, offset: 40}
                        },
                        range: [27, 40]
                      }
                    ],
                    loc: {
                      start: {line: 2, column: 3, offset: 11},
                      end: {line: 4, column: 3, offset: 48}
                    },
                    range: [11, 48]
                  }
                }
              }
            ],
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 5, column: 9, offset: 58}
            }
          }
        ],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 5, column: 9, offset: 58}
        }
      }
    )
  })

  await t.test('should add proper positions on estree (2)', async function () {
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          fromMarkdown("export let a = 'a'\n\nexport let b = 'b'", {
            extensions: [aimljs()],
            mdastExtensions: [mdxFromMarkdown()]
          })
        )
      ),
      {
        type: 'root',
        children: [
          {
            type: 'mdxjsEsm',
            value: "export let a = 'a'",
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 1, column: 19, offset: 18}
            },
            data: {
              estree: {
                type: 'Program',
                start: 0,
                end: 18,
                body: [
                  {
                    type: 'ExportNamedDeclaration',
                    start: 0,
                    end: 18,
                    declaration: {
                      type: 'VariableDeclaration',
                      start: 7,
                      end: 18,
                      declarations: [
                        {
                          type: 'VariableDeclarator',
                          start: 11,
                          end: 18,
                          id: {
                            type: 'Identifier',
                            start: 11,
                            end: 12,
                            name: 'a',
                            loc: {
                              start: {line: 1, column: 11, offset: 11},
                              end: {line: 1, column: 12, offset: 12}
                            },
                            range: [11, 12]
                          },
                          init: {
                            type: 'Literal',
                            start: 15,
                            end: 18,
                            value: 'a',
                            raw: "'a'",
                            loc: {
                              start: {line: 1, column: 15, offset: 15},
                              end: {line: 1, column: 18, offset: 18}
                            },
                            range: [15, 18]
                          },
                          loc: {
                            start: {line: 1, column: 11, offset: 11},
                            end: {line: 1, column: 18, offset: 18}
                          },
                          range: [11, 18]
                        }
                      ],
                      kind: 'let',
                      loc: {
                        start: {line: 1, column: 7, offset: 7},
                        end: {line: 1, column: 18, offset: 18}
                      },
                      range: [7, 18]
                    },
                    specifiers: [],
                    source: null,
                    loc: {
                      start: {line: 1, column: 0, offset: 0},
                      end: {line: 1, column: 18, offset: 18}
                    },
                    range: [0, 18]
                  }
                ],
                sourceType: 'module',
                comments: [],
                loc: {
                  start: {line: 1, column: 0, offset: 0},
                  end: {line: 1, column: 18, offset: 18}
                },
                range: [0, 18]
              }
            }
          },
          {
            type: 'mdxjsEsm',
            value: "export let b = 'b'",
            position: {
              start: {line: 3, column: 1, offset: 20},
              end: {line: 3, column: 19, offset: 38}
            },
            data: {
              estree: {
                type: 'Program',
                start: 20,
                end: 38,
                body: [
                  {
                    type: 'ExportNamedDeclaration',
                    start: 20,
                    end: 38,
                    declaration: {
                      type: 'VariableDeclaration',
                      start: 27,
                      end: 38,
                      declarations: [
                        {
                          type: 'VariableDeclarator',
                          start: 31,
                          end: 38,
                          id: {
                            type: 'Identifier',
                            start: 31,
                            end: 32,
                            name: 'b',
                            loc: {
                              start: {line: 3, column: 11, offset: 31},
                              end: {line: 3, column: 12, offset: 32}
                            },
                            range: [31, 32]
                          },
                          init: {
                            type: 'Literal',
                            start: 35,
                            end: 38,
                            value: 'b',
                            raw: "'b'",
                            loc: {
                              start: {line: 3, column: 15, offset: 35},
                              end: {line: 3, column: 18, offset: 38}
                            },
                            range: [35, 38]
                          },
                          loc: {
                            start: {line: 3, column: 11, offset: 31},
                            end: {line: 3, column: 18, offset: 38}
                          },
                          range: [31, 38]
                        }
                      ],
                      kind: 'let',
                      loc: {
                        start: {line: 3, column: 7, offset: 27},
                        end: {line: 3, column: 18, offset: 38}
                      },
                      range: [27, 38]
                    },
                    specifiers: [],
                    source: null,
                    loc: {
                      start: {line: 3, column: 0, offset: 20},
                      end: {line: 3, column: 18, offset: 38}
                    },
                    range: [20, 38]
                  }
                ],
                sourceType: 'module',
                comments: [],
                loc: {
                  start: {line: 3, column: 0, offset: 20},
                  end: {line: 3, column: 18, offset: 38}
                },
                range: [20, 38]
              }
            }
          }
        ],
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 3, column: 19, offset: 38}
        }
      }
    )
  })
})

test('mdxToMarkdown()', async function (t) {
  await t.test('should support esm', async function () {
    assert.equal(
      toMarkdown(
        {type: 'mdxjsEsm', value: 'import a from "b"'},
        {extensions: [mdxToMarkdown()]}
      ),
      'import a from "b"\n'
    )
  })

  await t.test('should support jsx', async function () {
    assert.equal(
      toMarkdown(
        {type: 'mdxJsxFlowElement', name: 'x', attributes: [], children: []},
        {extensions: [mdxToMarkdown()]}
      ),
      '<x />\n'
    )
  })

  await t.test('should support expressions', async function () {
    assert.deepEqual(
      toMarkdown(
        {type: 'mdxFlowExpression', value: '1 + 1'},
        {extensions: [mdxToMarkdown()]}
      ),
      '{1 + 1}\n'
    )
  })

  await t.test(
    'should use link (resource) instead of link (auto)',
    async function () {
      assert.deepEqual(
        toMarkdown(
          {
            type: 'link',
            url: 'tel:123',
            children: [{type: 'text', value: 'tel:123'}]
          },
          {extensions: [mdxToMarkdown()]}
        ),
        '[tel:123](tel:123)\n'
      )
    }
  )
})
