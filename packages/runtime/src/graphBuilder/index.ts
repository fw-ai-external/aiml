import type {
  RunStep,
  SerializedBaseElement,
  WorkflowGraph,
} from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import type { BaseElement } from "../elements/BaseElement";
import { BuildContext } from "./Context";
/**
 * Types for the workflow structure
 */
export type Attributes = Record<string, any>;

export type StepNodeCustomizations = {
  runChildrenInParallel?: boolean;
  variables?: Record<string, any>;
  attributes?: Attributes;
  when?: string;
};

// Default maximum recursion limit for any element
const DEFAULT_MAX_RECURSION = 10;

export class WorkflowGraphBuilder {
  private graph: WorkflowGraph;
  private rootContext?: BuildContext;
  private currentContext?: BuildContext;
  private stepMap: Map<string, RunStep> = new Map();
  private contextStack: BuildContext[] = [];
  private _currentCondition: string | null = null;
  private _conditionStack: string[] = [];
  private lastAddedStepKey: string | null = null;

  // Properties for recursion detection
  private currentConstructionPath: Map<string, number> = new Map();
  private wasLoopDetected: boolean = false;
  private errorStateId: string = "error";
  private _reachedEnd: "error" | "end" | null = null;
  reachedEnd(type: "error" | "end"): void {
    this._reachedEnd = type;
  }

  get hasReachedEnd(): boolean {
    return this._reachedEnd !== null || this.wasLoopDetected;
  }

  // Property to expose the graph as steps
  public get steps(): WorkflowGraph {
    return this.graph;
  }

  constructor() {
    this.graph = [];
  }

  /**
   * Begins element construction and checks if recursion limit is exceeded
   * @param elementKey The element key
   * @param maxRecursion Optional maximum recursion limit
   * @returns true if recursion limit is exceeded, false otherwise
   */
  private beginElementConstruction(
    elementKey: string,
    maxRecursion?: number
  ): boolean {
    const recursionCount = this.currentConstructionPath.get(elementKey) || 0;
    console.log("recursionCount", elementKey, recursionCount);
    // Use provided max recursion or DEFAULT_MAX_RECURSION
    const maxRecursionLimit = maxRecursion ?? DEFAULT_MAX_RECURSION;

    // Check if recursion limit is exceeded
    if (recursionCount >= maxRecursionLimit) {
      // Recursion limit exceeded
      this.wasLoopDetected = true;
      return true;
    }

    // Update recursion count and continue
    this.currentConstructionPath.set(elementKey, recursionCount + 1);
    return false;
  }

  /**
   * Finishes element construction
   * @param elementKey The element key
   */
  finishElementConstruction(elementKey: string): void {
    if (
      this.currentContext?.element?.subType === "output" ||
      this.currentContext?.element?.subType === "error"
    ) {
      this.reachedEnd("end");
    }
  }

  /**
   * Records when recursion limit is exceeded
   * @param sourceStepId The source step ID
   * @param loopedElementKey The element key that exceeded recursion limit
   */
  recordLoopTransition(sourceStepId: string, loopedElementKey: string): void {
    console.warn(
      `Recursion limit exceeded for element: ${loopedElementKey}. ` +
        `Creating transition from step '${sourceStepId}' to error state '${this.errorStateId}'.`
    );
  }

  goToErrorState(message: string, code: string): void {
    this.reachedEnd("error");
    const errorState = this.getErrorStateElement(
      this.currentContext?.currentStepKey || this.currentContext?.element?.key
    );

    this.graph.push({
      ...errorState,
      attributes: {
        ...errorState.attributes,
        message: message || errorState.attributes.message,
        code: code || errorState.attributes.code,
      },
    });
    this.stepMap.set(errorState.key, errorState);
  }

  /**
   * Returns a standard structure for the error state element.
   * @param sourceElementKey Optional key of the element causing the error state transition.
   */
  private getErrorStateElement(sourceElementKey?: string): RunStep {
    return {
      id: this.errorStateId,
      key: this.errorStateId,
      name: "Error State",
      type: "state",
      subType: "error",
      tag: "error",
      attributes: {
        id: this.errorStateId,
        message: `Workflow halted due to recursion limit exceeded${sourceElementKey ? ` for element ${sourceElementKey}` : ""}.`,
        ...(sourceElementKey && { sourceElement: sourceElementKey }),
      },
      scope: ["root", this.errorStateId],
    };
  }

  /**
   * Ensure error state exists in the graph
   */
  private ensureErrorStateExists(): void {
    if (!this.wasLoopDetected) {
      return;
    }

    // Check if error state already exists
    const errorStateExists = this.graph.some(
      (step) => step.id === this.errorStateId
    );

    // If error state doesn't exist, add it to the graph
    if (!errorStateExists) {
      const errorState = this.getErrorStateElement();
      this.graph.push(errorState);
    }
  }

  /**
   * Adds a new step to the workflow
   */
  step(
    stepNodeCustomizations: Partial<StepNodeCustomizations> = {}
  ): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }

    const ctx = this.currentContext;

    // Use element's key if available, or the id for the key to maintain consistency with tests
    const key = ctx?.elementKey;

    if (!key) {
      throw new Error("No key on element for graph construction");
    }

    const id = ctx?.element?.attributes?.id as string;

    // Check for recursion
    if (ctx?.element) {
      // Get maxRecursion from attributes if available
      let maxRecursion = DEFAULT_MAX_RECURSION;
      if ("maxRecursion" in ctx?.element.attributes) {
        const attrValue = ctx?.element.attributes.maxRecursion;
        if (typeof attrValue === "number") {
          maxRecursion = attrValue;
        } else if (typeof attrValue === "string") {
          const parsed = parseInt(attrValue, 10);
          if (!isNaN(parsed)) {
            maxRecursion = parsed;
          }
        }
      }

      const isRecursionLimitExceeded = this.beginElementConstruction(
        key,
        maxRecursion
      );

      if (isRecursionLimitExceeded) {
        // Record the loop for debugging purposes
        this.recordLoopTransition(id || key, key);

        // Instead of the regular step, create an error step
        this.goToErrorState(
          `Workflow halted due to recursion limit exceeded ${key ? ` for element ${key}` : ""}.`,
          "RECURSION_LIMIT_EXCEEDED"
        );
        const errorStep = this.getErrorStateElement(key);
        // Update context state
        ctx.previousStepKey = ctx?.currentStepKey;
        ctx.currentStepKey = errorStep.key;
        ctx.lastAddedStepKey = errorStep.key;
        this.lastAddedStepKey = errorStep.key;

        return this;
      }
    }

    // --------------------------------------------------------------
    // Parent ID determination logic
    // --------------------------------------------------------------
    let lastElementKeys: string[] | null = null;

    // If afterStepIds is set by the after() method, use those as parents
    if (ctx?.afterStepIds && ctx?.afterStepIds.length > 0) {
      lastElementKeys = ctx?.afterStepIds;
      // Clear afterStepIds to not affect future steps
      ctx.afterStepIds = null;
    }
    // For sequential steps, establish proper connections
    else if (this.graph.length > 0 && !ctx?.isChildContext) {
      const previousStep = this.graph[this.graph.length - 1];

      // Get the previous step ID - prefer id over key for test compatibility
      if (previousStep) {
        const previousId = previousStep.id || previousStep.key;

        // If this is not the first step and the IDs are different (not the same element)
        if (previousId && id !== previousId) {
          lastElementKeys = [previousId];
        }
      }
    }

    const newStep: RunStep = {
      id,
      key,
      name: id,
      lastElementKeys: lastElementKeys,
      // Add required fields from graph.ts
      type: ctx?.element?.type!,
      subType: ctx?.element?.subType!,
      tag: ctx?.element?.tag!,
      attributes: ctx?.element?.attributes || {}, // Use element attributes if available
      scope: (ctx?.element?.scope || ["root"]) as ["root", ...string[]],
      // Add description for test compatibility
    };

    if (
      "variables" in stepNodeCustomizations &&
      stepNodeCustomizations.variables
    ) {
      newStep.variables = stepNodeCustomizations.variables;
    }

    if ("when" in stepNodeCustomizations && stepNodeCustomizations.when) {
      newStep.when = stepNodeCustomizations.when;
      // Also set 'if' for backward compatibility with tests
      newStep.if = stepNodeCustomizations.when;
    }

    if (stepNodeCustomizations?.attributes) {
      newStep.attributes = {
        ...newStep.attributes,
        ...stepNodeCustomizations.attributes,
      };
    }

    // Handle condition from if/else context
    if (this._currentCondition !== null) {
      newStep.if = this._currentCondition;
    }

    if (ctx?.isInIfBlock && ctx?.currentCondition) {
      newStep.if = ctx?.currentCondition;

      if (!ctx?.ifStepKey) {
        ctx.ifStepKey = newStep.key;
      }
    }

    if (
      ctx?.isInIfBlock &&
      ctx?.currentCondition === null &&
      ctx?.elseStepKey === null
    ) {
      ctx.elseStepKey = newStep.key;
    }

    // Regular step - always add to workflow
    this.graph.push(newStep);
    this.stepMap.set(newStep.key, newStep);

    if (ctx) {
      // Track the previous step before updating currentStepKey
      ctx.previousStepKey = ctx?.currentStepKey!;
      ctx.currentStepKey = newStep.key;
      ctx.lastAddedStepKey = newStep.key;
      this.lastAddedStepKey = newStep.key;
    }

    // Call finishElementConstruction if we started construction
    this.finishElementConstruction(key);

    // Create a new context for parallel steps
    if (
      stepNodeCustomizations.runChildrenInParallel === true &&
      newStep.runParallel !== false
    ) {
      // Create a child context for parallel steps
      const newContext = this.currentContext?.clone(ctx?.element)!;
      this.currentContext = newContext;
    }

    return this;
  }

  then(stepConfig: Partial<StepNodeCustomizations> = {}): WorkflowGraphBuilder {
    return this.step({
      ...stepConfig,
      runChildrenInParallel: false,
    });
  }

  /**
   * Creates a step that runs in parallel with its siblings
   */
  thenParallel(stepConfig: StepNodeCustomizations = {}): WorkflowGraphBuilder {
    return this.step({
      ...stepConfig,
      runChildrenInParallel: true,
    });
  }

  /**
   * Define explicit dependencies between workflow steps
   */
  after(steps: string | string[]): WorkflowGraphBuilder {
    // Convert to array if not already an array
    const stepIds = Array.isArray(steps) ? steps : [steps];

    // Create a new context for this branch
    const newContext = this.currentContext?.clone()!;

    // Store the dependencies in the context
    newContext.afterStepIds = stepIds;

    this.currentContext = newContext;

    return this;
  }

  /**
   * Repeats a step until a condition becomes true
   */
  until(
    condition: string,
    step: SerializedBaseElement | string
  ): WorkflowGraphBuilder {
    const stepId = typeof step === "string" ? step : step.id;

    // Find the step by ID or by key
    const targetStep =
      this.stepMap.get(stepId || "") ||
      this.graph.find((s) => s.key === stepId);

    if (targetStep) {
      targetStep.loopUntil = condition;
    }

    return this;
  }

  /**
   * Creates a conditional branch in the workflow
   */
  if(condition: string): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }

    // Push the current condition to the stack if it exists
    if (this._currentCondition !== null) {
      this._conditionStack.push(this._currentCondition);
    }

    // Set the new condition
    this._currentCondition = condition;

    // Create a new context for the if branch
    const ifContext = this.currentContext?.clone()!;
    ifContext.isInIfBlock = true;
    ifContext.currentCondition = condition;

    this.currentContext = ifContext;

    return this;
  }

  /**
   * Creates an alternative branch for when if condition is false
   */
  else(): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }

    // Clear the condition for else branches
    this._currentCondition = null;

    if (this.currentContext?.isInIfBlock) {
      this.currentContext.currentCondition = null;
    }

    return this;
  }

  /**
   * Creates an alternative branch with a condition
   */
  elseIf(condition: string): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }
    // Set the new condition for elseIf branches
    this._currentCondition = condition;

    if (this.currentContext?.isInIfBlock) {
      this.currentContext.currentCondition = condition;
      // Reset the ifStepId for this branch
      this.currentContext.ifStepKey = null;
    }

    return this;
  }

  /**
   * Exits the conditional block and returns to the parent context
   */
  endIf(): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }
    if (
      this.currentContext?.isInIfBlock &&
      this.currentContext?.parentContext
    ) {
      // Return to parent context
      this.currentContext = this.currentContext?.parentContext;
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
  while(condition: string): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }
    if (this.currentContext?.currentStepKey) {
      const currentStep = this.stepMap.get(this.currentContext?.currentStepKey);
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
  ): WorkflowGraphBuilder {
    if (this.hasReachedEnd) {
      return this;
    }
    const ctx = this.currentContext;
    const eventStepKey = uuidv4();
    const newStep: RunStep = {
      key: eventStepKey,
      id: uuidv4(),
      name: `Wait for ${eventName}`,
      description: `Waits for the ${eventName} event to occur`,
      lastElementKeys: this.currentContext?.currentStepKey
        ? [this.currentContext?.currentStepKey]
        : null,
      type: ctx?.element?.type as any,
      subType: ctx?.element?.subType as any,
      tag: ctx?.element?.tag || "on",
      attributes: ctx?.element?.attributes || {},
      scope: (ctx?.element?.scope || ["root"]) as ["root", ...string[]],
    };

    // Add event details
    newStep.waitFor = {
      eventName: eventName,
      payloadSchema: eventArgs,
    };

    this.graph.push(newStep);
    this.stepMap.set(eventStepKey, newStep);
    if (this.currentContext) {
      this.currentContext.currentStepKey = eventStepKey;
    }

    return this;
  }

  /**
   * Switch to a different child branch build context
   * This is primarily used in tests to create isolated step chains
   */
  enterChildContext(): WorkflowGraphBuilder {
    // Save current context in stack with the current step key
    const currentKey = this.currentContext?.currentStepKey;

    // Push the current context to the stack
    this.contextStack.push(this.currentContext!);

    const newContext = this.currentContext?.clone()!;

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
  returnToRootContext(): WorkflowGraphBuilder {
    // Save the last step key before switching contexts
    const lastStepKeyBeforeReturn = this.currentContext?.lastAddedStepKey;

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
      this.currentContext!.lastAddedStepKey = lastStepKeyBeforeReturn;
      this.currentContext!.currentStepKey = lastStepKeyBeforeReturn;

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
  enterElementContext(element: BaseElement): WorkflowGraphBuilder {
    // Save the current context to the stack
    this.contextStack.push(this.currentContext!);

    // Create a new context with the current one as parent
    const newContext = this.currentContext?.clone(element)!;

    // Preserve the child context flag if we're in a child context
    if (this.currentContext?.isChildContext) {
      newContext.isChildContext = true;
    }

    // Preserve the afterStepIds from the previous context
    if (this.currentContext?.afterStepIds) {
      newContext.afterStepIds = this.currentContext?.afterStepIds;
      // Clear from the previous context to avoid duplication
      this.currentContext.afterStepIds = null;
    }

    // Store the elementId to be used for parent-child relationships
    const elementId = element.attributes?.id as string | undefined;
    if (elementId) {
      newContext.lastAddedStepKey = elementId;
      this.lastAddedStepKey = elementId;
    }

    // Track parent's step key to establish correct hierarchy
    if (this.currentContext?.currentStepKey && !newContext.isChildContext) {
      // We'll use this to set lastElementKeys when adding new steps
      newContext.parentContext = this.currentContext;
    }

    this.currentContext = newContext;
    return this;
  }

  /**
   * Leave the current element context and return to the previous context
   */
  leaveElementContext(): WorkflowGraphBuilder {
    // If the current context has a lastAddedStepKey, pass it to the parent context
    if (this.currentContext?.lastAddedStepKey) {
      this.lastAddedStepKey = this.currentContext?.lastAddedStepKey;
    }

    // Get the current step key before we pop the context
    const currentStepKey = this.currentContext?.currentStepKey;
    const isChildContext = this.currentContext?.isChildContext;

    // Pop the previous context from the stack
    const previousContext = this.contextStack.pop();

    // If we have a previous context, use it, otherwise fall back to root
    this.currentContext = previousContext || this.rootContext;

    // Only update parent context with current step key if not in a child context
    if (currentStepKey && !isChildContext) {
      this.currentContext!.currentStepKey = currentStepKey;
      this.currentContext!.lastAddedStepKey = currentStepKey;
    }

    return this;
  }

  /**
   * Create a build context for an element
   * @param element The element
   * @param parent The parent context (optional)
   * @returns The build context
   */
  private createBuildContext(
    element: BaseElement,
    parent?: BuildContext
  ): BuildContext {
    const context = new BuildContext(
      element,
      element.attributes,
      element.conditions ?? {},
      element,
      element,
      this
    );

    return context;
  }

  /**
   * Builds and returns the complete workflow definition
   */
  build(spec?: BaseElement): WorkflowGraph {
    if (!this.currentContext) {
      if (!spec) {
        throw new Error("No spec provided to graph builder");
      }
      this.currentContext = this.createBuildContext(spec);
    }
    if (!this.rootContext) {
      this.rootContext = this.currentContext;
    }
    if (spec) {
      spec.onExecutionGraphConstruction(this.currentContext);
    }

    // Return to root context
    this.currentContext = this.rootContext;

    // Ensure error state exists if needed
    this.ensureErrorStateExists();

    // Return both the graph array and additional properties for test compatibility
    return this.graph;
  }
}
