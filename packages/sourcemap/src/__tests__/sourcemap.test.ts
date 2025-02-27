import { generator, consumer } from "../index";
// Jest globals are automatically available in test files

describe("sourcemap", () => {
  const sourceCode = `function add(a, b) {
  return a + b;
}`;

  const distributedCode = `function add(a,b){return a+b}`;
  const fileName = "add.js";

  describe("generator", () => {
    it("should generate a source map from source and distribution code", () => {
      const sourceMap = generator(sourceCode, distributedCode, fileName);

      // Verify it's valid JSON
      expect(() => JSON.parse(sourceMap)).not.toThrow();

      // Verify basic structure
      const parsed = JSON.parse(sourceMap);
      expect(parsed.version).toBe(3);
      expect(parsed.file).toBe(fileName);
      expect(Array.isArray(parsed.sources)).toBe(true);
      expect(Array.isArray(parsed.sourcesContent)).toBe(true);
      expect(typeof parsed.mappings).toBe("string");
    });

    it("should use a default file name if none is provided", () => {
      const sourceMap = generator(sourceCode, distributedCode);
      const parsed = JSON.parse(sourceMap);
      expect(parsed.file).toBe("__fakename");
    });
  });

  describe("consumer", () => {
    let sourceMap: string;
    let sourceMapConsumer: ReturnType<typeof consumer>;

    beforeEach(() => {
      sourceMap = generator(sourceCode, distributedCode, fileName);
      sourceMapConsumer = consumer(sourceMap);
    });

    it("should create a consumer from a source map", () => {
      expect(sourceMapConsumer).toBeDefined();
      expect(typeof sourceMapConsumer.getOriginal).toBe("function");
      expect(typeof sourceMapConsumer.getGenerated).toBe("function");
    });

    it("should get original position for a generated position", () => {
      const position = sourceMapConsumer.getOriginal({
        line: 1,
        column: 10,
      });

      // Since our implementation is a mock, we're just checking the structure
      expect(position).toHaveProperty("line");
      expect(position).toHaveProperty("column");
      expect(position).toHaveProperty("source");
      expect(position).toHaveProperty("name");
    });

    it("should get generated position for an original position", () => {
      const position = sourceMapConsumer.getGenerated({
        line: 2,
        column: 5,
        file: fileName,
      });

      // Since our implementation is a mock, we're just checking the structure
      expect(position).toHaveProperty("line");
      expect(position).toHaveProperty("column");
    });
  });
});
