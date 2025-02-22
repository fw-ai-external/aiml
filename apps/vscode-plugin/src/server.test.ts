import { jest } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CompletionItemKind,
  Connection,
  Position,
} from "vscode-languageserver/node";
import {
  buildActiveToken,
  getOwnerAttributeName,
  getOwnerTagName,
} from "./utils/token";
import { allElementConfigs } from "@fireworks/element-types";
import { z } from "zod";

import { TokenType } from "./acorn";
import { parseToTokens } from "./acorn";
// Mock the connection with required methods
const mockConnection: Connection = {
  console: { log: () => {} },
  listen: () => {},
  onRequest: () => () => {},
  sendRequest: () => Promise.resolve(null),
  onNotification: () => () => {},
  sendNotification: () => {},
  onProgress: () => () => {},
  sendProgress: () => {},
  onInitialize: () => () => {},
  onInitialized: () => () => {},
  onDidChangeConfiguration: () => () => {},
  onDidChangeWatchedFiles: () => () => {},
  onCompletion: () => () => {},
  onCompletionResolve: () => () => {},
  onHover: () => () => {},
  workspace: {
    getConfiguration: () => Promise.resolve({}),
  },
  client: {
    register: () => Promise.resolve(),
  },
  sendDiagnostics: jest.fn(),
} as unknown as Connection;

// Helper to create a text document with content
function createTextDocument(content: string): TextDocument {
  return TextDocument.create("file:///test.aiml", "aiml", 1, content);
}

// Helper to get completion items at a specific position
async function getCompletionsAt(content: string, position: Position) {
  const doc = createTextDocument(content);
  const offset = doc.offsetAt(position);
  const tokens = parseToTokens(content);
  const token = buildActiveToken(tokens, offset);

  // Get the tag name if we're inside an element
  let tagName = "";
  for (let i = token.index; i >= 0; i--) {
    const t = token.all[i];
    if (t.type === TokenType.TagName) {
      tagName = content.substring(t.startIndex, t.endIndex);
      break;
    }
  }

  // Element completions
  if (
    !token.token ||
    token.token.type === TokenType.Name ||
    token.prevToken?.type === TokenType.StartTag ||
    token.prevToken?.type === TokenType.StartEndTag
  ) {
    return Object.entries(allElementConfigs).map(([name, config]) => ({
      label: name,
      kind: CompletionItemKind.Class,
      documentation: config.documentation || `${name} element`,
    }));
  }

  // Attribute completions
  if (tagName && token.prevToken?.type === TokenType.Whitespace) {
    const elementConfig =
      allElementConfigs[tagName as keyof typeof allElementConfigs];
    if (elementConfig) {
      return Object.keys(elementConfig.propsSchema.shape).map((attr) => ({
        label: attr,
        kind: CompletionItemKind.Property,
        documentation: `Attribute for ${tagName} element`,
      }));
    }
  }

  // Attribute value completions
  if (token.prevToken?.type === TokenType.Equal) {
    const attrNameToken = token.all
      .slice(0, token.index)
      .reverse()
      .find((t) => t.type === TokenType.AttributeName);

    if (attrNameToken) {
      const attrName = content.substring(
        attrNameToken.startIndex,
        attrNameToken.endIndex
      );
      const elementConfig =
        allElementConfigs[tagName as keyof typeof allElementConfigs];

      if (elementConfig) {
        const schema = elementConfig.propsSchema.shape[attrName];

        // Special handling for transition target
        if (tagName === "transition" && attrName === "target") {
          // Find all state IDs in the document
          const stateIds = new Set<string>();
          for (let i = 0; i < token.all.length; i++) {
            const t = token.all[i];
            if (t.type === TokenType.AttributeString) {
              const attrNameToken = getOwnerAttributeName(token.all, i);
              const tagNameToken = getOwnerTagName(token.all, i);

              if (attrNameToken && tagNameToken) {
                const tagName = content.substring(
                  tagNameToken.startIndex,
                  tagNameToken.endIndex
                );
                const attrName = content.substring(
                  attrNameToken.startIndex,
                  attrNameToken.endIndex
                );
                const attrValue = content.substring(
                  t.startIndex + 1,
                  t.endIndex - 1
                );

                if (tagName === "state" && attrName === "id") {
                  stateIds.add(attrValue);
                }
              }
            }
          }
          return Array.from(stateIds).map((id) => ({
            label: id,
            kind: CompletionItemKind.Reference,
            documentation: `Reference to state with id="${id}"`,
          }));
        }

        // Handle other attribute types
        if (schema) {
          if (schema instanceof z.ZodEnum) {
            return schema._def.values.map((value: string) => ({
              label: value,
              kind: CompletionItemKind.EnumMember,
              documentation: `Valid value for ${attrName}`,
            }));
          } else if (schema instanceof z.ZodBoolean) {
            return [
              { label: "true", kind: CompletionItemKind.Value },
              { label: "false", kind: CompletionItemKind.Value },
            ];
          }
        }
      }
    }
  }

  return [];
}

// // Helper to validate a document
// async function validateDocument(content: string) {
//   const doc = createTextDocument(content);
//   const tokens = parseToTokens(content);

//   const mockLogger: Partial<DebugLogger> = {
//     validation: (message: string, context?: any) => {
//       console.log(`[Validation] ${message}`, context);
//     },
//     state: () => {},
//   };

//   const stateTracker = new StateTracker(mockLogger as DebugLogger);
//   const validator = new DocumentValidator(
//     mockConnection,
//     mockLogger as DebugLogger,
//     stateTracker
//   );

//   // First pass to collect state IDs
//   const stateIds = new Set<string>();
//   for (let i = 0; i < tokens.length; i++) {
//     const token = tokens[i];
//     if (token.type === TokenType.String) {
//       const attrNameToken = getOwnerAttributeName(tokens, i);
//       const tagNameToken = getOwnerTagName(tokens, i);

//       if (attrNameToken && tagNameToken) {
//         const tagName = content.substring(
//           tagNameToken.startIndex,
//           tagNameToken.endIndex
//         );
//         const attrName = content.substring(
//           attrNameToken.startIndex,
//           attrNameToken.endIndex
//         );
//         const attrValue = content.substring(
//           token.startIndex + 1,
//           token.endIndex - 1
//         );

//         if (tagName === "state" && attrName === "id") {
//           stateIds.add(attrValue);
//         }
//       }
//     }
//   }

//   // Mock the state tracker to return our collected state IDs
//   stateTracker.getStatesForDocument = vi.fn().mockReturnValue(stateIds);

//   validator.validateDocument(doc, tokens);

//   // Extract diagnostics from the mock connection
//   const lastCall = (mockConnection.sendDiagnostics as ReturnType<typeof vi.fn>)
//     .mock.lastCall;
//   if (lastCall) {
//     return lastCall[0].diagnostics;
//   }
//   return [];
// }

// describe("SCXML Language Server", () => {
//   describe("Autocompletion", () => {
//     it("suggests elements after <", async () => {
//       const content = "<";
//       const completions = await getCompletionsAt(content, {
//         line: 0,
//         character: 1,
//       } as Position);

//       expect(completions.length).toBeGreaterThan(0);
//       expect(completions.some((c: CompletionItem) => c.label === "state")).toBe(
//         true
//       );
//       expect(
//         completions.some((c: CompletionItem) => c.label === "transition")
//       ).toBe(true);
//       expect(completions[0].kind).toBe(CompletionItemKind.Class);
//     });

//     it("suggests elements while typing element name", async () => {
//       const content = "<sta";
//       const completions = await getCompletionsAt(content, {
//         line: 0,
//         character: 4,
//       } as Position);

//       expect(completions.some((c: CompletionItem) => c.label === "state")).toBe(
//         true
//       );
//       expect(completions[0].kind).toBe(CompletionItemKind.Class);
//     });

//     it("suggests attributes for state element", async () => {
//       const content = "<state ";
//       const completions = await getCompletionsAt(content, {
//         line: 0,
//         character: 7,
//       } as Position);

//       expect(completions.some((c: CompletionItem) => c.label === "id")).toBe(
//         true
//       );
//       expect(completions[0].kind).toBe(CompletionItemKind.Property);
//     });

//     it("suggests state IDs for transition target", async () => {
//       const content = `<state id="idle"/><transition target=`;
//       const completions = await getCompletionsAt(content, {
//         line: 0,
//         character: 37,
//       } as Position);

//       expect(completions.some((c: CompletionItem) => c.label === "idle")).toBe(
//         true
//       );
//       expect(completions[0].kind).toBe(CompletionItemKind.Reference);
//     });

//     it("suggests initial attribute value", async () => {
//       const content = "<state initial=";
//       const completions = await getCompletionsAt(content, {
//         line: 0,
//         character: 15,
//       } as Position);

//       expect(completions.length).toBeGreaterThan(0);
//       expect(completions[0].kind).toBe(CompletionItemKind.EnumMember);
//     });
//   });

//   describe("Validation", () => {
//     it("detects invalid transition targets", async () => {
//       const content = '<state id="idle"/><transition target="nonexistent"/>';
//       const diagnostics = await validateDocument(content);

//       expect(diagnostics.length).toBe(1);
//       expect(diagnostics[0].message).toContain(
//         "Target state 'nonexistent' not found"
//       );
//     });

//     it("detects duplicate attributes", async () => {
//       const content = '<state id="idle" id="busy"/>';
//       const diagnostics = await validateDocument(content);

//       expect(diagnostics.length).toBe(1);
//       expect(diagnostics[0].message).toContain("Duplicate attribute");
//     });

//     it("validates string values", async () => {
//       const content = "<state initial={123} />";
//       const diagnostics = await validateDocument(content);

//       expect(diagnostics.length).toBe(1);
//       expect(diagnostics[0].message).toContain("Invalid value for attribute");
//     });
//   });
// });
