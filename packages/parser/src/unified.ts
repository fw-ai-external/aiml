import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { parse as parseYaml } from "yaml";
import { VFile } from "vfile";
import { Node } from "unist";

// Define the allowed AIML elements
export const aimlElements = [
  "workflow",
  "state",
  "parallel",
  "final",
  "datamodel",
  "data",
  "assign",
  "onentry",
  "onexit",
  "transition",
  "if",
  "elseif",
  "else",
  "foreach",
  "script",
  "llm",
  "toolcall",
  "log",
  "sendText",
  "sendToolCalls",
  "sendObject",
  "onerror",
  "onchunk",
  "prompt",
  "instructions",
] as const;

// Define element types and roles
export type ElementType = (typeof aimlElements)[number];
export type ElementRole =
  | "state"
  | "action"
  | "error"
  | "user-input"
  | "output";

// Map of element types to roles
const elementRoleMap: Record<ElementType, ElementRole> = {
  workflow: "state",
  state: "state",
  parallel: "state",
  final: "state",
  datamodel: "state",
  data: "state",
  assign: "action",
  onentry: "action",
  onexit: "action",
  transition: "action",
  if: "action",
  elseif: "action",
  else: "action",
  foreach: "action",
  script: "action",
  llm: "output",
  toolcall: "action",
  log: "action",
  sendText: "output",
  sendToolCalls: "output",
  sendObject: "output",
  onerror: "error",
  onchunk: "action",
  prompt: "user-input",
  instructions: "user-input",
};

export interface Attributes {
  [key: string]: string | number | boolean | null;
}

export interface IBaseElement {
  id?: string;
  key: string;
}

export type AIMLNode = {
  type:
    | "text"
    | "comment"
    | "element"
    | "import"
    | "header"
    | "expression"
    | "headerField"
    | "field";
  id?: string;
  key: string;
  tag?: string;
  role?: ElementRole;
  elementType?: string;
  attributes?: Attributes;
  children?: AIMLNode[];
  parent?: IBaseElement;
  value?: string | number | boolean;
  filePath?: string;
  namedImports?: string[];
  defaultImport?: string;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
};

// Define diagnostics types
export enum DiagnosticSeverity {
  Error = "error",
  Warning = "warning",
  Information = "information",
  Hint = "hint",
}

export interface DiagnosticPosition {
  line: number;
  column: number;
}

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
  range: {
    start: DiagnosticPosition;
    end: DiagnosticPosition;
  };
}

// Options for parsing MDX to AIML nodes
export interface MDXToAIMLOptions {
  filePath?: string;
  generateIds?: boolean;
  files?: VFile[]; // Add files array for import resolution
}

// Result of parsing MDX
export interface MDXParseResult {
  nodes: AIMLNode[];
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

  // Initialize diagnostics array
  const diagnostics: Diagnostic[] = [];

  // Create a file instance
  const file = new VFile({ value: content, path: options.filePath });

  // Create a unified processor for MDX
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkMdx);

  // Parse the content to get the AST
  const ast = await processor.parse(file);
  await processor.run(ast, file);

  // Process warnings from the parser
  if (file.messages.length > 0) {
    for (const message of file.messages) {
      diagnostics.push({
        message: message.reason,
        severity: DiagnosticSeverity.Warning,
        code: message.ruleId || "MDX001",
        source: "mdx-parser",
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
): AIMLNode[] {
  const nodes: AIMLNode[] = [];

  // Process root node's children
  if ("children" in ast && Array.isArray(ast.children)) {
    for (const child of ast.children) {
      const transformed = transformNode(child, options, diagnostics);
      if (transformed) {
        nodes.push(transformed);
      }
    }
  }

  return nodes;
}

/**
 * Transform a single AST node to an AIML node
 * @param node The unified AST node
 * @param options Parsing options
 * @param diagnostics Array to collect diagnostics
 * @returns An AIML node or null if the node should be skipped
 */
function transformNode(
  node: any,
  options: MDXToAIMLOptions,
  diagnostics: Diagnostic[]
): AIMLNode | null {
  if (!node) return null;

  // Skip yaml nodes as they're handled separately for frontmatter
  if (node.type === "yaml") {
    try {
      const frontmatter = parseYaml(node.value || "");

      // Create a header node with fields for frontmatter
      const headerNode: AIMLNode = {
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
            tag: key,
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
        code: "MDX101",
        source: "mdx-parser",
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
            code: "MDX201",
            source: "mdx-parser",
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
            code: "MDX202",
            source: "mdx-parser",
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
              code: "MDX204",
              source: "mdx-parser",
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
      return {
        type: "expression",
        key: generateKey(),
        value: node.value,
        lineStart: getPosition(node, "start", "line"),
        lineEnd: getPosition(node, "end", "line"),
        columnStart: getPosition(node, "start", "column"),
        columnEnd: getPosition(node, "end", "column"),
      };

    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      // Check if this is an allowed AIML element
      const tagName = node.name;

      if (aimlElements.includes(tagName)) {
        // This is a valid AIML element
        const elementNode: AIMLNode = {
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
            const childNode = transformNode(child, options, diagnostics);
            if (childNode) {
              // Set parent reference if needed
              childNode.parent = { key: elementNode.key };
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
          code: "MDX203",
          source: "mdx-parser",
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
  const sourceMatch = importStatement.match(/from\\s+['"]([^'"]+)['"]/);
  if (sourceMatch) {
    result.source = sourceMatch[1];
  }

  // Match default import
  const defaultImportMatch = importStatement.match(/import\\s+(\\w+)\\s+from/);
  if (defaultImportMatch) {
    result.defaultImport = defaultImportMatch[1];
  }

  // Match named imports
  const namedImportsMatch = importStatement.match(
    /import\\s+{([^}]+)}\\s+from/
  );
  if (namedImportsMatch) {
    const namedImportsStr = namedImportsMatch[1];
    const imports = namedImportsStr.split(",").map((imp) => {
      // Handle "as" aliases
      const aliasMatch = imp.trim().match(/(\\w+)(?:\\s+as\\s+(\\w+))?/);
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
      code: "MDX401",
      source: "mdx-parser",
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
      code: "MDX402",
      source: "mdx-parser",
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

  // For paragraphs, process children
  if (node.type === "paragraph") {
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
      } else if (
        child.type === "mdxJsxTextElement" ||
        child.type === "mdxJsxFlowElement"
      ) {
        result += serializeJsxToText(child);
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
          code: "MDX000",
          source: "mdx-parser",
          range: {
            start: { line: 1, column: 1 },
            end: { line: 1, column: 1 },
          },
        },
      ],
    };
  }

  // Use the first file as the main file to parse
  const mainFile = files[0];

  // Parse the main file, providing all files for import resolution
  return parseMDXToAIML(String(mainFile.value), {
    ...options,
    filePath: mainFile.path,
    files: files,
  });
}

/**
 * Example usage:
 *
 * // Create VFile instances for all files
 * const mainFile = new VFile({
 *   path: 'workflow.mdx',
 *   value: `---
 * title: AIML Workflow Example
 * description: An example of an AIML workflow
 * ---
 *
 * import { someData } from './data.js';
 *
 * # My Workflow
 *
 * <workflow name="example">
 *   <state id="start">
 *     <transition target="processing" />
 *   </state>
 * </workflow>
 * `
 * });
 *
 * const dataFile = new VFile({
 *   path: 'data.js',
 *   value: 'export const someData = { key: "value" };'
 * });
 *
 * // Pass all files to the parser
 * const result = await parseMDXFilesToAIML([mainFile, dataFile]);
 * console.log(JSON.stringify(result, null, 2));
 */
