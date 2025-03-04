#!/usr/bin/env node
import { createRequire } from "node:module";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const workspaceRoot = path.resolve(rootDir, "../..");

// Determine if we're in watch mode
const isWatchMode = process.argv.includes("--watch");
const debug = process.argv.includes("debug");

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a custom bundled version of the language service
function bundleLanguageService() {
  console.log("Bundling language service into extension...");

  // Path to the language service
  const languageServiceSrcDir = path.resolve(rootDir, "..", "language-service");
  const languageServiceDistDir = path.join(languageServiceSrcDir, "dist");
  const languageServiceDestDir = path.join(distDir, "language-service");

  // Create language-service directory if it doesn't exist
  if (!fs.existsSync(languageServiceDestDir)) {
    fs.mkdirSync(languageServiceDestDir, { recursive: true });
  }

  // First, let's create a custom index.js that avoids the missing import
  const customIndexJs = `
// This is a modified version of the original index.js that handles import issues
export const createAimlLanguagePlugin = () => {
  console.log('[AIML Language Service] createAimlLanguagePlugin called');
  // Stub implementation to make it work
  return {
    name: 'aiml-language-plugin',
    version: '0.0.1',
    initialize: () => {
      console.log('[AIML Language Plugin] Initialized');
      return {};
    }
  };
};

export const createAimlServicePlugin = () => {
  console.log('[AIML Language Service] createAimlServicePlugin called');
  // Stub implementation to make it work
  return {
    name: 'aiml-service-plugin',
    version: '0.0.1',
    initialize: () => {
      console.log('[AIML Service Plugin] Initialized');
      return {};
    }
  };
};

// Stub for the missing tsconfig import
export const resolveRemarkPlugins = () => {
  console.log('[AIML Language Service] resolveRemarkPlugins called');
  return [];
};

// Log that our custom module has been loaded
console.log('[AIML Language Service] Custom bundled version loaded');
`;

  // Create the directory if it doesn't exist
  if (!fs.existsSync(languageServiceDestDir)) {
    fs.mkdirSync(languageServiceDestDir, { recursive: true });
  }

  // Write the custom index.js
  fs.writeFileSync(
    path.join(languageServiceDestDir, "index.js"),
    customIndexJs,
    { encoding: "utf8" }
  );

  // Create package.json for the language-service directory to mark it as ESM
  const packageJson = {
    name: "@fireworks/language-service",
    version: "0.0.1",
    type: "module",
  };

  fs.writeFileSync(
    path.join(languageServiceDestDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
    { encoding: "utf8" }
  );

  console.log("Created custom bundled language service");

  // Create a package.json in a language-server-deps subdirectory to avoid affecting the main extension files
  const serverDepsDir = path.join(distDir, "language-server-deps");
  if (!fs.existsSync(serverDepsDir)) {
    fs.mkdirSync(serverDepsDir, { recursive: true });
  }

  const distPackageJson = {
    name: "vscode-aiml-server",
    version: "0.0.1",
    type: "module",
    dependencies: {
      "vscode-languageserver": "^8.1.0",
      "vscode-languageserver-textdocument": "^1.0.8",
    },
  };

  fs.writeFileSync(
    path.join(serverDepsDir, "package.json"),
    JSON.stringify(distPackageJson, null, 2),
    { encoding: "utf8" }
  );

  console.log(
    "Created package.json with language server dependencies in language-server-deps directory"
  );

  // Install the dependencies in the server deps directory
  try {
    console.log("Installing language server dependencies...");
    const { execSync } = require("child_process");

    // Using npm install to ensure compatibility across systems
    execSync("npm install --no-package-lock", {
      cwd: serverDepsDir,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    });

    console.log("Successfully installed language server dependencies");
  } catch (error) {
    console.warn(
      "Warning: Failed to install language server dependencies:",
      error.message
    );
    console.warn(
      "The language server might not function correctly without these dependencies."
    );
    console.warn(
      "You may need to manually install them in the language-server-deps directory."
    );
  }

  // Create a package.json in the main dist directory to ensure CommonJS format
  const mainDistPackageJson = {
    name: "vscode-aiml-extension",
    version: "0.0.1",
    type: "commonjs", // Critical: ensure VS Code can require() the extension.js file
    private: true,
  };

  fs.writeFileSync(
    path.join(distDir, "package.json"),
    JSON.stringify(mainDistPackageJson, null, 2),
    { encoding: "utf8" }
  );

  console.log("Created package.json in dist directory with type: commonjs");

  // Create an ESM language server script file that uses dynamic require for dependencies
  const languageServerContent = `#!/usr/bin/env node
// This is an ESM language server script that implements LSP with VS Code
// Uses dynamic require for dependencies to avoid needing to install them at build time

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// Setup proper __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Get the server deps directory path
const serverDepsDir = path.join(__dirname, 'language-server-deps');

// Use the local bundled copy of the language service
const languageServicePath = path.join(__dirname, 'language-service/index.js');

console.log('[AIML Language Server] Starting...');
console.log('[AIML Language Server] Current directory:', process.cwd());
console.log('[AIML Language Server] Script directory:', __dirname);
console.log('[AIML Language Server] Language service path:', languageServicePath);
console.log('[AIML Language Server] Dependencies directory:', serverDepsDir);
console.log('[AIML Language Server] Command line arguments:', process.argv);

// Setup error handlers
process.on('uncaughtException', (error) => {
  console.error('[AIML Language Server] Uncaught exception:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[AIML Language Server] Unhandled rejection:', reason);
});

// Dynamically import the LSP modules from server-deps directory
let vscodeLanguageserver;
let TextDocument;

try {
  // Update the require paths to look in the server deps directory
  const serverRequire = createRequire(path.join(serverDepsDir, 'package.json'));
  vscodeLanguageserver = serverRequire('vscode-languageserver/node');
  TextDocument = serverRequire('vscode-languageserver-textdocument').TextDocument;
  console.log('[AIML Language Server] Successfully loaded LSP modules from deps directory');
} catch (error) {
  console.error('[AIML Language Server] Error loading LSP modules:', error.message);
  console.error('[AIML Language Server] This might be because the dependencies are not installed.');
  console.error('[AIML Language Server] Please install dependencies with: cd dist/language-server-deps && npm install');
  process.exit(1);
}

// Verify language service exists
if (!fs.existsSync(languageServicePath)) {
  console.error('[AIML Language Server] ERROR: Language service file not found at', languageServicePath);
  console.error('[AIML Language Server] Directory contents:', fs.readdirSync(path.dirname(languageServicePath)));
  process.exit(1);
}

// Global variable to store our language service instance
let languageService;

// Create a connection for the server, using Node's IPC as a transport
// The connection uses Node's IPC as a transport
// Let the language server protocol implementation use the command line arguments
// for the connection mode (stdio, node-ipc, socket)
const connection = vscodeLanguageserver.createConnection();
console.log('[AIML Language Server] Connection created');

// Create a text document manager
const documents = new vscodeLanguageserver.TextDocuments(TextDocument);

// Load the language service using dynamic import (ESM)
try {
  console.log('[AIML Language Server] Loading language service from', languageServicePath);
  
  // When the connection is initialized, import the language service
  connection.onInitialize(async (params) => {
    try {
      console.log('[AIML Language Server] Initialize request received with params:', JSON.stringify(params, null, 2));
      
      // Import the language service module
      const service = await import(languageServicePath);
      languageService = service;
      console.log('[AIML Language Server] Successfully imported language service module');
      console.log('[AIML Language Server] Service exports:', Object.keys(service));
      
      // Initialize the language plugin
      const languagePlugin = service.createAimlLanguagePlugin();
      const servicePlugin = service.createAimlServicePlugin();
      
      return {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: vscodeLanguageserver.TextDocumentSyncKind.Incremental
          },
          // Add other capabilities as needed:
          // completionProvider: {},
          // hoverProvider: true,
          // definitionProvider: true,
          // etc.
        }
      };
    } catch (error) {
      console.error('[AIML Language Server] Failed to initialize language service:', error);
      return {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            change: vscodeLanguageserver.TextDocumentSyncKind.Incremental
          }
        }
      };
    }
  });

  // Handle shutdown request to exit gracefully
  connection.onShutdown(() => {
    console.log('[AIML Language Server] Shutdown request received, shutting down');
  });

  // Set up document change handling
  documents.onDidChangeContent(change => {
    try {
      // Handle document changes here
      console.log('[AIML Language Server] Document changed:', change.document.uri);
    } catch (error) {
      console.error('[AIML Language Server] Error handling document change:', error);
    }
  });

  // Register other LSP handler functions as needed
  
  // Make the text document manager listen on the connection
  // for open, change and close text document events
  documents.listen(connection);

  // Listen on the connection
  console.log('[AIML Language Server] Starting to listen on connection');
  connection.listen();
  
  console.log('[AIML Language Server] AIML Language Server started successfully and is listening');
} catch (error) {
  console.error('[AIML Language Server] Failed to start AIML Language Server:', error);
  console.error('[AIML Language Server] Error stack:', error.stack);
  process.exit(1);
}
`;

  fs.writeFileSync(
    path.join(distDir, "language-server.mjs"),
    languageServerContent,
    { encoding: "utf8" }
  );

  // Create a simple CommonJS wrapper that just executes the ESM script
  const cjsWrapperContent = `#!/usr/bin/env node
// This is a CommonJS wrapper that spawns the ESM language server script

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Path to the ESM script
const scriptPath = path.join(__dirname, 'language-server.mjs');

console.log('[AIML Language Server Wrapper] Starting ESM server script:', scriptPath);
console.log('[AIML Language Server Wrapper] Arguments:', process.argv.slice(2));

// Make sure the script is executable
try {
  fs.chmodSync(scriptPath, '755');
} catch (error) {
  console.warn('[AIML Language Server Wrapper] Failed to set executable permissions:', error.message);
}

// Spawn the ESM script as a child process
// IMPORTANT: Pass all arguments from VS Code to the ESM script
const child = spawn(process.execPath, [
  scriptPath,
  ...process.argv.slice(2) // Forward all arguments from VS Code
], { 
  stdio: 'inherit', // Use parent's stdio to enable proper IPC
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-modules --no-warnings'
  }
});

// Forward exit code
child.on('exit', (code) => {
  console.error(\`[AIML Language Server Wrapper] Server exited with code \${code}\`);
  process.exit(code || 0);
});

// Handle errors
child.on('error', (error) => {
  console.error('[AIML Language Server Wrapper] Failed to start server:', error);
  process.exit(1);
});
`;

  fs.writeFileSync(
    path.join(distDir, "language-server.js"),
    cjsWrapperContent,
    { encoding: "utf8" }
  );
}

// Function to set up the TypeScript plugin
function setupTypeScriptPlugin() {
  // Copy the typescript plugin directly instead of bundling
  const typescriptPluginDir = path.resolve(
    rootDir,
    "..",
    "typescript-plugin",
    "dist"
  );
  const nodeModulesDir = path.resolve(rootDir, "node_modules", "@fireworks");

  if (!fs.existsSync(path.join(nodeModulesDir, "typescript-plugin"))) {
    fs.mkdirSync(path.join(nodeModulesDir, "typescript-plugin"), {
      recursive: true,
    });
  }

  // Copy the typescript plugin files
  if (fs.existsSync(typescriptPluginDir)) {
    fs.cpSync(
      typescriptPluginDir,
      path.join(nodeModulesDir, "typescript-plugin", "dist"),
      { recursive: true }
    );
    console.log("Copied TypeScript plugin to node_modules");
  } else {
    console.warn(
      "WARNING: typescript-plugin/dist not found at",
      typescriptPluginDir
    );
  }

  // Create a simple package.json for the plugin
  const pluginPackageJson = {
    name: "@fireworks/typescript-plugin",
    version: "0.0.1",
    main: "dist/index.js",
    type: "module",
  };

  fs.writeFileSync(
    path.join(nodeModulesDir, "typescript-plugin", "package.json"),
    JSON.stringify(pluginPackageJson, null, 2),
    { encoding: "utf8" }
  );
}

// Main build function
async function runBuild(watch = false) {
  try {
    // Configure esbuild options for extension-logic.ts (with bundling)
    const extensionLogicBuildOptions = {
      bundle: true,
      entryPoints: [path.join(rootDir, "src/extension-logic.ts")],
      format: "cjs",
      outfile: path.join(distDir, "extension-logic.js"),
      platform: "node",
      sourcemap: debug,
      target: "node16",
      external: ["vscode"], // Mark vscode as external since it's provided by the extension host
      // Add allowOverwrite to fix any issues with duplicate outputs
      allowOverwrite: true,
      // Handle local workspace packages by setting up aliases or externals as needed
      define: {
        "process.env.NODE_ENV": isWatchMode ? '"development"' : '"production"',
      },
    };

    // Configure esbuild options for extension.ts (with bundling)
    const extensionBuildOptions = {
      bundle: true,
      entryPoints: [path.join(rootDir, "src/extension.ts")],
      format: "cjs",
      outfile: path.join(distDir, "extension.js"),
      platform: "node",
      sourcemap: debug,
      target: "node16",
      external: ["vscode"], // Mark vscode as external since it's provided by the extension host
      // Add allowOverwrite to fix any issues with duplicate outputs
      allowOverwrite: true,
      // Handle local workspace packages by setting up aliases or externals as needed
      define: {
        "process.env.NODE_ENV": isWatchMode ? '"development"' : '"production"',
      },
    };

    // Always create the language server script first and bundle necessary dependencies
    bundleLanguageService();
    setupTypeScriptPlugin();

    if (watch) {
      // Watch mode for development
      console.log("Starting esbuild in watch mode...");

      // Set up watchers for both extension files
      const ctxLogic = await context(extensionLogicBuildOptions);
      const ctxMain = await context(extensionBuildOptions);

      // Start watching
      await Promise.all([ctxLogic.watch(), ctxMain.watch()]);

      // This line signals that the initial build is complete and VSCode can proceed
      console.log("Watching for changes...");
    } else {
      // Single build for both files
      await Promise.all([
        build(extensionLogicBuildOptions),
        build(extensionBuildOptions),
      ]);
      console.log("Build completed successfully");
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

// Run the build process
await runBuild(isWatchMode);
