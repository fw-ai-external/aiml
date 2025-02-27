import { parse as parseYAML } from "yaml";
import { JSONSchemaType } from "ajv";

/**
 * Core MDXLD interface for parsed MDX documents with YAML-LD frontmatter
 */

export interface AIMLFile {
  name?: string;
  /**
   * Props schema supporting both:
   * 1. JSON Schema objects for complex types
   * 2. Shorthand notation for simple types:
   *    - Basic: string, number, boolean
   *    - Optional: string?, number?, boolean?
   *    - Arrays: string[], number[], boolean[]
   */
  props?: Record<
    string,
    | "string"
    | "number"
    | "boolean"
    | "string?"
    | "number?"
    | "boolean?"
    | "string[]"
    | "number[]"
    | "boolean[]"
    | Record<string, JSONSchemaType<any>> // For JSON Schema objects
  >;
  content: string;
}

const AIMLFrontmatterProperties: (keyof Omit<AIMLFile, "content">)[] = [
  "props",
  "name",
] as const;

/**
 * Special properties that should be extracted to root level
 */
export type FrontmatterProperty = (typeof AIMLFrontmatterProperties)[number];
/**
 * Options for parsing MDX documents
 */
export interface ParseOptions {
  /** Whether to parse the content as AST */
  ast?: boolean;
}

function extractFrontmatter(mdx: string): {
  frontmatter: string;
  content: string;
} {
  // Check for proper frontmatter delimiters
  if (!mdx.startsWith("---\n")) {
    return { frontmatter: "", content: mdx };
  }

  // Find the closing delimiter
  const endMatch = mdx.slice(4).match(/\n---\n/);
  if (!endMatch || typeof endMatch.index !== "number") {
    throw new Error("Failed to parse YAML frontmatter");
  }

  // Extract frontmatter and content
  const endIndex = endMatch.index;
  const frontmatter = mdx.slice(4, 4 + endIndex).trim();
  const content = mdx.slice(4 + endIndex + 5);

  if (!frontmatter) {
    return { frontmatter: "", content: mdx };
  }

  return { frontmatter, content };
}

export function parseMDXFrontmatter(mdx: string): AIMLFile {
  const { frontmatter, content } = extractFrontmatter(mdx);

  if (!frontmatter) {
    return {
      props: {},
      name: "",
      content,
    };
  }

  try {
    // Use strict mode for YAML parsing to catch invalid structures
    const yaml = parseYAML(frontmatter, {
      strict: true,
      schema: "core",
      logLevel: "error",
    });

    if (
      typeof yaml !== "object" ||
      yaml === null ||
      Array.isArray(yaml) ||
      Object.keys(yaml).length === 0
    ) {
      throw new Error("Failed to parse YAML frontmatter");
    }

    return {
      ...yaml,
      content,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
