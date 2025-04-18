import { workflowConfig } from "@aiml/shared";
import { BaseElement } from "../BaseElement";
import { createElementDefinition } from "../createElementFactory";

export const Workflow = createElementDefinition({
  ...workflowConfig,
  onExecutionGraphConstruction(buildContext) {
    // Processing workflow elements
    buildContext.graphBuilder.then();

    // Convert all child elements into ExecutionGraphStep
    buildContext.children.forEach((child) => {
      if (
        child instanceof BaseElement &&
        child.type === "action" &&
        child.subType !== "transition"
      ) {
        // children will add themselves to the graph builder
        child.onExecutionGraphConstruction(
          buildContext.createNewContextForChild(child)
        );
      }
    });

    let initialStep: BaseElement | undefined;
    // look for initial state if attribute is present
    const initial = buildContext.attributes.initial
      ? buildContext.children.find(
          (child) => child.id === buildContext.attributes.initial
        )
      : undefined;

    if (initial) {
      initialStep = initial;
    } else {
      // use first child of role state as initial step
      initialStep = buildContext.children.find(
        (child) =>
          child.type === "state" &&
          child.subType !== "error" &&
          child.subType !== "output" &&
          child.subType !== "user-input"
      );
    }

    const initialChild = buildContext.children.find(
      (child) => child.id === initialStep?.attributes.id
    );

    if (initialChild) {
      // Processing initial child element
      initialChild.onExecutionGraphConstruction(
        buildContext.createNewContextForChild(initialChild)
      );
    } else {
      throw new Error(
        `Initial state not found for workflow ${buildContext.elementKey}`
      );
    }
  },
});
