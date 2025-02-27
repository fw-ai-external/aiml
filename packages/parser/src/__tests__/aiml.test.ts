import { AimlParser } from "../index";
import { describe, it, expect, beforeEach } from "bun:test";
import { tsToAIML } from "../ts-to-aiml";

describe("AIML Parsing Tests", () => {
  let parser: AimlParser;

  beforeEach(() => {
    parser = new AimlParser();
  });

  describe("Basic AIML Parsing", () => {
    it("should parse a basic AIML file", () => {
      const input = `
---
name: Test Workflow
---

Some text here with {userInput.message.content}

<workflow id="test">
  <state id="start">
    <customTag>This is a custom tag</customTag>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
      `;

      parser.setFile({ path: "test.mdx", content: input }, true);

      const result = parser.compile("test.mdx");

      // Add more detailed debug logging
      console.log("AST Structure Type:", typeof result.ast);
      console.log("AST is array:", Array.isArray(result.ast));
      console.log("AST Length:", result.ast?.length);

      if (result.ast && result.ast.length > 0) {
        const firstNode = result.ast[0];
        console.log("First Node Kind:", firstNode.getKindName?.());

        // Show node structure recursively
        console.log("Full AST structure:");
        function logNode(node, depth = 0) {
          const indent = "  ".repeat(depth);
          console.log(`${indent}Kind: ${node.getKindName?.() || "unknown"}`);

          // Print more details for specific kinds
          if (node.getText) {
            const text = node.getText();
            if (text.length < 100) {
              console.log(`${indent}Text: ${text}`);
            } else {
              console.log(`${indent}Text: ${text.substring(0, 50)}...`);
            }
          }

          if (typeof node.getChildren === "function") {
            const children = node.getChildren();
            console.log(`${indent}Children count: ${children.length}`);
            children.forEach((child) => {
              logNode(child, depth + 1);
            });
          }
        }

        logNode(firstNode);
      }

      expect(result.ast).not.toBeNull();

      // Add debug in tsToAIML function
      console.log("Calling tsToAIML...");
      const ourAST = tsToAIML(result.ast!);

      // Print the ourAST to see what we're getting
      console.log("Parsed AIML AST:", JSON.stringify(ourAST, null, 2));

      // Enable the expectations now that we have a proper implementation
      expect(ourAST).toBeArrayOfSize(4);
      expect(ourAST[0].type).toBe("header");
      expect(ourAST[0].children).toBeArrayOfSize(1);
      expect(ourAST[0].children?.[0]?.type).toBe("headerField");
      expect(ourAST[0].children?.[0]?.id).toBe("name");
      expect(ourAST[0].children?.[0]?.value).toBe("Test Workflow");

      expect(ourAST[1].type).toBe("text");
      expect(ourAST[2].type).toBe("expression");
      expect(ourAST[2].value).toBe("userInput.message.content");
      expect(ourAST[3].type).toBe("element");
    });

    it("should parse an even more complex AIML file", () => {
      const input = `
---
name: Test Workflow
---

Some text here with {userInput.message.content.toLowerCase()}
<customTag>This is a custom tag so it is just a text node</customTag>

<transition 
target="end" />
  
      `;

      parser.setFile({ path: "test.mdx", content: input }, true);

      const result = parser.compile("test.mdx");
      expect(result.ast).not.toBeNull();

      const ourAST = tsToAIML(result.ast!);

      // Enable the expectations now that we have a proper implementation
      expect(ourAST).toBeArrayOfSize(5);
      expect(ourAST[0].type).toBe("header");
      expect(ourAST[0].children).toBeArrayOfSize(1);
      expect(ourAST[0].children?.[0]?.type).toBe("headerField");
      expect(ourAST[0].children?.[0]?.id).toBe("name");
      expect(ourAST[0].children?.[0]?.value).toBe("Test Workflow");

      expect(ourAST[1].type).toBe("text");
      expect(ourAST[2].type).toBe("expression");
      expect(ourAST[2].value).toBe("userInput.message.content.toLowerCase()");
      expect(ourAST[3].type).toBe("text");
      // this is just text, ignore that it looks like JSX
      expect(ourAST[3].value).toBe(
        "<customTag>This is a custom tag so it is just a text node</customTag>"
      );
      expect(ourAST[4].type).toBe("element");
      expect(ourAST[4].tag).toBe("transition");
      expect(ourAST[4].attributes).toBeObject();
      expect(ourAST[4].attributes?.target).toBe("end");
    });
  });
});
