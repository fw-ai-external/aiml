import { describe, expect, it } from "bun:test";
import { VFile } from "vfile";
import { parseFilesToAIMLNodes } from "../src";
import { readFileSync } from "fs";
import { join } from "path";

describe("Complex Attribute Expressions Integration Test", () => {
  it("should parse the complex-attributes.mdx file correctly", async () => {
    // Read the test MDX file
    const mdxContent = readFileSync(
      join(__dirname, "complex-attributes.mdx"),
      "utf-8"
    );

    const testFile = new VFile({
      path: "complex-attributes.mdx",
      value: mdxContent,
    });

    const result = await parseFilesToAIMLNodes([testFile], {
      filePath: "complex-attributes.mdx",
      files: [],
    });

    expect(result.nodes).not.toBeNull();
    expect(result.nodes).toBeArrayOfSize(1);
    expect(result.nodes[0].tag).toBe("workflow");

    // Test array expressions
    const emptyArrayData = findElementByAttributeValue(
      result.nodes[0],
      "id",
      "emptyArray"
    );
    expect(emptyArrayData).not.toBeUndefined();
    expect(emptyArrayData?.attributes?.value).toEqual([]);

    const filledArrayData = findElementByAttributeValue(
      result.nodes[0],
      "id",
      "filledArray"
    );
    expect(filledArrayData).not.toBeUndefined();
    expect(filledArrayData?.attributes?.value).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);

    // Test object expressions
    const simpleObjectData = findElementByAttributeValue(
      result.nodes[0],
      "id",
      "simpleObject"
    );
    expect(simpleObjectData).not.toBeUndefined();
    expect(simpleObjectData?.attributes?.value).toEqual({
      name: "John",
      age: 30,
    });


    // Test nested expressions
    const nestedObjectData = findElementByAttributeValue(
      result.nodes[0],
      "id",
      "nestedObject"
    );
    expect(nestedObjectData).not.toBeUndefined();
    expect(nestedObjectData?.attributes?.value).toEqual({
      user: {
        name: "John",
        details: {
          age: 30,
          role: "admin",
        },
      },
    });

    // Test mixed types in array
    const mixedTypesData = findElementByAttributeValue(
      result.nodes[0],
      "id",
      "mixedTypes"
    );
    expect(mixedTypesData).not.toBeUndefined();
    expect(mixedTypesData?.attributes?.value).toEqual("::FUNCTION-EXPRESSION::(context) => { const ctx = context; return [\n  { id: 1, name: \"Task 1\", completed: false },\n  { id: 2, name: \"Task 2\", completed: true },\n  { id: 3, function: \"filtered\" }\n]}");
  });
});

// Helper function to find an element by tag
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

// Helper function to find an element by attribute value
function findElementByAttributeValue(
  node: any,
  attrName: string,
  attrValue: string
): any {
  if (node.attributes && node.attributes[attrName] === attrValue) {
    return node;
  }

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findElementByAttributeValue(child, attrName, attrValue);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
