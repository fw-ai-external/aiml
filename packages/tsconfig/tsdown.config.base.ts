import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true, // Generate declaration files
  sourcemap: true,
  clean: true, // Clean output directory before build
  minify: false, // No minification in development
  outDir: 'dist',
});
