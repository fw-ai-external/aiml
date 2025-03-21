// Import everything explicitly from each module to avoid ambiguity
import { isAIMLElement, Unpack } from "./utils";

import { HTTPErrorCode } from "./errorCodes";
import {
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  Secrets,
  RunStreamEvent,
  TOOLS,
  APIStreamEvent,
  ToolCall,
  ToolCallSchema,
} from "./values";
import type { z } from "zod";
import type {
  ElementRole,
  AllowedChildrenType,
  SerializedElement,
  ElementType,
} from "./elements";
export * from "./values/data-types";
export * from "./values";
// Re-export everything explicitly
export {
  // From utils
  isAIMLElement,
};
export * from "./diagnostics";

export type {
  // From utils
  ElementType,
  Unpack,

  // From values
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  Secrets,
  RunStreamEvent as RunEvent,
  TOOLS,
  APIStreamEvent,
  ToolCall,
};

// From values
export { ToolCallSchema };

// From errorCodes
export { HTTPErrorCode };

// Re-export modules
export * from "./diagnostics";
export * from "./elements";
export * from "./openai";
export * from "./datamodel";

// Re-export types from elements.ts to maintain backward compatibility
export type {
  ElementType as ElementsElementType,
  ElementRole,
  AllowedChildrenType,
  SerializedBaseElement,
  SerializedElement,
  Attributes,
  ASTNodeType,
  CommentNode,
  TextNode,
  ExpressionNode,
  ParagraphNode,
  HeaderNode,
  HeaderFieldNode,
  ImportNode,
  FireAgentNode,
} from "./elements";

export { elementRoleMap } from "./elements";

/**
 * Configuration for a base element
 */
export interface SerializedElementConfig {
  id: string;
  key: string;
  tag: string;
  role: ElementRole;
  elementType: ElementType;
  attributes?: Record<string, any>;
  children?: SerializedElement[];
  parent?: SerializedElement;
  propsSchema?: any;
  description?: string;
  documentation?: string;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  type: "element";
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}
