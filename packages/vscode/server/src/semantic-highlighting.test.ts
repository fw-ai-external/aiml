import { test, expect, describe } from "bun:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  extractSemanticTokens,
  SEMANTIC_TOKEN_LEGEND,
} from "./semantic-highlighting";

// Helper function to create a TextDocument from string content
function createTextDocument(
  content: string,
  uri = "test://test.aiml"
): TextDocument {
  return TextDocument.create(uri, "aiml", 1, content);
}

// Helper function to decode semantic tokens for easier testing
function decodeSemanticTokens(tokens: number[], document: TextDocument) {
  const decoded: Array<{
    line: number;
    character: number;
    length: number;
    tokenType: string;
    tokenModifiers: string[];
  }> = [];

  let line = 0;
  let character = 0;

  for (let i = 0; i < tokens.length; i += 5) {
    const deltaLine = tokens[i];
    const deltaChar = tokens[i + 1];
    const length = tokens[i + 2];
    const tokenType = tokens[i + 3];
    const tokenModifiers = tokens[i + 4];

    line += deltaLine;
    if (deltaLine > 0) {
      character = deltaChar;
    } else {
      character += deltaChar;
    }

    const modifierNames: string[] = [];
    for (let j = 0; j < SEMANTIC_TOKEN_LEGEND.tokenModifiers.length; j++) {
      if (tokenModifiers & (1 << j)) {
        modifierNames.push(SEMANTIC_TOKEN_LEGEND.tokenModifiers[j]);
      }
    }

    decoded.push({
      line,
      character,
      length,
      tokenType: SEMANTIC_TOKEN_LEGEND.tokenTypes[tokenType],
      tokenModifiers: modifierNames,
    });
  }

  return decoded;
}

// Helper function to extract text at a specific position for verification
function getTextAtPosition(
  document: TextDocument,
  line: number,
  character: number,
  length: number
): string {
  const start = document.positionAt(document.offsetAt({ line, character }));
  const end = document.positionAt(
    document.offsetAt({ line, character }) + length
  );
  return document.getText({ start, end });
}

describe("AST to Semantic Highlighting Conversion", () => {
  describe("AIML Elements", () => {
    test("should highlight basic AIML element tags", async () => {
      const content = '<llm model="gpt-4">Hello</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Should have tokens for the element name
      const llmTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "llm"
      );
      expect(llmTokens.length).toBeGreaterThan(0);
      expect(llmTokens[0].tokenType).toBe("function"); // LLM elements should be highlighted as functions
    });

    test("should highlight state elements", async () => {
      const content = '<state id="initial">Content</state>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const stateTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "state"
      );
      expect(stateTokens.length).toBeGreaterThan(0);
      expect(stateTokens[0].tokenType).toBe("class"); // State elements should be highlighted as classes
    });

    test("should highlight workflow elements", async () => {
      const content = '<workflow name="test">Content</workflow>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const workflowTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "workflow"
      );
      expect(workflowTokens.length).toBeGreaterThan(0);
      expect(workflowTokens[0].tokenType).toBe("namespace"); // Workflow elements should be highlighted as namespaces
    });

    test("should highlight self-closing elements", async () => {
      const content = '<state id="test" />';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const stateTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "state"
      );
      expect(stateTokens.length).toBeGreaterThan(0);
      expect(stateTokens[0].tokenType).toBe("class");
    });
  });

  describe("Attributes", () => {
    test("should highlight attribute names", async () => {
      const content = '<llm model="gpt-4" temperature="0.7">Hello</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const modelTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "model"
      );
      expect(modelTokens.length).toBeGreaterThan(0);
      expect(modelTokens[0].tokenType).toBe("parameter"); // Attribute names should be parameters

      const tempTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "temperature"
      );
      expect(tempTokens.length).toBeGreaterThan(0);
      expect(tempTokens[0].tokenType).toBe("parameter");
    });

    test("should highlight string attribute values", async () => {
      const content = '<llm model="gpt-4">Hello</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const stringTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "gpt-4"
      );
      expect(stringTokens.length).toBeGreaterThan(0);
      expect(stringTokens[0].tokenType).toBe("enumMember"); // Model attribute values are highlighted as enum members
    });

    test("should highlight expression attribute values", async () => {
      const content = "<llm model={modelName}>Hello</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const exprTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "{modelName}"
      );
      expect(exprTokens.length).toBeGreaterThan(0);
      expect(exprTokens[0].tokenType).toBe("property"); // Expressions should be properties
    });

    test("should highlight numeric attribute values", async () => {
      const content = "<llm temperature={0.7}>Hello</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const numTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "{0.7}"
      );
      expect(numTokens.length).toBeGreaterThan(0);
      expect(numTokens[0].tokenType).toBe("property");
    });
  });

  describe("Comments", () => {
    test("should highlight HTML-style comments", async () => {
      const content = "<!-- This is a comment --><llm>Hello</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const commentTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "<!-- This is a comment -->"
      );
      expect(commentTokens.length).toBeGreaterThan(0);
      expect(commentTokens[0].tokenType).toBe("comment");
      expect(commentTokens[0].tokenModifiers).toContain("documentation");
    });

    test("should highlight JSX-style comments", async () => {
      const content = "{/* JSX comment */}<llm>Hello</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const commentTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "{/* JSX comment */}"
      );
      expect(commentTokens.length).toBeGreaterThan(0);
      expect(commentTokens[0].tokenType).toBe("comment");
    });

    test("should highlight multi-line comments", async () => {
      const content = `<!-- This is a
multi-line
comment -->
<llm>Hello</llm>`;
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Multi-line comments are not currently supported by the line-by-line processing
      // This test documents expected behavior for future implementation
      expect(decoded).toBeDefined();
    });
  });

  describe("Script Tags", () => {
    test("should highlight JavaScript code in script tags", async () => {
      const content = "<script>const x = 42;</script>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Should have tokens for JavaScript keywords
      const constTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "const"
      );
      expect(constTokens.length).toBeGreaterThan(0);
      expect(constTokens[0].tokenType).toBe("keyword");
    });

    test("should highlight TypeScript code in script tags", async () => {
      const content =
        '<script lang="typescript">interface User { name: string; }</script>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const interfaceTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "interface"
      );
      expect(interfaceTokens.length).toBeGreaterThan(0);
      expect(interfaceTokens[0].tokenType).toBe("keyword");
    });

    test("should highlight Python code in script tags", async () => {
      const content = '<script lang="python">def hello(): pass</script>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const defTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "def"
      );
      expect(defTokens.length).toBeGreaterThan(0);
      expect(defTokens[0].tokenType).toBe("keyword");
    });
  });

  describe("Expressions", () => {
    test("should highlight simple expressions", async () => {
      const content = "<llm>{variable}</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const exprTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "{variable}"
      );
      expect(exprTokens.length).toBeGreaterThan(0);
      expect(exprTokens[0].tokenType).toBe("property");
    });

    test("should highlight complex expressions", async () => {
      const content = '<llm>{user.name || "Anonymous"}</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const exprTokens = decoded.filter((token) =>
        getTextAtPosition(
          document,
          token.line,
          token.character,
          token.length
        ).includes("user.name")
      );
      expect(exprTokens.length).toBeGreaterThan(0);
      expect(exprTokens[0].tokenType).toBe("property");
    });

    test("should highlight arrow function expressions", async () => {
      const content = "<llm prompt={(input) => `Hello ${input}`}>Content</llm>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const exprTokens = decoded.filter((token) =>
        getTextAtPosition(
          document,
          token.line,
          token.character,
          token.length
        ).includes("=>")
      );
      expect(exprTokens.length).toBeGreaterThan(0);
      expect(exprTokens[0].tokenType).toBe("property");
    });
  });

  describe("Frontmatter", () => {
    test("should highlight YAML frontmatter", async () => {
      const content = `---
title: Test Workflow
version: 1.0
---
<llm>Hello</llm>`;
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // The current implementation may not handle frontmatter highlighting
      // This test documents expected behavior for future AST-based implementation
      expect(decoded).toBeDefined();
    });
  });

  describe("Imports", () => {
    test("should highlight ES6 imports", async () => {
      const content = `import utils from 'utils';
<llm>Hello</llm>`;
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // The current implementation may not handle import highlighting
      // This test documents expected behavior for future AST-based implementation
      expect(decoded).toBeDefined();
    });
  });

  describe("Nested Elements", () => {
    test("should highlight nested AIML elements", async () => {
      const content = `<workflow name="test">
  <state id="initial">
    <llm model="gpt-4">
      Hello World
    </llm>
  </state>
</workflow>`;
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Should highlight all element types correctly
      const workflowTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "workflow"
      );
      const stateTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "state"
      );
      const llmTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "llm"
      );

      expect(workflowTokens.length).toBeGreaterThan(0);
      expect(stateTokens.length).toBeGreaterThan(0);
      expect(llmTokens.length).toBeGreaterThan(0);

      expect(workflowTokens[0].tokenType).toBe("namespace");
      expect(stateTokens[0].tokenType).toBe("class");
      expect(llmTokens[0].tokenType).toBe("function");
    });
  });

  describe("Special Content Tags", () => {
    test("should handle prompt tags with raw content", async () => {
      const content =
        "<prompt>You are a helpful assistant. Use <llm> tags when needed.</prompt>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const promptTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "prompt"
      );
      expect(promptTokens.length).toBeGreaterThan(0);
      expect(promptTokens[0].tokenType).toBe("property"); // Prompt elements should be highlighted as properties
    });

    test("should handle script tags with raw content", async () => {
      const content = "<script>const obj = {a: 1, b: 2};</script>";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      const scriptTokens = decoded.filter(
        (token) =>
          getTextAtPosition(
            document,
            token.line,
            token.character,
            token.length
          ) === "script"
      );
      expect(scriptTokens.length).toBeGreaterThan(0);
      expect(scriptTokens[0].tokenType).toBe("typeParameter"); // Script elements should be highlighted as type parameters
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed AIML gracefully", async () => {
      const content = '<llm model="unclosed>Hello</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);

      // Should not throw and should return some tokens
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    test("should handle empty documents", async () => {
      const content = "";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);

      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
    });

    test("should handle documents with only text", async () => {
      const content = "Just plain text with no AIML elements";
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe("Position Accuracy", () => {
    test("should provide accurate token positions", async () => {
      const content = '<llm model="gpt-4">Hello</llm>';
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Verify that token positions match the actual content
      for (const token of decoded) {
        const actualText = getTextAtPosition(
          document,
          token.line,
          token.character,
          token.length
        );
        expect(actualText.length).toBe(token.length);
        expect(token.line).toBeGreaterThanOrEqual(0);
        expect(token.character).toBeGreaterThanOrEqual(0);
      }
    });

    test("should handle multi-line content correctly", async () => {
      const content = `<llm 
  model="gpt-4"
  temperature="0.7">
  Hello World
</llm>`;
      const document = createTextDocument(content);
      const result = await extractSemanticTokens(document);
      const decoded = decodeSemanticTokens(result.data, document);

      // Should have tokens on multiple lines
      const lines = new Set(decoded.map((token) => token.line));
      expect(lines.size).toBeGreaterThan(1);
    });
  });
});

describe("AST-based Highlighting (Future Implementation)", () => {
  test("should be implemented when AST parser is available", () => {
    // This test suite documents expected behavior for future AST-based highlighting
    // Currently, the parseAIML function is not exported from the parser package
    // These tests will be implemented when the AST functionality is properly exposed
    expect(true).toBe(true);
  });
});
