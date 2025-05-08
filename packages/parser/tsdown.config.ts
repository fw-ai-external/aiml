import baseConfig from '../tsconfig/tsdown.config.base';
import { importAsString } from 'rollup-plugin-string-import';

export default {
  ...baseConfig,
  // Disable dts generation in tsdown, we'll use tsc for that
  entry: ['src/index.ts'],
  plugins: [importAsString({
    include: ['**/*.aiml', '**/*.ohm'],
  })],
};

