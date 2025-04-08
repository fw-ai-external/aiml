import type { BaseElement } from "../elements/BaseElement";
import { v4 as uuidv4 } from "uuid";
/**
 * Types for the workflow structure
 */
export type Attributes = Record<string, any>;

export type StateStep = {
  id: string;
  type: "state";
  subType: "output" | "error" | "user-input" | "parallel";
};

export type ActionStep = {
  id?: undefined;
  type: "action";
  subType: "model" | "tool-call" | "human-input" | "code";
};

export type DataModelStep = {
  id?: undefined;
  type: "data-model";
  subType: never;
};

export type ExecutionGraphStep = (ActionStep | StateStep | DataModelStep) & {
  key: string;
  name?: string;
  description?: string;
  if?: string;

  /**
   * Specifies the exact kind of step/action, e.g. "scxml", "state", "parallel", etc.
   */
  tag: string;
  /**
   * Arbitrary set of key-value pairs storing original attributes and runtime config.
   */
  attributes: Attributes;
  /**
   * The scope of the node based on the ID of state type steps
   */
  scope: ["root", ...string[]];
  while?: string;
  lastElementKeys?: string[] | null;
  runAfter?: string[];
  loopUntil?: string;
  waitFor?: {
    eventName: string;
    payloadSchema: Record<string, any>; // JSON Schema
  };
  variables?: Record<string, any>;
};

export type SingleStep = ExecutionGraphStep & {
  runParallel?: false;
};

export type ParallelSteps = ExecutionGraphStep & {
  runParallel: true;
  steps: Step[][];
};

export type Step = SingleStep | ParallelSteps;

export type Workflow = {
  id: string;
  name: string;
  description: string;
  steps: Step[];
};

export type StepConfig = {
  runChildrenInParallel?: boolean;
  variables?: Record<string, any>;
  attributes?: Attributes;
  when?: string;
  type?: "state" | "action" | "data-model";
  scope?: ["root", ...string[]];
};

/**
 * Context for tracking the current state during workflow building
 */
class BuildContext {
  currentStepKey: string | null = null;
  previousStepKey: string | null = null;
  parentContext: BuildContext | null = null;
  isInIfBlock: boolean = false;
  currentCondition: string | null = null;
  ifStepKey: string | null = null;
  elseStepKey: string | null = null;
  element?: BaseElement;
  lastAddedStepKey: string | null = null;
  afterStepIds: string[] | null = null;
  isChildContext: boolean = false; // Flag to indicate this is an isolated child context

  constructor(parentContext: BuildContext | null = null) {
    this.parentContext = parentContext;
  }

  createBranchContext(): BuildContext {
    return new BuildContext(this);
  }

  getRoot(): BuildContext {
    let current: BuildContext = this;
    while (current.parentContext !== null) {
      current = current.parentContext;
    }
    return current;
  }
}

export class WorkflowBuilder {
  private workflow: Workflow;
  private rootContext: BuildContext;
  private currentContext: BuildContext;
  private stepMap: Map<string, Step> = new Map();
  private contextStack: BuildContext[] = [];
  private _currentCondition: string | null = null;
  private _conditionStack: string[] = [];
  private lastAddedStepKey: string | null = null;

  constructor(id: string, name: string, description: string = "") {
    this.workflow = {
      id,
      name,
      description,
      steps: [],
    };
    this.rootContext = new BuildContext();
    this.currentContext = this.rootContext;
  }

  /**
   * Adds a new step to the workflow
   */
  step(stepConfig: StepConfig): WorkflowBuilder {
    const ctx = this.currentContext;

    // Use element's key if available, or the id for the key to maintain consistency with tests
    const key =
      ctx.element?.key || (ctx.element?.attributes?.id as string) || uuidv4();
    const id = ctx.element?.attributes?.id as string;

    // --------------------------------------------------------------
    // Parent ID determination logic
    // --------------------------------------------------------------
    let lastElementKeys: string[] | null = null;

    // If afterStepIds is set by the after() method, use those as parents
    if (ctx.afterStepIds && ctx.afterStepIds.length > 0) {
      lastElementKeys = ctx.afterStepIds;
      // Clear afterStepIds to not affect future steps
      ctx.afterStepIds = null;
    }
    // For sequential steps, establish proper connections
    else if (this.workflow.steps.length > 0 && !ctx.isChildContext) {
      const previousStep = this.workflow.steps[this.workflow.steps.length - 1];

      // Get the previous step ID - prefer id over key for test compatibility
      if (previousStep) {
        const previousId = previousStep.id || previousStep.key;

        // If this is not the first step and the IDs are different (not the same element)
        if (previousId && id !== previousId) {
          lastElementKeys = [previousId];
        }
      }
    }

    const newStep: Step = {
      id,
      key,
      name: id,
      description: ctx.element?.description,
      lastElementKeys: lastElementKeys,
      // Add required fields from graph.ts
      type: ctx.element?.role as any,
      subType: ctx.element?.subType as any,
      tag: ctx.element?.tag || "action",
      attributes: ctx.element?.attributes || {}, // Use element attributes if available
      scope: ctx.element?.scope || ["root"],
      steps: stepConfig.runChildrenInParallel
        ? []
        : ctx.element?.subType === "parallel"
          ? [] // Initialize with empty array of arrays for parallel
          : undefined,
    };

    if ("variables" in stepConfig && stepConfig.variables) {
      newStep.variables = stepConfig.variables;
    }

    if (stepConfig?.when) {
      newStep.if = stepConfig.when;
    }

    if (stepConfig?.attributes) {
      newStep.attributes = {
        ...newStep.attributes,
        ...stepConfig.attributes,
      };
    }

    // Handle condition from if/else context
    if (this._currentCondition !== null) {
      newStep.if = this._currentCondition;
    }

    if (ctx.isInIfBlock && ctx.currentCondition) {
      newStep.if = ctx.currentCondition;

      if (!ctx.ifStepKey) {
        ctx.ifStepKey = newStep.key;
      }
    }

    if (
      ctx.isInIfBlock &&
      ctx.currentCondition === null &&
      ctx.elseStepKey === null
    ) {
      ctx.elseStepKey = newStep.key;
    }

    // Regular step - always add to workflow
    this.workflow.steps.push(newStep);
    this.stepMap.set(newStep.key, newStep);

    // Track the previous step before updating currentStepKey
    ctx.previousStepKey = ctx.currentStepKey;
    ctx.currentStepKey = newStep.key;
    ctx.lastAddedStepKey = newStep.key;
    this.lastAddedStepKey = newStep.key;

    // Create a new context for parallel steps
    if (
      stepConfig.runChildrenInParallel === true ||
      newStep.runParallel === true
    ) {
      // Create a child context for parallel steps
      const newContext = new BuildContext(this.currentContext);
      newContext.element = ctx.element;
      this.currentContext = newContext;
    }

    return this;
  }

  then(stepConfig: StepConfig): WorkflowBuilder {
    return this.step({
      ...stepConfig,
      runChildrenInParallel: false,
    });
  }

  /**
   * Creates a step that runs in parallel with its siblings
   */
  parallel(stepConfig: StepConfig): WorkflowBuilder {
    return this.step({
      ...stepConfig,
      runChildrenInParallel: true,
    });
  }

  /**
   * Define explicit dependencies between workflow steps
   */
  after(steps: string | string[]): WorkflowBuilder {
    // Convert to array if not already an array
    const stepIds = Array.isArray(steps) ? steps : [steps];

    // Create a new context for this branch
    const newContext = new BuildContext(this.currentContext);

    // Store the dependencies in the context
    newContext.afterStepIds = stepIds;

    this.currentContext = newContext;

    return this;
  }

  /**
   * Repeats a step until a condition becomes true
   */
  until(condition: string, step: { id: string } | string): WorkflowBuilder {
    const stepId = typeof step === "string" ? step : step.id;

    // Find the step by ID or by key
    const targetStep =
      this.stepMap.get(stepId || "") ||
      this.workflow.steps.find((s) => s.key === stepId);

    if (targetStep) {
      targetStep.loopUntil = condition;
    }

    return this;
  }

  /**
   * Creates a conditional branch in the workflow
   */
  if(condition: string): WorkflowBuilder {
    // Push the current condition to the stack if it exists
    if (this._currentCondition !== null) {
      this._conditionStack.push(this._currentCondition);
    }

    // Set the new condition
    this._currentCondition = condition;

    // Create a new context for the if branch
    const ifContext = new BuildContext(this.currentContext);
    ifContext.isInIfBlock = true;
    ifContext.currentCondition = condition;

    this.currentContext = ifContext;

    return this;
  }

  /**
   * Creates an alternative branch for when if condition is false
   */
  else(): WorkflowBuilder {
    // Clear the condition for else branches
    this._currentCondition = null;

    if (this.currentContext.isInIfBlock) {
      this.currentContext.currentCondition = null;
    }

    return this;
  }

  /**
   * Creates an alternative branch with a condition
   */
  elseIf(condition: string): WorkflowBuilder {
    // Set the new condition for elseIf branches
    this._currentCondition = condition;

    if (this.currentContext.isInIfBlock) {
      this.currentContext.currentCondition = condition;
      // Reset the ifStepId for this branch
      this.currentContext.ifStepKey = null;
    }

    return this;
  }

  /**
   * Exits the conditional block and returns to the parent context
   */
  endIf(): WorkflowBuilder {
    if (this.currentContext.isInIfBlock && this.currentContext.parentContext) {
      // Return to parent context
      this.currentContext = this.currentContext.parentContext;
    }

    // Pop the condition from the stack
    if (this._conditionStack.length > 0) {
      this._currentCondition = this._conditionStack.pop() || null;
    } else {
      this._currentCondition = null;
    }

    return this;
  }

  /**
   * Creates a while loop in the workflow
   */
  while(condition: string): WorkflowBuilder {
    if (this.currentContext.currentStepKey) {
      const currentStep = this.stepMap.get(this.currentContext.currentStepKey);
      if (currentStep) {
        currentStep.while = condition;
      }
    }

    return this;
  }

  /**
   * Creates a suspension point waiting for a specific event
   */
  afterEvent(
    eventName: string,
    eventArgs: Record<string, any>
  ): WorkflowBuilder {
    const ctx = this.currentContext;
    const eventStepKey = uuidv4();
    const newStep: Step = {
      key: eventStepKey,
      name: `Wait for ${eventName}`,
      description: `Waits for the ${eventName} event to occur`,
      lastElementKeys: this.currentContext.currentStepKey
        ? [this.currentContext.currentStepKey]
        : null,
      type: ctx.element?.role as any,
      subType: ctx.element?.subType as any,
      tag: ctx.element?.tag || "on",
      attributes: ctx.element?.attributes || {},
      scope: ctx.element?.scope || ["root"],
    };

    // Add event details
    newStep.waitFor = {
      eventName: eventName,
      payloadSchema: eventArgs,
    };

    this.workflow.steps.push(newStep);
    this.stepMap.set(eventStepKey, newStep);
    this.currentContext.currentStepKey = eventStepKey;

    return this;
  }

  /**
   * Switch to a different child branch build context
   * This is primarily used in tests to create isolated step chains
   */
  enterChildContext(): WorkflowBuilder {
    // Save current context in stack with the current step key
    const currentKey = this.currentContext.currentStepKey;

    // Push the current context to the stack
    this.contextStack.push(this.currentContext);

    // Create a blank context not linked to current context
    const newContext = new BuildContext();

    // Mark this as an isolated child context
    newContext.isChildContext = true;

    // Important: clear these to prevent parent-child relationships
    // with steps in other contexts
    newContext.currentStepKey = null;
    newContext.previousStepKey = null;
    newContext.lastAddedStepKey = null;

    // Track the parent step that created this child context
    // This will be used when returning to root
    (newContext as any).parentStepKey = currentKey;

    // Flag this as a child context for the step method to detect
    this.currentContext = newContext;
    return this;
  }

  /**
   * Go back to the root context
   * This is primarily used in tests to return to the main step chain
   */
  returnToRootContext(): WorkflowBuilder {
    // Save the last step key before switching contexts
    const lastStepKeyBeforeReturn = this.currentContext.lastAddedStepKey;

    // Get the parent step that created this child context
    const parentStepKey = (this.currentContext as any).parentStepKey;

    // Reset to original root context
    this.currentContext = this.rootContext;

    // In the test pattern, the currentContext will be immediately replaced
    // with a new context via direct assignment, but we still want to
    // clear the stack
    this.contextStack = [];

    // Update the lastAddedStepKey in root context to the last step in the child context
    // This allows the next step in the root context to establish a connection
    if (lastStepKeyBeforeReturn) {
      this.lastAddedStepKey = lastStepKeyBeforeReturn;
      this.currentContext.lastAddedStepKey = lastStepKeyBeforeReturn;
      this.currentContext.currentStepKey = lastStepKeyBeforeReturn;

      // Mark this context as having returned from a child context
      (this.currentContext as any).returnedFromChildContext = true;

      // Store the last step of the child context to connect to the next root step
      (this.currentContext as any).lastChildStepKey = lastStepKeyBeforeReturn;
    }

    return this;
  }

  /**
   * Enter a context with the specified element
   * @param element The element to associate with this context
   */
  enterElementContext(element: BaseElement): WorkflowBuilder {
    // Save the current context to the stack
    this.contextStack.push(this.currentContext);

    // Create a new context with the current one as parent
    const newContext = new BuildContext(this.currentContext);
    newContext.element = element;

    // Preserve the child context flag if we're in a child context
    if (this.currentContext.isChildContext) {
      newContext.isChildContext = true;
    }

    // Preserve the afterStepIds from the previous context
    if (this.currentContext.afterStepIds) {
      newContext.afterStepIds = this.currentContext.afterStepIds;
      // Clear from the previous context to avoid duplication
      this.currentContext.afterStepIds = null;
    }

    // Store the elementId to be used for parent-child relationships
    const elementId = element.attributes?.id;
    if (elementId) {
      newContext.lastAddedStepKey = elementId;
      this.lastAddedStepKey = elementId;
    }

    // Track parent's step key to establish correct hierarchy
    if (this.currentContext.currentStepKey && !newContext.isChildContext) {
      // We'll use this to set lastElementKeys when adding new steps
      newContext.parentContext = this.currentContext;
    }

    this.currentContext = newContext;
    return this;
  }

  /**
   * Leave the current element context and return to the previous context
   */
  leaveElementContext(): WorkflowBuilder {
    // If the current context has a lastAddedStepKey, pass it to the parent context
    if (this.currentContext.lastAddedStepKey) {
      this.lastAddedStepKey = this.currentContext.lastAddedStepKey;
    }

    // Get the current step key before we pop the context
    const currentStepKey = this.currentContext.currentStepKey;
    const isChildContext = this.currentContext.isChildContext;

    // Pop the previous context from the stack
    const previousContext = this.contextStack.pop();

    // If we have a previous context, use it, otherwise fall back to root
    this.currentContext = previousContext || this.rootContext;

    // Only update parent context with current step key if not in a child context
    if (currentStepKey && !isChildContext) {
      this.currentContext.currentStepKey = currentStepKey;
      this.currentContext.lastAddedStepKey = currentStepKey;
    }

    return this;
  }

  /**
   * Builds and returns the complete workflow definition
   */
  build(): Workflow {
    // Return to root context
    this.currentContext = this.rootContext;

    return { ...this.workflow };
  }
}
