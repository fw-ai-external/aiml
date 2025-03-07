// Define a simplified local Workflow type to avoid deep type instantiation
import { BaseElement } from "@fireworks/core";
import { z } from "zod";
import { BuildContext } from "./BuildContext";
import { StepValue } from "./StepValue";
import { ExecutionGraphElement } from "./types";
import { Workflow } from "@mastra/core/workflows";
import { RunValue } from "./RunValue";

type WorkflowRunState = Awaited<ReturnType<Workflow["getState"]>>;

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

    const executionGraph =
      this.spec.onExecutionGraphConstruction?.(buildContext);
    if (!executionGraph) {
      throw new Error(
        "Execution graph construction returned undefined",
        buildContext as any
      );
    }

    // Start with the root execution graph element and add all elements recursively
    this.addGraphElementToWorkflow(buildContext, executionGraph, true);
  }

  private addGraphElementToWorkflow(
    buildContext: BuildContext,
    element: ExecutionGraphElement,
    parallel: boolean = false
  ) {
    if (element.runAfter) {
      console.log(
        "=-------------------- runAfter",
        element.runAfter,
        element.key
      );
      this.workflow.after(
        element.runAfter.map((key) => buildContext.getElementByKey(key)) as any
      ) as any;
    }
    // Add the current element to the workflow
    console.log(
      "=-------------------- addGraphElementToWorkflow",
      element.subType,
      element.key
    );
    const step = buildContext.getElementByKey(element.key);
    if (step) {
      console.log("=-------------------- getElementById", step.tag);
      if (parallel) {
        this.workflow.step(step, {
          // create a function that evaluates the when expression
          // this serves as a guard for the step
          // TODO use Step context here
          when: async ({ context }: { context: Record<string, any> }) =>
            element.when ? eval(element.when) : true,
        });
      } else {
        console.log("=-------------------- then", step.tag);
        this.workflow.then(step, {
          // create a function that evaluates the when expression
          // this serves as a guard for the step
          // TODO use Step context here
          when: async ({ context }: { context: Record<string, any> }) =>
            element.when ? eval(element.when) : true,
        });
      }
    }

    // Recursively add all child elements
    if (element.next) {
      for (const child of element.next) {
        this.addGraphElementToWorkflow(buildContext, child);
      }
    }

    if (element.parallel) {
      for (const child of element.parallel) {
        this.addGraphElementToWorkflow(buildContext, child, true);
      }
    }
  }

  private async handleStateTransition(state: WorkflowRunState) {
    // Update active states
    const newActiveStates = new Set(
      Object.keys(state?.context ?? {}).filter(
        (key) =>
          (state?.context as Record<string, { isActive?: boolean }>)[key]
            ?.isActive === true
      )
    );

    // Handle state exits
    for (const stateId of this.activeStates) {
      if (!newActiveStates.has(stateId)) {
        const element = this.findElementById(stateId);
        if (element) {
          // await (element as BaseElement).deactivate?.();
        }
      }
    }

    this.activeStates = newActiveStates;
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
      const { results } = await start({
        triggerData: {
          input: new StepValue(input),
          chatHistory: [],
          userInput: null,
          datamodel: {},
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
    const { runId, start } = this.workflow.createRun();

    const run = new RunValue({ runId });

    const workflowOutput = start({
      triggerData: {
        input: new StepValue(input),
        chatHistory: [],
        userInput: null,
        datamodel: {},
      },
    });

    workflowOutput.then(async (results) => {
      await run.finalize();
    });

    return run;
  }
  public toGraph() {
    return this.workflow.stepGraph;
  }
}

export * from "./BuildContext";
export * from "./StepValue";
export * from "./types";
export * from "./ElementExecutionContext";
export * from "./formalize";
