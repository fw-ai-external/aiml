# @aiml/sourcemap

Source map utilities for AIML, based on [js-sourcemap](https://github.com/joeyguo/js-sourcemap).

## Installation

```bash
npm install @aiml/sourcemap
```

## Usage

### Generating Source Maps

```typescript
import { generator } from "@aiml/sourcemap";

const sourceCode = `function add(a, b) {
  return a + b;
}`;

const distributedCode = `function add(a,b){return a+b}`;

// Generate a source map
const sourceMap = generator(sourceCode, distributedCode, "add.js");
console.log(sourceMap);
```

### Consuming Source Maps

```typescript
import { consumer } from "@aiml/sourcemap";

// Parse a source map
const sourceMapConsumer = consumer(sourceMapString);

// Find the original position for a generated position
const originalPosition = sourceMapConsumer.getOriginal({
  line: 1,
  column: 10,
});
console.log(originalPosition);

// Find the generated position for an original position
const generatedPosition = sourceMapConsumer.getGenerated({
  line: 2,
  column: 5,
  file: "add.js",
});
console.log(generatedPosition);
```

## API

### generator(src, dist, file?)

Generates a source map from source and distribution code.

- `src` - Source code
- `dist` - Distribution code
- `file` - Optional file name
- Returns: Source map as a string

### consumer(sourcemap)

Creates a source map consumer for reading source maps.

- `sourcemap` - Source map as a string
- Returns: Source map consumer object with methods:
  - `getGenerated(opts)` - Gets the generated position for a source position
  - `getOriginal(opts)` - Gets the original position for a generated position

## License

MIT
