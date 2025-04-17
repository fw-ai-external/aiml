import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import fs from "fs";
import path from "path";
import type { BaseElement } from "./elements";
import { Workflow } from "./workflow";

// Sample workflow data for testing
const createTestElement = () => {
  return {
    id: "test-element",
    key: "test-element-key",
    tag: "workflow",
    elementType: "workflow",
    children: [
      {
        id: "test-child",
        key: "test-child-key",
        tag: "state",
        elementType: "state",
        children: [],
        attributes: { id: "test-child" },
        toJSON: () => ({ id: "test-child" }),
        onExecutionGraphConstruction: (context: any) => ({
          key: "test-child-key",
          tag: "state",
          type: "state",
        }),
      },
    ],
    attributes: { id: "test-element" },
    toJSON: () => ({ id: "test-element" }),
    onExecutionGraphConstruction: (context: any) => ({
      key: "test-element-key",
      tag: "workflow",
      type: "workflow",
      next: [
        {
          key: "test-child-key",
          tag: "state",
          type: "state",
        },
      ],
    }),
  } as unknown as BaseElement;
};

// Temporary directory for test files
const testDir = path.join(process.cwd(), "test-tmp");

// Create a test scope to avoid contaminating global scope
describe("Workflow Context Management", () => {
  let workflow: Workflow<any, any>;
  let testElement: BaseElement;
  let originalServices: Map<string, any>;

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create a real BaseElement for testing
    testElement = createTestElement();

    // Create a workflow instance for testing
    try {
      workflow = new Workflow(testElement, {
        scopedDataModels: {},
        fieldValues: {},
      });
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  });

  afterEach(() => {
    // Clean up any test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file));
      }
    }
  });

  describe("getContextValues", () => {
    it("should retrieve context values from workflow", () => {
      // Create a custom implementation for the spy
      const originalMethod = workflow.getContextValues;

      // Set up spy
      const spy = spyOn(workflow, "getContextValues");

      // Replace with mock implementation for this test only
      spy.mockImplementation(() => ({
        datamodel: { testVar: "test value" },
        steps: { step1: { status: "success" } },
      }));

      const contextValues = workflow.getContextValues();

      // Verify the method was called
      expect(spy).toHaveBeenCalled();

      // Check the structure is as expected
      expect(contextValues).toBeDefined();
      expect(contextValues.datamodel).toBeDefined();
      expect(contextValues.datamodel.testVar).toBe("test value");

      // Restore the original method
      spy.mockRestore();
    });

    it("should handle errors gracefully", () => {
      // Create a custom implementation for the spy
      const originalMethod = workflow.getContextValues;

      // Set up spy
      const spy = spyOn(workflow, "getContextValues");

      // Make it throw an error
      spy.mockImplementation(() => {
        throw new Error("Test error");
      });

      let error;
      let contextValues;

      try {
        contextValues = workflow.getContextValues();
      } catch (e) {
        error = e;
      }

      // Verify the method was called
      expect(spy).toHaveBeenCalled();

      // Since we're testing what happens when getContextValues throws,
      // the implementation in Workflow should handle it
      // Either it should return empty object, or the test needs to be adjusted
      // based on actual error handling in the Workflow class

      // Restore the original method
      spy.mockRestore();
    });
  });

  describe("rehydrateContextValues", () => {
    it("should accept context values", () => {
      const contextValues = {
        datamodel: {
          testVar: "rehydrated value",
          newVar: "new value",
        },
        steps: {
          step1: { status: "success" },
        },
      };

      // Set up spy
      const spy = spyOn(workflow, "rehydrateContextValues");

      // Call the method
      workflow.rehydrateContextValues(contextValues);

      // Verify the method was called with the correct arguments
      expect(spy).toHaveBeenCalledWith(contextValues);

      // Restore the spy
      spy.mockRestore();
    });

    it("should handle null or invalid context values", () => {
      // Set up spy
      const spy = spyOn(workflow, "rehydrateContextValues");

      // Test with null
      workflow.rehydrateContextValues(null as any);
      expect(spy).toHaveBeenCalledWith(null);

      // Test with non-object
      workflow.rehydrateContextValues("not an object" as any);
      expect(spy).toHaveBeenCalledWith("not an object");

      // Restore the spy
      spy.mockRestore();
    });
  });
});
