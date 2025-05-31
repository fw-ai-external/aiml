import {
  type CompletionItem,
  CompletionItemKind,
  type Position,
  type TextDocument,
} from "vscode-languageserver";
import { allElementConfigs } from "@aiml/shared";

// Get all AIML elements from shared config
const ALL_AIML_ELEMENTS = Object.keys(allElementConfigs);

// Categorize elements based on their type from shared config
const WORKFLOW_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) => {
  const config = allElementConfigs[name as keyof typeof allElementConfigs];
  return config?.type === "state" || ["workflow", "scxml"].includes(name);
});

const CONTROL_FLOW_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) =>
  ["if", "elseif", "else", "foreach"].includes(name)
);

const ACTION_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) => {
  const config = allElementConfigs[name as keyof typeof allElementConfigs];
  return config?.type === "action";
});

const DATAMODEL_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) =>
  ["datamodel", "data", "assign"].includes(name)
);

const EVENT_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) =>
  ["onentry", "onexit", "onerror", "onchunk"].includes(name)
);

const CONTENT_ELEMENTS = ALL_AIML_ELEMENTS.filter((name) =>
  [
    "prompt",
    "instructions",
    "donedata",
    "content",
    "param",
    "finalize",
  ].includes(name)
);

// Define common attributes for elements
const COMMON_ATTRIBUTES = ["id", "name", "expr"];

/**
 * Get attributes for an element from its schema
 */
function getElementAttributesFromSchema(elementName: string): string[] {
  const config =
    allElementConfigs[elementName as keyof typeof allElementConfigs];
  if (!config?.propsSchema?.shape) {
    return COMMON_ATTRIBUTES;
  }

  try {
    const schemaKeys = Object.keys(config.propsSchema.shape);
    return [...new Set([...schemaKeys, ...COMMON_ATTRIBUTES])];
  } catch {
    return COMMON_ATTRIBUTES;
  }
}

// Popular model names for completion (corrected format)
const POPULAR_MODELS = [
  "accounts/fireworks/models/llama-v3p1-8b-instruct",
  "accounts/fireworks/models/qwen2-72b-instruct",
  "accounts/fireworks/models/deepseek-v3",
  "accounts/fireworks/models/mixtral-8x7b-instruct",
  "accounts/fireworks/models/llama-v3p1-70b-instruct",
];

// AIML expression patterns for completion
const AIML_EXPRESSIONS = [
  {
    label: "({state}) =>",
    insertText: "({${1:state}}) => ${2:expression}",
    detail: "Access workflow state",
  },
  {
    label: "({userInput}) =>",
    insertText: "({${1:userInput}}) => ${2:expression}",
    detail: "Access user input",
  },
  {
    label: "({lastElement}) =>",
    insertText: "({${1:lastElement}}) => ${2:expression}",
    detail: "Access previous step output",
  },
  {
    label: "({workflowInput}) =>",
    insertText: "({${1:workflowInput}}) => ${2:expression}",
    detail: "Access workflow input parameters",
  },
];

// Context analysis interface
interface CompletionContext {
  isInElement: boolean;
  isInAttribute: boolean;
  isInAttributeValue: boolean;
  isInExpression: boolean;
  elementName?: string;
  attributeName?: string;
  isInWorkflow: boolean;
  isInState: boolean;
  parentElements: string[];
}

/**
 * Get all available AIML element tag names
 */
export function getElementTagNames(): string[] {
  return ALL_AIML_ELEMENTS;
}

/**
 * Get attributes for a specific element tag
 * @param tagName The element tag name
 */
export function getElementAttributes(tagName: string): string[] {
  // Use schema-based attribute extraction
  return getElementAttributesFromSchema(tagName);
}

/**
 * Determine if the cursor is inside an element tag
 * @param document The text document
 * @param position The cursor position
 */
export function isInsideElementTag(
  document: TextDocument,
  position: Position
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return false;
  }

  // Find the next '>' after the last '<'
  const nextCloseBracket = text.indexOf(">", lastOpenBracket);

  // If there's no '>' or it's after the cursor, we're inside a tag
  return nextCloseBracket === -1 || nextCloseBracket >= offset;
}

/**
 * Extract the current element tag name at cursor position
 * @param document The text document
 * @param position The cursor position
 */
export function getCurrentElementTagName(
  document: TextDocument,
  position: Position
): string | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return null;
  }

  // Extract the text between '<' and the cursor or the first whitespace
  const tagText = text.substring(lastOpenBracket + 1, offset);
  const match = tagText.match(/^(\w+)/);

  return match ? match[1] : null;
}

/**
 * Check if cursor is at a position where attribute names should be suggested
 * @param document The text document
 * @param position The cursor position
 */
export function isAtAttributePosition(
  document: TextDocument,
  position: Position
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Find the last '<' before the cursor
  let lastOpenBracket = text.lastIndexOf("<", offset);
  if (lastOpenBracket === -1) {
    return false;
  }

  // Find the next '>' after the last '<'
  const nextCloseBracket = text.indexOf(">", lastOpenBracket);

  // If there's no '>' or it's after the cursor, and we have a tag name followed by whitespace
  if (nextCloseBracket === -1 || nextCloseBracket >= offset) {
    const tagText = text.substring(lastOpenBracket + 1, offset);
    return /^\w+\s+/.test(tagText);
  }

  return false;
}

/**
 * Improved element stack tracking with proper self-closing tag handling
 */
function buildElementStack(text: string, offset: number): string[] {
  try {
    const elementStack: string[] = [];
    let i = 0;

    while (i < offset) {
      const openBracket = text.indexOf("<", i);
      if (openBracket === -1 || openBracket >= offset) break;

      const closeBracket = text.indexOf(">", openBracket);
      if (closeBracket === -1) break;

      try {
        const tagContent = text.substring(openBracket + 1, closeBracket);

        if (tagContent.startsWith("/")) {
          // Closing tag
          const tagName = tagContent.substring(1).trim();
          const lastIndex = elementStack.lastIndexOf(tagName);
          if (lastIndex !== -1) {
            elementStack.splice(lastIndex, 1);
          }
        } else if (tagContent.endsWith("/") || isSelfClosingTag(tagContent)) {
          // Self-closing tag - don't add to stack
        } else {
          // Opening tag
          const tagName = tagContent.split(/\s/)[0];
          if (tagName) {
            elementStack.push(tagName);
          }
        }
      } catch (tagError) {
        console.error(
          `Error processing tag at position ${openBracket}: ${tagError}`
        );
      }

      i = closeBracket + 1;
    }

    return elementStack;
  } catch (error) {
    console.error(`Error building element stack: ${error}`);
    return []; // Return empty stack on error
  }
}

/**
 * Check if a tag is self-closing based on known self-closing tags
 */
function isSelfClosingTag(tagContent: string): boolean {
  const tagName = tagContent.split(/\s/)[0];
  // Use known self-closing tags list
  return ["data", "assign", "transition"].includes(tagName);
}

/**
 * Analyze the completion context at the given position
 */
function analyzeCompletionContext(
  document: TextDocument,
  position: Position
): CompletionContext {
  try {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Build element stack using improved algorithm
    const parentElements = buildElementStack(text, offset);

    // Check if we're inside an element tag
    const lastOpenBracket = text.lastIndexOf("<", offset);
    const nextCloseBracket = text.indexOf(">", lastOpenBracket);
    const isInElement =
      lastOpenBracket !== -1 &&
      (nextCloseBracket === -1 || nextCloseBracket >= offset);

    // Check if we're inside a JavaScript expression
    const lastOpenBrace = text.lastIndexOf("{", offset);
    const nextCloseBrace = text.indexOf("}", lastOpenBrace);
    const isInExpression =
      lastOpenBrace !== -1 &&
      lastOpenBrace > lastOpenBracket &&
      (nextCloseBrace === -1 || nextCloseBrace >= offset);

    let elementName: string | undefined;
    let isInAttribute = false;
    let isInAttributeValue = false;
    let attributeName: string | undefined;

    if (isInElement && lastOpenBracket !== -1) {
      try {
        const tagContent = text.substring(lastOpenBracket + 1, offset);
        const elementMatch = tagContent.match(/^(\w+)/);
        elementName = elementMatch?.[1];

        // Check if we're in an attribute position
        const afterElementName = tagContent.substring(elementName?.length || 0);
        isInAttribute = /^\s+\w*$/.test(afterElementName);

        // Check if we're in an attribute value
        const attributeValueMatch = afterElementName.match(
          /\s+(\w+)\s*=\s*["']?([^"']*)?$/
        );
        if (attributeValueMatch) {
          isInAttributeValue = true;
          attributeName = attributeValueMatch[1];
        }
      } catch (innerError) {
        console.error(`Error analyzing tag content: ${innerError}`);
      }
    }

    return {
      isInElement,
      isInAttribute,
      isInAttributeValue,
      isInExpression,
      elementName,
      attributeName,
      isInWorkflow:
        parentElements.includes("workflow") || parentElements.includes("scxml"),
      isInState: parentElements.includes("state"),
      parentElements,
    };
  } catch (error) {
    console.error(`Error analyzing completion context: ${error}`);
    // Return a default context that won't crash the server
    return {
      isInElement: false,
      isInAttribute: false,
      isInAttributeValue: false,
      isInExpression: false,
      isInWorkflow: false,
      isInState: false,
      parentElements: [],
    };
  }
}

/**
 * Get completions for element tags based on context
 */
function getElementCompletions(context: CompletionContext): CompletionItem[] {
  let relevantElements: string[] = [];

  if (!context.isInWorkflow) {
    // Top-level elements
    relevantElements = ["workflow", "scxml"];
  } else if (context.isInState) {
    // Inside a state - suggest actions and control flow
    relevantElements = [
      ...ACTION_ELEMENTS,
      ...CONTROL_FLOW_ELEMENTS,
      ...EVENT_ELEMENTS,
    ];
  } else if (context.isInWorkflow) {
    // Inside workflow but not in state - suggest workflow elements
    relevantElements = [...WORKFLOW_ELEMENTS, ...DATAMODEL_ELEMENTS];
  } else {
    // Default to all elements
    relevantElements = ALL_AIML_ELEMENTS;
  }

  return relevantElements.map((tag) => ({
    label: tag,
    kind: CompletionItemKind.Class,
    detail: `AIML Element`,
    documentation: getElementDocumentation(tag),
    insertText: getElementInsertText(tag),
  }));
}

/**
 * Get completions for attributes based on element context
 */
function getAttributeCompletions(elementName: string): CompletionItem[] {
  const attributes = getElementAttributes(elementName);

  return attributes.map((attr) => ({
    label: attr,
    kind: CompletionItemKind.Property,
    detail: `Attribute`,
    documentation: getAttributeDocumentation(elementName, attr),
    insertText: `${attr}="\${1}"`,
  }));
}

/**
 * Get completions for attribute values
 */
function getAttributeValueCompletions(
  elementName: string,
  attributeName: string
): CompletionItem[] {
  const completions: CompletionItem[] = [];

  if (attributeName === "model" && elementName === "llm") {
    // Suggest popular model names
    completions.push(
      ...POPULAR_MODELS.map((model) => ({
        label: model,
        kind: CompletionItemKind.Value,
        detail: "LLM Model",
        documentation: `Fireworks AI model: ${model}`,
      }))
    );
  } else if (attributeName === "type" && elementName === "transition") {
    // Suggest transition types
    completions.push(
      ...["internal", "external"].map((type) => ({
        label: type,
        kind: CompletionItemKind.Value,
        detail: "Transition Type",
        documentation: `Transition type: ${type}`,
      }))
    );
  } else if (attributeName === "language" || attributeName === "lang") {
    // Suggest script languages
    completions.push(
      ...["javascript", "python"].map((lang) => ({
        label: lang,
        kind: CompletionItemKind.Value,
        detail: "Script Language",
        documentation: `Script language: ${lang}`,
      }))
    );
  } else if (attributeName === "cond" || attributeName === "expr") {
    // Suggest AIML expressions for conditions and expressions
    completions.push(
      ...AIML_EXPRESSIONS.map((expr) => ({
        label: expr.label,
        kind: CompletionItemKind.Snippet,
        detail: expr.detail,
        insertText: expr.insertText,
        documentation: `AIML expression: ${expr.detail}`,
      }))
    );
  }

  return completions;
}

/**
 * Get completions for AIML expressions
 */
function getExpressionCompletions(): CompletionItem[] {
  return AIML_EXPRESSIONS.map((expr) => ({
    label: expr.label,
    kind: CompletionItemKind.Snippet,
    detail: expr.detail,
    insertText: expr.insertText,
    documentation: `AIML expression: ${expr.detail}`,
  }));
}

/**
 * Get documentation for an element using shared config
 */
function getElementDocumentation(elementName: string): string {
  const config =
    allElementConfigs[elementName as keyof typeof allElementConfigs];
  if (config?.description) {
    return config.description;
  }

  // Fallback documentation
  const docs: Record<string, string> = {
    workflow: "Defines an AIML workflow with states and transitions",
    scxml: "SCXML-compatible workflow definition",
    state: "Defines a state in the workflow with possible actions",
    llm: "Makes a call to a large language model",
    script: "Executes JavaScript or Python code",
    if: "Conditional execution based on a condition",
    foreach: "Iterates over an array or collection",
    transition: "Defines a transition between states",
    data: "Declares a data variable in the datamodel",
    assign: "Assigns a value to a datamodel variable",
    toolcall: "Executes a tool/function call",
    prompt: "Defines the prompt text for an LLM call",
    instructions: "Provides instructions for an LLM call",
  };

  return docs[elementName] || `AIML ${elementName} element`;
}

/**
 * Get documentation for an attribute
 */
function getAttributeDocumentation(
  elementName: string,
  attributeName: string
): string {
  const config =
    allElementConfigs[elementName as keyof typeof allElementConfigs];
  if (config?.propsSchema?.shape?.[attributeName]?.description) {
    return config.propsSchema.shape[attributeName].description;
  }

  // Fallback documentation
  const docs: Record<string, Record<string, string>> = {
    llm: {
      model: "The LLM model to use for this call",
      temperature: "Controls randomness in the response (0.0-2.0)",
      maxTokens: "Maximum number of tokens to generate",
      topP: "Nucleus sampling parameter (0.0-1.0)",
      instructions: "Instructions for the LLM call",
      prompt: "Prompt text for the LLM call",
    },
    state: {
      id: "Unique identifier for this state",
      name: "Human-readable name for this state",
      initial: "The initial child state (for compound states)",
    },
    transition: {
      target: "The target state for this transition",
      cond: "Condition that must be true for transition",
      event: "Event that triggers this transition",
      type: "Transition type (internal/external)",
    },
    script: {
      language: "Programming language (javascript/python)",
      lang: "Programming language (javascript/python)",
      src: "External script file path",
    },
    data: {
      id: "Variable identifier",
      type: "Data type",
      value: "Initial value",
      expr: "Expression to compute initial value",
    },
  };

  return docs[elementName]?.[attributeName] || `${attributeName} attribute`;
}

/**
 * Get appropriate insert text for an element
 */
function getElementInsertText(elementName: string): string {
  // Use known self-closing tags list
  const selfClosing = ["data", "assign", "transition"].includes(elementName);

  if (selfClosing) {
    return `${elementName} \${1} />`;
  }

  // Special cases for common elements with typical content
  const templates: Record<string, string> = {
    llm: `${elementName} model="\${1:accounts/fireworks/models/deepseek-v3}">\n    <prompt>\${2}</prompt>\n</${elementName}>`,
    script: `${elementName} language="\${1|javascript,python|}">\n    \${2}\n</${elementName}>`,
    if: `${elementName} cond="\${1:({state}) => condition}">\n    \${2}\n</${elementName}>`,
    state: `${elementName} id="\${1:stateName}">\n    \${2}\n</${elementName}>`,
    workflow: `${elementName} id="\${1:workflowName}">\n    \${2}\n</${elementName}>`,
    scxml: `${elementName} id="\${1:workflowName}">\n    \${2}\n</${elementName}>`,
  };

  return templates[elementName] || `${elementName}>\${1}</${elementName}>`;
}

/**
 * Provide completion items based on document context
 * @param document The text document
 * @param position The cursor position
 */
export function provideCompletionItems(
  document: TextDocument,
  position: Position
): CompletionItem[] {
  try {
    const context = analyzeCompletionContext(document, position);

    if (context.isInExpression) {
      // Inside a JavaScript expression - suggest AIML expressions
      return getExpressionCompletions();
    } else if (
      context.isInAttributeValue &&
      context.elementName &&
      context.attributeName
    ) {
      // Suggest attribute values
      return getAttributeValueCompletions(
        context.elementName,
        context.attributeName
      );
    } else if (context.isInAttribute && context.elementName) {
      // Suggest attributes for the current element
      return getAttributeCompletions(context.elementName);
    } else if (!context.isInElement) {
      // Suggest element tags
      return getElementCompletions(context);
    }

    // Default fallback
    return getElementCompletions(context);
  } catch (error) {
    // Log error but don't crash the server
    console.error(
      `Error providing completion items: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // Return empty array to avoid crashing
    return [];
  }
}
