import { Processor, unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import { VFile } from "vfile";
import { Node } from "unist";
import {
  SerializedBaseElement,
  type Diagnostic,
  type DiagnosticPosition,
  CommentNode,
  TextNode,
  ExpressionNode,
  DiagnosticSeverity,
} from "@fireworks/types";
import { Root } from "mdast";

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

// Counter for generating unique keys
let keyCounter = 0;

/**
 * Generate a unique key for an AIML node
 */
function generateKey(): string {
  return `aiml-${++keyCounter}`;
}

/**
 * Parse MDX content into AIML nodes with diagnostics
 * @param content The MDX content to parse
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics
 */
export async function parseMDXToAIML(
  content: string,
  options: MDXToAIMLOptions = {}
): Promise<MDXParseResult> {
  // Reset key counter for each parse
  keyCounter = 0;

  // Set default options
  const opts = {
    generateIds: true,
    ...options,
  };

  // Create a unified processor for MDX
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdxFrontmatter, { name: "frontmatter" })
    .use(remarkMdx);

  const { ast, diagnostics, file } = await parseWithRecursiveRecovery(content, {
    filePath: options.filePath || "index.aiml",
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
        code: message.ruleId || "AIML001",
        source: "aiml-parser",
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

  return {
    nodes: finalNodes,
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
export async function parseMDXFilesToAIML(
  files: VFile[],
  options: MDXToAIMLOptions = {}
): Promise<MDXParseResult> {
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
      code: "AIML005",
      source: "aiml-parser",
      range: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
    });

    return { nodes: [], diagnostics };
  }
}

/**
 * Parses MDX content recursively, handling missing closing tags and removing problematic lines
 * @param content The MDX content to parse
 * @param options Options including file path
 * @returns Object containing parsed nodes and diagnostics
 */
async function parseWithRecursiveRecovery(
  content: string,
  options: {
    filePath: string;
    processor: Processor<Root, Root, Root, undefined, undefined>;
  }
): Promise<{
  ast: Root | null;
  diagnostics: Diagnostic[];
  file: VFile;
}> {
  // Initialize diagnostics array
  const diagnostics: Diagnostic[] = [];

  // Keep track of our content through each iteration
  let currentContent = content;

  // Track number of attempts to prevent infinite loops
  let attempts = 0;
  const MAX_ATTEMPTS = 100;
  let file = new VFile({ value: currentContent, path: options.filePath });

  // Keep attempting to parse until we succeed or hit max attempts
  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    try {
      // Create a file instance
      file = new VFile({ value: currentContent, path: options.filePath });

      // Parse the content to get the AST
      const ast = options.processor.parse(file);

      // If we reach here, parsing succeeded
      return { ast, diagnostics, file };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Extract error position information if available
      let errorPosition = { line: 1, column: 1 };
      if (error instanceof Error && "loc" in error) {
        const loc = (error as any).loc;
        if (
          loc &&
          typeof loc.line === "number" &&
          typeof loc.column === "number"
        ) {
          errorPosition = { line: loc.line, column: loc.column };
        }
      }

      // Log the error
      console.error(`Error parsing AIML at ${options.filePath}: ${error}
Offending code: ${currentContent.split("\n")[errorPosition.line - 1]}
`);

      // Add to diagnostics
      diagnostics.push({
        message: errorMessage,
        severity: DiagnosticSeverity.Error,
        code: "AIML002",
        source: "aiml-parser",
        range: {
          start: { line: errorPosition.line, column: errorPosition.column },
          end: { line: errorPosition.line, column: errorPosition.column + 1 },
        },
      });

      // Check for unexpected closing tag errors
      const unexpectedClosingTagMatch = errorMessage.match(
        /Unexpected closing tag `<\/(\w+)>`/i
      );
      if (unexpectedClosingTagMatch) {
        const tagName = unexpectedClosingTagMatch[1];
        console.log(`Detected unexpected closing tag: </${tagName}>`);

        // Find and remove the unexpected closing tag
        const unexpectedTag = `</${tagName}>`;
        currentContent = currentContent.replace(unexpectedTag, "");

        console.log(
          `Removed unexpected closing tag </${tagName}> from content`
        );
        continue;
      }

      // Check if the error involves a missing closing tag
      const closingTagMatch = errorMessage.match(/closing tag for `<(\w+)>`/i);
      // Check for unexpected end of file errors related to unclosed tags
      const unclosedTagMatch = errorMessage.match(
        /Unexpected end of file.*or the end of the tag/i
      );
      if (unclosedTagMatch) {
        console.log("Detected unclosed tag, appending '>' to content");
        // Find the line with unclosed tag (containing '</' without a following '>')
        const contentLines = currentContent.split("\n");
        let fixedContent = false;

        for (let i = 0; i < contentLines.length; i++) {
          const line = contentLines[i];
          // Look for a '</' that isn't followed by a '>' before another '<'
          const match = line.match(/(<\/[a-zA-Z0-9]*(?!\>)(?=[^<]*$))/);
          if (match) {
            // Trim the line and append '>' to it
            contentLines[i] = line.trim() + ">";
            fixedContent = true;
            break;
          }
        }

        if (fixedContent) {
          currentContent = contentLines.join("\n");
        } else {
          // Fallback if we can't locate the line
          currentContent += ">";
        }
        console.log("Appended missing '>' to the offending line");
        continue;
      }

      if (closingTagMatch) {
        // Extract the tag name from the error message
        const tagName = closingTagMatch[1];
        console.log(`Detected missing closing tag: </${tagName}>`);

        // Append the missing closing tag to the content
        currentContent += `\n</${tagName}>`;

        // Log the recovery action
        console.log(`Appended missing tag </${tagName}> to content`);
      } else {
        // Check if the error mentions a tag
        const tagMentionMatch = errorMessage.includes(" tag ");

        const contentLines = currentContent.split("\n");
        if (errorPosition.line <= contentLines.length) {
          if (tagMentionMatch) {
            // Escape < and > on the offending line
            const line = contentLines[errorPosition.line - 1];

            console.log("line" + line);

            contentLines[errorPosition.line - 1] = line
              .trimEnd()
              .replace(/</g, "\\<")
              .replace(/>/g, "\\>");
          } else {
            // If it's not a tag-related error, replace the offending line with a newline
            contentLines[errorPosition.line - 1] = "";
          }
          currentContent = contentLines.join("\n");
        } else {
          // If we can't locate the line, we can't continue
          break;
        }
      }
    }
  }

  // If we exit the loop without returning, parsing failed despite our attempts
  console.error(`Failed to parse MDX after ${attempts} attempts`);
  return { ast: null, diagnostics, file };
}

/**
 * Process the intermediate nodes into a final structure ready for hydration
 * - Handles root-level paragraphs, converting them to LLM elements wrapped in state elements
 * - Processes and assigns comments
 * - Ensures proper parent-child relationships
 * - Creates a workflow element if one doesn't exist
 */
function processFinalStructure(
  nodes: SerializedBaseElement[],
  diagnostics: Diagnostic[]
): SerializedBaseElement[] {
  const rootLevelNodes: SerializedBaseElement[] = [];
  const comments: CommentNode[] = [];
  const rootLevelParagraphs: SerializedBaseElement[] = [];
  let headerNode: SerializedBaseElement | undefined;
  let workflowNode: SerializedBaseElement | undefined;

  // First pass: categorize nodes
  for (const node of nodes) {
    if (node.type === "header") {
      headerNode = node;
      rootLevelNodes.push(node);
    } else if (node.type === "comment") {
      comments.push(node as CommentNode);
    } else if (node.type === "paragraph") {
      rootLevelParagraphs.push(node);
    } else if (node.type === "element" && node.elementType === "workflow") {
      workflowNode = node;
      rootLevelNodes.push(node);
    } else {
      rootLevelNodes.push(node);
    }
  }

  // Create workflow node if one doesn't exist
  if (!workflowNode) {
    workflowNode = {
      type: "element",
      key: generateKey(),
      tag: "workflow",
      role: "state",
      elementType: "workflow",
      attributes: {},
      children: [],
      lineStart: 1,
      lineEnd: 1,
      columnStart: 1,
      columnEnd: 1,
    };

    if (!workflowNode.attributes) {
      workflowNode.attributes = {};
    }
    workflowNode.attributes.id = "workflow-root";
    rootLevelNodes.push(workflowNode);
  }

  // Check if workflow has a final element; if not, add one
  let hasFinalElement = false;
  if (workflowNode.children) {
    hasFinalElement = workflowNode.children.some(
      (child) => child.type === "element" && child.tag === "final"
    );
  }

  if (!hasFinalElement && workflowNode) {
    // Create a final element with a unique ID
    const finalElement: SerializedBaseElement = {
      type: "element",
      key: generateKey(),
      tag: "final",
      role: "output",
      elementType: "final",
      attributes: {
        id: "final_state",
      },
      children: [],
      lineStart: workflowNode.lineStart,
      lineEnd: workflowNode.lineEnd,
      columnStart: workflowNode.columnStart,
      columnEnd: workflowNode.columnEnd,
    };

    // Add the final element to the workflow
    if (workflowNode.children) {
      workflowNode.children.push(finalElement);
    } else {
      workflowNode.children = [finalElement];
    }

    // Set parent reference
    finalElement.parentId = workflowNode.id;
  }

  // Process root level paragraphs by converting them to LLM elements wrapped in state elements
  if (rootLevelParagraphs.length > 0) {
    for (const [index, paragraph] of rootLevelParagraphs.entries()) {
      // Convert paragraph to LLM element
      const llmElement = convertParagraphToLlmNode(paragraph);

      // Create state element to wrap the LLM element
      const stateElement: SerializedBaseElement = {
        type: "element",
        key: generateKey(),
        tag: "state",
        role: "state",
        elementType: "state",
        attributes: {
          id: `root-state-${index}`,
        },
        children: [llmElement],
        lineStart: paragraph.lineStart,
        lineEnd: paragraph.lineEnd,
        columnStart: paragraph.columnStart,
        columnEnd: paragraph.columnEnd,
      };

      // Set parent reference
      llmElement.parentId = stateElement.id;

      // Add state element to workflow's children
      if (workflowNode && workflowNode.children) {
        workflowNode.children.push(stateElement);
        stateElement.parentId = workflowNode.id;
      }
    }
  }

  // Add non-paragraph, non-header nodes to workflow
  for (const node of rootLevelNodes) {
    if (
      node !== workflowNode &&
      node !== headerNode &&
      node.type === "element"
    ) {
      // Handle action elements that aren't already part of a state
      if (node.role === "action") {
        // Check if it already has a state ancestor
        let hasStateAncestor = false;
        let currentParentId = node.parentId;

        // Find parent nodes recursively by their IDs
        const findParentNode = (
          parentId: string
        ): SerializedBaseElement | undefined => {
          // Check if the parent is the workflow node
          if (
            workflowNode &&
            workflowNode.attributes &&
            workflowNode.attributes.id === parentId
          ) {
            return workflowNode;
          }

          // Search through all nodes to find the one with matching ID
          for (const rootNode of rootLevelNodes) {
            // Check if current node is the parent
            if (rootNode.attributes && rootNode.attributes.id === parentId) {
              return rootNode;
            }

            // Check in children recursively
            if (rootNode.children) {
              const queue = [...rootNode.children];
              while (queue.length > 0) {
                const current = queue.shift() as SerializedBaseElement;
                if (current.attributes && current.attributes.id === parentId) {
                  return current;
                }
                if (current.children) {
                  queue.push(...current.children);
                }
              }
            }
          }

          return undefined;
        };

        while (currentParentId) {
          const parentNode = findParentNode(currentParentId);
          if (!parentNode) break;

          if (parentNode.role === "state") {
            hasStateAncestor = true;
            break;
          }
          currentParentId = parentNode.parentId;
        }

        if (!hasStateAncestor && workflowNode) {
          // Wrap action in a state
          const stateElement: SerializedBaseElement = {
            type: "element",
            key: generateKey(),
            tag: "state",
            role: "state",
            elementType: "state",
            attributes: {
              id: `state-${node.key}`,
            },
            children: [node],
            lineStart: node.lineStart,
            lineEnd: node.lineEnd,
            columnStart: node.columnStart,
            columnEnd: node.columnEnd,
          };

          // Set parent reference
          node.parentId = stateElement.id;

          // Add to workflow's children
          if (workflowNode.children) {
            workflowNode.children.push(stateElement);
            stateElement.parentId = workflowNode.id;
          }
        } else if (!node.parentId && workflowNode && workflowNode.children) {
          // Add directly to workflow if no parent
          workflowNode.children.push(node);
          node.parentId = workflowNode.id;
        }
      } else if (!node.parentId && workflowNode && workflowNode.children) {
        // Add non-action element directly to workflow if no parent
        workflowNode.children.push(node);
        node.parentId = workflowNode.id;
      }
    }
  }

  // Process header information
  if (
    headerNode &&
    headerNode.children &&
    workflowNode &&
    workflowNode.attributes
  ) {
    for (const field of headerNode.children) {
      if (
        field.type === "headerField" &&
        field.id &&
        field.value !== undefined
      ) {
        workflowNode.attributes[field.id] = field.value;
      }
    }
  }

  // Assign comments to elements
  if (comments.length > 0 && workflowNode) {
    assignCommentsToElement(workflowNode, comments);
  }

  // If this is an auto-created workflow, set the initial state to the first state element
  if (
    workflowNode &&
    workflowNode.children &&
    workflowNode.children.length > 0 &&
    workflowNode.attributes
  ) {
    const firstState = workflowNode.children.find(
      (child) => child.role === "state"
    );

    if (
      firstState &&
      firstState.attributes &&
      firstState.attributes.id &&
      !workflowNode.attributes.initial
    ) {
      workflowNode.attributes.initial = firstState.attributes.id;
    }
  }

  // Return the final array with the workflow as the main element
  return [workflowNode];
}

/**
 * Assign comments to elements based on their position in the document
 */
function assignCommentsToElement(
  element: SerializedBaseElement,
  remainingComments: CommentNode[]
): void {
  const elementComments: CommentNode[] = [];
  const otherComments: CommentNode[] = [];

  for (const comment of remainingComments) {
    if (comment.lineEnd <= element.lineStart) {
      elementComments.push(comment);
    } else {
      otherComments.push(comment);
    }
  }

  if (elementComments.length > 0) {
    element.comments = elementComments;
  }

  if (element.children) {
    for (const child of element.children) {
      if (child.type === "element") {
        assignCommentsToElement(child, otherComments);
      }
    }
  }
}

/**
 * Convert a paragraph node to an LLM element
 */
function convertParagraphToLlmNode(
  paragraphNode: SerializedBaseElement
): SerializedBaseElement {
  let promptText = "";

  if (paragraphNode.children) {
    for (const child of paragraphNode.children) {
      if (child.type === "text") {
        promptText += (child as TextNode).value;
      } else if (child.type === "expression") {
        promptText += `\${${(child as ExpressionNode).value}}`;
      }
    }
  }

  return {
    type: "element",
    key: generateKey(),
    tag: "llm",
    role: "output",
    elementType: "llm",
    attributes: {
      prompt: promptText,
      model: "gpt-4o", // Default model
    },
    children: [],
    lineStart: paragraphNode.lineStart,
    lineEnd: paragraphNode.lineEnd,
    columnStart: paragraphNode.columnStart,
    columnEnd: paragraphNode.columnEnd,
  };
}

/**
 * Get position information from a node
 */
function getPosition(
  node: any,
  startOrEnd: "start" | "end",
  lineOrColumn: "line" | "column"
): number {
  if (
    node.position &&
    node.position[startOrEnd] &&
    typeof node.position[startOrEnd][lineOrColumn] === "number"
  ) {
    return node.position[startOrEnd][lineOrColumn];
  }
  return startOrEnd === "start" ? 1 : 2; // Default values
}

/**
 * Check if an import path is valid (starts with ./ or ../)
 */
function isValidImportPath(path: string): boolean {
  return path.startsWith("./") || path.startsWith("../");
}

/**
 * Resolve a relative import path against the current file path
 */
function resolveImportPath(
  currentPath: string | undefined,
  importPath: string
): string {
  if (!currentPath) return importPath;

  // Extract directory from current path
  const parts = currentPath.split("/");
  const dir = parts.slice(0, -1).join("/");

  // Handle different relative paths
  if (importPath.startsWith("./")) {
    return `${dir ? dir + "/" : ""}${importPath.substring(2)}`;
  } else if (importPath.startsWith("../")) {
    // Go up one directory
    const parentDir = parts.slice(0, -2).join("/");
    return `${parentDir ? parentDir + "/" : ""}${importPath.substring(3)}`;
  }

  return importPath;
}

/**
 * Check if a file exists in the provided VFiles
 */
function fileExistsInVFiles(
  files: VFile[] | undefined,
  filePath: string
): boolean {
  if (!files || files.length === 0) return false;
  return files.some((file) => file.path === filePath);
}

/**
 * Parse an import statement to extract named imports, default import, and source
 */
function parseImportStatement(importStatement: string): {
  namedImports: string[];
  defaultImport: string | undefined;
  source: string | undefined;
} {
  const result = {
    namedImports: [] as string[],
    defaultImport: undefined as string | undefined,
    source: undefined as string | undefined,
  };

  // Match source path from import statement
  const sourceMatch = importStatement.match(/from\s+["']([^"']+)["']/);
  if (sourceMatch) {
    // Add .aiml extension if not present and not a .js file
    let sourcePath = sourceMatch[1];
    if (!sourcePath.endsWith(".js") && !sourcePath.endsWith(".aiml")) {
      sourcePath = sourcePath + ".aiml";
    }
    result.source = sourcePath;
  }

  // Match default import
  const defaultImportMatch = importStatement.match(/import\s+(\w+)\s+from/);
  if (defaultImportMatch) {
    result.defaultImport = defaultImportMatch[1];
  }

  // Match named imports
  const namedImportsMatch = importStatement.match(/import\s+{([^}]+)}\s+from/);
  if (namedImportsMatch) {
    const namedImportsStr = namedImportsMatch[1];
    const imports = namedImportsStr.split(",").map((imp) => {
      // Handle "as" aliases
      const aliasMatch = imp.trim().match(/(\w+)(?:\s+as\s+(\w+))?/);
      if (aliasMatch) {
        return aliasMatch[2] || aliasMatch[1];
      }
      return imp.trim();
    });

    result.namedImports = imports.filter(Boolean);
  }

  return result;
}

/**
 * Validate a JSX expression for potential issues
 */
function validateJsxExpression(
  expression: string,
  position: DiagnosticPosition,
  diagnostics: Diagnostic[]
): void {
  // Check for potentially problematic patterns
  if (expression.includes("document.") || expression.includes("window.")) {
    diagnostics.push({
      message:
        "Browser APIs like document and window should not be used in MDX expressions",
      severity: DiagnosticSeverity.Warning,
      code: "AIML401",
      source: "aiml-parser",
      range: {
        start: position,
        end: {
          line: position.line,
          column: position.column + expression.length,
        },
      },
    });
  }

  // Check for React hooks
  if (
    /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)\b/.test(
      expression
    )
  ) {
    diagnostics.push({
      message: "React hooks should not be used in MDX expressions",
      severity: DiagnosticSeverity.Error,
      code: "AIML402",
      source: "aiml-parser",
      range: {
        start: position,
        end: {
          line: position.line,
          column: position.column + expression.length,
        },
      },
    });
  }
}

/**
 * Extract text content from a node, recursively including children
 */
function extractTextFromNode(node: any): string | null {
  if (node.type === "mdxJsxTextElement" || node.type === "mdxJsxFlowElement") {
    return serializeJsxToText(node);
  }

  // For text nodes, simply return the value
  if (node.type === "text") {
    return node.value || "";
  }

  // For code blocks, return with markdown code formatting
  if (node.type === "code") {
    return `\`\`\`${node.lang || ""}\n${node.value || ""}\n\`\`\``;
  }

  // For inline code, return with backticks
  if (node.type === "inlineCode") {
    return `\`${node.value || ""}\``;
  }

  // For headings, add the appropriate number of # characters
  if (node.type === "heading") {
    const prefix = "#".repeat(node.depth) + " ";
    let text = prefix;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text;
  }

  // For paragraphs, handle nested content
  if (node.type === "paragraph") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        // Skip mdxTextExpression nodes in text extraction
        if (child.type === "mdxTextExpression") {
          text += "{...}"; // Placeholder for expressions
        } else {
          const childText = extractTextFromNode(child);
          if (childText) {
            text += childText;
          }
        }
      }
    }

    return text;
  }

  // For lists, convert to text representation
  if (node.type === "list") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const prefix = node.ordered ? `${i + 1}. ` : "- ";
        const childText = extractTextFromNode(node.children[i]);
        if (childText) {
          text += prefix + childText + "\n";
        }
      }
    }

    return text;
  }

  // For list items, process children
  if (node.type === "listItem") {
    let text = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text;
  }

  // For links, convert to markdown link format
  if (node.type === "link") {
    let linkText = "";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          linkText += childText;
        }
      }
    }

    return `[${linkText}](${node.url || ""})`;
  }

  // For images, convert to markdown image format
  if (node.type === "image") {
    return `![${node.alt || ""}](${node.url || ""})`;
  }

  // For emphasis, add asterisks
  if (node.type === "emphasis") {
    let text = "*";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text + "*";
  }

  // For strong emphasis, add double asterisks
  if (node.type === "strong") {
    let text = "**";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText;
        }
      }
    }

    return text + "**";
  }

  // For blockquotes, add > prefix
  if (node.type === "blockquote") {
    let text = "> ";

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childText = extractTextFromNode(child);
        if (childText) {
          text += childText.replace(/\n/g, "\n> ");
        }
      }
    }

    return text;
  }

  // For horizontal rules
  if (node.type === "thematicBreak") {
    return "---";
  }

  // For other nodes with children, recursively extract text
  if (node.children && node.children.length > 0) {
    let text = "";

    for (const child of node.children) {
      const childText = extractTextFromNode(child);
      if (childText) {
        text += childText;
      }
    }

    return text;
  }

  return null;
}

/**
 * Serialize a JSX node to text representation
 */
function serializeJsxToText(node: any): string {
  if (!node) return "";

  // Start with opening tag
  let result = `<${node.name}`;

  // Add attributes
  if (node.attributes && Array.isArray(node.attributes)) {
    for (const attr of node.attributes) {
      if (attr.type === "mdxJsxAttribute") {
        if (typeof attr.value === "string") {
          result += ` ${attr.name}="${attr.value}"`;
        } else if (
          attr.value &&
          attr.value.type === "mdxJsxAttributeValueExpression"
        ) {
          result += ` ${attr.name}={${attr.value.value}}`;
        } else if (attr.value === null) {
          // Boolean attribute
          result += ` ${attr.name}`;
        }
      }
    }
  }

  // Check if it's a self-closing tag
  if (!node.children || node.children.length === 0) {
    result += " />";
    return result;
  }

  // Close opening tag
  result += ">";

  // Add children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.type === "text") {
        result += child.value || "";
      } else {
        const childText = extractTextFromNode(child);
        if (childText) {
          result += childText;
        }
      }
    }
  }

  // Add closing tag
  result += `</${node.name}>`;

  return result;
}

/**
 * Transform unified AST to AIML nodes
 * @param ast The unified AST
 * @param options Parsing options
 * @param diagnostics Array to collect diagnostics
 * @returns An array of AIML nodes
 */
function transformToAIMLNodes(
  ast: Node,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[]
): SerializedBaseElement[] {
  const nodes: SerializedBaseElement[] = [];
  const additionalNodes: SerializedBaseElement[] = [];

  // Process root node's children
  if ("children" in ast && Array.isArray(ast.children)) {
    for (const child of ast.children) {
      const transformed = transformNode(
        child,
        options,
        diagnostics,
        additionalNodes
      );
      if (transformed) {
        nodes.push(transformed);
      }
    }

    // Add any additional nodes from processing
    if (additionalNodes.length > 0) {
      nodes.push(...additionalNodes);
    }

    // Merge adjacent paragraphs
    mergeParagraphs(nodes);
  }

  return nodes;
}

/**
 * Transform a single AST node to an AIML node
 * @param node AST node to transform
 * @param options Parsing options
 * @param diagnostics Diagnostic collection
 * @param additionalNodes Array to collect additional nodes
 * @returns Transformed AIML node or null
 */
function transformNode(
  node: any,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[],
  additionalNodes: SerializedBaseElement[]
): SerializedBaseElement | null {
  // Handle different node types
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    // Process JSX elements into AIML elements
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");

    // Handle elements
    return {
      type: "element",
      key: generateKey(),
      tag: node.name,
      role:
        node.name.toLowerCase().includes("state") ||
        node.name.toLowerCase() === "workflow"
          ? "state"
          : node.name.toLowerCase().includes("error")
            ? "error"
            : node.name.toLowerCase().includes("output")
              ? "output"
              : node.name.toLowerCase().includes("input")
                ? "user-input"
                : "action",
      elementType: node.name.toLowerCase() as any,
      attributes: processAttributes(node.attributes),
      children:
        node.children
          ?.map((child: any) =>
            transformNode(child, options, diagnostics, additionalNodes)
          )
          .filter(Boolean) || [],
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "paragraph") {
    // Create a paragraph node
    const lineStart = getPosition(node, "start", "line");
    const columnStart = getPosition(node, "start", "column");
    const lineEnd = getPosition(node, "end", "line");
    const columnEnd = getPosition(node, "end", "column");

    // Process the children of the paragraph
    const children: SerializedBaseElement[] = [];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === "text") {
          // Add text node
          children.push({
            type: "text",
            key: generateKey(),
            value: child.value,
            lineStart: getPosition(child, "start", "line"),
            lineEnd: getPosition(child, "end", "line"),
            columnStart: getPosition(child, "start", "column"),
            columnEnd: getPosition(child, "end", "column"),
          });
        } else if (child.type === "mdxTextExpression") {
          // Process JSX expressions in text (like {someVar})
          children.push({
            type: "expression",
            key: generateKey(),
            value: child.value,
            lineStart: getPosition(child, "start", "line"),
            lineEnd: getPosition(child, "end", "line"),
            columnStart: getPosition(child, "start", "column"),
            columnEnd: getPosition(child, "end", "column"),
          });
        } else if (child.type === "mdxJsxTextElement") {
          // Nested JSX in paragraph
          const transformed = transformNode(
            child,
            options,
            diagnostics,
            additionalNodes
          );
          if (transformed) {
            children.push(transformed);
          }
        }
      }
    }

    // Create paragraph node
    return {
      type: "paragraph",
      key: generateKey(),
      children,
      lineStart,
      lineEnd,
      columnStart,
      columnEnd,
    };
  } else if (node.type === "mdxJsxAttribute") {
    // Skip attribute nodes - they are handled by their parent element
    return null;
  } else if (node.type === "mdxjsFrontmatter") {
    // Process frontmatter into a header node
    const fields: SerializedBaseElement[] = [];

    if (node.value) {
      // Try to parse YAML frontmatter
      try {
        const yaml = node.value;
        const lines = yaml.split("\n");

        for (const line of lines) {
          const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
          if (match) {
            const id = match[1];
            const value = match[2].replace(/^['"]|['"]$/g, ""); // Remove quotes

            fields.push({
              type: "headerField",
              key: generateKey(),
              id,
              value,
              lineStart: getPosition(node, "start", "line"),
              lineEnd: getPosition(node, "end", "line"),
              columnStart: getPosition(node, "start", "column"),
              columnEnd: getPosition(node, "end", "column"),
            });
          }
        }
      } catch (e) {
        // Add diagnostic for failed frontmatter parsing
        diagnostics.push({
          message: `Failed to parse frontmatter: ${e}`,
          severity: DiagnosticSeverity.Warning,
          code: "AIML003",
          source: "aiml-parser",
          range: {
            start: {
              line: getPosition(node, "start", "line"),
              column: getPosition(node, "start", "column"),
            },
            end: {
              line: getPosition(node, "end", "line"),
              column: getPosition(node, "end", "column"),
            },
          },
        });
      }
    }

    return {
      type: "header",
      key: generateKey(),
      children: fields,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "mdxjsEsm") {
    // Process ES modules (import statements)
    if (node.value && node.value.includes("import")) {
      const { namedImports, defaultImport, source } = parseImportStatement(
        node.value
      );

      if (source) {
        return {
          type: "import",
          key: generateKey(),
          filePath: source,
          namedImports,
          defaultImport,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }
    }

    return null;
  } else if (node.type === "heading") {
    // Process headings - could convert to a special element or text
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "html") {
    // Raw HTML - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "list" || node.type === "listItem") {
    // Convert lists to text paragraphs
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "text") {
    // Plain text outside of paragraphs
    if (node.value.trim() === "") {
      return null; // Skip empty text nodes
    }

    // If it's a standalone text node, wrap it in a paragraph
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: node.value,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "code") {
    // Code blocks - convert to text
    const text = `\`\`\`${node.lang || ""}\n${node.value || ""}\n\`\`\``;
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "inlineCode") {
    // Inline code - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: `\`${node.value || ""}\``,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "thematicBreak") {
    // Horizontal rule - convert to text
    return {
      type: "text",
      key: generateKey(),
      value: "---",
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "mdxFlowExpression") {
    // MDX expression outside JSX - create an expression node
    return {
      type: "expression",
      key: generateKey(),
      value: node.value,
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  } else if (node.type === "blockquote") {
    // Convert blockquotes to text
    const text = extractTextFromNode(node);
    return {
      type: "paragraph",
      key: generateKey(),
      children: [
        {
          type: "text",
          key: generateKey(),
          value: text || "",
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        },
      ],
      lineStart: getPosition(node, "start", "line"),
      lineEnd: getPosition(node, "end", "line"),
      columnStart: getPosition(node, "start", "column"),
      columnEnd: getPosition(node, "end", "column"),
    };
  }

  // For unsupported node types, log a diagnostic and return null
  console.warn(`Unsupported node type: ${node.type}`);
  diagnostics.push({
    message: `Unsupported node type: ${node.type}`,
    severity: DiagnosticSeverity.Information,
    code: "AIML004",
    source: "aiml-parser",
    range: {
      start: {
        line: getPosition(node, "start", "line"),
        column: getPosition(node, "start", "column"),
      },
      end: {
        line: getPosition(node, "end", "line"),
        column: getPosition(node, "end", "column"),
      },
    },
  });

  return null;
}

/**
 * Process attributes from an AST node into a record
 */
function processAttributes(attributes: any[]): Record<string, any> {
  if (!attributes || !Array.isArray(attributes)) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const attr of attributes) {
    if (attr.type === "mdxJsxAttribute") {
      if (attr.value === null) {
        // Boolean attribute
        result[attr.name] = true;
      } else if (typeof attr.value === "string") {
        // String attribute
        result[attr.name] = attr.value;
      } else if (attr.value?.type === "mdxJsxAttributeValueExpression") {
        // Expression attribute - try to evaluate simple expressions
        try {
          // For simple literals like numbers, booleans, etc.
          // eslint-disable-next-line no-eval
          result[attr.name] = Function(
            `"use strict"; return (${attr.value.value})`
          )();
        } catch (e) {
          // If evaluation fails, store as a string expression
          result[attr.name] = `\${${attr.value.value}}`;
        }
      }
    }
  }

  return result;
}

/**
 * Merge adjacent paragraph nodes in the node array
 * This helps with combining text across line breaks
 */
function mergeParagraphs(nodes: SerializedBaseElement[]): void {
  if (nodes.length < 2) return;

  for (let i = 0; i < nodes.length - 1; i++) {
    // Check if current and next nodes are both paragraphs
    if (nodes[i]?.type === "paragraph" && nodes[i + 1]?.type === "paragraph") {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];

      // Combine the children arrays
      const combinedChildren = [
        ...(currentNode.children || []),
        ...(nextNode.children || []),
      ];

      // Update the current node with combined children and adjusted end position
      currentNode.children = combinedChildren;
      currentNode.lineEnd = nextNode.lineEnd;
      currentNode.columnEnd = nextNode.columnEnd;

      // Remove the next node as it's now merged
      nodes.splice(i + 1, 1);

      // Decrement i to check the merged node against the next one
      i--;
    }
  }
}
