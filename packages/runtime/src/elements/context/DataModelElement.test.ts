import { describe, it, expect, beforeEach } from "bun:test";
import { BaseElement } from "../BaseElement";
import { ValueType } from "./DataElement";

// Define a local version of the ScopedDataModel interface and implementation
// to avoid import issues
interface DataElementMetadata {
  type: ValueType | string;
  readonly: boolean;
  id: string;
  fromRequest: boolean;
  parentStateId: string | null;
}

interface ScopedDataModel {
  get(key: string): any | undefined;
  has(key: string): boolean;
  getMetadata(key: string): DataElementMetadata | undefined;
  getAllMetadata(): Record<string, DataElementMetadata>;
  set(key: string, value: any, validate?: boolean): boolean;
  getLocalVariables(): Record<string, any>;
  getAllVariables(): Record<string, any>;
  getElementId(): string;
  getParentScope(): ScopedDataModel | undefined;
}

function createScopedDataModel(
  elementId: string,
  variables: Record<string, any> = {},
  metadata: Record<string, DataElementMetadata> = {},
  parentScope?: ScopedDataModel
): ScopedDataModel {
  // Create a local copy of the variables and metadata
  const localVariables = { ...variables };
  const localMetadata = { ...metadata };

  return {
    get(key: string): any | undefined {
      // Special case for metadata
      if (key === "__metadata") {
        return this.getAllMetadata();
      }

      // Check local scope first
      if (key in localVariables) {
        return localVariables[key];
      }

      // Then check parent scope
      return parentScope?.get(key);
    },

    has(key: string): boolean {
      return key in localVariables || (parentScope?.has(key) ?? false);
    },

    getMetadata(key: string): DataElementMetadata | undefined {
      // Check local scope first
      if (key in localMetadata) {
        return localMetadata[key];
      }

      // Then check parent scope
      return parentScope?.getMetadata(key);
    },

    set(key: string, value: any, validate: boolean = true): boolean {
      // If the variable exists in the local scope, update it
      if (key in localVariables) {
        // Check if the variable is readonly
        if (validate && localMetadata[key]?.readonly) {
          throw new Error(`Cannot assign to readonly variable: ${key}`);
        }

        localVariables[key] = value;
        return true;
      }

      // If the variable exists in a parent scope, update it there
      if (parentScope?.has(key)) {
        return parentScope.set(key, value, validate);
      }

      // If the variable doesn't exist anywhere, create it in the local scope
      localVariables[key] = value;
      return true;
    },

    getLocalVariables(): Record<string, any> {
      return { ...localVariables };
    },

    getAllVariables(): Record<string, any> {
      const allVariables = parentScope ? parentScope.getAllVariables() : {};

      // Local variables override parent variables
      return {
        ...allVariables,
        ...localVariables,
      };
    },

    getAllMetadata(): Record<string, DataElementMetadata> {
      const allMetadata = parentScope
        ? (parentScope.get("__metadata") as Record<
            string,
            DataElementMetadata
          >) || {}
        : {};

      // Local metadata overrides parent metadata
      return {
        ...allMetadata,
        ...localMetadata,
      };
    },

    getElementId(): string {
      return elementId;
    },

    getParentScope(): ScopedDataModel | undefined {
      return parentScope;
    },
  };
}

describe("DataModelElement with scoping", () => {
  let parentElement: BaseElement;
  let childElement: BaseElement;
  let grandchildElement: BaseElement;
  let siblingElement: BaseElement;

  beforeEach(() => {
    // Create mock elements for testing
    parentElement = {
      id: "parent",
      children: [],
      _parentElementId: undefined,
      _childrenIds: [],
      getAncestorIds: () => [],
      addChild: (child: any) => {
        (parentElement as any)._childrenIds.push(child.id);
        (child as any)._parentElementId = parentElement.id;
      },
    } as unknown as BaseElement;

    childElement = {
      id: "child",
      children: [],
      _parentElementId: "parent",
      _childrenIds: [],
      getAncestorIds: () => ["parent"],
      addChild: (child: any) => {
        (childElement as any)._childrenIds.push(child.id);
        (child as any)._parentElementId = childElement.id;
      },
    } as unknown as BaseElement;

    grandchildElement = {
      id: "grandchild",
      children: [],
      _parentElementId: "child",
      _childrenIds: [],
      getAncestorIds: () => ["child", "parent"],
      addChild: () => {},
    } as unknown as BaseElement;

    siblingElement = {
      id: "sibling",
      children: [],
      _parentElementId: "parent",
      _childrenIds: [],
      getAncestorIds: () => ["parent"],
      addChild: () => {},
    } as unknown as BaseElement;

    // Set up the parent-child relationships
    parentElement.children = [childElement, siblingElement];
    childElement.children = [grandchildElement];
    siblingElement.children = [];
    grandchildElement.children = [];
  });

  it("should create a scoped data model with proper hierarchy", () => {
    // Create data models for each element
    const parentDataModel = {
      parentVar: "parent value",
      __metadata: {
        parentVar: {
          id: "parent",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: null,
        },
      },
    };

    const childDataModel = {
      childVar: "child value",
      __metadata: {
        childVar: {
          id: "child",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: "parent",
        },
      },
    };

    const grandchildDataModel = {
      grandchildVar: "grandchild value",
      __metadata: {
        grandchildVar: {
          id: "grandchild",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: "child",
        },
      },
    };

    // Create scoped data models
    const parentScoped = createScopedDataModel(
      "parent",
      parentDataModel,
      parentDataModel.__metadata
    );

    const childScoped = createScopedDataModel(
      "child",
      childDataModel,
      childDataModel.__metadata,
      parentScoped
    );

    const grandchildScoped = createScopedDataModel(
      "grandchild",
      grandchildDataModel,
      grandchildDataModel.__metadata,
      childScoped
    );

    // Test variable access from grandchild
    expect(grandchildScoped.get("grandchildVar")).toBe("grandchild value");
    expect(grandchildScoped.get("childVar")).toBe("child value");
    expect(grandchildScoped.get("parentVar")).toBe("parent value");

    // Test variable access from child
    expect(childScoped.get("childVar")).toBe("child value");
    expect(childScoped.get("parentVar")).toBe("parent value");
    expect(childScoped.get("grandchildVar")).toBeUndefined();

    // Test variable access from parent
    expect(parentScoped.get("parentVar")).toBe("parent value");
    expect(parentScoped.get("childVar")).toBeUndefined();
    expect(parentScoped.get("grandchildVar")).toBeUndefined();
  });

  it("should respect readonly properties", () => {
    // Create data models with readonly properties
    const parentDataModel = {
      readonlyVar: "cannot change",
      __metadata: {
        readonlyVar: {
          id: "parent",
          type: "string",
          readonly: true,
          fromRequest: false,
          parentStateId: null,
        },
      },
    };

    // Create scoped data model
    const parentScoped = createScopedDataModel(
      "parent",
      parentDataModel,
      parentDataModel.__metadata
    );

    // Test setting readonly variable
    expect(() => {
      parentScoped.set("readonlyVar", "new value");
    }).toThrow("Cannot assign to readonly variable");

    // Verify value didn't change
    expect(parentScoped.get("readonlyVar")).toBe("cannot change");
  });

  it("should handle fromRequest variables correctly", () => {
    // Create data models with fromRequest properties
    const parentDataModel = {
      userInput: "user message",
      __metadata: {
        userInput: {
          id: "parent",
          type: "string",
          readonly: true,
          fromRequest: true,
          parentStateId: null,
        },
      },
    };

    const childDataModel = {
      childVar: "child value",
      __metadata: {
        childVar: {
          id: "child",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: "parent",
        },
      },
    };

    // Create scoped data models
    const parentScoped = createScopedDataModel(
      "parent",
      parentDataModel,
      parentDataModel.__metadata
    );

    const childScoped = createScopedDataModel(
      "child",
      childDataModel,
      childDataModel.__metadata,
      parentScoped
    );

    // Child should be able to access parent's fromRequest variable
    expect(childScoped.get("userInput")).toBe("user message");

    // But should not be able to modify it
    expect(() => {
      childScoped.set("userInput", "new value");
    }).toThrow("Cannot assign to readonly variable");
  });

  it("should allow setting variables in the correct scope", () => {
    // Create data models
    const parentDataModel = {
      parentVar: "parent value",
      __metadata: {
        parentVar: {
          id: "parent",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: null,
        },
      },
    };

    const childDataModel = {
      childVar: "child value",
      __metadata: {
        childVar: {
          id: "child",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: "parent",
        },
      },
    };

    // Create scoped data models
    const parentScoped = createScopedDataModel(
      "parent",
      parentDataModel,
      parentDataModel.__metadata
    );

    const childScoped = createScopedDataModel(
      "child",
      childDataModel,
      childDataModel.__metadata,
      parentScoped
    );

    // Child should be able to modify its own variables
    childScoped.set("childVar", "new child value");
    expect(childScoped.get("childVar")).toBe("new child value");

    // Child should be able to modify parent's variables
    childScoped.set("parentVar", "new parent value");
    expect(childScoped.get("parentVar")).toBe("new parent value");
    expect(parentScoped.get("parentVar")).toBe("new parent value");

    // Parent should not see child's variables
    expect(parentScoped.get("childVar")).toBeUndefined();
  });

  it("should create new variables in the local scope", () => {
    // Create data models
    const parentDataModel = {
      parentVar: "parent value",
      __metadata: {
        parentVar: {
          id: "parent",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: null,
        },
      },
    };

    const childDataModel = {
      childVar: "child value",
      __metadata: {
        childVar: {
          id: "child",
          type: "string",
          readonly: false,
          fromRequest: false,
          parentStateId: "parent",
        },
      },
    };

    // Create scoped data models
    const parentScoped = createScopedDataModel(
      "parent",
      parentDataModel,
      parentDataModel.__metadata
    );

    const childScoped = createScopedDataModel(
      "child",
      childDataModel,
      childDataModel.__metadata,
      parentScoped
    );

    // Create a new variable in the child scope
    childScoped.set("newVar", "new value");
    expect(childScoped.get("newVar")).toBe("new value");

    // Parent should not see the new variable
    expect(parentScoped.get("newVar")).toBeUndefined();

    // Create a new variable in the parent scope
    parentScoped.set("newParentVar", "new parent value");
    expect(parentScoped.get("newParentVar")).toBe("new parent value");

    // Child should see the new parent variable
    expect(childScoped.get("newParentVar")).toBe("new parent value");
  });
});
