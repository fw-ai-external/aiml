import { mock } from 'bun:test';

// Create a consistent mock for the element-config module to be used across tests
export const setupElementConfigMock = () => {
  const mockAllElementConfigs = {
    state: {
      documentation: 'State element documentation',
      propsSchema: {
        shape: {
          id: {
            type: 'string',
            description: 'State identifier (unique within a workflow)',
          },
        },
      },
    },
  };

  // Create all the necessary exports that match the real module
  const mockExports = {
    allElementConfigs: mockAllElementConfigs,
    isSupportedNodeName: (nodeName: string) => nodeName === 'state',
    getNodeDefinitionClass: (tag: string) => {
      if (tag === 'state') {
        return mockAllElementConfigs.state;
      }
      return null;
    },
    registerNodeDefinitionClass: mock(() => {}),
    allStateElementConfigs: [],
  };

  // Apply the mock
  mock.module('@aiml/shared', () => mockExports);

  return mockExports;
};
