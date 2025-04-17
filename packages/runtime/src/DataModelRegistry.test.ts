import { expect, test, describe, beforeEach } from "bun:test";
import { DataModelRegistry } from "./DataModelRegistry";
import type { DataModel } from "@fireworks/shared";

describe("DataModelRegistry Class", () => {
  let registry: DataModelRegistry;

  beforeEach(() => {
    registry = new DataModelRegistry();
  });

  describe("Basic Functionality", () => {
    test("should create a DataModelRegistry instance", () => {
      expect(registry).toBeInstanceOf(DataModelRegistry);
    });

    test("should add a data model to a scope", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(scoped.has("field1")).toBe(true);
    });

    test("should get field value with default value", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(scoped.get("field1")).toBe("default");
    });

    test("should set field value", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      scoped.set("field1", "new value");
      expect(scoped.get("field1")).toBe("new value");
    });

    test("should convert to JSON", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: {
            type: "string",
          },
        },
        field2: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 42,
          schema: {
            type: "number",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      const json = scoped.toJSON();
      expect(json).toEqual({ field1: "default", field2: 42 });
    });
  });

  describe("Validation", () => {
    test("should validate values with json schema", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", 44)).toThrow();
      expect(() => scoped.set("field1", "valid")).not.toThrow();
    });

    test("should validate number types", () => {
      registry.addDataModel("test", {
        field1: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 10,
          schema: {
            type: "number",
            minimum: 0,
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", 3)).not.toThrow();
      expect(() => scoped.set("field1", "not a number")).toThrow();
      expect(() => scoped.set("field1", 10)).not.toThrow();
    });

    test("should validate boolean types", () => {
      registry.addDataModel("test", {
        field1: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: false,
          schema: {
            type: "boolean",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", "not a boolean")).toThrow();
      expect(() => scoped.set("field1", false)).not.toThrow();
    });

    test("should validate JSON types", () => {
      registry.addDataModel("test", {
        field1: {
          type: "json",
          readonly: false,
          fromRequest: false,
          defaultValue: { prop1: "value", prop2: 42 },
          schema: {
            type: "object",
            required: ["prop1", "prop2"], // Both properties required
            properties: {
              prop1: {
                type: "string",
                minLength: 3, // Enforce minimum length
              },
              prop2: {
                type: "number",
                minimum: 0, // Only positive numbers
              },
            },
            additionalProperties: false, // No extra properties allowed
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");

      // Missing required property
      expect(() => scoped.set("field1", { prop1: "value" })).toThrow();

      // Invalid property value
      expect(() =>
        scoped.set("field1", { prop1: "val", prop2: "not a number" })
      ).toThrow();

      // Extra property
      expect(() =>
        scoped.set("field1", {
          prop1: "valid",
          prop2: 99,
          extra: "invalid",
        })
      ).toThrow();

      // Valid update
      expect(() =>
        scoped.set("field1", { prop1: "valid", prop2: 99 })
      ).not.toThrow();
    });
  });

  describe("Read-only Protection", () => {
    test("should prevent modification of readonly fields", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: true,
          fromRequest: false,
          defaultValue: "cannot change",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", "new value")).toThrow();
      expect(scoped.get("field1")).toBe("cannot change");
    });

    test("should allow modification of non-readonly fields", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "can change",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", "new value")).not.toThrow();
      expect(scoped.get("field1")).toBe("new value");
    });
  });

  describe("Scope Hierarchy", () => {
    test("should inherit fields from parent scopes", () => {
      registry.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: {
            type: "string",
          },
        },
      });

      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("parent.child.grandchild");
      expect(scoped.has("parentField")).toBe(true);
      expect(scoped.has("childField")).toBe(true);
      expect(scoped.get("parentField")).toBe("parent value");
      expect(scoped.get("childField")).toBe("child value");
    });

    test("should not access fields from sibling scopes", () => {
      registry.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: {
            type: "string",
          },
        },
      });

      registry.addDataModel("parent.child1", {
        child1Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child1 value",
          schema: {
            type: "string",
          },
        },
      });

      registry.addDataModel("parent.child2", {
        child2Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child2 value",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("parent.child1.grandchild");
      expect(scoped.has("parentField")).toBe(true);
      expect(scoped.has("child1Field")).toBe(true);
      expect(scoped.has("child2Field")).toBe(false);
    });

    test("most specific parent scope wins for field definitions", () => {
      registry.addDataModel("parent", {
        sharedField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: {
            type: "string",
          },
        },
      });

      registry.addDataModel("parent.child", {
        sharedField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("parent.child.grandchild");
      expect(scoped.get("sharedField")).toBe("child value");
    });

    test("modifying a field should affect the field's original scope", () => {
      registry.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: {
            type: "string",
          },
        },
      });

      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: {
            type: "string",
          },
        },
      });

      const scoped = registry.getScopedDataModel("parent.child.grandchild");
      scoped.set("parentField", "new parent value");
      scoped.set("childField", "new child value");

      const parentScoped = registry.getScopedDataModel("parent");
      const childScoped = registry.getScopedDataModel("parent.child");

      expect(parentScoped.get("parentField")).toBe("new parent value");
      expect(childScoped.get("childField")).toBe("new child value");
    });
  });

  describe("Bulk Operations", () => {
    test.skip("should hydrate multiple data models with validation", () => {
      const registry = new DataModelRegistry();
      const models: Record<string, DataModel> = {
        scope1: {
          field1: {
            type: "string" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: "valid",
            schema: {
              type: "string",
              minLength: 3,
            },
          },
        },
        scope2: {
          field2: {
            type: "number" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: 42,
            schema: {
              type: "number",
              minimum: 0,
            },
          },
        },
      };

      const newRegistry = DataModelRegistry.rehydrateFromDump({
        scopedDataModels: models,
        fieldValues: {},
      });

      expect(newRegistry.getScopedDataModel("scope1").get("field1")).toBe(
        "valid"
      );
      expect(newRegistry.getScopedDataModel("scope2").get("field2")).toBe(42);
    });

    test.skip("should throw when hydrating invalid models", () => {
      const models: Record<string, DataModel> = {
        scope1: {
          field1: {
            type: "string" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: "a",
            schema: {
              type: "number",
            },
          },
        },
      };

      expect(() =>
        DataModelRegistry.rehydrateFromDump({
          scopedDataModels: models,
          fieldValues: {},
        })
      ).toThrow();
    });

    test("should rehydrate from dump while skipping fromRequest fields", () => {
      const registry = new DataModelRegistry();
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "value1",
          schema: {
            type: "string",
          },
        },
        field2: {
          type: "string",
          readonly: false,
          fromRequest: true,
          defaultValue: "requestValue",
          schema: {
            type: "string",
          },
        },
      });

      const json = registry.toJSON();
      const newRegistry = DataModelRegistry.rehydrateFromDump(json);

      const scoped = newRegistry.getScopedDataModel("test");
      expect(scoped.get("field1")).toBe("value1");
      expect(scoped.get("field2")).toBeUndefined();
    });

    test("should maintain scope hierarchy when rehydrating", () => {
      const registry = new DataModelRegistry();
      registry.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parentValue",
          schema: {
            type: "string",
          },
        },
      });
      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "childValue",
          schema: {
            type: "string",
          },
        },
      });

      const json = registry.toJSON();
      const newRegistry = DataModelRegistry.rehydrateFromDump(json);

      const scoped = newRegistry.getScopedDataModel("parent.child.grandchild");
      expect(scoped.get("parentField")).toBe("parentValue");
      expect(scoped.get("childField")).toBe("childValue");
    });
  });
});
