/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { workspace, type ExtensionContext } from "vscode";

import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  try {
    console.log("=== AIML Extension Activation Started ===");
    console.log(`Extension context path: ${context.extensionPath}`);
    console.log(`Extension mode: ${context.extensionMode}`);

    // The server is implemented in node
    const serverModule = context.asAbsolutePath(
      path.join("server", "out", "server.js")
    );

    console.log(`Server module path: ${serverModule}`);

    // Check if the server module exists
    const fs = require("fs");
    if (!fs.existsSync(serverModule)) {
      console.error(`Server module not found at: ${serverModule}`);

      // Check what files do exist in the server directory
      const serverDir = path.dirname(serverModule);
      console.log(`Checking server directory: ${serverDir}`);
      try {
        if (fs.existsSync(serverDir)) {
          const files = fs.readdirSync(serverDir);
          console.log(`Files in server directory:`, files);
        } else {
          console.error(`Server directory does not exist: ${serverDir}`);
        }
      } catch (dirError) {
        console.error(`Error reading server directory: ${dirError}`);
      }

      throw new Error(`Server module not found at: ${serverModule}`);
    }

    console.log("Server module file exists, checking if it's readable...");
    try {
      const stats = fs.statSync(serverModule);
      console.log(`Server module size: ${stats.size} bytes`);
      console.log(`Server module modified: ${stats.mtime}`);
    } catch (statError) {
      console.error(`Error reading server module stats: ${statError}`);
    }

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          env: {
            ...process.env,
            AIML_SERVER_DEBUG: "true",
          },
        },
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: ["--nolazy", "--inspect=6009"],
          env: {
            ...process.env,
            AIML_SERVER_DEBUG: "true",
          },
        },
      },
    };

    console.log(
      "Server options configured:",
      JSON.stringify(serverOptions, null, 2)
    );

    // Create output channel for better debugging
    const outputChannel = require("vscode").window.createOutputChannel(
      "AIML Language Server"
    );

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for plain text documents
      documentSelector: [{ scheme: "file", language: "aiml" }],
      synchronize: {
        // Notify the server about file changes to '.clientrc files contained in the workspace
        fileEvents: workspace.createFileSystemWatcher("**/*.aiml"),
      },
      // Add error handling for client-server communication
      outputChannel: outputChannel,
      // Increase timeout for server startup
      connectionOptions: {
        maxRestartCount: 5,
      },
      // Add more detailed error handling
      errorHandler: {
        error: (error, message, count) => {
          console.error(`Client error (count: ${count}):`, error);
          console.error(`Error message:`, message);
          outputChannel.appendLine(`Client error (count: ${count}): ${error}`);
          outputChannel.appendLine(`Error message: ${message}`);
          return {
            action: require("vscode-languageclient").ErrorAction.Continue,
          };
        },
        closed: () => {
          console.log("Connection to server closed");
          outputChannel.appendLine("Connection to server closed");
          return {
            action: require("vscode-languageclient").CloseAction.DoNotRestart,
          };
        },
      },
    };

    console.log("Client options configured");

    console.log("Creating language client...");

    // Create the language client and start the client.
    client = new LanguageClient(
      "AIML",
      "AIML Language Server",
      serverOptions,
      clientOptions
    );

    console.log("Language client created, setting up event handlers...");

    // Add detailed event handlers for debugging
    client.onDidChangeState((event) => {
      console.log(
        `Client state changed: ${event.oldState} -> ${event.newState}`
      );
      outputChannel.appendLine(
        `Client state changed: ${event.oldState} -> ${event.newState}`
      );
    });

    console.log("Starting language client...");

    // Start the client. This will also launch the server
    const startPromise = client.start();

    startPromise
      .then(() => {
        console.log("✅ Language client started successfully");
        outputChannel.appendLine("✅ Language client started successfully");
        console.log("✅ Language client is ready and connected to server");
        outputChannel.appendLine(
          "✅ Language client is ready and connected to server"
        );
      })
      .catch((error) => {
        console.error(`❌ Failed to start language client:`, error);
        console.error(`Error stack:`, error.stack);
        outputChannel.appendLine(
          `❌ Failed to start language client: ${error.message}`
        );
        outputChannel.appendLine(`Error stack: ${error.stack}`);

        // Show error to user
        require("vscode")
          .window.showErrorMessage(
            `AIML Language Server failed to start: ${error.message}`,
            "Show Output"
          )
          .then((selection) => {
            if (selection === "Show Output") {
              outputChannel.show();
            }
          });

        throw error;
      });

    console.log("=== AIML Extension Activation Completed ===");
  } catch (error) {
    console.error("=== AIML Extension Activation Failed ===");
    console.error(
      `Error activating extension: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(
      `Error stack: ${error instanceof Error ? error.stack : "No stack"}`
    );

    // Show error to user
    require("vscode").window.showErrorMessage(
      `AIML Extension failed to activate: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    throw error;
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
