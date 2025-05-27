/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { describe, test } from "bun:test";

let vscode: any;
let assert: any;
let getDocUri: any;
let activate: any;

try {
  vscode = require("vscode");
  assert = require("assert");
  const helper = require("./helper");
  getDocUri = helper.getDocUri;
  activate = helper.activate;
} catch (error) {
  // VSCode modules not available - skip tests
}

const isVSCodeAvailable = !!vscode;

if (!isVSCodeAvailable) {
  describe.skip("VSCode Integration Tests (skipped - VSCode not available)", () => {
    test.skip("Completes JS/TS in an aiml file within a script tag", () => {
      // This test requires VSCode environment
    });
  });
} else {
  describe("Should do completion", () => {
    const docUri = getDocUri("completion.aiml");

    test("Completes JS/TS in an aiml file within a script tag", async () => {
      await testCompletion(docUri, new vscode.Position(0, 0), {
        items: [
          { label: "JavaScript", kind: vscode.CompletionItemKind.Text },
          { label: "TypeScript", kind: vscode.CompletionItemKind.Text },
        ],
      });
    });
  });

  async function testCompletion(
    docUri: any,
    position: any,
    expectedCompletionList: any
  ) {
    await activate(docUri);

    // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
    const actualCompletionList = (await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      docUri,
      position
    )) as any;

    assert.ok(actualCompletionList.items.length >= 2);
    expectedCompletionList.items.forEach((expectedItem: any, i: number) => {
      const actualItem = actualCompletionList.items[i];
      assert.equal(actualItem.label, expectedItem.label);
      assert.equal(actualItem.kind, expectedItem.kind);
    });
  }
}
