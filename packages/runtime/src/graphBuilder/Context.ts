import type { BaseElement } from "../elements/BaseElement";
import type { WorkflowGraphBuilder } from ".";

// Define missing types
export interface StepConfig<
  TInput = any,
  TOutput = any,
  TProps extends Record<string, any> = Record<string, any>,
  TContext = any,
> {
  when?: (context: TContext) => Promise<boolean>;
}

export class BuildContext<
  TProps extends Record<string, any> = Record<string, any>,
> {
  /**
   * A cache of already-constructed ExecutionGraphSteps,
   * keyed by their SCXML element's 'id'.
   */
  public children: BaseElement[];
  public scope: ["root", ...string[]];

  currentStepKey: string | null = null;
  previousStepKey: string | null = null;
  parentContext: BuildContext | null = null;
  isInIfBlock: boolean = false;
  currentCondition: string | null = null;
  ifStepKey: string | null = null;
  elseStepKey: string | null = null;
  lastAddedStepKey: string | null = null;
  afterStepIds: string[] | null = null;
  isChildContext: boolean = false; // Flag to indicate this is an isolated child context

  public readonly elementKey: string;
  constructor(
    public readonly element: BaseElement,
    public readonly attributes: TProps = {} as TProps,
    public readonly conditions: StepConfig<any, any, any, any>,
    public readonly spec: BaseElement,
    public readonly fullSpec: BaseElement | null,
    public graphBuilder: WorkflowGraphBuilder
  ) {
    this.elementKey = element.key;
    this.children = element.children;
    this.scope = spec.scope as any;
  }

  public findElementByKey(
    targetKey: string,
    withinNode?: BaseElement
  ): BaseElement | undefined {
    if ((withinNode ?? this.spec).key === targetKey) {
      return withinNode ?? this.spec;
    }

    for (const child of (withinNode ?? this.fullSpec ?? this.spec).children) {
      const found = this.findElementByKey(targetKey, child);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  public createNewContextForChild(child: BaseElement): BuildContext {
    return new BuildContext(
      child,
      child.attributes,
      this.conditions,
      child,
      this.fullSpec,
      this.graphBuilder
    );
  }

  getRoot(): BuildContext {
    let current: BuildContext = this;
    while (current.parentContext !== null) {
      current = current.parentContext;
    }
    return current;
  }

  clone(newElement?: BaseElement): BuildContext {
    const newContext = new BuildContext(
      newElement ?? this.element,
      newElement?.attributes ?? this.attributes,
      this.conditions,
      newElement ?? this.spec,
      this.fullSpec,
      this.graphBuilder
    );
    return newContext;
  }
}
