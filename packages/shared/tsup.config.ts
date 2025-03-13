import baseConfig from "../tsconfig/tsup.config.base";

export default {
  ...baseConfig,
  // Disable dts generation in tsup, we'll use tsc for that
};
