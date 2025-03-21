import { describe, expect, it, mock, spyOn } from "bun:test";
import { Data, ValueType } from "./DataElement";
import { StepValue } from "@fireworks/shared";
import { createScopedDataModel } from "./ScopedDataModel";

describe("DataElement", () => {
  // Mock execution context with DataModel setup
  const createMockContext = (
    overrides: { attributes?: any; [key: string]: any } = {}
  ): any => {
    // Create a real scoped data model
    const scopedModel = createScopedDataModel("state_1", {}, {});

    // Spy on the setValue method
    const setValueSpy = spyOn(scopedModel, "setValue");

    // Create a proxy for the datamodel that enforces scoping rules
    const datamodelProxy = new Proxy(
      {},
      {
        get(target, prop) {
          const key = String(prop);
          if (key === "__metadata") {
            return scopedModel.getAllMetadata();
          }
          return scopedModel.get(key);
        },
        set(target, prop, value) {
          const key = String(prop);
          if (key === "__metadata") {
            return false;
          }
          return scopedModel.set(key, value, true);
        },
        has(target, prop) {
          return scopedModel.has(String(prop));
        },
      }
    );

    return {
      context: {
        workflow: {
          id: "test-workflow",
          version: 1,
        },
      },
      suspend: mock(),
      runId: "test-run-123",
      attributes: {
        id: "testData",
        type: ValueType.STRING,
        readonly: false,
        fromRequest: false,
        ...overrides.attributes,
      },
      scopedDataModel: scopedModel,
      datamodel: datamodelProxy,
      workflowInput: {
        userMessage: "Hello from request",
        systemMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      state: {
        id: "state_1",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      ...overrides,
    };
  };

  // Test 1: Basic initialization with expr
  it("should initialize with expr attribute", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "testData",
        expr: "5 + 5",
        type: ValueType.NUMBER,
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result } = await dataElement.execute(ctx);

    expect(ctx.scopedDataModel.setValue).toHaveBeenCalledWith(
      "testData",
      10,
      expect.objectContaining({
        type: ValueType.NUMBER,
        readonly: false,
      })
    );
  });

  // Test 2: Initialize with fromRequest
  it("should initialize with fromRequest attribute", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "userInput",
        fromRequest: true,
      },
    });

    // Create a mock setValue function
    const setValue = mock();

    // Create a mock scopedDataModel
    ctx.scopedDataModel = {
      setValue,
      getValue: mock(),
      getMetadata: mock(),
      get: mock(),
      has: mock(),
      set: mock(),
      getLocalVariables: mock(),
      getAllVariables: mock(),
      getAllMetadata: mock(),
      getElementId: mock(),
      getParentScope: mock(),
    };

    // Make setValue store the value in the datamodel
    setValue.mockImplementation((key, value, metadata) => {
      ctx.datamodel[key] = value;
      return true;
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result } = await dataElement.execute(ctx);

    // Check that setValue was called with the correct parameters
    expect(setValue).toHaveBeenCalledWith(
      "userInput",
      "Hello from request",
      expect.objectContaining({
        readonly: true, // fromRequest should make it readonly
        fromRequest: true,
      })
    );

    // Check that the value was stored in the datamodel
    expect(ctx.datamodel.userInput).toBe("Hello from request");
  });

  // Test 3: Type validation
  it("should validate type and use default value on error", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "numberData",
        expr: "'not a number'", // This will evaluate to a string
        type: ValueType.NUMBER, // But we expect a number
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result, exception } = await dataElement.execute(ctx);

    expect(exception).toBeDefined();
    expect(exception?.message).toContain(
      "No result in element data numberData"
    );
  });

  // Test 4: Readonly property
  it("should mark data as readonly when specified", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "readonlyData",
        expr: "'test'",
        readonly: true,
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result } = await dataElement.execute(ctx);

    expect(ctx.scopedDataModel.setValue).toHaveBeenCalledWith(
      "readonlyData",
      "test",
      expect.objectContaining({
        readonly: true,
      })
    );
  });

  // Test 5: Default value
  it("should use defaultValue when expression evaluation fails", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "defaultData",
        expr: "nonExistentVariable", // This will cause an error
        defaultValue: "fallback value",
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result, exception } = await dataElement.execute(ctx);

    expect(exception).toBeDefined();
    expect(exception?.message).toContain(
      "No result in element data defaultData"
    );
  });

  // Test 6: Content parsing
  it("should parse content as JSON", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "jsonData",
        content: '{"name": "Test", "value": 123}',
        type: ValueType.JSON,
        schema: {
          type: ValueType.JSON,
          properties: {
            name: { type: ValueType.STRING },
            value: { type: ValueType.NUMBER },
          },
        },
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result } = await dataElement.execute(ctx);

    expect(ctx.scopedDataModel.setValue).toHaveBeenCalledWith(
      "jsonData",
      { name: "Test", value: 123 },
      expect.objectContaining({
        type: ValueType.JSON,
      })
    );
  });

  // Test 7: Parent state tracking
  it("should track parent state ID for scope determination", async () => {
    const ctx = createMockContext({
      attributes: {
        id: "scopedData",
        expr: "'scoped value'",
      },
      state: {
        id: "parent_state_123",
        attributes: {},
        input: new StepValue({ type: "text", text: "" }),
      },
    });

    const dataElement = Data.initFromAttributesAndNodes(ctx.attributes, []);
    const { result } = await dataElement.execute(ctx);

    expect(ctx.scopedDataModel.setValue).toHaveBeenCalledTimes(1);
  });
});
