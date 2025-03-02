#!/usr/bin/env node
import { createRequire } from "node:module";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const debug = process.argv.includes("debug");

// First build TypeScript to JavaScript
await build({
  bundle: false,
  entryPoints: [
    path.join(rootDir, "src/extension.ts"),
    path.join(rootDir, "src/extension-logic.ts"),
  ],
  format: "cjs",
  outdir: distDir,
  platform: "node",
  sourcemap: debug,
  target: "node16",
});

// Then bundle everything together
await build({
  bundle: true,
  entryPoints: {
    "dist/extension": require.resolve(path.join(distDir, "extension.js")),
    "dist/extension-logic": require.resolve(
      path.join(distDir, "extension-logic.js")
    ),
    "dist/language-server": "@fireworks/language-service",
    "node_modules/@fireworks/typescript-plugin": require.resolve(
      "../../typescript-plugin/dist/index.js"
    ),
  },
  external: ["vscode", "./language-plugin", "./service-plugin", "./tsconfig"],
  logLevel: "info",
  minify: !debug,
  outdir: rootDir,
  platform: "node",
  sourcemap: debug,
  target: "node16",
  allowOverwrite: true,
  plugins: [
    {
      name: "alias",
      setup({ onResolve, resolve }) {
        onResolve({ filter: /^(jsonc-parser)$/ }, ({ path, ...options }) =>
          resolve(require.resolve(path).replace(/\/umd\//, "/esm/"), options)
        );
        onResolve({ filter: /\/umd\// }, ({ path, ...options }) =>
          resolve(path.replace(/\/umd\//, "/esm/"), options)
        );
      },
    },
  ],
});
