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
    test.skip("Diagnoses uppercase texts", () => {
      // This test requires VSCode environment
    });
  });
} else {
  describe("Should get diagnostics", () => {
    let docUri: any;

    try {
      docUri = getDocUri("diagnostics.txt");
    } catch (error) {
      // If getDocUri fails, skip the tests
      describe.skip("Should get diagnostics (VSCode not available)", () => {
        test.skip("Diagnoses uppercase texts", () => {
          // This test requires VSCode environment
        });
      });
    }

    if (docUri) {
      test("Diagnoses uppercase texts", async () => {
        await testDiagnostics(docUri, [
          {
            message: "ANY is all uppercase.",
            range: toRange(0, 0, 0, 3),
            severity: vscode.DiagnosticSeverity.Warning,
            source: "ex",
          },
          {
            message: "ANY is all uppercase.",
            range: toRange(0, 14, 0, 17),
            severity: vscode.DiagnosticSeverity.Warning,
            source: "ex",
          },
          {
            message: "OS is all uppercase.",
            range: toRange(0, 18, 0, 20),
            severity: vscode.DiagnosticSeverity.Warning,
            source: "ex",
          },
        ]);
      });
    }
  });

  function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
    const start = new vscode.Position(sLine, sChar);
    const end = new vscode.Position(eLine, eChar);
    return new vscode.Range(start, end);
  }

  async function testDiagnostics(docUri: any, expectedDiagnostics: any[]) {
    await activate(docUri);

    const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

    assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

    expectedDiagnostics.forEach((expectedDiagnostic, i) => {
      const actualDiagnostic = actualDiagnostics[i];
      assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
      assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
      assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
    });
  }
}
