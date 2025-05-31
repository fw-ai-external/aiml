import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node16",
  outDir: "out",
  sourcemap: true,
  clean: true,
  external: ["vscode"],
  platform: "node",
  minify: false,
  bundle: true,
  splitting: false,
  dts: false,
  noExternal: [
    "vscode-languageserver",
    "vscode-languageserver-textdocument",
    "@aiml/parser",
    "@aiml/shared",
  ],
});
