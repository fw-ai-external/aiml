// Define a simplified local Workflow type to avoid deep type instantiation
import { BaseElement } from "@fireworks/core";
import { z } from "zod";
import { BuildContext } from "./BuildContext";
import { StepValue } from "./StepValue";
import { ExecutionGraphElement } from "./types";
import { Workflow, WorkflowRunState } from "@mastra/core/workflows";
import { RunValue } from "./RunValue";

export type RuntimeOptions = {
  onTransition?: (state: WorkflowRunState) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

export class Runtime<
  InputSchema extends z.ZodType<any>,
  InputType extends z.infer<InputSchema>,
> {
  public workflow: Workflow;
  private readonly rootElement: BaseElement;
  private activeStates: Set<string> = new Set();
  private value: RunValue | null = null;
  private executionGraph: ExecutionGraphElement | null = null;
  constructor(
    private readonly spec: BaseElement,
    private options?: RuntimeOptions
  ) {
    this.rootElement = spec;

    this.workflow = new Workflow({
      name: "workflow",
      triggerSchema: z.object({}),
    });

    this.buildWorkflowTree();
  }

  // Walks the spec and its children and builds the workflow tree of steps
  private buildWorkflowTree() {
    // Add the root spec and let it add its children
    const buildContext = new BuildContext(
      this.workflow,
      this.spec.key,
      this.spec.children,
      this.spec.attributes,
      {},
      this.spec
    );

    const executionGraph = this.spec.onExecutionGraphConstruction?.(
      buildContext as any
    );
    if (!executionGraph) {
      throw new Error(
        "Execution graph construction returned undefined",
        buildContext as any
      );
    }

    this.executionGraph = executionGraph;

    // Start with the root execution graph element and add all elements recursively
    this.addGraphElementToWorkflow(buildContext, executionGraph, false, true);
  }

  private addGraphElementToWorkflow(
    buildContext: BuildContext,
    element: ExecutionGraphElement,
    parallel: boolean = false,
    root: boolean = false,
    parent?: BaseElement
  ) {
    if (element.runAfter) {
      this.workflow.after(
        element.runAfter.map((key) => buildContext.getElementByKey(key)) as any
      ) as any;
    }
    // Add the current element to the workflow

    const step = buildContext.getElementByKey(element.key);
    if (!step || element.key !== step.key || element.subType !== step.tag) {
      throw new Error(
        `Step mismatch: ${element.key} !== ${step?.key} || ${element.subType} !== ${step?.tag}`
      );
    }
    if (step) {
      if (parallel || root) {
        this.workflow.step(step, {
          variables: {
            input: root
              ? { step: "trigger", path: "input" as any }
              : { step: { id: parent?.id! } as any, path: "result" as any },
          },
          // create a function that evaluates the when expression
          // this serves as a guard for the step
          // TODO use Step context here
          // when: async ({ context }: { context: Record<string, any> }) =>
          //   element.when ? eval(element.when) : true,
        });
      } else {
        this.workflow.then(step, {
          variables: {
            input: { step: { id: parent?.id! }, path: "result" },
          },
          // create a function that evaluates the when expression
          // this serves as a guard for the step
          // TODO use Step context here
          // when: async ({ context }: { context: Record<string, any> }) =>
          //   element.when ? eval(element.when) : true,
        });
      }
    }

    // Recursively add all child elements
    if (element.next) {
      for (const child of element.next) {
        this.addGraphElementToWorkflow(buildContext, child, false, false, step);
      }
    }

    if (element.parallel) {
      for (const child of element.parallel) {
        this.addGraphElementToWorkflow(buildContext, child, true, false, step);
      }
    }
  }

  private async handleStateTransition(state: WorkflowRunState) {
    // Update active states
    const currentlyActiveStates = new Set(
      Object.keys(state?.context.steps ?? {}).filter(
        (key) =>
          (state?.context.steps)[key]?.status === "success" ||
          (state?.context.steps)[key]?.status === "waiting" ||
          (state?.context.steps)[key]?.status === "suspended"
      )
    );

    const failedStates = Object.keys(state?.context.steps ?? {}).filter(
      (key) => (state?.context.steps)[key]?.status === "failed"
    );

    const newActiveStates = Array.from(currentlyActiveStates).filter(
      (stateId: string) => !this.activeStates.has(stateId)
    );

    for (const stateId of newActiveStates) {
      const element = this.findElementById(stateId);
      // const input = state?.context.steps?.[stateId].payload;
      if (element) {
        this.value?.addActiveStep({
          elementType: element.elementType,
          id: element.id,
          path: [],
          status: "active",
          // TODO add input
        });
      }
    }

    // Handle state exits
    for (const stateId of this.activeStates) {
      if (
        !currentlyActiveStates.has(stateId) &&
        failedStates.includes(stateId)
      ) {
        const element = this.findElementById(stateId);
        if (element) {
          this.value?.markStepAsFinished(element.id);
          // await (element as BaseElement).deactivate?.();
        }
      }
    }

    this.activeStates = currentlyActiveStates;
    this.options?.onTransition?.(state);
  }

  private findElementById(
    id: string,
    element: BaseElement = this.rootElement
  ): BaseElement | undefined {
    if (element.id === id) {
      return element;
    }

    for (const child of element.children) {
      if (child instanceof BaseElement) {
        const found = this.findElementById(id, child);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  async run(input: InputType) {
    this.workflow = this.workflow.commit();

    const { runId, start } = this.workflow.createRun();

    // Set up state transition monitoring
    this.workflow.watch((state: WorkflowRunState) =>
      this.handleStateTransition(state)
    );
    // .catch((error) => {
    //   console.error("error", error);
    //   this.options?.onError?.(error as Error);
    // });

    try {
      console.log("=-------------------- run", input);
      const { results } = await start({
        triggerData: {
          input: new StepValue(input),
          chatHistory: [],
          userInput: null,
          datamodel: {},
          secrets: {},
        },
      });

      console.log("results", results);

      this.options?.onComplete?.();

      return {
        runId,
        results,
      };
    } catch (error) {
      console.error("error", error);
      this.options?.onError?.(error as Error);
      throw error;
    }
  }

  public runStream(input: InputType) {
    this.workflow = this.workflow.commit();

    const { runId, start } = this.workflow.createRun();

    this.value = new RunValue({ runId });
    // Set up state transition monitoring
    this.workflow.watch((state: WorkflowRunState) =>
      this.handleStateTransition(state)
    );
    const workflowOutput = start({
      triggerData: {
        input: new StepValue(input),
        chatHistory: [],
        userInput: null,
        datamodel: {},
      },
    });

    workflowOutput.then(async (results) => {
      await this.value?.finalize();
    });

    return this.value;
  }
  public toGraph() {
    return this.workflow.stepGraph;
  }
  public getExecutionGraph() {
    return this.executionGraph;
  }
}

export * from "./BuildContext";
export * from "./StepValue";
export * from "./types";
export * from "./ElementExecutionContext";
export * from "./formalize";
