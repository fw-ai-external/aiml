import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
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
  noExternal: ["vscode-languageclient"],
});
