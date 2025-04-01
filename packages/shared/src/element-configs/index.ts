import type { z } from "zod";
import type { ElementDefinition, ElementType } from "../types";

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
  foreachConfig,
  ifConfig,
  onEntryConfig,
  onExitConfig,
  transitionConfig,
} from "./schemas/control-flow";
import {
  contentConfig,
  donedataConfig,
  finalizeConfig,
  historyConfig,
  initialConfig,
  invokeConfig,
  paramConfig,
  scxmlConfig,
} from "./schemas/scxml";
import {
  dataConfig,
  dataModelConfig,
  instructionsConfig,
  llmConfig,
  onChunkConfig,
  onErrorConfig,
  promptConfig,
  sendObjectConfig,
  sendTextConfig,
  sendToolCallsConfig,
  toolCallConfig,
  workflowConfig,
} from "./schemas/specialized";
import { finalConfig, parallelConfig, stateConfig } from "./schemas/states";

export const allElementConfigs: Record<ElementType, ElementDefinition> = {
  workflow: workflowConfig,
  state: stateConfig,
  parallel: parallelConfig,
  final: finalConfig,
  datamodel: dataModelConfig,
  data: dataConfig,
  assign: assignConfig,
  onentry: onEntryConfig,
  onexit: onExitConfig,
  transition: transitionConfig,
  if: ifConfig,
  elseif: elseIfConfig,
  else: elseConfig,
  foreach: foreachConfig,
  script: scriptConfig,
  llm: llmConfig,
  toolcall: toolCallConfig,
  log: logConfig,
  sendText: sendTextConfig,
  sendToolCalls: sendToolCallsConfig,
  sendObject: sendObjectConfig,
  onerror: onErrorConfig,
  onchunk: onChunkConfig,
  prompt: promptConfig,
  instructions: instructionsConfig,
  cancel: cancelConfig,
  raise: raiseConfig,
  send: sendConfig,
  // Add SCXML specific elements
  scxml: scxmlConfig,
  initial: initialConfig,
  history: historyConfig,
  donedata: donedataConfig,
  content: contentConfig,
  param: paramConfig,
  invoke: invokeConfig,
  finalize: finalizeConfig,
} as const;

// Import the registration function AFTER allElementConfigs is defined
import { registerAllElementConfigs } from "./nodeDefinitions";

// Register all element conf, ElementDefinitionigs now that they've been initialized
registerAllElementConfigs(allElementConfigs);

export const allStateElementConfigs = Object.values(allElementConfigs).filter(
  (config) => config.role === "state"
);

export * from "./schemas/states";
export * from "./schemas/actions";
export * from "./schemas/control-flow";
export * from "./schemas/specialized";
export * from "./schemas/scxml";

// Export prop types
export type AssignProps = z.infer<typeof assignConfig.propsSchema>;
export type LogProps = z.infer<typeof logConfig.propsSchema>;
export type ScriptProps = z.infer<typeof scriptConfig.propsSchema>;
export type OnEntryProps = z.infer<typeof onEntryConfig.propsSchema>;
export type OnExitProps = z.infer<typeof onExitConfig.propsSchema>;
export type ToolCallProps = z.infer<typeof toolCallConfig.propsSchema>;
export type SendTextProps = z.infer<typeof sendTextConfig.propsSchema>;
export type SendToolCallsProps = z.infer<
  typeof sendToolCallsConfig.propsSchema
>;
export type SendObjectProps = z.infer<typeof sendObjectConfig.propsSchema>;
export type OnErrorProps = z.infer<typeof onErrorConfig.propsSchema>;
export type OnChunkProps = z.infer<typeof onChunkConfig.propsSchema>;
export type PromptProps = z.infer<typeof promptConfig.propsSchema>;
export type InstructionsProps = z.infer<typeof instructionsConfig.propsSchema>;
export type CancelProps = z.infer<typeof cancelConfig.propsSchema>;
export type RaiseProps = z.infer<typeof raiseConfig.propsSchema>;
export type SendProps = z.infer<typeof sendConfig.propsSchema>;
// Export new SCXML prop types
export type ScxmlProps = z.infer<typeof scxmlConfig.propsSchema>;
export type InitialProps = z.infer<typeof initialConfig.propsSchema>;
export type HistoryProps = z.infer<typeof historyConfig.propsSchema>;
export type DonedataProps = z.infer<typeof donedataConfig.propsSchema>;
export type ContentProps = z.infer<typeof contentConfig.propsSchema>;
export type ParamProps = z.infer<typeof paramConfig.propsSchema>;
export type InvokeProps = z.infer<typeof invokeConfig.propsSchema>;
export type FinalizeProps = z.infer<typeof finalizeConfig.propsSchema>;

export * from "./nodeDefinitions";
