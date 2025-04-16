// Type definitions for mdast-util-aiml-jsx
// Project: https://github.com/your-repo/mdast-util-aiml-jsx
// Definitions by: Your Name <your-email@example.com>

// Import base types
import type { Literal, Node, Parent } from "unist";

// Define AIML-specific types
export interface AimlJsxAttribute extends Node {
  type: "aimlJsxAttribute";
  name: string;
  value: string | null;
}

export interface AimlJsxExpressionAttribute extends Literal {
  type: "aimlJsxExpressionAttribute"; // May not be needed for AIML
}

export interface AimlJsxElement extends Parent {
  name: string | null;
  attributes: Array<AimlJsxAttribute | AimlJsxExpressionAttribute>;
}

export interface AimlJsxFlowElement extends AimlJsxElement {
  type: "aimlJsxFlowElement";
  children: Array<Node>; // Define appropriate content model
}

export interface AimlJsxTextElement extends AimlJsxElement {
  type: "aimlJsxTextElement";
  children: Array<Node>; // Define appropriate content model
}

// Options for the to-markdown utility
export interface ToMarkdownOptions {
  quote?: '"' | "'";
  quoteSmart?: boolean;
  tightSelfClosing?: boolean;
  printWidth?: number;
}

// Declare the exported functions (using 'any' as a placeholder for extension types)
export declare const aimlJsxFromMarkdown: any; // Replace 'any' with actual FromMarkdownExtension type later
export declare function aimlJsxToMarkdown(options?: ToMarkdownOptions): any; // Replace 'any' with actual ToMarkdownExtension type later

// No final export block needed - types and functions are exported above
