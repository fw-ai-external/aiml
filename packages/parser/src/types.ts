import type {
  Diagnostic,
  SerializedBaseElement,
  DataModel,
} from "@aiml/shared";
import type { VFile } from "vfile";

/**
 * Options for MDX to AIML conversion
 */
export interface MDXToAIMLOptions {
  /**
   * Path to the file being processed
   */
  filePath?: string;

  /**
   * Maximum number of iterations for error correction
   */
  maxIterations?: number;

  /**
   * Array of VFiles for imported files
   */
  files?: VFile[];

  /**
   * Whether to generate IDs for elements that don't have them
   */
  generateIds?: boolean;

  /**
   * Whether to enable strict mode for validation
   * When enabled, warnings will be generated for unknown elements
   */
  strict?: boolean;

  /**
   * Whether to preserve custom tags as elements
   * When true, unknown elements will be preserved in the AST
   * When false (default), unknown elements will be converted to LLM elements
   */
  preserveCustomTags?: boolean;
}

// Result of parsing MDX
export interface MDXParseResult {
  nodes: SerializedBaseElement[];
  diagnostics: Diagnostic[];
  datamodel?: Record<string, DataModel>;
}
