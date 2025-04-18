import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      // Build started
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      // Build finished
    });
  },
};

const baseConfig = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info', // Change to info for better debugging
  format: 'cjs',
  sourcesContent: false,
  platform: 'node',
  plugins: [esbuildProblemMatcherPlugin],
  target: 'node16', // Specify node target version
  mainFields: ['module', 'main'], // Prioritize ESM
  resolveExtensions: ['.ts', '.js'],
  loader: {
    // Add explicit loaders
    '.ts': 'ts',
    '.js': 'js',
  },
};

const extensionConfig = {
  ...baseConfig,
  entryPoints: ['src/extension.ts'],
  outfile: '.dist/extension.js',
  external: ['vscode'],
};

const serverConfig = {
  ...baseConfig,
  entryPoints: ['src/server.ts'],
  outfile: '.dist/server.js',
  external: ['vscode'],
};

async function main() {
  const extensionCtx = await esbuild.context(extensionConfig);
  const serverCtx = await esbuild.context(serverConfig);

  if (watch) {
    await Promise.all([extensionCtx.watch(), serverCtx.watch()]);
  } else {
    await Promise.all([extensionCtx.rebuild(), serverCtx.rebuild()]);
    await Promise.all([extensionCtx.dispose(), serverCtx.dispose()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
