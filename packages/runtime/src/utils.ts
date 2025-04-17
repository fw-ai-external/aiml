import { BaseElement } from "./elements/BaseElement";
import { BuildContext } from "./graphBuilder/Context";

export const defaultStepExecutionGraphMapper = (buildContext: BuildContext) => {
  buildContext.graphBuilder.then();

  buildContext.children.map((child) => {
    if (!(child instanceof BaseElement)) {
      // console.log("child is not a BaseElement", child);
      // TODO: handle as value in parser
      return;
    }
    child.onExecutionGraphConstruction(
      new BuildContext(
        child,
        child.attributes,
        buildContext.conditions,
        child,
        child,
        buildContext.graphBuilder
      )
    );
  });
};
