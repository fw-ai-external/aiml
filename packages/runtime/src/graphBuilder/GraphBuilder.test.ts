import { describe, expect, it } from "bun:test";
import { GraphBuilder } from "./index";
import { BaseElement } from "../elements/BaseElement";
import type { ExecutionGraphElement } from "@fireworks/shared";
import type { BuildContext } from "./Context";

// Helper to create a BaseElement with a custom onExecutionGraphConstruction implementation
// This bypasses the default implementation which depends on the actual tree structure
function createTestElement(
  id: string,
  key: string,
  nextElements: BaseElement[] = []
): BaseElement {
  const element = new BaseElement({
    id,
    key,
    tag: "state",
    role: "state",
    elementType: "state",
    attributes: { id },
    allowedChildren: "any",
    schema: {} as any,
    type: "element",
    lineStart: 0,
    lineEnd: 0,
    columnStart: 0,
    columnEnd: 0,
    // Provide a custom onExecutionGraphConstruction implementation
    onExecutionGraphConstruction: (
      context: BuildContext
    ): ExecutionGraphElement => {
      const graphBuilder = context.graphBuilder;

      if (!graphBuilder) {
        return {
          id,
          key,
          type: "state",
          tag: "state",
          scope: ["root"],
          attributes: { id },
          next: [],
        };
      }

      // Check for loops using the graph builder
      const isLoop = graphBuilder.beginElementConstruction(key);

      try {
        if (isLoop) {
          // Loop detected - transition to error state
          graphBuilder.recordLoopTransition(id, key);

          return {
            id,
            key,
            type: "state",
            tag: "state",
            scope: ["root"],
            attributes: { id },
            next: [
              {
                id: "error",
                key: "error",
                type: "error",
                tag: "error",
                attributes: {
                  id: "error",
                  message: `Loop detected in element: ${key}`,
                },
                scope: ["root", "error"],
              },
            ],
          };
        }

        // Process next elements
        const nextGraphElements: ExecutionGraphElement[] = [];
        for (const nextElement of nextElements) {
          nextGraphElements.push(
            nextElement.onExecutionGraphConstruction(context)
          );
        }

        return {
          id,
          key,
          type: "state",
          tag: "state",
          scope: ["root"],
          attributes: { id },
          next: nextGraphElements,
        };
      } finally {
        if (!isLoop && graphBuilder) {
          graphBuilder.finishElementConstruction(key);
        }
      }
    },
  });

  return element;
}

describe("GraphBuilder", () => {
  describe("Loop Detection", () => {
    it("should build a graph correctly for a simple path without loops", () => {
      // Create a simple linear path of elements (A → B → C)
      const elementC = createTestElement("C", "C-key", []);
      const elementB = createTestElement("B", "B-key", [elementC]);
      const elementA = createTestElement("A", "A-key", [elementB]);

      // Create a graph builder and build the graph
      const graphBuilder = new GraphBuilder();
      const graph = graphBuilder.buildGraph(elementA);

      // Validate the graph structure
      expect(graph.id).toBe("A");

      // Validate the chain of elements
      const graphB = graph.next?.[0];
      expect(graphB?.id).toBe("B");

      const graphC = graphB?.next?.[0];
      expect(graphC?.id).toBe("C");

      // Verify no error state was added
      const hasErrorState = findErrorState(graph);
      expect(hasErrorState).toBe(false);
    });

    it("should detect a direct self-loop and redirect to an error state", () => {
      // Create an element that has itself as its next element (A → A)
      const selfLoopElement = createTestElement("A", "A-key");
      // Create a direct self-reference
      (selfLoopElement as any).onExecutionGraphConstruction = (
        context: BuildContext
      ): ExecutionGraphElement => {
        const graphBuilder = context.graphBuilder;

        if (!graphBuilder) {
          return {
            id: "A",
            key: "A-key",
            type: "state",
            tag: "state",
            scope: ["root"],
            attributes: { id: "A" },
          };
        }

        // Check for loops
        const isLoop = graphBuilder.beginElementConstruction("A-key");

        try {
          if (isLoop) {
            // Loop detected
            graphBuilder.recordLoopTransition("A", "A-key");
            return {
              id: "A",
              key: "A-key",
              type: "state",
              tag: "state",
              scope: ["root"],
              attributes: { id: "A" },
              next: [
                {
                  id: "error",
                  key: "error",
                  type: "error",
                  tag: "error",
                  attributes: { id: "error" },
                  scope: ["root", "error"],
                },
              ],
            };
          }

          // Call itself recursively - this will cause a loop
          return {
            id: "A",
            key: "A-key",
            type: "state",
            tag: "state",
            scope: ["root"],
            attributes: { id: "A" },
            next: [selfLoopElement.onExecutionGraphConstruction(context)],
          };
        } finally {
          if (!isLoop) {
            graphBuilder.finishElementConstruction("A-key");
          }
        }
      };

      // Create a graph builder and build the graph
      const graphBuilder = new GraphBuilder();
      const graph = graphBuilder.buildGraph(selfLoopElement);

      // We should detect the loop and add an error state
      expect(graph.id).toBe("A");

      // Verify the error state was added somewhere in the graph
      const hasErrorState = findErrorState(graph);
      expect(hasErrorState).toBe(true);
    });

    it("should detect an indirect loop and redirect to an error state", () => {
      // Create a cycle: A → B → C → A
      const elementA = createTestElement("A", "A-key");
      const elementB = createTestElement("B", "B-key");
      const elementC = createTestElement("C", "C-key");

      // Set up the cycle
      (elementA as any).onExecutionGraphConstruction =
        createCustomGraphConstructor("A", "A-key", [elementB]);
      (elementB as any).onExecutionGraphConstruction =
        createCustomGraphConstructor("B", "B-key", [elementC]);
      (elementC as any).onExecutionGraphConstruction =
        createCustomGraphConstructor("C", "C-key", [elementA]);

      // Create a graph builder and build the graph
      const graphBuilder = new GraphBuilder();
      const graph = graphBuilder.buildGraph(elementA);

      // We should detect the loop somewhere in the chain
      expect(graph.id).toBe("A");

      // Verify the error state exists somewhere in the graph
      const hasErrorState = findErrorState(graph);
      expect(hasErrorState).toBe(true);
    });
  });
});

// Helper function to find an error state anywhere in the graph
function findErrorState(node: ExecutionGraphElement): boolean {
  if (node.id === "error" || node.type === "error") {
    return true;
  }

  if (node.next) {
    for (const next of node.next) {
      if (findErrorState(next)) {
        return true;
      }
    }
  }

  if (node.parallel) {
    for (const parallel of node.parallel) {
      if (findErrorState(parallel)) {
        return true;
      }
    }
  }

  return false;
}

// Helper function to create a custom onExecutionGraphConstruction function
function createCustomGraphConstructor(
  id: string,
  key: string,
  nextElements: BaseElement[]
) {
  return function (context: BuildContext): ExecutionGraphElement {
    const graphBuilder = context.graphBuilder;

    if (!graphBuilder) {
      return {
        id,
        key,
        type: "state",
        tag: "state",
        scope: ["root"],
        attributes: { id },
        next: [],
      };
    }

    // Check for loops
    const isLoop = graphBuilder.beginElementConstruction(key);

    try {
      if (isLoop) {
        // Loop detected
        graphBuilder.recordLoopTransition(id, key);
        return {
          id,
          key,
          type: "state",
          tag: "state",
          scope: ["root"],
          attributes: { id },
          next: [
            {
              id: "error",
              key: "error",
              type: "error",
              tag: "error",
              attributes: { id: "error" },
              scope: ["root", "error"],
            },
          ],
        };
      }

      // Process next elements
      const nextGraphElements: ExecutionGraphElement[] = [];
      for (const nextElement of nextElements) {
        nextGraphElements.push(
          nextElement.onExecutionGraphConstruction(context)
        );
      }

      return {
        id,
        key,
        type: "state",
        tag: "state",
        scope: ["root"],
        attributes: { id },
        next: nextGraphElements,
      };
    } finally {
      if (!isLoop) {
        graphBuilder.finishElementConstruction(key);
      }
    }
  };
}
