import { expect, test, describe, beforeEach } from "bun:test";
import { DataModelRegistry } from "./DataModelRegistry";
import type { DataModel } from "./DataModelRegistry";
import { z } from "zod";

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
          schema: z.string(),
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
          schema: z.string(),
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
          schema: z.string(),
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
          schema: z.string(),
        },
        field2: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 42,
          schema: z.number(),
        },
      });

      const scoped = registry.getScopedDataModel("test");
      const json = scoped.toJson();
      expect(json).toEqual({ field1: "default", field2: 42 });
    });
  });

  describe("Validation", () => {
    test("should validate values with zod schema", () => {
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string().min(3),
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", "ab")).toThrow();
      expect(() => scoped.set("field1", "valid")).not.toThrow();
    });

    test("should validate number types", () => {
      registry.addDataModel("test", {
        field1: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 10,
          schema: z.number().min(5),
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", 3)).toThrow();
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
          schema: z.boolean(),
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", "not a boolean")).toThrow();
      expect(() => scoped.set("field1", true)).not.toThrow();
    });

    test("should validate JSON types", () => {
      const jsonSchema = z.object({
        prop1: z.string(),
        prop2: z.number(),
      });

      registry.addDataModel("test", {
        field1: {
          type: "json",
          readonly: false,
          fromRequest: false,
          defaultValue: { prop1: "value", prop2: 42 },
          schema: jsonSchema,
        },
      });

      const scoped = registry.getScopedDataModel("test");
      expect(() => scoped.set("field1", { prop1: "value" })).toThrow();
      expect(() =>
        scoped.set("field1", { prop1: "new value", prop2: 99 })
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
          schema: z.string(),
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
          schema: z.string(),
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
          schema: z.string(),
        },
      });

      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
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
          schema: z.string(),
        },
      });

      registry.addDataModel("parent.child1", {
        child1Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child1 value",
          schema: z.string(),
        },
      });

      registry.addDataModel("parent.child2", {
        child2Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child2 value",
          schema: z.string(),
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
          schema: z.string(),
        },
      });

      registry.addDataModel("parent.child", {
        sharedField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
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
          schema: z.string(),
        },
      });

      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
        },
      });
    });
  });

  describe("Bulk Operations", () => {
    test("should hydrate multiple data models with validation", () => {
      const registry = new DataModelRegistry();
      const models: Record<string, DataModel> = {
        scope1: {
          field1: {
            type: "string" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: "valid",
            schema: z.string().min(3),
          },
        },
        scope2: {
          field2: {
            type: "number" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: 42,
            schema: z.number().min(0),
          },
        },
      };

      registry.hydrateDataModels(models);

      expect(registry.getScopedDataModel("scope1").get("field1")).toBe("valid");
      expect(registry.getScopedDataModel("scope2").get("field2")).toBe(42);
    });

    test("should throw when hydrating invalid models", () => {
      const registry = new DataModelRegistry();
      const models: Record<string, DataModel> = {
        scope1: {
          field1: {
            type: "string" as const,
            readonly: false,
            fromRequest: false,
            defaultValue: "a", // Too short (min 3)
            schema: z.string().min(3),
          },
        },
      };

      expect(() => registry.hydrateDataModels(models)).toThrow();
    });

    test("should rehydrate from dump while skipping fromRequest fields", () => {
      const registry = new DataModelRegistry();
      registry.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "value1",
          schema: z.string(),
        },
        field2: {
          type: "string",
          readonly: false,
          fromRequest: true,
          defaultValue: "requestValue",
          schema: z.string(),
        },
      });

      const json = registry.toJSON();
      const newRegistry = new DataModelRegistry();
      newRegistry.rehydrateFromDump(json);

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
          schema: z.string(),
        },
      });
      registry.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "childValue",
          schema: z.string(),
        },
      });

      const json = registry.toJSON();
      const newRegistry = new DataModelRegistry();
      newRegistry.rehydrateFromDump(json);

      const scoped = newRegistry.getScopedDataModel("parent.child.grandchild");
      expect(scoped.get("parentField")).toBe("parentValue");
      expect(scoped.get("childField")).toBe("childValue");
    });
  });
});
