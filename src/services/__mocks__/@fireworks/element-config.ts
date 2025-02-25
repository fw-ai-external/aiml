// @fireworks/element-config mock implementation for tests
export const allElementConfigs = {
  state: {
    documentation: "State element documentation",
    propsSchema: {
      shape: {
        id: {
          type: "string",
          description: "State identifier (unique within a workflow)",
          constructor: { name: "Object" },
        },
      },
    },
  },
};

export function isSupportedNodeName(nodeName: string): boolean {
  return nodeName === "state";
}

export function getNodeDefinitionClass(tag: string) {
  if (tag === "state") {
    return allElementConfigs.state;
  }
  return null;
}

export function registerNodeDefinitionClass() {
  // Mock implementation
}

export const allStateElementConfigs = [];
