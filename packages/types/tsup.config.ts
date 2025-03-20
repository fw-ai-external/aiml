import { defineConfig } from "tsup";
import baseConfig from "../tsconfig/tsup.config.base";

export default defineConfig({
  ...baseConfig,
  treeshake: true,
  bundle: true,
  // Use esbuild to handle circular dependencies better
  esbuildOptions(options) {
    options.treeShaking = true;
    // Preserve the call structure in the module
    options.keepNames = true;
    // Handle circular dependencies
    options.mainFields = ["module", "main"];
  },
});
