// Import everything explicitly from each module to avoid ambiguity
import { isAIMLElement, Unpack } from "./utils";
import {
  BuildContext,
  ExecutionGraphElement,
  StepValueResult,
  ElementExecutionContext,
  ElementExecutionContextSerialized,
  StepValue,
  StepValueResultType,
} from "./runtime";
import { ErrorCode } from "./errorCodes";
import {
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  Secrets,
  RunStreamEvent,
  TOOLS,
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

export type {
  // From utils
  ElementType,
  Unpack,

  // From runtime
  BuildContext,
  ExecutionGraphElement,
  StepValueResult,
  ElementExecutionContext,
  ElementExecutionContextSerialized,
  StepValue,
  StepValueResultType,

  // From values
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  Secrets,
  RunStreamEvent as RunEvent,
  TOOLS,
};

// From errorCodes
export { ErrorCode };

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
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  onExecutionGraphConstruction: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
  propsSchema?: any;
  description?: string;
  documentation?: string;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  type: "element";
  execute?: (
    context: ElementExecutionContext,
    childrenNodes: any[]
  ) => Promise<ExecutionReturnType>;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface ExecutionReturnType {
  result: StepValue;
  contextUpdate?: Record<string, any>;
  exception?: Error;
}
