import type { MDXToAIMLOptions, MDXParseResult } from "./types.js";
import { VFile } from "vfile";
import { DiagnosticSeverity } from "@fireworks/shared";
import { safeParse } from "./safeParse/index.js";
import { transformToAIMLNodes } from "./safeParse/astToElementTree.js";
import {
  addAllTransitions,
  healFlowOrError,
  healInvalidElementTree,
} from "./safeParse/healInvalidElementTree.js";

/**
 * Parse MDX content into AIML nodes with diagnostics
 * @param content The MDX content to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export function parseMDXToAIML(
  content: string,
  options: MDXToAIMLOptions = {
    maxIterations: 10,
  }
): Promise<MDXParseResult> {
  const files = [
    new VFile({
      value: content,
      path: options.filePath || "index.aiml",
    }),
  ];
  return parseMDXFilesToAIML(files, options);
}

/**
 * Parse multiple MDX files into AIML nodes with diagnostics
 * This is used when dealing with files that import each other
 * @param files Array of VFiles to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export async function parseMDXFilesToAIML(
  files: VFile[],
  options: MDXToAIMLOptions = {
    maxIterations: 10,
  }
): Promise<MDXParseResult> {
  if (!files || files.length === 0) {
    return { nodes: [], diagnostics: [], datamodel: {} };
  }

  // For multiple files, we need to process them together
  // Start with the first file as the "main" file
  const mainFile = files[0];

  try {
    // Parse the main file, providing all files for import resolution
    const result = await safeParse(mainFile.value as string, {
      ...options,
      filePath: mainFile.path,
      files,
    });

    // Transform the AST to AIML nodes and datamodel
    const {
      nodes: intermediateNodes,
      diagnostics: transformDiagnostics,
      datamodel,
    } = transformToAIMLNodes(result.ast, options, result.diagnostics);

    // Process the intermediate nodes into a final SerializedBaseElement tree
    // that's ready for hydration by the runtime
    const finalNodes = healInvalidElementTree(
      intermediateNodes,
      transformDiagnostics
    );

    // Apply the healFlowOrError phase to ensure proper workflow structure and transitions
    const healedNodes = healFlowOrError(finalNodes, transformDiagnostics);

    // Apply addAllTransitions to ensure all states have proper transitions
    const nodesWithTransitions = addAllTransitions(
      healedNodes,
      transformDiagnostics
    );

    return {
      nodes: nodesWithTransitions,
      diagnostics: Array.from(result.diagnostics),
      datamodel,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      nodes: [],
      diagnostics: [
        {
          message: `Error parsing multiple files: ${errorMessage}`,
          severity: DiagnosticSeverity.Error,
          code: "AIML005",
          source: "aiml-parser",
          range: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 2 },
          },
        },
      ],
    };
  }
}
