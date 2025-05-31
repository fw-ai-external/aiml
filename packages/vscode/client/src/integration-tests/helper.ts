/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";

let vscode: any;

try {
  vscode = require("vscode");
} catch (error) {
  // VSCode not available
}

export let doc: any;
export let editor: any;
export let documentEol: string;
export let platformEol: string;

/**
 * Activates the vscode.lsp-sample extension
 */
export async function activate(docUri: any) {
  if (!vscode) {
    throw new Error("VSCode not available");
  }

  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension("vscode-samples.lsp-sample")!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000); // Wait for server activation
  } catch (e) {
    console.error(e);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, "../../testFixture", p);
};

export const getDocUri = (p: string) => {
  if (!vscode) {
    throw new Error("VSCode not available");
  }
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
  if (!vscode) {
    throw new Error("VSCode not available");
  }

  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  return editor.edit((eb: any) => eb.replace(all, content));
}
