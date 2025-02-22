import type { BaseElementDefinition } from "./types";
import { allElementConfigs } from "./index";

const nodeDefinitionClasses = new Map<string, BaseElementDefinition>();

export function registerNodeDefinitionClass(
  tag: string,
  nodeClass: BaseElementDefinition
): void {
  nodeDefinitionClasses.set(tag, nodeClass);
}

export function getNodeDefinitionClass(tag: string): BaseElementDefinition {
  const nodeClass = nodeDefinitionClasses.get(tag);
  if (!nodeClass) {
    throw new Error(`No node definition class found for tag: ${tag}`);
  }
  return nodeClass;
}

export function isSupportedNodeName(nodeName: string): boolean {
  return nodeName in allElementConfigs;
}

// Register all element configs
Object.entries(allElementConfigs).forEach(([tag, config]) => {
  registerNodeDefinitionClass(tag, config);
});
