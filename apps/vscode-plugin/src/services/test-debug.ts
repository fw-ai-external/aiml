import { mock } from 'bun:test';

/**
 * Debug utility for tests to help troubleshoot module loading issues
 */
export function debugModuleLoading(moduleName: string): void {
  try {
    // Capture the module load attempt
    const originalRequire = module.constructor.prototype.require;

    // Override require temporarily to log module resolution
    module.constructor.prototype.require = function (path: string) {
      if (path.includes(moduleName)) {
      }
      return originalRequire.apply(this, [path]);
    };

    // Attempt to load the module to trace what's happening
    try {
      // Force a require of the module to see what happens
      require(moduleName);
    } catch (error) {}

    // Restore original require
    module.constructor.prototype.require = originalRequire;
  } catch (error) {}
}

/**
 * Creates mock package with better debugging for circular dependencies
 */
export function createElementConfigMock() {
  const mockAllElementConfigs = {
    state: {
      documentation: 'State element documentation',
      propsSchema: {
        shape: {
          id: {
            type: 'string',
            description: 'State identifier (unique within a workflow)',
            constructor: { name: 'Object' },
          },
        },
      },
    },
  };

  const mockExports = {
    allElementConfigs: mockAllElementConfigs,
    isSupportedNodeName: (nodeName: string) => {
      return nodeName === 'state';
    },
    getNodeDefinitionClass: (tag: string) => {
      if (tag === 'state') {
        return mockAllElementConfigs.state;
      }
      return null;
    },
    registerNodeDefinitionClass: mock(() => {}),
    allStateElementConfigs: [],
  };

  mock.module('@aiml/shared', () => mockExports);

  return mockExports;
}
