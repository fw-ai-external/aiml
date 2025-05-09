import type { MDXToAIMLOptions, MDXParseResult } from "./types.js";
import { VFile } from "vfile";
import { DiagnosticSeverity } from "@aiml/shared";
import { transformToAIMLNodes } from "./astToElementTree.js";
import {
  astToElements,
  healFlowOrError,
  addAllTransitions,
} from "./astToElements/index.js";
import { stringToAST } from "./ast/index.js";

/**
 * Parse MDX content into AIML nodes with diagnostics
 * @param content The MDX content to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export function parse(
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
  return parseFilesToAIMLNodes(files, options);
}

/**
 * Parse multiple MDX files into AIML nodes with diagnostics
 * This is used when dealing with files that import each other
 * @param files Array of VFiles to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export async function parseFilesToAIMLNodes(
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
    const { ast, diagnostics: astDiagnostics } = await stringToAST(
      mainFile.value as string
    );

    if (ast.length === 0) {
      if (astDiagnostics.size > 0) {
        return {
          nodes: [],
          diagnostics: [
            {
              message: "Failed to parse AIML",
              severity: DiagnosticSeverity.Error,
              code: "AIML005",
              source: "aiml-parser",
              range: {
                start: { line: 1, column: 1 },
                end: { line: 1, column: 1 },
              },
            },
          ],
          datamodel: {},
        };
      }

      return {
        nodes: [],
        diagnostics: Array.from(astDiagnostics),
        datamodel: {},
      };
    }

    // Transform the AST to AIML nodes and datamodel
    const {
      nodes: intermediateNodes,
      diagnostics: transformDiagnostics,
      datamodel,
    } = transformToAIMLNodes(ast, options);

    if (intermediateNodes.length === 0) {
      return {
        nodes: [],
        diagnostics: [
          ...Array.from(astDiagnostics),
          ...Array.from(transformDiagnostics),
        ],
        datamodel: {},
      };
    }

    // Process the intermediate nodes into a final SerializedBaseElement tree
    // that's ready for hydration by the runtime
    const finalNodes = astToElements(intermediateNodes);

    // Apply the healFlowOrError phase to ensure proper workflow structure and transitions
    const healedNodes = healFlowOrError(finalNodes);

    // Apply addAllTransitions to ensure all states have proper transitions
    const nodesWithTransitions = addAllTransitions(healedNodes);

    return {
      nodes: nodesWithTransitions,
      diagnostics: [
        ...Array.from(astDiagnostics),
        ...Array.from(transformDiagnostics),
      ],
      datamodel,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      nodes: [],
      diagnostics: [
        {
          message: `Error parsing AIML prompt: ${errorMessage}`,
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
