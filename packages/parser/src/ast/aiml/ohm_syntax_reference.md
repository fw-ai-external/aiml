# Syntax Reference

This document describes the syntax of the _Ohm language_, which is a variant of parsing expression grammars (PEGs). If you have experience with PEGs, the Ohm syntax will mostly look familiar, but there are a few important differences to note:

- When naming rules, **case matters**: whitespace is implicitly skipped inside a rule application if the rule name begins with an uppercase letter. For further information, see [Syntactic vs. Lexical Rules](#syntactic-lexical).
- Grammars are purely about recognition: they do not contain semantic actions (those are defined separately) or bindings. The separation of semantic actions is one of the defining features of Ohm — we believe that it improves modularity and makes both grammars and semantics easier to understand.
- Alternation expressions support _case names_, which are used in [inline rule declarations](#inline-rule-declarations). This makes semantic actions for alternation expressions simpler and less error-prone.
- Ohm does not (yet) support semantic predicates.

Ohm is closely related to [OMeta](http://tinlizzie.org/ometa/), another PEG-based language for parsing and pattern matching. Like OMeta, Ohm supports a few features not supported by many PEG parsing frameworks:

- [Rule applications](#rule-application) can accept parameters. This makes it possible to write higher-order rules, such as the built-in `ListOf` rule.
- Grammars can be extended in an object-oriented way — see [Defining, Extending, and Overriding Rules](#defining-extending-and-overriding-rules).

## Terminology

<!-- @markscript
  const ohm = require('ohm-js');
  function checkGrammar(source) {
  	assert(ohm.grammar(source));
  }
  markscript.transformNextBlock(checkGrammar);
-->

```
Arithmetic {
  Expr = "1 + 1"
}
```

This is a grammar named "Arithmetic", which has a single rule named "Expr". The right hand side of _Expr_ is known as a "rule body". A rule body may be any valid _parsing expression_.

## Parsing Expressions

Here is a full list of the different kinds of parsing expressions supported by Ohm:

### Terminals

    "hello there"

Matches exactly the characters contained inside the quotation marks.

#### Special characters

Special characters (`"`, `\`, and `'`) can be escaped with a backslash — e.g., `"\""` will match a literal quote character in the input stream. Other valid escape sequences include: `\b` (backspace), `\f` (form feed), `\n` (line feed), `\r` (carriage return), and `\t` (tab), as well as `\x` followed by 2 hex digits and `\u` followed by 4 hex digits, for matching characters by code point.

The <code>\u{<i>hexDigits</i>}</code> escape sequence can be used to represent _any_ Unicode code point, including code points above `0xFFFF`. E.g., `"\u{1F639}"` will match `'😹'`. (_New in Ohm v16.3.0._)

**NOTE:** For grammars defined in a JavaScript string literal (i.e., not in a separate .ohm file), it's recommended to use a [template literal with the String.raw tag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/raw). Without `String.raw`, you'll need to use double-escaping — e.g., `\\n` rather than `\n`.

### Terminal Range

<pre><code><i>start</i>..<i>end</i></code></pre>

Matches exactly one code point whose value is between _start_ and _end_ (inclusive). E.g., `"a".."c"` will match `'a'`, `'b'`, or `'c'`. Note: _start_ and _end_ must be [Terminal](#terminals) expressions containing a single character or code point. (_Note:_ Prior to Ohm v16.3.0, terminal ranges only supported code points up `0xFFFF`. As of v16.3.0, higher code points can be specified directly (e.g. `"😇".."😈"`) or with an escape code (`"\u{1F607}".."\u{1F608}"`).

<!-- @markscript
  assert(ohm.grammar('G{ start = "😇".."😈" }').match('😇').succeeded())
  assert(ohm.grammar('G{ start = "\u{1F607}".."\u{1F608}" }').match('😇').succeeded())
-->

### Rule Application

<pre><code><i>ruleName</i></code></pre>

Matches the body of the rule named _ruleName_. For example, the built-in rule `letter` will parse a string of length 1 that is a letter.

<pre><code><i>ruleName</i>&lt;<i>expr</i>&gt;</code></pre>

Matches the body of the _parameterized rule_ named _ruleName_, substituting the parsing expression _expr_ as its first parameter. For parameterized rules with more than one parameter, the parameters are comma-separated, e.g. `ListOf<field, ";">`.

### Repetition operators: \*, +, ?

<pre><code><i>expr</i> *</code></pre>

Matches the expression _expr_ repeated 0 or more times. E.g., `"a"*` will match `''`, `'a'`, `'aa'`, ...

Inside a _syntactic rule_ — any rule whose name begins with an upper-case letter — spaces before a match are automatically skipped. E.g., `"a"*` will match `" a a"` as well as `"aa"`. See the documentation on [syntactic and lexical rules](#syntactic-lexical) for more information.

<pre><code><i>expr</i> +</code></pre>

Matches the expression _expr_ repeated 1 or more times. E.g., `letter+` will match `'x'`, `'xA'`, ...

As with the `*` operator, spaces are skipped when used in a [syntactic rule](#syntactic-lexical).

<pre><code><i>expr</i> ?</code></pre>

Tries to match the expression _expr_, succeeding whether it matches or not. No input is consumed if it does not match.

### Sequence

<pre><code><i>expr1</i> <i>expr2</i></code></pre>

Matches the expression `expr1` followed by `expr2`. E.g., `"grade" letter` will match `'gradeA'`, `'gradeB'`, ...

As with the `*` and `+` operators, spaces are skipped when used in a [syntactic rule](#syntactic-lexical). E.g., `"grade" letter` will match `' grade A'` as well as `'gradeA'`.

### Alternation

<pre><code><i>expr1</i> | <i>expr2</i></code></pre>

Matches the expression `expr1`, and if that does not succeed, matches the expression `expr2`. E.g., `letter | digit` will match `'a'`, `'9'`, ...

### Lookahead: &

<pre><code>& <i>expr</i></code></pre>

Succeeds if the expression `expr` can be matched, but does not consume anything from the input stream. Usually used as part of a sequence, e.g. `letter &digit` will match `'a9'`, but only consume 'a'. `&"a" letter+` will match any string of letters that begins with 'a'.

### Negative Lookahead: ~

<pre><code>~ <i>expr</i></code></pre>

Succeeds if the expression `expr` cannot be matched, and does not consume anything from the input stream. Usually used as part of a sequence, e.g., `~"\n" any` will consume any single character that is not a new line character.

### Lexification: <span>#</span>

<pre><code># <i>expr</i></code></pre>

Matches _expr_ as if in a lexical context. This can be used to prevent whitespace skipping before an expression that appears in the body of a syntactic rule. For further information, see [Syntactic vs. Lexical Rules](#syntactic-lexical).

### Comment

Inside an Ohm grammar, you can use both single-line (`//`) comments like

```
booleanLiteral = ("true" | "false") // TODO: Should we support "True"/"False" as well?
```

or

```
// For semantics on how decimal literals are constructed, see section 7.8.3
```

as well as multiline (`/* */`) comments like:

```
/*
  Note: Punctuator and DivPunctuator (see https://es5.github.io/x7.html#x7.7) are
  not currently used by this grammar.
*/
```

## Built-in Rules

(See [src/built-in-rules.ohm](https://github.com/ohmjs/ohm/blob/main/packages/ohm-js/src/built-in-rules.ohm).)

`any`: Matches the next Unicode character — i.e., a single code point — in the input stream, if one exists.

**NOTE:** A JavaScript string is a sequence of 16-bit _code units_. Some Unicode characters, such as emoji, are encoded as pairs of 16-bit values. For example, the string `'😆'` has length 2, but contains a single Unicode code point. Prior to Ohm v17, `any` always consumed a single 16-bit code unit, rather than a full Unicode character.

`letter`: Matches a single character which is a letter (either uppercase or lowercase).

`lower`: Matches a single lowercase letter.

`upper`: Matches a single uppercase letter.

`digit`: Matches a single character which is a digit from 0 to 9.

`hexDigit`: Matches a single character which is a either digit or a letter from A-F.

`alnum`: Matches a single letter or digit; equivalent to `letter | digit`.

`space`: Matches a single whitespace character (e.g., space, tab, newline, etc.)

`end`: Matches the end of the input stream. Equivalent to `~any`.

<code>caseInsensitive&lt;<i>terminal</i>&gt;</code>: Matches _terminal_, but ignoring any differences in casing (based on the simple, single-character Unicode case mappings). E.g., `caseInsensitive<"ohm">` will match `'Ohm'`, `'OHM'`, etc.

<code>ListOf&lt;<i>elem</i>, <i>sep</i>&gt;</code>: Matches the expression _elem_ zero or more times, separated by something that matches the expression _sep_. E.g., `ListOf&lt;letter, ","$gt;` will match `''`, `'a'`, and `'a, b, c'`.

<code>NonemptyListOf&lt;<i>elem</i>, <i>sep</i>&gt;</code>: Like `ListOf`, but matches _elem_ at least one time.

<code>listOf&lt;<i>elem</i>, <i>sep</i>&gt;</code>: Similar to `ListOf&lt;elem, sep&gt;` but interpreted as [lexical rule](#syntactic-lexical).

<code id="applySyntactic">applySyntactic&lt;<i>ruleName</i>&gt;</code>: Allows the syntactic rule _ruleName_ to be applied in a lexical context, which is otherwise not allowed. Spaces are skipped _before_ and _after_ the rule application. _New in Ohm v16.1.0._

## Grammar Syntax

### Grammar Inheritance

<pre><code><i>grammarName</i> &lt;: <i>supergrammarName</i> { ... }</code></pre>

Declares a grammar named `grammarName` which inherits from `supergrammarName`.

### Defining, Extending, and Overriding Rules

In the three forms below, the rule body may optionally begin with a `|` character, which will be
ignored. Also note that in rule names, [**case is significant**](#syntactic-lexical).

<pre><code><i>ruleName</i> = <i>expr</i></code></pre>

Defines a new rule named `ruleName` in the grammar, with the parsing expression `expr` as the rule body. Throws an error if a rule with that name already exists in the grammar or one of its supergrammars.

<pre><code><i>ruleName</i> := <i>expr</i></code></pre>

Defines a rule named `ruleName`, overriding a rule of the same name in a supergrammar. Throws an error if no rule with that name exists in a supergrammar.

**New in 15.3.0:** The _super-splice_ operator (`...`) can be used to append and/or prepend cases to the supergrammar rule body. E.g., if the supergrammar defines `comment = multiLineComment`, then `comment := ... | singleLineComment` is equivalent to `comment := multiLineComment | singleLineComment`.

<pre><code><i>ruleName</i> += <i>expr</i></code></pre>

Extends a supergrammar rule named `ruleName`, throwing an error if no rule with that name exists in a supergrammar. The rule body will effectively be <code><i>expr</i> | <i>oldBody</i></code>, where `oldBody` is the rule body as defined in the supergrammar.

Note that as of v15.3.0, the super-splice operator (`...`) offers a more general form of rule extension. E.g., `keyword += "def"` can also be written `keyword := "def" | ...`.

#### Parameterized Rules

<pre><code><i>ruleName</i>&lt;<i>arg1</i>, ..., <i>argN</i>&gt; = <i>expr</i></code></pre>

Defines a new rule named `ruleName` which has _n_ parameters. In the rule body _expr_, the parameter names (e.g. _arg1_) may be used as rule applications. E.g., `Repeat<x> = x x`.

#### Rule Descriptions

Rule declarations may optionally have a description, which is a parenthesized "comment" following the name of the rule in its declaration. Rule descriptions are used to produce better error messages for end users of a language when input is not recognized. For example:

<!-- @markscript
  function checkRule(source) {
    assert(ohm.ohmGrammar.match(source, 'Rule').succeeded());
  }
  markscript.transformNextBlock(checkRule);
-->

```
ident (an identifier)
  = ~keyword name
```

#### Inline Rule Declarations

<pre><code><i>expr</i> -- <i>caseName</i></code></pre>

When a parsing expression is followed by the characters `--` and a name, it signals an _inline rule declaration_. This is most commonly used in alternation expressions to ensure that each branch has the same arity. For example, the following declaration:

<!-- @markscript
  markscript.transformNextBlock(checkRule);
-->

```
AddExp = AddExp "+" MulExp  -- plus
       | MulExp
```

is equivalent to:

```ohm
AddExp = AddExp_plus
       | MulExp
AddExp_plus = AddExp "+" MulExp
```

<h3 id="syntactic-lexical">Syntactic vs. Lexical Rules</h3>

<!-- https://ohmjs.org/d/svl -->

A _syntactic rule_ is a rule whose name begins with an uppercase letter, and _lexical rule_ is one whose name begins with a lowercase letter. The difference between lexical and syntactic rules is that syntactic rules implicitly skip whitespace characters.

The definition of "whitespace character" is anything that matches the grammar's `space` rule. The default implementation of `space` matches ' ', '\t', '\n', '\r', and any other character that is considered whitespace in the [ES5 spec](http://ecma-international.org/ecma-262/5.1/#sec-7.2).

#### How space skipping works

In the body of a syntactic rule, Ohm implicitly inserts applications of the `spaces` rule before each expression. (The `spaces` rule is defined as `spaces = space*`.) As an example, take this fragment of JSON grammar:

<!-- @markscript
  let syntacticDefs;
  markscript.transformNextBlock(code => {
    syntacticDefs = code;
  });
-->

```
Array = "[" "]"  -- empty
      | "[" Elements "]"  -- nonEmpty
Elements = Element ("," Element)*
```

`Array` and `Elements` are both syntactic rules, since their names begin with a capital letter. Here's what a lexical version of these rule would look like, with _explicit_ space skipping:

<!-- @markscript
  let lexicalDefs;

  const delexifyRuleNames = str =>
    str.replace(/array/g, 'Array').replace(/element/g, 'Element');

  markscript.transformNextBlock(code => {
    lexicalDefs = code;
    assert.equal(syntacticDefs, delexifyRuleNames(lexicalDefs).replace(/spaces /g, ''));

    const g = ohm.grammar(`
      JSON {
        ${syntacticDefs}
        ${lexicalDefs}
        lexStart = array spaces  // Ensure trailing space is skipped.
        Element = number
        element = number
        number = digit+
      }
    `);
    assert(g.match(' [2, 33 ] ').succeeded());
    assert(g.match(' [2, 33 ] ', 'lexStart').succeeded());

    assert(g.match(' [ ] ').succeeded());
    assert(g.match(' [ ] ', 'lexStart').succeeded());

    assert(g.match('[]  ').succeeded());
    assert(g.match('[]  ', 'lexStart').succeeded());

    assert(g.match(' [12 ,2,2]').succeeded());
    assert(g.match(' [12 ,2,2]', 'lexStart').succeeded());

    assert(g.match(' [1 2]').failed());
    assert(g.match(' [1 2]', 'lexStart').failed());

    assert(g.match(' [1,]').failed());
    assert(g.match(' [1,]', 'lexStart').failed());
  });
-->

```
array = spaces "[" spaces "]"  -- empty
      | spaces "[" spaces elements spaces "]"  -- nonEmpty
elements = spaces element (spaces "," spaces element)*
```

In terms of the language it accepts, this version of the rules — with explicit space skipping — is equivalent to the syntactic version above.

A few other details that are helpful to know:

1. If the start rule is a syntactic rule, both leading and trailing spaces are skipped around the top-level application.
2. When the body of a rule contains a [repetition operator](#repetition-operators---) (e.g. `+` or `*`), spaces are skipped before each match. In other words, `Names = name+` is equivalent to `names = (spaces name)+`.
3. The [lexification operator (`#`)](#lexification-) can be used in the body of a syntactic rule to prevent space skipping in specific places. For example:

<!-- @markscript
  let syntacticKeyValueDef;
  markscript.transformNextBlock(code => { syntacticKeyValueDef = code; });
-->

```
KeyAndValue = #(letter alnum+) ":" #(digit+)
```

is equivalent to:

<!-- @markscript
  markscript.transformNextBlock(code => {
    let lexicalKeyValueDef = code;

    const g = ohm.grammar(`G { ${syntacticKeyValueDef} ${lexicalKeyValueDef} }`);
    assert(g.match('count :33', 'keyAndValue').succeeded());
    assert(g.match('count :33', 'KeyAndValue').succeeded());
    assert(g.match('count: 33', 'keyAndValue').failed());
    assert(g.match('count: 33', 'KeyAndValue').failed());
  });
-->

```
keyAndValue = letter alnum+ spaces ":" digit+
```

Note that no space skipping occurs _inside_ or _before_ the lexical context defined by the `#` character. That means that this rule will match `'count :33'`, but _not_ `'count: 33'`.

# Patterns and Pitfalls

## Grammars

### Dealing with greedy matching

In Ohm, like other PEG-based tools, the [repetition operators](./syntax-reference.md#repetition-operators---) `*` and `+` are _greedy_, meaning they always consume as much input as possible. This is different than the way that `*` works in regular expressions. For example, the regular expression `/^a*a/` will successfully match `'aaa'`, whereas in Ohm, the equivalent parsing expression `"a"* "a"` can never match any input.

You can use [negative lookahead](./syntax-reference.md#negative-lookahead-) (`~`) to prevent a repetition from matching too many characters. E.g., the following rule will match all but the last 'a' in a string:

```
allButLastA = (~("a" end) "a")*
```

The expression `"a" end` means "match an 'a' at the end of the input", and `~("a" end) "a"` means "match an 'a' only if it is not the last 'a' at the end of the input".

For a more realistic example, see the next section on delimited strings.

### Delimited strings

A common use for negative lookahead is implementing delimited strings and comments. For example, to support JavaScript-style multiline strings delimited by `` ` ``:

```
stringDelimiter = "`"
string = stringDelimiter (~stringDelimiter any)* stringDelimiter
```

The expression `~stringDelimiter any` means "match any character not matched by _stringDelimiter_".

### Supporting comments

In most languages, comments are treated as a form of whitespace. Ohm has implicit space skipping ([see Syntactic vs. Lexical rules](./syntax-reference.md#syntactic-vs-lexical-rules)), which is controlled by the _space_ rule. To add comments to your language, you first need to define a _comment_ rule. Here's an example of C-style (`/*`/`*/`-delimited) comments:

```
comment = "/*" (~"*/" any)* "*/"
```

Then, you need to extend the _space_ rule in your grammar so that Ohm will treat the comments as whitespace:

```
space += comment
```

### Reserved words / keywords

Many programming languages have the concept of [reserved words](https://en.wikipedia.org/wiki/Reserved_word) — identifiers that have a special meaning, and can't be used as the name of a variable, function, etc. In Ohm grammars, it's common to define a separate lexical rule for each reserved word. For example, here's the definition of [the `keyword` rule in our ES5 grammar](https://github.com/ohmjs/ohm/blob/c7dcbb6b97366daf54349ba8e5be9133978f5c83/examples/ecmascript/src/es5.ohm#L87):

```
  keyword = break    | do        | instanceof | typeof
          | case     | else      | new        | var
          | catch    | finally   | return     | void
          | continue | for       | switch     | while
          | debugger | function  | this       | with
          | default  | if        | throw
          | delete   | in        | try
```

🐍 There are a couple of things to watch out for:

- One reserved word might be a prefix of another, e.g., `in` and `instanceof` in JavaScript.
- Identifiers that begin with a reserved word shouldn't be disallowed, e.g. `className`.

To prevent both of these potential problems, you can use [negative lookahead](./syntax-reference.md#negative-lookahead-) in the rules for your reserved words. For example:

```
  in = "in" ~identifierPart
```

This ensures that (a) the `in` rule won't accidentally match the wrong keyword (like "instanceof"), and (b) it won't match a valid identifier like "inProgress".

### Matching exactly _n_ times

Unlike regular expressions, Ohm does not support [quantifier](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Quantifiers) syntax to indicate the number of times an expression should be matched. However, this can be implemented using a normal sequence:

```
zipCode = digit digit digit digit
```

### Operator precedence

The common way to handle operator precedence in Ohm is to use left-recursive rules which encode the precedence in the grammar structure. For example:

```
  exp = addExp

  addExp = addExp "+" mulExp  -- plus
         | addExp "-" mulExp  -- minus
         | mulExp

  mulExp = mulExp "*" priExp  -- times
         | mulExp "/" priExp  -- divide
         | priExp
```

Note that the rule for the lower precedence operators (`+` and `-`) invokes the rule for the higher-precedence operators (`*`/`/`). This ensures that the higher-precedence operators "bind more tightly". See Ray Toal's [Operator Precedence and Associativity Examples](https://github.com/ohmjs/ohm/tree/main/examples/operators) for more.

#### 🐍 Ambiguous recursion

Notice that in the arithmetic grammar above, `mulExp` appears on the right hand side of all of `addExp`'s cases. Be careful that you don't write rules that are "ambiguously recursive", e.g. `addExp = addExp "+" addExp`. If you write your grammar like this, a reader can't tell whether `+` is left-associative or right-associative. (In Ohm, you will actually get a right-associative parse — see [#56](https://github.com/ohmjs/ohm/issues/56) for details.)

## Semantics

### Iteration nodes

_Iteration nodes_ are associated with expressions inside a repetition operator (`*`, `+`, and `?`). E.g., for the grammar `G { letters = letter+ }`, the single argument to the _letters_ action will be an iteration node. There are two main ways to handle iteration nodes inside semantic actions:

1. Use array operations (`map`, `filter`, etc.) on the node's `children` attribute. For example, `iterNode.children.map(c => c.prettyPrint())` would invoke the `prettyPrint` operation on each child of the iteration node.
2. Define an _\_iter_ action for your operation, which allows you to write something like `iterNode.prettyPrint()`. If you have not defined an _\_iter_ action for the operation, this will result in a "missing semantic action" error.

#### Optional nodes

An optional node (associated with the `?` operator) is just an iteration node with at most one child. In modern JavaScript (EMCAScript 2020+) and TypeScript, the [optional chaining operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining) provides a convenient way to deal with optional nodes:

```
optNode.child(0)?.myOperation();
```

This evaluates to either (a) `undefined`, if the node has no child, or (b) the result of calling `myOperation()` on the child. In older versions of JavaScript, you can achieve the same thing via `optNode.child(0) && optNode.child(0).myOperation()`. Another way to do the same thing is: `optNode.children.map(c => c.myOperation())[0]`.

### Handling the built-in list rules

When using the built-in list rules (`listOf`, etc.) in your grammar, you usually don't need to write semantic actions for them. Instead, you can use the [built-in `asIteration` operation](./api-reference.md#asIteration).

# Parsing indentation sensitive languages

As of v17, Ohm has experimental support for indentation-sensitive languages. This will make it possible to write Ohm grammars for languages like Python and YAML. **NOTE:** as this is API is experimental, it is outside the scope of semver — which means that we may make breaking changes to the API without a change to Ohm's major version number.

## Background

The Ohm language is based on parsing expression grammars (PEGs), and pure PEGs can't express indentation sensitivity. The usual trick is to pre-process the input and insert explicit `indent` and `dedent` tokens, then parse the modified output. While this works, it has a few downsides:

- Error messages can be confusing, as they refer to the modified input rather than the original input
- You can't use the "real" syntax in the Ohm Editor — your examples inputs need to be pre-processed
- The preprocessing step is trickier than you might think!

For these reasons, we decided to add built-in support for indentation-sensitive languages.

## Making indentation-sensitive grammars

To define an indentation-sensitive language, create a grammar that inherits from `ExperimentalIndentationSensitive`. For example, here is a grammar for language support nested lists of bullet points:

```
import * as ohm from 'ohm-js';

const outline = ohm.grammar(
  String.raw`
    Outline <: IndentationSensitive {
      Items = Item+
      Item = "-" label indent Items dedent  -- withChildren
          | "-" label  -- leaf

      label = (~newline any)* eol

      eol = newline | end
      newline = "\r\n" | "\r" | "\n"
      spaces := (~newline space)*
    }
`,
  {IndentationSensitive: ohm.ExperimentalIndentationSensitive}
);
```

## Implementation details

The `indent` and `dedent` rules are primitive rules defined by `ExperimentalIndentationSensitive`. You can think of them as special characters that automatically inserted at the appropriate points — except that they take up no width in the input stream. They are inserted immediately after the associated indentation characters at the beginning of the line. For example, here is some Python code, with comments indicating where the indents and dedents are inserted:

```python
if col == 3:
  if row == 4: #   # <~~ indent at position 2 on this line
    print("bingo") # <~~ indent at position 4
  print("done")    # <~~ dedent at position 2
```

There is also final dedent at the end of the input.

## Examples

See examples/indentation-sensitive for an example you can experiment with.

## Notes and open questions

- The current implementation _only_ works with spaces (not tabs). Among the indentation-sensitive languages (Python, YAML, Elm, etc.) there are small difference in what characters they allow and how they treat them. We probably want to make this customizable in some way.
