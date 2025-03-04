import { LabsInfo } from "@volar/vscode";
import { ExtensionContext, workspace, FileSystemWatcher } from "vscode";
import * as path from "path";

// Track the current extension instance
let currentExtension: any = null;
let watcher: FileSystemWatcher | null = null;

export async function activate(context: ExtensionContext): Promise<LabsInfo> {
  // Setup hot reloading if in development mode
  if (process.env.NODE_ENV === "development") {
    setupHotReload(context);
  }

  return loadExtensionLogic(context);
}

/**
 * Sets up file watching for hot reload
 */
function setupHotReload(context: ExtensionContext) {
  // Watch for changes to the extension-logic.ts file
  const extensionPath = context.extensionPath;
  const srcPath = path.join(extensionPath, "src");

  // Create a file watcher for the src directory
  watcher = workspace.createFileSystemWatcher(path.join(srcPath, "**", "*.ts"));

  // When a file changes, reload the extension logic
  watcher.onDidChange(async (uri) => {
    console.log(`File changed: ${uri.fsPath}. Reloading extension...`);

    // Dispose the current extension instance if it exists
    if (currentExtension && typeof currentExtension.dispose === "function") {
      await currentExtension.dispose();
      currentExtension = null;
    }

    // Reload the extension logic
    await loadExtensionLogic(context);
  });

  // Add the watcher to the context subscriptions
  context.subscriptions.push(watcher);
}

/**
 * Loads the extension logic module
 */
async function loadExtensionLogic(
  context: ExtensionContext
): Promise<LabsInfo> {
  try {
    // Clear the module cache to force a reload
    if (process.env.NODE_ENV === "development") {
      const logicPath = path.join(
        context.extensionPath,
        "dist",
        "extension-logic.js"
      );
      if (require.cache[require.resolve(logicPath)]) {
        delete require.cache[require.resolve(logicPath)];
      }
    }

    // Import the extension logic
    const extensionLogic = await import("./extension-logic");

    // Create a new instance of the extension logic
    currentExtension = new extensionLogic.AimlExtension(context);

    // Initialize the extension
    return await currentExtension.initialize();
  } catch (error) {
    console.error("Failed to load extension logic:", error);
    throw error;
  }
}

/**
 * Deactivate the extension.
 */
export async function deactivate() {
  // Dispose the current extension instance if it exists
  if (currentExtension && typeof currentExtension.dispose === "function") {
    await currentExtension.dispose();
    currentExtension = null;
  }

  // Dispose the watcher if it exists
  if (watcher) {
    watcher.dispose();
    watcher = null;
  }
}
