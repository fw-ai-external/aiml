export * from "./utils";
export * from "./runtime";
export * from "./errorCodes";
export * from "./diagnostics";
export * from "./elements";
export * from "./values";
import type {
  BuildContext,
  ExecutionGraphElement,
  RunstepOutput,
  ElementExecutionContext,
  ElementExecutionContextSerialized,
  StepValue,
} from "./runtime";
import type {
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  RunStepInput,
  APIStreamEvent,
  ToolCall,
  ToolCallSchema,
  Secrets,
  RunEvent,
} from "./values";
import type { z } from "zod";
import { ErrorCode } from "./errorCodes";

export type {
  ExecutionGraphElement,
  RunstepOutput,
  BuildContext,
  ElementExecutionContext,
  ElementExecutionContextSerialized,
  StepValue,
  ErrorResult,
  JSONObject,
  OpenAIToolCall,
  RunStepInput,
  APIStreamEvent,
  ToolCall,
  ToolCallSchema,
  Secrets,
  RunEvent,
};

export { ErrorCode };

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
  execute?: any;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
}

// Re-export types from elements.ts to maintain backward compatibility
import type {
  ElementType,
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

import { elementRoleMap } from "./elements";

export type {
  ElementType,
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
};

export { elementRoleMap };
