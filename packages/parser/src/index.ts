import { type Diagnostic, DiagnosticSeverity } from '@fireworks/shared';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { VFile } from 'vfile';

import { parseWithRecursiveRecovery } from './parser/recovery-parsing.js';
import { addAllTransitions, healFlowOrError, processFinalStructure } from './parser/structure-processing.js';
import { transformToAIMLNodes } from './parser/transform-nodes.js';
import type { MDXParseResult, MDXToAIMLOptions } from './types.js';
import { resetKeyCounter } from './utils/helpers.js';

/**
 * Parse MDX content into AIML nodes with diagnostics
 * @param content The MDX content to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export async function parseMDXToAIML(content: string, options: MDXToAIMLOptions = {}): Promise<MDXParseResult> {
  // Reset key counter for each parse
  resetKeyCounter();

  // Set default options
  const opts = {
    generateIds: true,
    ...options,
  };

  // Create a unified processor for MDX
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdxFrontmatter, { name: 'frontmatter' })
    .use(remarkMdx);

  const { ast, diagnostics, file } = await parseWithRecursiveRecovery(content, {
    filePath: options.filePath || 'index.aiml',
    processor,
  });

  if (!ast) {
    return { nodes: [], diagnostics };
  }

  await processor.run(ast, file);

  // Process warnings from the parser
  if (file.messages.length > 0) {
    for (const message of file.messages) {
      diagnostics.push({
        message: message.reason,
        severity: DiagnosticSeverity.Warning,
        code: message.ruleId || 'AIML001',
        source: 'aiml-parser',
        range: {
          start: {
            line: message.line || 1,
            column: message.column || 1,
          },
          end: {
            line: message.line || 1,
            column: (message.column || 1) + 1,
          },
        },
      });
    }
  }

  // Transform the AST to AIML nodes
  const intermediateNodes = transformToAIMLNodes(ast, opts, diagnostics);

  // Process the intermediate nodes into a final SerializedBaseElement tree
  // that's ready for hydration by the runtime
  const finalNodes = processFinalStructure(intermediateNodes, diagnostics);

  // Apply the healFlowOrError phase to ensure proper workflow structure and transitions
  const healedNodes = healFlowOrError(finalNodes, diagnostics);

  // Apply addAllTransitions to ensure all states have proper transitions
  const nodesWithTransitions = addAllTransitions(healedNodes, diagnostics);

  return {
    nodes: nodesWithTransitions,
    diagnostics,
  };
}

/**
 * Parse multiple MDX files into AIML nodes with diagnostics
 * This is used when dealing with files that import each other
 * @param files Array of VFiles to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export async function parseMDXFilesToAIML(files: VFile[], options: MDXToAIMLOptions = {}): Promise<MDXParseResult> {
  if (!files || files.length === 0) {
    return { nodes: [], diagnostics: [] };
  }

  // If there's only one file, use the single-file parser
  if (files.length === 1) {
    return parseMDXToAIML(files[0].value as string, {
      ...options,
      filePath: files[0].path,
      files,
    });
  }

  // For multiple files, we need to process them together
  // Start with the first file as the "main" file
  const mainFile = files[0];
  const diagnostics: Diagnostic[] = [];

  try {
    // Parse the main file, providing all files for import resolution
    const result = await parseMDXToAIML(mainFile.value as string, {
      ...options,
      filePath: mainFile.path,
      files,
    });

    // Combine diagnostics
    diagnostics.push(...result.diagnostics);

    return {
      nodes: result.nodes,
      diagnostics,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    diagnostics.push({
      message: `Error parsing multiple files: ${errorMessage}`,
      severity: DiagnosticSeverity.Error,
      code: 'AIML005',
      source: 'aiml-parser',
      range: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
    });

    return { nodes: [], diagnostics };
  }
}
