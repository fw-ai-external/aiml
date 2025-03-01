import { LanguageServerHandle } from "@volar/test-utils";
import { createRequire } from "node:module";
import path from "node:path";
import { URI, Utils } from "vscode-uri";

// Define a minimal interface for the language server handle

// Mock implementation of startLanguageServer for TypeScript type checking
function startLanguageServer(
  binPath: string,
  baseUrl: URL
): LanguageServerHandle {
  // This is just a type stub - the actual implementation will be provided by the imported module
  throw new Error("This is a stub implementation for TypeScript type checking");
}

const require = createRequire(import.meta.url);
const pkgPath = new URL("../package.json", import.meta.url);
const pkgRequire = createRequire(pkgPath);
const pkg = require("../package.json");

const bin = pkgRequire.resolve(pkg.bin["mdx-language-server"]);

const fixturesURI = Utils.joinPath(
  URI.parse(import.meta.url),
  "../../../../fixtures"
);

/**
 * The path to the TypeScript SDK.
 */
export const tsdk = path.dirname(require.resolve("typescript"));

export function createServer(): LanguageServerHandle {
  // In a real implementation, we would use the imported startLanguageServer
  // For now, we'll create a mock implementation for TypeScript type checking
  try {
    // Try to dynamically import the module at runtime
    const { startLanguageServer } = require("@volar/test-utils");
    return startLanguageServer(bin, new URL("..", import.meta.url));
  } catch (error) {
    console.error("Error importing @volar/test-utils:", error);
    throw error;
  }
}

/**
 * Get a fully resolved URI for a fixture file.
 */
export function fixtureUri(fileName: string): string {
  return fixturesURI + "/" + fileName;
}

/**
 * Get a fully resolved file path for a fixture file.
 */
export function fixturePath(fileName: string): string {
  return URI.parse(fixtureUri(fileName)).fsPath.replaceAll("\\", "/");
}
