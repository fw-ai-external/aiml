import Tokenizr from "tokenizr";
import {
  RawSourceMap,
  SourceMapConsumer,
  SourceMapGenerator,
} from "source-map";

let lexer = new Tokenizr();

// lexer.rule(/[a-zA-Z_][a-zA-Z0-9_]*/, (ctx, match) => {
//   ctx.accept("id");
// });
// lexer.rule(/[+-]?[0-9]+/, (ctx, match) => {
//   ctx.accept("number", parseInt(match[0]));
// });
// lexer.rule(/"((?:\\"|[^\r\n])*)"/, (ctx, match) => {
//   ctx.accept("string", match[1].replace(/\\"/g, '"'));
// });
// lexer.rule(/\/\/[^\r\n]*\r?\n/, (ctx, match) => {
//   ctx.ignore();
// });
// lexer.rule(/[ \t\r\n]+/, (ctx, match) => {
//   ctx.ignore();
// });
// lexer.rule(/./, (ctx, match) => {
//   ctx.accept("char");
// });

const __fakename = "__fakename.aiml";

export function generator(src: string, dist: string, file: string) {
  const _file = file || __fakename,
    srcTs = tokenizer(src, { locations: true, sourceType: "module" }),
    distTs = tokenizer(dist, {
      locations: true,
      sourceType: "module",
    });

  const generator = new SourceMapGenerator({ file: _file });

  while (true) {
    const srcT = srcTs.getToken(),
      distT = distTs.getToken();

    if (srcT.type.label === "eof") break;

    const mapping = {
      original: srcT.loc?.start || { line: 0, column: 0 },
      generated: distT.loc?.start || { line: 0, column: 0 },
      source: _file,
      name: undefined,
    };

    if (srcT.type.label === "name") {
      mapping.name = srcT.value;
    }

    generator.addMapping(mapping);
  }

  generator.setSourceContent("source", src);

  return generator.toString();
}

export function consumer(sourcemap: string) {
  const _string = JSON.parse(sourcemap) as RawSourceMap,
    _sources = _string.sources || [__fakename];

  return {
    getGenerated: function (opts: {
      line: number;
      column: number;
      file?: string;
    }) {
      const line = opts.line,
        col = opts.column,
        _file = opts.file || _sources[0];

      return new SourceMapConsumer(_string).generatedPositionFor({
        source: _file,
        line: line,
        column: col,
      });
    },
    getOriginal: function (opts: {
      line: number;
      column: number;
      file?: string;
    }) {
      const line = opts.line,
        col = opts.column,
        _file = opts.file || _sources[0];

      return new SourceMapConsumer(_string).originalPositionFor({
        line: line,
        column: col,
      });
    },
  };
}
