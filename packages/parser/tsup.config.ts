import baseConfig from "../tsconfig/tsup.config.base";
import { importAsString } from "rollup-plugin-string-import";

export default {
  ...baseConfig,
  entry: ["src/index.ts"],
  // Keep the string import plugin for AIML and OHM files
  plugins: [
    importAsString({
      include: ["**/*.aiml", "**/*.ohm"],
    }),
  ],
};
