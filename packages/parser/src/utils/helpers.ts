import {
  type Diagnostic,
  type DiagnosticPosition,
  DiagnosticSeverity,
} from "@aiml/shared";
import type { VFile } from "vfile";

// Counter for generating unique keys
let keyCounter = 0;

/**
 * Generate a unique key for an AIML node
 */
export function generateKey(): string {
  return `aiml-${++keyCounter}`;
}

/**
 * Reset key counter
 */
export function resetKeyCounter(): void {
  keyCounter = 0;
}

/**
 * Get position information from a node
 */
export function getPosition(
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
export function isValidImportPath(path: string): boolean {
  return path.startsWith("./") || path.startsWith("../");
}

/**
 * Resolve a relative import path against the current file path
 */
export function resolveImportPath(
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
export function fileExistsInVFiles(
  files: VFile[] | undefined,
  filePath: string
): boolean {
  if (!files || files.length === 0) return false;
  return files.some((file) => file.path === filePath);
}

/**
 * Validate a JSX expression for potential issues
 */
export function validateJsxExpression(
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
 * Parse an import statement to extract named imports, default import, and source
 */
export function parseImportStatement(importStatement: string): {
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

const tagEscapeMap = {
  "<": "&lt;",
  ">": "&gt;",
  "{": "&#123;",
  "}": "&#125;",
};

export function escapeLineContent(line: string): string {
  let updatedLine = line;
  for (const [key, value] of Object.entries(tagEscapeMap)) {
    updatedLine = updatedLine.replace(new RegExp(key, "g"), value);
  }
  return updatedLine;
}

export function unescapeLineContent(line: string): string {
  let updatedLine = line;
  for (const [key, value] of Object.entries(tagEscapeMap)) {
    updatedLine = updatedLine.replace(new RegExp(value, "g"), key);
  }
  return updatedLine;
}

/**
 * Extract error location from error message
 */
export function extractErrorLocation(
  error: any,
  content: string
): { start: number; end: number } | null {
  const errorMsg = String(error);

  // Common error patterns
  // Match both (line:col) and line:col: patterns in error messages
  const lineColMatch = errorMsg.match(/(?:\((\d+):(\d+)\))|(?:(\d+):(\d+):)/);

  if (lineColMatch) {
    const errorLine = parseInt(lineColMatch[1] || lineColMatch[3]);
    const errorCol = parseInt(lineColMatch[2] || lineColMatch[4]);

    // Convert line:col to index
    const lines = content.split("\n");
    let offset = 0;
    for (let i = 0; i < errorLine - 1; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    const startPos = offset + errorCol - 1;

    // Create a reasonable window around the error
    return {
      start: Math.max(0, startPos - 20),
      end: Math.min(content.length, startPos + 100),
    };
  }

  // Fallback: try to find a quoted problematic JSX element
  const jsxMatch = errorMsg.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*?>/);
  if (jsxMatch) {
    const tagText = jsxMatch[0];
    const index = content.indexOf(tagText);
    if (index !== -1) {
      return {
        start: Math.max(0, index - 10),
        end: Math.min(content.length, index + tagText.length + 50),
      };
    }
  }

  return null;
}

/**
 * Find a JSX element in the given portion of content
 */
export function findJsxElement(
  content: string,
  start: number,
  end: number
): { startIdx: number; endIdx: number; tagName: string } | null {
  // Get the segment to analyze
  const segment = content.substring(start, end);

  // RegEx to match opening tags with attributes (accommodating multi-line)
  const openTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*?>/gs;
  const openMatch = openTagRegex.exec(segment);

  if (openMatch) {
    const tagName = openMatch[1];
    const tagStart = start + openMatch.index;

    // Look for corresponding closing tag
    const closeTagPos = content.indexOf(`</${tagName}>`, tagStart);
    if (closeTagPos !== -1 && closeTagPos < end + 100) {
      // Allow some flexibility
      return {
        startIdx: tagStart,
        endIdx: closeTagPos + `</${tagName}>`.length,
        tagName,
      };
    } else {
      // Self-closing tag or unclosed tag
      const selfClosingEnd = content.indexOf(">", tagStart);
      if (selfClosingEnd !== -1 && selfClosingEnd < end) {
        return {
          startIdx: tagStart,
          endIdx: selfClosingEnd + 1,
          tagName,
        };
      }
    }
  }

  return null;
}
