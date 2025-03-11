import { Processor, unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import { parse as parseYaml } from "yaml";
import { VFile } from "vfile";
import { Node } from "unist";
import {
  aimlElements,
  SerializedBaseElement,
  Diagnostic,
  DiagnosticPosition,
  DiagnosticSeverity,
  ElementType,
  elementRoleMap,
} from "@fireworks/types";
import { Root } from "remark-parse/lib";

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

  // Debug the AST structure
  // console.log("AST Structure:", JSON.stringify(ast, null, 2));

  // Process warnings from the parser
  if (file.messages.length > 0) {
    for (const message of file.messages) {
      diagnostics.push({
        message: message.reason,
        severity: DiagnosticSeverity.Warning,
        code: message.ruleId || "AIML001",
        source: "aiml-parserr",
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
  const transformResult = transformToAIMLNodes(ast, opts, diagnostics);

  return {
    nodes: transformResult,
    diagnostics,
  };
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
  // Array to store additional nodes from paragraph processing
  const additionalNodes: SerializedBaseElement[] = [];

  // Process root node's children
  if ("children" in ast && Array.isArray(ast.children)) {
    // Check if the first nodes form a frontmatter pattern
    if (
      ast.children.length >= 3 &&
      ast.children[0].type === "mdxjsEsm" &&
      ast.children[1].type === "thematicBreak" &&
      ast.children[2].type === "heading" &&
      (ast.children[2] as any).depth === 2
    ) {
      // Extract frontmatter data from the heading
      const headingNode = ast.children[2] as any;
      if (
        headingNode.children &&
        headingNode.children.length > 0 &&
        headingNode.children[0].type === "text"
      ) {
        const headingText = headingNode.children[0].value;
        const match = headingText.match(/^name:\s*(.+)$/);

        if (match) {
          // Create a header node with a headerField for the name
          const headerNode: SerializedBaseElement = {
            type: "header",
            key: generateKey(),
            lineStart: getPosition(ast.children[0], "start", "line"),
            lineEnd: getPosition(ast.children[2], "end", "line"),
            columnStart: getPosition(ast.children[0], "start", "column"),
            columnEnd: getPosition(ast.children[2], "end", "column"),
            children: [
              {
                type: "headerField",
                key: generateKey(),
                tag: "name",
                id: "name",
                value: match[1].trim(),
                lineStart: getPosition(headingNode, "start", "line"),
                lineEnd: getPosition(headingNode, "end", "line"),
                columnStart: getPosition(headingNode, "start", "column"),
                columnEnd: getPosition(headingNode, "end", "column"),
              },
            ],
          };

          nodes.push(headerNode);

          // Process the remaining children
          for (let i = 3; i < ast.children.length; i++) {
            const transformed = transformNode(
              ast.children[i],
              options,
              diagnostics,
              additionalNodes
            );
            if (transformed) {
              nodes.push(transformed);
            }
          }

          // Add any additional nodes from paragraph processing
          if (additionalNodes.length > 0) {
            nodes.push(...additionalNodes);
          }

          // Merge adjacent paragraphs
          mergeParagraphs(nodes);

          return nodes;
        }
      }
    }

    // If no frontmatter pattern was found, process all children normally
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
  }

  // Add any additional nodes from paragraph processing
  if (additionalNodes.length > 0) {
    nodes.push(...additionalNodes);
  }

  // Merge adjacent paragraphs
  mergeParagraphs(nodes);

  return nodes;
}

/**
 * Merge all paragraph nodes, combining their children
 * @param nodes Array of AIML nodes to process
 */
function mergeParagraphs(nodes: SerializedBaseElement[]): void {
  if (nodes.length < 2) return;

  // Find the first paragraph node
  let firstParagraphIndex = -1;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === "paragraph") {
      firstParagraphIndex = i;
      break;
    }
  }

  // If no paragraph found, return
  if (firstParagraphIndex === -1) return;

  // Get the first paragraph node
  const firstParagraph = nodes[firstParagraphIndex];

  // Iterate through the remaining nodes
  let i = firstParagraphIndex + 1;
  while (i < nodes.length) {
    const current = nodes[i];

    // If the current node is a paragraph, merge it with the first paragraph
    if (current.type === "paragraph") {
      // Merge the children of the current paragraph into the first paragraph
      if (firstParagraph.children && current.children) {
        firstParagraph.children.push(...current.children);
      }

      // Update the end position of the first paragraph to match the end of the current paragraph
      if (current.lineEnd !== undefined) {
        firstParagraph.lineEnd = current.lineEnd;
      }
      if (current.columnEnd !== undefined) {
        firstParagraph.columnEnd = current.columnEnd;
      }

      // Remove the current paragraph from the array
      nodes.splice(i, 1);

      // Don't increment i, as we need to check the next node
    } else {
      // Move to the next node
      i++;
    }
  }
}

/**
 * Transform a single AST node to an AIML node
 * @param node The unified AST node
 * @param options Parsing options
 * @param diagnostics Array to collect diagnostics
 * @param additionalNodes Optional array to store additional nodes
 * @returns An AIML node or null if the node should be skipped
 */
function transformNode(
  node: any,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[],
  additionalNodes: SerializedBaseElement[] = []
): SerializedBaseElement | null {
  if (!node) return null;

  // Skip yaml nodes as they're handled separately for frontmatter
  if (node.type === "yaml") {
    try {
      const frontmatter = parseYaml(node.value || "");

      // Create a header node with fields for frontmatter
      const headerNode: SerializedBaseElement = {
        type: "header",
        key: generateKey(),
        lineStart: getPosition(node, "start", "line"),
        lineEnd: getPosition(node, "end", "line"),
        columnStart: getPosition(node, "start", "column"),
        columnEnd: getPosition(node, "end", "column"),
        children: [],
      };

      // Add header fields for each frontmatter field
      if (frontmatter && typeof frontmatter === "object") {
        for (const [key, value] of Object.entries(frontmatter)) {
          headerNode.children!.push({
            type: "headerField",
            key: generateKey(),
            id: key, // Add id property to match test expectations
            value: value as any,
            lineStart: getPosition(node, "start", "line"),
            lineEnd: getPosition(node, "end", "line"),
            columnStart: getPosition(node, "start", "column"),
            columnEnd: getPosition(node, "end", "column"),
          });
        }
      }

      return headerNode;
    } catch (e) {
      // Add diagnostic for invalid YAML
      diagnostics.push({
        message: `Invalid YAML frontmatter: ${e}`,
        severity: DiagnosticSeverity.Error,
        code: "AIML101",
        source: "aiml-parserr",
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
  }

  switch (node.type) {
    case "text":
      return {
        type: "text",
        key: generateKey(),
        value: node.value,
        lineStart: getPosition(node, "start", "line"),
        lineEnd: getPosition(node, "end", "line"),
        columnStart: getPosition(node, "start", "column"),
        columnEnd: getPosition(node, "end", "column"),
      };

    case "mdxjsEsm": // ESM import/export
      if (node.value && node.value.trim().startsWith("import ")) {
        // Parse import statement to extract named and default imports
        const importInfo = parseImportStatement(node.value);

        // Skip React imports with diagnostics
        if (importInfo.source === "react") {
          diagnostics.push({
            message: "React imports are not supported",
            severity: DiagnosticSeverity.Error,
            code: "AIML201",
            source: "aiml-parserr",
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

        // Validate that the import source is a file path
        if (importInfo.source && !isValidImportPath(importInfo.source)) {
          diagnostics.push({
            message:
              "Import source must be a relative file path (starting with ./ or ../)",
            severity: DiagnosticSeverity.Error,
            code: "AIML202",
            source: "aiml-parserr",
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
        } else if (importInfo.source) {
          // Check if the imported file exists in the provided VFiles
          const resolvedPath = resolveImportPath(
            options.filePath,
            importInfo.source
          );
          if (!fileExistsInVFiles(options.files, resolvedPath)) {
            diagnostics.push({
              message: `Imported file not found: ${importInfo.source}`,
              severity: DiagnosticSeverity.Error,
              code: "AIML204",
              source: "aiml-parserr",
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

        // Check if the import is an export
        if (
          !!importInfo.source &&
          (importInfo.namedImports || importInfo.defaultImport)
        ) {
          return {
            type: "import",
            key: generateKey(),
            value: node.value,
            namedImports: importInfo.namedImports,
            defaultImport: importInfo.defaultImport,
            filePath: importInfo.source,
            lineStart: getPosition(node, "start", "line"),
            lineEnd: getPosition(node, "end", "line"),
            columnStart: getPosition(node, "start", "column"),
            columnEnd: getPosition(node, "end", "column"),
          };
        }

        return {
          type: "import",
          key: generateKey(),
          value: node.value,
          namedImports: importInfo.namedImports,
          defaultImport: importInfo.defaultImport,
          filePath: importInfo.source,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }

      // For exports, create an expression
      if (node.value.trim().length > 0) {
        return {
          type: "expression",
          key: generateKey(),
          value: node.value,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }

      return null;

    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      // Check if this is an allowed AIML element
      const tagName = node.name;

      // Check if this is an allowed AIML element or an imported component
      // For imported components, we'll treat them as valid elements
      if (
        aimlElements.includes(tagName) ||
        tagName.charAt(0).toUpperCase() === tagName.charAt(0)
      ) {
        // This is a valid AIML element
        const elementNode: SerializedBaseElement = {
          type: "element",
          key: generateKey(),
          tag: tagName,
          role: elementRoleMap[tagName as ElementType],
          elementType: tagName,
          attributes: {},
          children: [],
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };

        // Process attributes
        if (node.attributes && Array.isArray(node.attributes)) {
          for (const attr of node.attributes) {
            if (attr.type === "mdxJsxAttribute") {
              if (typeof attr.value === "string") {
                elementNode.attributes![attr.name] = attr.value;
              } else if (
                attr.value &&
                attr.value.type === "mdxJsxAttributeValueExpression"
              ) {
                // For JSX expressions in attributes, we store the raw expression
                elementNode.attributes![attr.name] = `{${attr.value.value}}`;

                // Check for potentially invalid expressions
                validateJsxExpression(
                  attr.value.value,
                  {
                    line: getPosition(attr.value, "start", "line"),
                    column: getPosition(attr.value, "start", "column"),
                  },
                  diagnostics
                );
              } else if (attr.value === null) {
                // Boolean attributes
                elementNode.attributes![attr.name] = true;
              }
            }
          }
        }

        // Process children
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            const childNode = transformNode(
              child,
              options,
              diagnostics,
              additionalNodes
            );
            if (childNode) {
              // Set parent reference if needed
              childNode.parent = elementNode;
              elementNode.children!.push(childNode);
            }
          }
        }

        return elementNode;
      } else {
        // This is not an allowed AIML element, convert it to text
        diagnostics.push({
          message: `Element '${tagName}' is not a valid AIML element. Converting to text.`,
          severity: DiagnosticSeverity.Information,
          code: "AIML203",
          source: "aiml-parserr",
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

        // Convert the JSX to text representation
        const textValue = serializeJsxToText(node);
        return {
          type: "text",
          key: generateKey(),
          value: textValue,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }

    case "mdxFlowExpression":
    case "mdxTextExpression":
      // Transform MDX expressions (e.g., {variable})
      // Validate the expression
      validateJsxExpression(
        node.value,
        {
          line: getPosition(node, "start", "line"),
          column: getPosition(node, "start", "column"),
        },
        diagnostics
      );

      return {
        type: "expression",
        key: generateKey(),
        value: node.value,
        lineStart: getPosition(node, "start", "line"),
        lineEnd: getPosition(node, "end", "line"),
        columnStart: getPosition(node, "start", "column"),
        columnEnd: getPosition(node, "end", "column"),
      };

    // Special handling for paragraph nodes to preserve mdxTextExpression nodes
    case "paragraph":
      // Create a paragraph node with children
      if (node.children && node.children.length > 0) {
        // Create the paragraph node
        const paragraphNode: SerializedBaseElement = {
          type: "paragraph",
          key: generateKey(),
          children: [],
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };

        // First, collect all the children into a more manageable format
        const processedChildren: {
          type: string;
          value?: string;
          node?: any;
        }[] = [];

        // First pass: convert all nodes to a simpler format
        for (const child of node.children) {
          const childNode = child as any;

          if (childNode.type === "text") {
            processedChildren.push({
              type: "text",
              value: childNode.value || "",
            });
          } else if (childNode.type === "mdxTextExpression") {
            // Process the expression node
            const expressionNode = transformNode(
              child,
              options,
              diagnostics,
              additionalNodes
            );
            if (expressionNode) {
              processedChildren.push({
                type: "expression",
                node: expressionNode,
              });
            }
          } else if (childNode.type === "mdxJsxTextElement") {
            // Convert custom JSX elements to text
            const textValue = serializeJsxToText(childNode);
            processedChildren.push({
              type: "text",
              value: textValue,
            });
          } else {
            // For other node types, just add their text content
            const childText = extractTextFromNode(childNode);
            if (childText) {
              processedChildren.push({
                type: "text",
                value: childText,
              });
            }
          }
        }

        // Second pass: combine adjacent text nodes
        const combinedChildren: {
          type: string;
          value?: string;
          node?: any;
        }[] = [];

        let currentText = "";
        for (const child of processedChildren) {
          if (child.type === "text") {
            currentText += child.value || "";
          } else {
            // If we have accumulated text, add it as a text node
            if (currentText) {
              combinedChildren.push({
                type: "text",
                value: currentText,
              });
              currentText = "";
            }
            combinedChildren.push(child);
          }
        }

        // Add any remaining text
        if (currentText) {
          combinedChildren.push({
            type: "text",
            value: currentText,
          });
        }

        // Third pass: create actual nodes
        for (const child of combinedChildren) {
          if (child.type === "text") {
            paragraphNode.children!.push({
              type: "text",
              key: generateKey(),
              value: child.value || "",
              lineStart: getPosition(node, "start", "line"),
              lineEnd: getPosition(node, "end", "line"),
              columnStart: getPosition(node, "start", "column"),
              columnEnd: getPosition(node, "end", "column"),
            });
          } else if (child.type === "expression" && child.node) {
            paragraphNode.children!.push(child.node);
          }
        }

        // Return the paragraph node with all children
        return paragraphNode;
      }

      // If no children or no valid nodes created, extract text content normally
      const paragraphText = extractTextFromNode(node);
      if (paragraphText) {
        return {
          type: "paragraph",
          key: generateKey(),
          children: [
            {
              type: "text",
              key: generateKey(),
              value: paragraphText,
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
      return null;

    // For all other nodes, convert to text
    default:
      // Extract text content from the node
      const textContent = extractTextFromNode(node);

      if (textContent) {
        return {
          type: "text",
          key: generateKey(),
          value: textContent,
          lineStart: getPosition(node, "start", "line"),
          lineEnd: getPosition(node, "end", "line"),
          columnStart: getPosition(node, "start", "column"),
          columnEnd: getPosition(node, "end", "column"),
        };
      }

      return null;
  }
}

/**
 * Generate a unique key for an AIML node
 */
function generateKey(): string {
  return `aiml-${++keyCounter}`;
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
 * Check if an import path is valid (starts with ./ or ../)
 */
function isValidImportPath(path: string): boolean {
  return path.startsWith("./") || path.startsWith("../");
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
      source: "aiml-parserr",
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
    /\\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef)\\b/.test(
      expression
    )
  ) {
    diagnostics.push({
      message: "React hooks should not be used in MDX expressions",
      severity: DiagnosticSeverity.Error,
      code: "AIML402",
      source: "aiml-parserr",
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

  // For paragraphs, we need special handling to preserve mdxTextExpression nodes
  // This function should only be called for text extraction, not for node transformation
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
          text +=
            prefix +
            childText +
            "\
";
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
 * Parse multiple MDX files into AIML nodes with diagnostics
 * @param files Array of VFile instances with paths and content
 * @param options Parsing options
 * @returns Parse result with nodes and diagnostics for the main file
 */
export async function parseMDXFilesToAIML(
  files: VFile[],
  options: Omit<MDXToAIMLOptions, "files"> = {}
): Promise<MDXParseResult> {
  if (!files || files.length === 0) {
    return {
      nodes: [],
      diagnostics: [
        {
          message: "No files provided",
          severity: DiagnosticSeverity.Error,
          code: "AIML000",
          source: "aiml-parserr",
          range: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
        },
      ],
    };
  }

  // TODO: support multiple files
  const mainFile = files[0];

  // Parse the main file, providing all files for import resolution
  return parseMDXToAIML(String(mainFile.value), {
    ...options,
    filePath: mainFile.path,
    files: files,
  });
}

/**
 * Parses MDX content recursively, handling missing closing tags and removing problematic lines
 * @param content The MDX content to parse
 * @param options Options including file path
 * @returns Object containing parsed nodes and diagnostics
 */
function parseWithRecursiveRecovery(
  content: string,
  options: {
    filePath: string;
    processor: Processor<Root, Root, Root, undefined, undefined>;
  }
): {
  ast: Root | null;
  diagnostics: Diagnostic[];
  file: VFile;
} {
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
          //console.log("Recovered from error, current content:", currentContent);
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
