Matching a pattern at the beginning of a string via the `^` regex token is pretty straight forward.

**Example:**

```js
const regex = /^theThing/

const string = "theThing lol hehehe"

string.match(reg)
// > ["theThing", index: 0, input: "theThing lol hehehe", groups: undefined]
```

However, what if we want to match a given string but **only if it isn't at the start of the string**?

The regex below allows matching pattern that is **not** at the start of a string or line via `(?<!^)` regex tokens.

**Example:**

```js
const regex = /(?<!^)> function /

const string = "> function ${merge('x', > function merge('y', 'z'))}"

string.match(regex)
// ["> function ", index: 24, input: "> function ${merge('x', > function merge('y', 'z'))}", groups: undefined]

const stringTwo = "> function ${merge('x', 'x')}"
stringTwo.match(regex)
// null
```

The use case here would be trying to find a nested pattern in a string via regex.

This was handy for implementing recursive function config params in my [configorama](https://github.com/DavidWells/configorama) library.
