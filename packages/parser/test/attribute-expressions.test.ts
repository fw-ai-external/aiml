import { describe, expect, it } from "bun:test";
import { VFile } from "vfile";
import { parseMDXFilesToAIML } from "../src";

describe("Attribute Expression Tests", () => {
  it("should support array expressions in attributes", async () => {
    const input = `
<data id="order" value={[]} />
    `;

    const testFile = new VFile({
      path: "test.mdx",
      value: input,
    });

    const result = await parseMDXFilesToAIML([testFile], {
      filePath: "test.mdx",
      files: [],
      preserveCustomTags: true,
    });

    expect(result.nodes).not.toBeNull();
    expect(result.nodes).toBeArrayOfSize(1);
    expect(result.nodes[0].tag).toBe("workflow");

    // Find the data element
    const dataElement = findElementByTag(result.nodes[0], "data");
    expect(dataElement).not.toBeUndefined();
    expect(dataElement?.attributes?.id).toBe("order");
    expect(dataElement?.attributes?.value).toBe("${array:[]}");
  });

  it("should support object expressions in attributes", async () => {
    const input = `
<data id="user" value={{ name: "John", age: 30 }} />
    `;

    const testFile = new VFile({
      path: "test.mdx",
      value: input,
    });

    const result = await parseMDXFilesToAIML([testFile]);

    expect(result.nodes).not.toBeNull();
    expect(result.nodes).toBeArrayOfSize(1);

    // Find the data element
    const dataElement = findElementByTag(result.nodes[0], "data");
    expect(dataElement).not.toBeUndefined();
    expect(dataElement?.attributes?.id).toBe("user");
    expect(dataElement?.attributes?.value).toBe(
      '${object:{ name: "John", age: 30 }}'
    );
  });

  it("should support function expressions in attributes", async () => {
    const input = `
<forEach items={(ctx) => ctx.lastElement.actions} var="currentAction" />
    `;

    const testFile = new VFile({
      path: "test.mdx",
      value: input,
    });

    const result = await parseMDXFilesToAIML([testFile]);

    expect(result.nodes).not.toBeNull();
    expect(result.nodes).toBeArrayOfSize(1);

    // Find the forEach element - note that the parser normalizes tag names to lowercase
    const forEachElement = findElementByTag(result.nodes[0], "foreach");
    expect(forEachElement).not.toBeUndefined();
    expect(forEachElement?.attributes?.var).toBe("currentAction");
    expect(forEachElement?.attributes?.items).toBe(
      "${function:(ctx) => ctx.lastElement.actions}"
    );
  });

  it("should handle nested complex expressions", async () => {
    const input = `
<data id="complex" value={[{ title: "Task 1", completed: false }, { title: "Task 2", completed: true }]} />
    `;

    const testFile = new VFile({
      path: "test.mdx",
      value: input,
    });

    const result = await parseMDXFilesToAIML([testFile]);

    expect(result.nodes).not.toBeNull();
    expect(result.nodes).toBeArrayOfSize(1);

    // Find the data element
    const dataElement = findElementByTag(result.nodes[0], "data");
    expect(dataElement).not.toBeUndefined();
    expect(dataElement?.attributes?.id).toBe("complex");
    expect(dataElement?.attributes?.value).toBe(
      '${array:[{ title: "Task 1", completed: false }, { title: "Task 2", completed: true }]}'
    );
  });
});

// Helper function to recursively find an element by tag
function findElementByTag(node: any, tagName: string): any {
  if (node.tag === tagName) {
    return node;
  }

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findElementByTag(child, tagName);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
