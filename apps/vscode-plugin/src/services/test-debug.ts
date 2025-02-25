import { mock } from "bun:test";

/**
 * Debug utility for tests to help troubleshoot module loading issues
 */
export function debugModuleLoading(moduleName: string): void {
  console.log(`[TEST-DEBUG] Attempting to load module: ${moduleName}`);

  try {
    // Capture the module load attempt
    const originalRequire = module.constructor.prototype.require;

    // Override require temporarily to log module resolution
    module.constructor.prototype.require = function (path: string) {
      if (path.includes(moduleName)) {
        console.log(`[TEST-DEBUG] Module require called for: ${path}`);
        console.log(
          `[TEST-DEBUG] Call stack: ${new Error().stack?.split("\n").slice(1, 4).join("\n")}`
        );
      }
      return originalRequire.apply(this, [path]);
    };

    // Attempt to load the module to trace what's happening
    try {
      // Force a require of the module to see what happens
      require(moduleName);
      console.log(`[TEST-DEBUG] Module ${moduleName} loaded successfully`);
    } catch (error) {
      console.log(`[TEST-DEBUG] Error loading module ${moduleName}:`, error);
    }

    // Restore original require
    module.constructor.prototype.require = originalRequire;
  } catch (error) {
    console.log(`[TEST-DEBUG] Error in debug utility:`, error);
  }
}

/**
 * Creates mock package with better debugging for circular dependencies
 */
export function createElementConfigMock() {
  console.log("[TEST-DEBUG] Creating element-config mock");

  const mockAllElementConfigs = {
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

  const mockExports = {
    allElementConfigs: mockAllElementConfigs,
    isSupportedNodeName: (nodeName: string) => {
      console.log(`[TEST-DEBUG] isSupportedNodeName called with: ${nodeName}`);
      return nodeName === "state";
    },
    getNodeDefinitionClass: (tag: string) => {
      console.log(`[TEST-DEBUG] getNodeDefinitionClass called with: ${tag}`);
      if (tag === "state") {
        return mockAllElementConfigs.state;
      }
      return null;
    },
    registerNodeDefinitionClass: mock(() => {
      console.log("[TEST-DEBUG] registerNodeDefinitionClass called");
    }),
    allStateElementConfigs: [],
  };

  console.log("[TEST-DEBUG] Mocking @fireworks/element-config module");
  mock.module("@fireworks/element-config", () => mockExports);

  return mockExports;
}
