import baseConfig from "../tsconfig/tsup.config.base";

export default {
  ...baseConfig,
  // Instead of using tsup, we'll rely on tsc for the types package
  // name: "types",
};
