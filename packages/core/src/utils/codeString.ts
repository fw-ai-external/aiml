// Define allowed constructors
const ALLOWED_CONSTRUCTORS = new Set(['Date', 'String', 'Number', 'Boolean', 'Array', 'Object']);

// Define specific dangerous patterns that should be blocked
const DANGEROUS_PATTERNS = [
  // Eval and similar dangerous functions
  /\beval\s*\(/,
  /\bFunction\s*\(/,

  // Block access to dangerous globals
  /\bwindow\b/,
  /\bdocument\b/,
  /\bglobal\b/,
  /\bprocess\b/,

  // Block potentially dangerous patterns
  /\brequire\b/,
  /\bimport\b/,
  /\bexport\b/,

  // Block throw statements
  /\bthrow\b/,

  // Block function declarations (but not arrow functions)
  /\bfunction\s*\w*\s*\(/,

  // Block console usage
  /\bconsole\b/,
];

const DANGEROUS_TEMPLATE_PATTERNS = [
  // Block multi-statement expressions
  /;/,
];

export function valideCodeStringExpressions(
  code: string,
  allowedVars: Set<string> = new Set(),
  codeIsTemplateString: boolean = true,
): boolean | string {
  let matches: string[] = [];
  if (codeIsTemplateString) {
    const templateRegex = /\$\{([^}]+)\}/g;
    matches = code.match(templateRegex) || [];

    if (!matches) return true;
  } else {
    matches = [code];
  }

  const UNSUPPORTED_PATTERNS = codeIsTemplateString ? DANGEROUS_TEMPLATE_PATTERNS : DANGEROUS_PATTERNS;
  let firstError: string | undefined;

  const result = matches.every((match) => {
    // Remove ${ and }
    const expr = codeIsTemplateString ? match.slice(2, -1).trim() : match.trim().replace(/\n/g, '');

    // Check for dangerous patterns first
    if (UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(expr))) {
      const error = `Invalid template string syntax. ${expr} is not valid syntax.`;
      if (!firstError) firstError = error;
      return false;
    }

    // Get all variable references (words not inside strings)
    const variableMatches = (expr.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []).filter((v) => {
      return v.trim() !== '';
    });

    // Check constructor usage
    const newExpr = expr.match(/new\s+([A-Z][a-zA-Z0-9_$]*)/g) || [];
    const hasValidConstructor = newExpr.every((constructor) => ALLOWED_CONSTRUCTORS.has(constructor.slice(4).trim()));

    // If using 'new', ensure it's an allowed constructor
    if (expr.includes('new') && !hasValidConstructor) {
      const error =
        'Invalid constructor usage, only the following constructors are allowed: ' +
        Array.from(ALLOWED_CONSTRUCTORS).join(', ');
      if (!firstError) firstError = error;
      return false;
    }

    // If it's just a constructor call with no ALLOWED_VARS, that's okay
    if (hasValidConstructor && newExpr.length > 0) {
      return true;
    }

    // Otherwise, check if all variable references start with an allowed variable
    const hasAllowedVars = variableMatches.find((varName) => allowedVars.has(varName as any));

    if (!hasAllowedVars) {
      const error = `Invalid variable usage of ${variableMatches.find((v) => !allowedVars.has(v as any))}, only the following variables are allowed: ${Array.from(allowedVars).join(', ')}`;
      if (!firstError) firstError = error;
      return false;
    }
    return true;
  });

  return firstError ? `[CodeStringError]${firstError}` : result;
}
