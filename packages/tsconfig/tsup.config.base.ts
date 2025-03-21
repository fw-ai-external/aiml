import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // Generate both ESM and CommonJS
  dts: true, // Generate declaration files
  splitting: false,
  sourcemap: true,
  clean: true, // Clean output directory before build
  minify: false, // No minification in development
  outDir: 'dist',
});
