import { IBaseElement } from "@fireworks/types";
import { MDXParser } from "./index";
import { MDXParseError, MDXParseResult } from "./types";
// @ts-ignore - No types available for js-yaml
import yaml from "js-yaml";

interface AimlParseResult extends MDXParseResult {
  mode: "workflow" | "non-workflow";
  systemPrompt?: string;
  frontmatter?: Record<string, any>;
  success: boolean;
}

/**
 * AimlParser extends the base MDXParser to provide AIML-specific functionality
 * It focuses on correctly identifying AIML elements and handling both
 * workflow and non-workflow mode
 */
export class AimlParser {
  /**
   * Parses AIML content and determines its mode (workflow or non-workflow)
   */
  static parse(content: string): AimlParseResult {
    // Use existing MDXParser for initial parsing
    const parser = new MDXParser();
    const result = parser.parse(content);

    // Initialize errors array if it's undefined
    if (!result.errors) {
      result.errors = [];
    }

    const parseResult: AimlParseResult = {
      ast: result.ast,
      errors: Array.isArray(result.errors) ? result.errors : [],
      mode: "non-workflow", // Default
      success:
        Array.isArray(result.errors) &&
        result.errors.length === 0 &&
        result.ast !== null,
    };

    // If parsing failed completely (no AST), return early
    if (!result.ast) {
      return parseResult;
    }

    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
      try {
        parseResult.frontmatter = yaml.load(frontmatterMatch[1]) as Record<
          string,
          any
        >;

        // Also attach frontmatter to the AST
        if (parseResult.frontmatter) {
          (result.ast as any).attributes = {
            ...(result.ast.attributes || {}),
            frontmatter: parseResult.frontmatter,
          };
        }
      } catch (error) {
        if (!Array.isArray(parseResult.errors)) {
          parseResult.errors = [];
        }

        parseResult.errors.push(
          new MDXParseError(
            `Error parsing frontmatter: ${(error as Error).message}`,
            1,
            1,
            "frontmatter_error"
          )
        );
        parseResult.success = false;
      }
    }

    // Determine AIML mode based on root element
    if (result.ast.tag === "workflow") {
      parseResult.mode = "workflow";
    } else if (this.isTopLevelElement(result.ast)) {
      parseResult.mode = "non-workflow";
    }

    // Extract system prompt (text before the first AIML element)
    // Do this regardless of the mode to ensure we always capture it
    const firstElementMatch = content.match(
      /<(workflow|state|parallel|final)[^>]*>/i
    );
    if (firstElementMatch && firstElementMatch.index !== undefined) {
      const contentBeforeFirstElement = content.substring(
        0,
        firstElementMatch.index
      );

      // Remove frontmatter from the system prompt if present
      let systemPrompt = contentBeforeFirstElement;
      if (frontmatterMatch) {
        systemPrompt = systemPrompt.replace(frontmatterMatch[0], "").trim();
      }

      if (systemPrompt) {
        parseResult.systemPrompt = systemPrompt.trim();

        // Use type assertion to modify the read-only attributes
        (result.ast as any).attributes = {
          ...(result.ast.attributes || {}),
          systemPrompt: systemPrompt.trim(),
        };
      }
    }

    return parseResult;
  }

  /**
   * Checks if an element is a valid top-level AIML element
   */
  static isTopLevelElement(element: IBaseElement): boolean {
    const topLevelTags = ["state", "parallel", "final"];
    return topLevelTags.includes(element.tag);
  }

  /**
   * Gets the workflow type based on the workflow element's attributes
   */
  static getWorkflowType(
    workflowElement: IBaseElement
  ): "standard" | "sequential" {
    if (workflowElement.tag !== "workflow") {
      return "standard";
    }

    // Check for runInOrder attribute (could be boolean or string)
    const runInOrder = workflowElement.attributes?.runInOrder;

    // If runInOrder is truthy (true, "true", "yes", etc.)
    if (
      runInOrder === true ||
      runInOrder === "true" ||
      runInOrder === "yes" ||
      runInOrder === 1 ||
      runInOrder === "1"
    ) {
      return "sequential";
    }

    return "standard";
  }
}
