export const allElementConfigs = {
  state: {
    documentation: "State element documentation",
    propsSchema: {
      shape: {
        id: {
          type: "string",
          description: "State identifier (unique within a workflow)",
        },
      },
    },
  },
};

export function isSupportedNodeName(nodeName: string): boolean {
  return nodeName === "state";
}
