import { z } from "zod";
import type {
  SCXMLNodeType,
  ElementRole,
  AllowedChildrenType,
} from "@fireworks/types";
import {
  finalConfig,
  historyConfig,
  parallelConfig,
  stateConfig,
} from "./schemas/states";
import {
  assignConfig,
  cancelConfig,
  logConfig,
  raiseConfig,
  scriptConfig,
  sendConfig,
} from "./schemas/actions";
import {
  elseConfig,
  elseIfConfig,
  forEachConfig,
  ifConfig,
  onEntryConfig,
  onExitConfig,
  transitionConfig,
} from "./schemas/control-flow";
import {
  dataConfig,
  dataModelConfig,
  llmConfig,
  scxmlConfig,
} from "./schemas/specialized";

// Helper type for element definitions to ensure type safety with allowed children
export type AllowedChildrenLiteral = AllowedChildrenType;

export interface BaseElementDefinition {
  /**
   * The actual tag name used in the config/tsx
   */
  tag: string;
  /**
   * The type of the element
   */
  scxmlType?: SCXMLNodeType;
  /**
   * The role of the element
   */
  role?: ElementRole;
  /**
   * The allowed children for this element as an array of tags or a function that returns an array of tags
   */
  allowedChildren?: AllowedChildrenType;
  /**
   * The props/options exposed to the schema by this element
   */
  propsSchema: z.ZodObject<any>;

  /**
   * Human-readable description of the element
   */
  description: string;

  /**
   * The documentation for the element in markdown format
   */
  documentation: string;

  /**
   * Array of parent elements that this element can be nested under
   */
  requiredParent?: string[];
  /**
   * Whether this element can be used as a root element
   */
  isRoot?: boolean;
}

export type ElementDefinition<
  Props = any,
  Tag extends string = string,
> = BaseElementDefinition & {
  tag: Tag;
  propsSchema?: z.ZodType<Props>;
  allowedChildren?:
    | AllowedChildrenType
    | ((props: Props) => AllowedChildrenType);
};

// Export all schemas and types
export * from "./schemas/states";
export * from "./schemas/actions";
export * from "./schemas/control-flow";
export * from "./schemas/specialized";
export * from "./types";

export const allElementConfigs = {
  scxml: scxmlConfig,
  state: stateConfig,
  parallel: parallelConfig,
  transition: transitionConfig,
  final: finalConfig,
  onentry: onEntryConfig,
  onexit: onExitConfig,
  history: historyConfig,
  datamodel: dataModelConfig,
  data: dataConfig,
  assign: assignConfig,
  send: sendConfig,
  cancel: cancelConfig,
  script: scriptConfig,
  log: logConfig,
  raise: raiseConfig,
  if: ifConfig,
  elseif: elseIfConfig,
  else: elseConfig,
  foreach: forEachConfig,
  llm: llmConfig,
} as const;

export const allStateElementConfigs = Object.values(allElementConfigs).filter(
  (config) => config.role === "state"
);

export * from "./types";
export * from "./schemas/states";
export * from "./schemas/actions";
export * from "./schemas/control-flow";
export * from "./schemas/specialized";

// Export prop types
export type AssignProps = z.infer<typeof assignConfig.propsSchema>;
export type CancelProps = z.infer<typeof cancelConfig.propsSchema>;
export type LogProps = z.infer<typeof logConfig.propsSchema>;
export type RaiseProps = z.infer<typeof raiseConfig.propsSchema>;
export type ScriptProps = z.infer<typeof scriptConfig.propsSchema>;
export type SendProps = z.infer<typeof sendConfig.propsSchema>;
export type OnEntryProps = z.infer<typeof onEntryConfig.propsSchema>;
export type OnExitProps = z.infer<typeof onExitConfig.propsSchema>;

export * from "./nodeDefinitions";
