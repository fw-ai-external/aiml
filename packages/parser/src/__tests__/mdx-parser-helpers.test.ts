import { MDXParser } from "../mdx";
import { describe, test, expect } from "bun:test";

// Extend MDXParser to expose private helper functions for testing
class TestMDXParser extends MDXParser {
  public testExtractTagName(source: string): string {
    return this.extractTagName(source);
  }
  public testExtractId(source: string): string {
    return this.extractId(source);
  }
  public testExtractAttributes(source: string): Record<string, string> {
    return this.extractAttributes(source);
  }
  public testExtractChildren(source: string): string[] {
    // Return the tags of the children for simplicity
    return this.extractChildren(source).map((child) => child.tag);
  }
}

describe("MDXParser Helper Methods", () => {
  const parser = new TestMDXParser(
    "<Test id='123' attr='value'><Action id='a1'/></Test>"
  );

  test("extractTagName should return correct tag", () => {
    expect(parser.testExtractTagName("<Test id='123'>")).toBe("Test");
  });

  test("extractId should return provided id", () => {
    expect(parser.testExtractId("<Test id='456'>")).toBe("456");
  });

  test("extractAttributes should extract attributes", () => {
    const attrs = parser.testExtractAttributes(
      "<Test id='789' attr='value' flag='true'>"
    );
    expect(attrs.id).toBe("789");
    expect(attrs.attr).toBe("value");
    expect(attrs.flag).toBe("true");
  });

  test("extractChildren should return child tag names", () => {
    // when source has nested <Action id='a1'>
    expect(
      parser.testExtractChildren("<Test><Action id='a1'/></Test>")
    ).toEqual(["Action"]);
  });
});
