import { expect, test, describe, beforeEach } from "bun:test";
import { Context } from "./context";
import { z } from "zod";

describe("Context Class", () => {
  let context: Context;

  beforeEach(() => {
    context = new Context();
  });

  describe("Basic Functionality", () => {
    test("should create a Context instance", () => {
      expect(context).toBeInstanceOf(Context);
    });

    test("should add a data model to a scope", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(scoped.has("field1")).toBe(true);
    });

    test("should get field value with default value", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(scoped.get("field1")).toBe("default");
    });

    test("should set field value", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      scoped.set("field1", "new value");
      expect(scoped.get("field1")).toBe("new value");
    });

    test("should convert to JSON", () => {
      context.addDataModel("test", {
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

      const scoped = context.getScopedDataModel("test");
      const json = scoped.toJson();
      expect(json).toEqual({ field1: "default", field2: 42 });
    });
  });

  describe("Validation", () => {
    test("should validate values with zod schema", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string().min(3),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", "ab")).toThrow();
      expect(() => scoped.set("field1", "valid")).not.toThrow();
    });

    test("should validate number types", () => {
      context.addDataModel("test", {
        field1: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 10,
          schema: z.number().min(5),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", 3)).toThrow();
      expect(() => scoped.set("field1", "not a number")).toThrow();
      expect(() => scoped.set("field1", 10)).not.toThrow();
    });

    test("should validate boolean types", () => {
      context.addDataModel("test", {
        field1: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: false,
          schema: z.boolean(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", "not a boolean")).toThrow();
      expect(() => scoped.set("field1", true)).not.toThrow();
    });

    test("should validate JSON types", () => {
      const jsonSchema = z.object({
        prop1: z.string(),
        prop2: z.number(),
      });

      context.addDataModel("test", {
        field1: {
          type: "json",
          readonly: false,
          fromRequest: false,
          defaultValue: { prop1: "value", prop2: 42 },
          schema: jsonSchema,
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", { prop1: "value" })).toThrow();
      expect(() =>
        scoped.set("field1", { prop1: "new value", prop2: 99 })
      ).not.toThrow();
    });
  });

  describe("Read-only Protection", () => {
    test("should prevent modification of readonly fields", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: true,
          fromRequest: false,
          defaultValue: "cannot change",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", "new value")).toThrow();
      expect(scoped.get("field1")).toBe("cannot change");
    });

    test("should allow modification of non-readonly fields", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "can change",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(() => scoped.set("field1", "new value")).not.toThrow();
      expect(scoped.get("field1")).toBe("new value");
    });
  });

  describe("Scope Hierarchy", () => {
    test("should inherit fields from parent scopes", () => {
      context.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: z.string(),
        },
      });

      context.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("parent.child.grandchild");
      expect(scoped.has("parentField")).toBe(true);
      expect(scoped.has("childField")).toBe(true);
      expect(scoped.get("parentField")).toBe("parent value");
      expect(scoped.get("childField")).toBe("child value");
    });

    test("should not access fields from sibling scopes", () => {
      context.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: z.string(),
        },
      });

      context.addDataModel("parent.child1", {
        child1Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child1 value",
          schema: z.string(),
        },
      });

      context.addDataModel("parent.child2", {
        child2Field: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child2 value",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("parent.child1.grandchild");
      expect(scoped.has("parentField")).toBe(true);
      expect(scoped.has("child1Field")).toBe(true);
      expect(scoped.has("child2Field")).toBe(false);
    });

    test("most specific parent scope wins for field definitions", () => {
      context.addDataModel("parent", {
        sharedField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: z.string(),
        },
      });

      context.addDataModel("parent.child", {
        sharedField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("parent.child.grandchild");
      expect(scoped.get("sharedField")).toBe("child value");
    });

    test("modifying a field should affect the field's original scope", () => {
      context.addDataModel("parent", {
        parentField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "parent value",
          schema: z.string(),
        },
      });

      context.addDataModel("parent.child", {
        childField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "child value",
          schema: z.string(),
        },
      });

      const childScoped = context.getScopedDataModel("parent.child");
      const grandchildScoped = context.getScopedDataModel(
        "parent.child.grandchild"
      );

      grandchildScoped.set("parentField", "new parent value");
      expect(childScoped.get("parentField")).toBe("new parent value");
    });
  });

  describe("Corner Cases", () => {
    test("should handle non-existent fields", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(scoped.has("nonExistentField")).toBe(false);
      expect(scoped.get("nonExistentField")).toBeUndefined();
      expect(() => scoped.set("nonExistentField", "value")).toThrow();
    });

    test("should handle empty scopes", () => {
      const scoped = context.getScopedDataModel("empty");
      expect(scoped.toJson()).toEqual({});
    });

    test("should handle deeply nested scopes", () => {
      context.addDataModel("level1", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "level1",
          schema: z.string(),
        },
      });

      context.addDataModel("level1.level2", {
        field2: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "level2",
          schema: z.string(),
        },
      });

      context.addDataModel("level1.level2.level3", {
        field3: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "level3",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel(
        "level1.level2.level3.level4.level5"
      );
      expect(scoped.has("field1")).toBe(true);
      expect(scoped.has("field2")).toBe(true);
      expect(scoped.has("field3")).toBe(true);
      expect(scoped.toJson()).toEqual({
        field1: "level1",
        field2: "level2",
        field3: "level3",
      });
    });

    test("should handle complex field type combinations", () => {
      context.addDataModel("complex", {
        stringField: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "string",
          schema: z.string(),
        },
        numberField: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 42,
          schema: z.number(),
        },
        booleanField: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: true,
          schema: z.boolean(),
        },
        jsonField: {
          type: "json",
          readonly: false,
          fromRequest: false,
          defaultValue: { key: "value" },
          schema: z.object({ key: z.string() }),
        },
      });

      const scoped = context.getScopedDataModel("complex");
      expect(scoped.toJson()).toEqual({
        stringField: "string",
        numberField: 42,
        booleanField: true,
        jsonField: { key: "value" },
      });
    });

    test("should ignore parent scope if it's not a prefix of the requested scope", () => {
      context.addDataModel("a.b.c", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "abc",
          schema: z.string(),
        },
      });

      context.addDataModel("a.d", {
        field2: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "ad",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("a.b.c.d");
      expect(scoped.has("field1")).toBe(true);
      expect(scoped.has("field2")).toBe(false);
    });

    test("should handle specific example from requirements", () => {
      context.addDataModel("dot", {
        fieldA: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "CAT",
          schema: z.string(),
        },
        fieldB: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "CAT",
          schema: z.string(),
        },
      });

      context.addDataModel("dot.child", {
        fieldC: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "C",
          schema: z.string(),
        },
        fieldD: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "D",
          schema: z.string(),
        },
      });

      context.addDataModel("dot.other", {
        fieldB: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "bar",
          schema: z.string(),
        },
        fieldG: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "G",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("dot.child.grandchild");

      expect(scoped.has("fieldA")).toBe(true);
      expect(scoped.has("fieldB")).toBe(true);
      expect(scoped.has("fieldC")).toBe(true);
      expect(scoped.has("fieldD")).toBe(true);
      expect(scoped.has("fieldG")).toBe(false);

      // B should have "CAT" from dot scope, not "bar" from dot.other scope
      expect(scoped.get("fieldB")).toBe("CAT");

      // Ensure all expected fields are in the JSON output
      const json = scoped.toJson();
      expect(json).toEqual({
        fieldA: "CAT",
        fieldB: "CAT",
        fieldC: "C",
        fieldD: "D",
      });
    });
  });

  describe("Advanced Features", () => {
    test("should handle fromRequest flag", () => {
      // This test is more for documentation since fromRequest is not used in the implementation
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: true, // Marked as coming from request
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      expect(scoped.has("field1")).toBe(true);
    });

    test("should handle complex Zod schemas", () => {
      const complexSchema = z.object({
        id: z.number(),
        name: z.string().min(2),
        tags: z.array(z.string()),
        metadata: z
          .object({
            created: z.string(),
            version: z.number(),
          })
          .optional(),
      });

      context.addDataModel("complex", {
        configField: {
          type: "json",
          readonly: false,
          fromRequest: false,
          defaultValue: {
            id: 1,
            name: "test",
            tags: ["tag1", "tag2"],
            metadata: {
              created: "2023-01-01",
              version: 1,
            },
          },
          schema: complexSchema,
        },
      });

      const scoped = context.getScopedDataModel("complex");

      // Valid update
      const validUpdate = {
        id: 2,
        name: "updated",
        tags: ["new"],
        metadata: {
          created: "2023-01-02",
          version: 2,
        },
      };

      expect(() => scoped.set("configField", validUpdate)).not.toThrow();

      // Invalid update - name too short
      const invalidUpdate = {
        id: 3,
        name: "a", // Too short
        tags: ["new"],
        metadata: {
          created: "2023-01-03",
          version: 3,
        },
      };

      expect(() => scoped.set("configField", invalidUpdate)).toThrow();
    });

    test("should handle scope siblings correctly", () => {
      // Parent
      context.addDataModel("app", {
        version: {
          type: "string",
          readonly: true,
          fromRequest: false,
          defaultValue: "1.0.0",
          schema: z.string(),
        },
      });

      // Child 1
      context.addDataModel("app.settings", {
        theme: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "light",
          schema: z.string().refine((val) => ["light", "dark"].includes(val)),
        },
      });

      // Child 2
      context.addDataModel("app.user", {
        id: {
          type: "string",
          readonly: true,
          fromRequest: true,
          defaultValue: "",
          schema: z.string().uuid().optional(),
        },
        name: {
          type: "string",
          readonly: false,
          fromRequest: true,
          defaultValue: "Guest",
          schema: z.string(),
        },
      });

      // Settings scope - should have app + app.settings fields
      const settingsScope = context.getScopedDataModel("app.settings.display");
      expect(settingsScope.has("version")).toBe(true);
      expect(settingsScope.has("theme")).toBe(true);
      expect(settingsScope.has("id")).toBe(false);
      expect(settingsScope.has("name")).toBe(false);

      // User scope - should have app + app.user fields
      const userScope = context.getScopedDataModel("app.user.profile");
      expect(userScope.has("version")).toBe(true);
      expect(userScope.has("theme")).toBe(false);
      expect(userScope.has("id")).toBe(true);
      expect(userScope.has("name")).toBe(true);
    });

    test("should properly handle partial overlapping scopes", () => {
      context.addDataModel("products", {
        category: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "general",
          schema: z.string(),
        },
      });

      context.addDataModel("products.electronics", {
        warranty: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 12, // months
          schema: z.number(),
        },
      });

      context.addDataModel("products.electronics.phones", {
        screenSize: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 6.1,
          schema: z.number(),
        },
      });

      context.addDataModel("products.clothing", {
        size: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "M",
          schema: z.string(),
        },
      });

      // Test electronics scopes
      const electronicsScope = context.getScopedDataModel(
        "products.electronics"
      );
      expect(electronicsScope.toJson()).toEqual({
        category: "general",
        warranty: 12,
      });

      // Test phones scopes
      const phonesScope = context.getScopedDataModel(
        "products.electronics.phones"
      );
      expect(phonesScope.toJson()).toEqual({
        category: "general",
        warranty: 12,
        screenSize: 6.1,
      });

      // Test clothing scopes
      const clothingScope = context.getScopedDataModel("products.clothing");
      expect(clothingScope.toJson()).toEqual({
        category: "general",
        size: "M",
      });
    });
  });

  describe("Error handling", () => {
    test("should throw descriptive errors for field not found", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      const error = () => scoped.set("nonExistent", "value");
      expect(error).toThrow();
      expect(error).toThrow(/not found/);
    });

    test("should throw descriptive errors for readonly fields", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: true,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      const error = () => scoped.set("field1", "new value");
      expect(error).toThrow();
      expect(error).toThrow(/readonly/);
    });

    test("should throw descriptive errors for validation failures", () => {
      context.addDataModel("test", {
        field1: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "default",
          schema: z.string().email(),
        },
      });

      const scoped = context.getScopedDataModel("test");
      const error = () => scoped.set("field1", "not-an-email");
      expect(error).toThrow();
      expect(error).toThrow(/Validation failed/);
    });
  });

  describe("Performance Edge Cases", () => {
    test("should handle extremely deep nesting", () => {
      // Setup a deep nesting structure
      for (let i = 1; i <= 10; i++) {
        const scope = Array(i).fill("level").join(".");
        context.addDataModel(scope, {
          [`field${i}`]: {
            type: "string",
            readonly: false,
            fromRequest: false,
            defaultValue: `value${i}`,
            schema: z.string(),
          },
        });
      }

      // Try to access the deepest scope +5 levels deeper
      const deepScope = Array(15).fill("level").join(".");
      const scoped = context.getScopedDataModel(deepScope);

      // Should have all 10 fields
      const json = scoped.toJson();
      expect(Object.keys(json).length).toBe(10);

      // Check a few fields
      expect(scoped.get("field1")).toBe("value1");
      expect(scoped.get("field5")).toBe("value5");
      expect(scoped.get("field10")).toBe("value10");
    });

    test("should handle adding many data models", () => {
      // Add 100 data models
      for (let i = 1; i <= 100; i++) {
        context.addDataModel(`scope${i}`, {
          [`field${i}`]: {
            type: "string",
            readonly: false,
            fromRequest: false,
            defaultValue: `value${i}`,
            schema: z.string(),
          },
        });
      }

      // Check that models were added correctly
      for (let i = 1; i <= 100; i++) {
        const scoped = context.getScopedDataModel(`scope${i}`);
        expect(scoped.get(`field${i}`)).toBe(`value${i}`);
      }
    });
  });

  describe("Integration Scenarios", () => {
    test("should support a typical user config scenario", () => {
      // System defaults
      context.addDataModel("system", {
        theme: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "light",
          schema: z.enum(["light", "dark", "auto"]),
        },
        fontSize: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 14,
          schema: z.number().min(8).max(24),
        },
        notifications: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: true,
          schema: z.boolean(),
        },
      });

      // User preferences
      context.addDataModel("system.user", {
        theme: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "dark",
          schema: z.enum(["light", "dark", "auto"]),
        },
        language: {
          type: "string",
          readonly: false,
          fromRequest: true,
          defaultValue: "en",
          schema: z.string().length(2),
        },
      });

      // Feature-specific defaults
      context.addDataModel("system.features.editor", {
        fontSize: {
          type: "number",
          readonly: false,
          fromRequest: false,
          defaultValue: 16,
          schema: z.number().min(8).max(24),
        },
        autosave: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: true,
          schema: z.boolean(),
        },
      });

      // Get editor config
      const editorConfig = context.getScopedDataModel("system.features.editor");

      // Should include system defaults, user prefs, and feature-specific settings
      expect(editorConfig.toJson()).toEqual({
        theme: "dark", // From user pref, overriding system default
        fontSize: 16, // From feature-specific, overriding system default
        notifications: true, // From system default
        language: "en", // From user pref
        autosave: true, // From feature-specific
      });

      // Update a setting
      editorConfig.set("fontSize", 18);

      // Check the setting was updated in the original scope
      const featureScope = context.getScopedDataModel("system.features.editor");
      expect(featureScope.get("fontSize")).toBe(18);

      // System default should remain unchanged
      const systemScope = context.getScopedDataModel("system");
      expect(systemScope.get("fontSize")).toBe(14);
    });

    test("should support workflow state tracking", () => {
      // Define workflow stages and transitions
      context.addDataModel("workflow", {
        currentStage: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "draft",
          schema: z.enum(["draft", "review", "approved", "published"]),
        },
        isLocked: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: false,
          schema: z.boolean(),
        },
        lastUpdated: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: new Date().toISOString(),
          schema: z.string().datetime(),
        },
      });

      // Draft stage specifics
      context.addDataModel("workflow.draft", {
        canEdit: {
          type: "boolean",
          readonly: true,
          fromRequest: false,
          defaultValue: true,
          schema: z.boolean(),
        },
        canSubmit: {
          type: "boolean",
          readonly: false,
          fromRequest: false,
          defaultValue: true,
          schema: z.boolean(),
        },
      });

      // Review stage specifics
      context.addDataModel("workflow.review", {
        canEdit: {
          type: "boolean",
          readonly: true,
          fromRequest: false,
          defaultValue: false,
          schema: z.boolean(),
        },
        reviewer: {
          type: "string",
          readonly: false,
          fromRequest: true,
          defaultValue: "",
          schema: z.string(),
        },
        notes: {
          type: "string",
          readonly: false,
          fromRequest: false,
          defaultValue: "",
          schema: z.string(),
        },
      });

      // Get draft state
      const draftState = context.getScopedDataModel("workflow.draft");
      expect(draftState.toJson()).toEqual({
        currentStage: "draft",
        isLocked: false,
        lastUpdated: expect.any(String),
        canEdit: true,
        canSubmit: true,
      });

      // Transition to review
      draftState.set("currentStage", "review");
      draftState.set("lastUpdated", new Date().toISOString());

      // Get review state
      const reviewState = context.getScopedDataModel("workflow.review");
      expect(reviewState.toJson()).toEqual({
        currentStage: "review",
        isLocked: false,
        lastUpdated: expect.any(String),
        canEdit: false,
        reviewer: "",
        notes: "",
      });

      // Update review info
      reviewState.set("reviewer", "John Doe");
      reviewState.set("notes", "Looks good!");

      // Ensure readonly still works
      expect(() => reviewState.set("canEdit", true)).toThrow(/readonly/);
    });
  });
});
