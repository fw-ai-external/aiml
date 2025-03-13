import { VFile } from "vfile";
import { SerializedBaseElement, Diagnostic } from "@fireworks/types";

// Options for parsing MDX to AIML nodes
export interface MDXToAIMLOptions {
  filePath?: string;
  generateIds?: boolean;
  files?: VFile[]; // Add files array for import resolution
}

// Result of parsing MDX
export interface MDXParseResult {
  nodes: SerializedBaseElement[];
  diagnostics: Diagnostic[];
}
