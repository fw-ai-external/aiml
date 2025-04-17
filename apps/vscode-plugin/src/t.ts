import * as t from "typescript";
import { compat } from "woodpile";

const ast = t.createSourceFile(
  "test.ts",
  "(<div>Hello, World!</div>)",
  t.ScriptTarget.ESNext
);

const compat_ast = compat(ast, {
  flavor: "acorn", // optional, default to babel
});

// console.log(compat_ast);
