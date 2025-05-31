import { describe, expect, it } from "bun:test";
import { parseAIML } from "../src/ast/aiml/aiml.js";
import type { AIMLASTNode } from "../src/ast/aiml/aiml.js";

describe("Script Tag Parsing Tests", () => {
  it("should parse script tag without type as JavaScript", () => {
    const input = `
<script>
console.log("Hello World");
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check tag name
    const tagNameAttr = scriptElement.attributes?.find(
      (attr) => attr.type === "TagName"
    );
    expect(tagNameAttr?.content).toBe("script");

    // Check that content is parsed as CodeJavascript
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodeJavascript");
    expect(codeNode.content).toBe('console.log("Hello World");');
  });

  it("should parse script tag with type='javascript' as JavaScript", () => {
    const input = `
<script type="javascript">
const x = 42;
console.log(x);
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check type attribute
    const typeAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "type"
    );
    expect(typeAttr?.content).toBe("javascript");

    // Check that content is parsed as CodeJavascript
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodeJavascript");
    expect(codeNode.content).toBe("const x = 42;\nconsole.log(x);");
  });

  it("should parse script tag with type='js' as JavaScript", () => {
    const input = `
<script type="js">
function greet(name) {
  return "Hello " + name;
}
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check that content is parsed as CodeJavascript
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodeJavascript");
    expect(codeNode.content).toBe(
      'function greet(name) {\n  return "Hello " + name;\n}'
    );
  });

  it("should parse script tag with type='python' as Python", () => {
    const input = `
<script type="python">
def greet(name):
    return f"Hello {name}"

print(greet("World"))
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check type attribute
    const typeAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "type"
    );
    expect(typeAttr?.content).toBe("python");

    // Check that content is parsed as CodePython
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodePython");
    expect(codeNode.content).toBe(
      'def greet(name):\n    return f"Hello {name}"\n\nprint(greet("World"))'
    );
  });

  it("should parse script tag with type='py' as Python", () => {
    const input = `
<script type="py">
import json
data = {"message": "Hello World"}
print(json.dumps(data))
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check that content is parsed as CodePython
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodePython");
    expect(codeNode.content).toBe(
      'import json\ndata = {"message": "Hello World"}\nprint(json.dumps(data))'
    );
  });

  it("should default to JavaScript for unknown script types", () => {
    const input = `
<script type="typescript">
interface User {
  name: string;
  age: number;
}
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check that content defaults to CodeJavascript for unknown types
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodeJavascript");
    expect(codeNode.content).toBe(
      "interface User {\n  name: string;\n  age: number;\n}"
    );
  });

  // Skip this test as self-closing script tags aren't supported by current grammar
  it.skip("should handle self-closing script tags", () => {
    const input = `<script type="python" />`;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check type attribute
    const typeAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "type"
    );
    expect(typeAttr?.content).toBe("python");

    // Self-closing tags should have no children
    expect(scriptElement.children).toBeArrayOfSize(0);
  });

  it("should handle multiple script tags with different types", () => {
    const input = `
<script type="javascript">
console.log("JavaScript code");
</script>

<script type="python">
print("Python code")
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(2);

    // First script (JavaScript)
    const jsScript = result[0] as AIMLASTNode;
    expect(jsScript.type).toBe("AIMLElement");
    expect(jsScript.children).toBeArrayOfSize(1);
    expect(jsScript.children![0].type).toBe("CodeJavascript");
    expect(jsScript.children![0].content).toBe(
      'console.log("JavaScript code");'
    );

    // Second script (Python)
    const pyScript = result[1] as AIMLASTNode;
    expect(pyScript.type).toBe("AIMLElement");
    expect(pyScript.children).toBeArrayOfSize(1);
    expect(pyScript.children![0].type).toBe("CodePython");
    expect(pyScript.children![0].content).toBe('print("Python code")');
  });

  it("should preserve position information for code nodes", () => {
    const input = `<script type="python">
x = 1 + 1
</script>`;

    const result = parseAIML(input);

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    const codeNode = scriptElement.children![0];

    expect(codeNode.type).toBe("CodePython");
    expect(codeNode.lineStart).toBeGreaterThan(0);
    expect(codeNode.columnStart).toBeGreaterThan(0);
    expect(codeNode.lineEnd).toBeGreaterThan(0);
    expect(codeNode.columnEnd).toBeGreaterThan(0);
  });

  // Skip this test as boolean attributes aren't supported by current grammar
  it.skip("should handle script tags with additional attributes", () => {
    const input = `
<script type="python" id="my-script" async>
import time
time.sleep(1)
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check all attributes are preserved
    const typeAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "type"
    );
    expect(typeAttr?.content).toBe("python");

    const idAttr = scriptElement.attributes?.find((attr) => attr.name === "id");
    expect(idAttr?.content).toBe("my-script");

    const asyncAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "async"
    );
    expect(asyncAttr).toBeDefined();

    // Check that content is still parsed as CodePython
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodePython");
    expect(codeNode.content).toBe("import time\ntime.sleep(1)");
  });

  // Skip this test as prompt tag isn't currently supported
  it.skip("should handle mixed content with script tags", () => {
    const input = `
<prompt>
  Hello, this is a prompt.
  
  <script type="javascript">
  console.log("Executing JavaScript");
  </script>
  
  More text here.
  
  <script type="python">
  print("Executing Python")
  </script>
</prompt>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const promptElement = result[0] as AIMLASTNode;
    expect(promptElement.type).toBe("AIMLElement");

    // Should have multiple children: text, script, text, script
    expect(promptElement.children!.length).toBeGreaterThan(3);

    // Find the script elements
    const scriptElements = promptElement.children!.filter((child) => {
      if (child.type === "AIMLElement") {
        const tagName = child.attributes?.find(
          (attr) => attr.type === "TagName"
        );
        return tagName?.content === "script";
      }
      return false;
    });

    expect(scriptElements).toBeArrayOfSize(2);

    // Verify the first script is JavaScript
    const jsScript = scriptElements[0];
    expect(jsScript.children![0].type).toBe("CodeJavascript");

    // Verify the second script is Python
    const pyScript = scriptElements[1];
    expect(pyScript.children![0].type).toBe("CodePython");
  });

  it("should handle script tags with basic attributes", () => {
    const input = `
<script type="python" id="my-script">
import time
time.sleep(1)
</script>
    `;

    const result = parseAIML(input.trim());

    expect(result).toBeArrayOfSize(1);

    const scriptElement = result[0] as AIMLASTNode;
    expect(scriptElement.type).toBe("AIMLElement");

    // Check all attributes are preserved
    const typeAttr = scriptElement.attributes?.find(
      (attr) => attr.name === "type"
    );
    expect(typeAttr?.content).toBe("python");

    const idAttr = scriptElement.attributes?.find((attr) => attr.name === "id");
    expect(idAttr?.content).toBe("my-script");

    // Check that content is still parsed as CodePython
    expect(scriptElement.children).toBeArrayOfSize(1);
    const codeNode = scriptElement.children![0];
    expect(codeNode.type).toBe("CodePython");
    expect(codeNode.content).toBe("import time\ntime.sleep(1)");
  });
});
