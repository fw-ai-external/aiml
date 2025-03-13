/**
 * Workflow Runner Module
 *
 * This module provides a workflow runner that executes workflows.
 * It uses dependency injection to decouple from other components.
 */

import { BaseElement } from "@fireworks/shared";
// Use type-only import with resolution-mode
import type { ExecutionGraphElement } from "@fireworks/types";
import { StepValue } from "@fireworks/shared";
import { container, ServiceIdentifiers } from "./di";
import { GraphBuilder } from "./graph-builder";
import {
  Workflow as MastraWorkflow,
  WorkflowRunState,
} from "@mastra/core/workflows";
import { BuildContext } from "./BuildContext";
import { z } from "zod";
import { RunValue } from "./RunValue";
/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  input: any;
  workflowInput: any;
  datamodel: Record<string, any>;
  machine: {
    id: string;
    secrets: any;
  };
  run: {
    id: string;
  };
}

export type RuntimeOptions = {
  onTransition?: (state: WorkflowRunState) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

/**
 * Workflow runner
 */
export class Workflow<
  InputSchema extends z.ZodType<any>,
  InputType extends z.infer<InputSchema>,
> {
  private graphBuilder: GraphBuilder;
  private workflow: MastraWorkflow;
  private activeStates: Set<string> = new Set();
  private value: RunValue | null = null;
  private executionGraph: ExecutionGraphElement;
  constructor(
    private readonly spec: BaseElement,
    private options?: RuntimeOptions
  ) {
    this.graphBuilder = container.get<GraphBuilder>(
      ServiceIdentifiers.GRAPH_BUILDER
    );
    // Build the execution graph
    this.executionGraph = this.graphBuilder.buildGraph(this.spec);
    this.workflow = new MastraWorkflow({
      name: "workflow",
      triggerSchema: z.object({}),
    });

    this.addGraphElementToWorkflow(
      new BuildContext(
        this.workflow,
        this.spec.key,
        this.spec.children,
        this.spec.attributes,
        {},
        this.spec
      ),
      this.executionGraph,
      false,
      true
    );

    this.workflow.commit();
  }

  /**
   * Execute a workflow
   * @param rootElement The root element
   * @param options The execution options
   * @returns The execution result
   */
  private async handleStateTransition(state: WorkflowRunState) {
    // Update active states
    console.log("state", state);
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
        console.log("adding active step", element.tag);
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
        !currentlyActiveStates.has(stateId) ||
        failedStates.includes(stateId) ||
        state.context.steps[stateId]?.status === "success"
      ) {
        const element = this.findElementById(stateId);
        if (element) {
          console.log(
            "marking step as finished",
            element.tag,
            element.id,
            state.context.steps
          );
          this.value?.markStepAsFinished(
            element.id,
            state.context.steps[element.id]?.payload
          );
          // await (element as BaseElement).deactivate?.();
        }
      }
    }

    // Filter out states that have succeeded from the active states
    this.activeStates = new Set(
      Array.from(currentlyActiveStates).filter(
        (stateId) => state.context.steps[stateId]?.status !== "success"
      )
    );
    this.options?.onTransition?.(state);
  }

  private findElementById(
    id: string,
    element: BaseElement = this.spec
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

  private addGraphElementToWorkflow(
    buildContext: BuildContext,
    element: ExecutionGraphElement,
    parallel: boolean = false,
    root: boolean = false,
    parent?: BaseElement
  ) {
    if (element.runAfter) {
      this.workflow.after(
        element.runAfter.map((key: string) =>
          buildContext.getElementByKey(key)
        ) as any
      ) as any;
    }
    // Add the current element to the workflow

    const step = buildContext.getElementByKey(element.key);
    console.log("step ***", step?.tag);
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

  /**
   * Find an element by key
   * @param elements The elements to search in
   * @param key The key to search for
   * @returns The element with the key, or undefined if not found
   */
  private findElementByKey(
    elements: BaseElement[],
    key: string
  ): BaseElement | undefined {
    for (const element of elements) {
      if (element.key === key) {
        return element;
      }

      if (element.children && element.children.length > 0) {
        const found = this.findElementByKey(
          element.children as BaseElement[],
          key
        );
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }
}
