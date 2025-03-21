import type { ElementDefinition, ElementType } from '../types';

const nodeDefinitionClasses = new Map<string, ElementDefinition>();

export function registerNodeDefinitionClass(tag: string, nodeClass: ElementDefinition): void {
  nodeDefinitionClasses.set(tag, nodeClass);
}

export function getNodeDefinitionClass(tag: string): ElementDefinition {
  const nodeClass = nodeDefinitionClasses.get(tag);
  if (!nodeClass) {
    throw new Error(`No node definition class found for tag: ${tag}`);
  }
  return nodeClass;
}

// Store supported node names separately to break circular dependency
const supportedNodeNames = new Set<string>();

export function registerSupportedNodeName(nodeName: string): void {
  supportedNodeNames.add(nodeName);
}

export function isSupportedNodeName(nodeName: string): boolean {
  return supportedNodeNames.has(nodeName);
}

// Function to register all element configs to be called from index.ts after allElementConfigs is defined
export function registerAllElementConfigs(configs: Record<ElementType, ElementDefinition>): void {
  Object.entries(configs).forEach(([tag, config]) => {
    registerNodeDefinitionClass(tag, config);
    registerSupportedNodeName(tag);
  });
}
