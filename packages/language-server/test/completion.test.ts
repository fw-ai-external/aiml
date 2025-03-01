import { expect, afterEach, beforeEach, test } from "bun:test";
import { CompletionItemKind, InsertTextFormat } from "@volar/language-server";
import { URI } from "vscode-uri";
import { createServer, fixturePath, fixtureUri, tsdk } from "./utils";
import { LanguageServerHandle } from "@volar/test-utils";

let serverHandle: LanguageServerHandle;

beforeEach(async () => {
  serverHandle = createServer();
  await serverHandle.initialize(fixtureUri("node16"), {
    typescript: { enabled: true, tsdk },
  });
});

afterEach(() => {
  serverHandle.connection.dispose();
});

test("support completion in ESM", async () => {
  const { uri } = await serverHandle.openTextDocument(
    fixturePath("node16/completion.mdx"),
    "mdx"
  );

  const result = await serverHandle.sendCompletionRequest(uri, {
    line: 1,
    character: 1,
  });
  expect(result).toBeTruthy();
  expect("items" in result!).toBe(true);
  const completion = result!.items.find((r: any) => r.label === "Boolean");
  expect(completion).toBeTruthy();
  expect(completion).toEqual({
    commitCharacters: [".", ",", ";", "("],
    data: {
      embeddedDocumentUri: String(
        URI.from({
          scheme: "volar-embedded-content",
          authority: "jsx",
          path: "/" + encodeURIComponent(fixtureUri("node16/completion.mdx")),
        })
      ),
      original: {
        data: {
          fileName: fixturePath("node16/completion.mdx"),
          offset: 81,
          originalItem: { name: "Boolean" },
          uri: String(
            URI.from({
              scheme: "volar-embedded-content",
              authority: "jsx",
              path:
                "/" + encodeURIComponent(fixtureUri("node16/completion.mdx")),
            })
          ),
        },
      },
      pluginIndex: 2,
      uri: fixtureUri("node16/completion.mdx"),
    },
    insertTextFormat: InsertTextFormat.PlainText,
    kind: CompletionItemKind.Variable,
    label: "Boolean",
    sortText: "15",
  });

  const resolved = await serverHandle.sendCompletionResolveRequest(completion!);
  expect(resolved).toEqual({
    commitCharacters: [".", ",", ";", "("],
    detail: "interface Boolean\nvar Boolean: BooleanConstructor",
    documentation: { kind: "markdown", value: "" },
    insertTextFormat: 1,
    kind: 6,
    label: "Boolean",
    sortText: "15",
  });
});

test("support completion in JSX", async () => {
  const { uri } = await serverHandle.openTextDocument(
    fixturePath("node16/completion.mdx"),
    "mdx"
  );
  await serverHandle.sendCompletionRequest(uri, {
    line: 5,
    character: 3,
  });
  const result = await serverHandle.sendCompletionRequest(uri, {
    line: 5,
    character: 3,
  });

  expect(result).toBeTruthy();
  expect("items" in result!).toBe(true);
  const completion = result!.items.find((r: any) => r.label === "Boolean");
  expect(completion).toBeTruthy();
  expect(completion).toEqual({
    commitCharacters: [".", ",", ";", "("],
    data: {
      embeddedDocumentUri: String(
        URI.from({
          scheme: "volar-embedded-content",
          authority: "jsx",
          path: "/" + encodeURIComponent(fixtureUri("node16/completion.mdx")),
        })
      ),
      original: {
        data: {
          fileName: fixturePath("node16/completion.mdx"),
          offset: 119,
          originalItem: { name: "Boolean" },
          uri: String(
            URI.from({
              scheme: "volar-embedded-content",
              authority: "jsx",
              path:
                "/" + encodeURIComponent(fixtureUri("node16/completion.mdx")),
            })
          ),
        },
      },
      pluginIndex: 2,
      uri: fixtureUri("node16/completion.mdx"),
    },
    insertTextFormat: InsertTextFormat.PlainText,
    kind: CompletionItemKind.Variable,
    label: "Boolean",
    sortText: "15",
  });

  const resolved = await serverHandle.sendCompletionResolveRequest(completion!);
  expect(resolved).toEqual({
    commitCharacters: [".", ",", ";", "("],
    detail: "interface Boolean\nvar Boolean: BooleanConstructor",
    documentation: { kind: "markdown", value: "" },
    insertTextFormat: 1,
    kind: 6,
    label: "Boolean",
    sortText: "15",
  });
});

test("ignore completion in markdown content", async () => {
  const { uri } = await serverHandle.openTextDocument(
    fixturePath("node16/completion.mdx"),
    "mdx"
  );
  const result = await serverHandle.sendCompletionRequest(uri, {
    line: 8,
    character: 10,
  });

  expect(result).toEqual({ isIncomplete: false, items: [] });
});
