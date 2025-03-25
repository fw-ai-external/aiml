/**
 * Workflow Runner Module
 *
 * This module provides a workflow runner that executes workflows.
 * It uses dependency injection to decouple from other components.
 */

import {
  Workflow as MastraWorkflow,
  type WorkflowRunState,
} from "@mastra/core/workflows";
import { z } from "zod";
import { RunValue } from "./RunValue";
import { StepValue } from "./StepValue";
import { ServiceIdentifiers, container } from "./di";
import { BaseElement } from "./elements/BaseElement";
import type { GraphBuilder } from "./graphBuilder";
import { BuildContext } from "./graphBuilder/Context";
import type { ExecutionGraphElement } from "./types";
import type { DataModel, FieldValues } from "@fireworks/shared";
import { DataModelRegistry } from "./DataModelRegistry";

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
  private debug: string = "";
  private graphBuilder: GraphBuilder;
  private workflow: MastraWorkflow;
  private activeStates: Set<string> = new Set();
  private value: RunValue | null = null;
  private executionGraph: ExecutionGraphElement;
  public datamodel: DataModelRegistry;
  constructor(
    private readonly spec: BaseElement,
    datamodel: {
      scopedDataModels: Record<string, DataModel>;
      fieldValues: Record<string, FieldValues>;
    },
    private options?: RuntimeOptions
  ) {
    this.datamodel = DataModelRegistry.rehydrateFromDump(datamodel);
    this.graphBuilder = container.get<GraphBuilder>(
      ServiceIdentifiers.GRAPH_BUILDER
    );
    // Build the execution graph
    this.executionGraph = this.graphBuilder.buildGraph(this.spec);

    this.workflow = new MastraWorkflow({
      name: "workflow",
      triggerSchema: z.object({
        chatHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        userInput: z.string(),
        secrets: z.record(z.any()),
      }),
    });
    // this.workflow.__setLogger(
    //   createLogger({
    //     name: "Mastra Core Runtime",
    //     level: "debug",
    //   })
    // );

    this.addGraphElementToWorkflow(
      new BuildContext(
        this.workflow,
        this.spec.key,
        this.spec.children,
        this.spec.attributes,
        {},
        this.spec,
        this.spec
      ),
      this.executionGraph,
      false,
      true
    );
    console.log("[DEBUG] mastra workflow 'code':\n", this.debug);
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
    for (const stateId of currentlyActiveStates) {
      if (
        failedStates.includes(stateId) ||
        state.context.steps[stateId]?.status === "success"
      ) {
        const element = this.findElementById(stateId);
        if (element) {
          this.value?.markStepAsFinished(
            element.id,
            (state as any).context.steps[stateId].output?.result
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
      const { results } = await start({
        triggerData: {
          input: new StepValue(input.userMessage[0]),
          chatHistory: input.chatHistory,
          systemMessage: input.systemMessage,
          userInput: input.userMessage[0],
          secrets: input.secrets,
        },
      });

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
      this.handleStateTransition(state).catch((error) => {
        console.error("error", error);
        this.options?.onError?.(error as Error);
        throw error;
      })
    );

    const workflowOutput = start({
      triggerData: {
        input: new StepValue(input.userMessage[0]),
        chatHistory: input.chatHistory,
        systemMessage: input.systemMessage,
        userInput: input.userMessage[0],
        secrets: input.secrets,
        getDatamodel: () => {
          return this.datamodel;
        },
      },
    }).catch((error) => {
      console.error("error", error);
      this.options?.onError?.(error as Error);
      throw error;
    });

    workflowOutput.then(async (results) => {
      console.log(JSON.stringify(results, null, 2));
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

  /**
   * Helper function to strip circular references from any object
   */
  private sanitizeForJSON(obj: any, seen = new WeakSet()): any {
    // Check for null or non-objects
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Handle circular references
    if (seen.has(obj)) {
      return "[Circular Reference]";
    }
    seen.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeForJSON(item, seen));
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip parent references entirely
      if (key === "parent" || key === "_parent") {
        continue;
      }
      result[key] = this.sanitizeForJSON(value, seen);
    }
    return result;
  }

  /**
   * Gets all context values from the workflow
   * @returns A record of all context values
   */
  public getContextValues(): Record<string, any> {
    try {
      const result: Record<string, any> = {};

      // Safely access workflow state if available
      try {
        // Since we're not sure about the exact signature or implementation of getState,
        // let's use a safer approach using any to bypass type checking
        // This isn't ideal, but it's a pragmatic solution given the constraints
        const state = (this.workflow as any).getState?.(this.workflow as any);

        if (state && typeof state === "object") {
          // Handle both direct object and promise responses
          const processState = (stateObj: any) => {
            if (stateObj && typeof stateObj === "object" && stateObj.context) {
              const context = stateObj.context;

              // Extract datamodel
              if (context.datamodel) {
                result.datamodel = this.sanitizeForJSON(context.datamodel);
              }

              // Extract steps data
              if (context.steps) {
                result.steps = this.sanitizeForJSON(context.steps);
              }
            }
          };

          // Handle potential promise
          if (state.then && typeof state.then === "function") {
            // Just log that we found a promise but can't handle it synchronously
            console.log(
              "Workflow state is a promise. Cannot extract synchronously."
            );
          } else {
            processState(state);
          }
        }
      } catch (e) {
        console.error("Error accessing workflow state:", e);
      }

      return result;
    } catch (error) {
      console.error("Error getting context values:", error);
      return {};
    }
  }

  /**
   * Rehydrates context values into the workflow
   * @param contextValues The context values to set
   */
  public rehydrateContextValues(contextValues: Record<string, any>): void {
    if (!contextValues || typeof contextValues !== "object") {
      return;
    }

    try {
      // Recreate the workflow
      this.workflow = new MastraWorkflow({
        name: "workflow",
        triggerSchema: z.object({
          chatHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ),
          userInput: z.string(),
          secrets: z.record(z.any()),
          getDatamodel: z.any(),
        }),
      });

      // Reset active states
      this.activeStates = new Set();

      // Rebuild the graph
      this.addGraphElementToWorkflow(
        new BuildContext(
          this.workflow,
          this.spec.key,
          this.spec.children,
          this.spec.attributes,
          {},
          this.spec,
          this.spec
        ),
        this.executionGraph,
        false,
        true
      );

      // Commit the changes
      this.workflow.commit();

      // Create a new run with the rehydrated context
      if (contextValues.datamodel || contextValues.steps) {
        // Safely create a run
        const runCreation = this.workflow.createRun();

        if (
          runCreation &&
          typeof runCreation === "object" &&
          "start" in runCreation
        ) {
          const { runId, start } = runCreation;

          // Prepare the input data with the rehydrated context
          const triggerData: Record<string, any> = {
            // Default empty values
            chatHistory: [],
            userInput: "",
            secrets: {},
          };

          // Include restored datamodel if available
          if (contextValues.datamodel) {
            triggerData.datamodel = contextValues.datamodel;
          }

          // Start the run with the rehydrated context
          if (typeof start === "function") {
            start({ triggerData }).catch((error: Error) => {
              console.error(
                "Error starting workflow with rehydrated context:",
                error
              );
            });
          }

          console.log(`Rehydrated workflow context with run ID: ${runId}`);
        }
      }
    } catch (error) {
      console.error("Error rehydrating context values:", error);
    }
  }

  private addGraphElementToWorkflow(
    buildContext: BuildContext,
    element: ExecutionGraphElement,
    parallel: boolean = false,
    root: boolean = false,
    parentId?: string
  ) {
    if (element.runAfter) {
      this.debug = `${this.debug}.runAfter([${element.runAfter.join(",")}])`;
      this.workflow.after(
        element.runAfter.map((key: string) =>
          buildContext.findElementByKey(key)
        ) as any
      ) as any;
    }
    // Add the current element to the workflow

    const step = buildContext.findElementByKey(element.key, buildContext.spec);

    // Should never happen, so we add this here to catch issues/bugs
    if (!step || element.key !== step.key || element.subType !== step.tag) {
      throw new Error(
        `Step mismatch: ${element.key} !== ${step?.key} || ${element.subType} !== ${step?.tag}`
      );
    }

    if (parallel || root) {
      this.debug = root
        ? `mastraWorkflow.step(${step.tag})`
        : `${this.debug}.step(${step.tag})`;

      this.workflow.step(step, {
        variables: {
          input: root
            ? { step: "trigger", path: "input" as any }
            : { step: { id: parentId! } as any, path: "result" as any },
          getDatamodel: { step: "trigger", path: "getDatamodel" as any },
        },
        // create a function that evaluates the when expression
        // this serves as a guard for the step
        // TODO use Step context here
        // when: async ({ context }: { context: Record<string, any> }) =>
        //   element.when ? eval(element.when) : true,
      });
    } else {
      this.debug = `${this.debug}.then(Step: ${step.tag} Id:${step.id} ParentId:${parentId!})`;
      this.workflow.then(step, {
        variables: {
          input: { step: { id: parentId! }, path: "result" },
          getDatamodel: { step: "trigger" as any, path: "getDatamodel" as any },
        },
        // create a function that evaluates the when expression
        // this serves as a guard for the step
        // TODO use Step context here
        // when: async ({ context }: { context: Record<string, any> }) =>
        //   element.when ? eval(element.when) : true,
      });
    }

    // Recursively add all child elements
    if (element.next) {
      let lastChildId: string = step.id;
      for (const child of element.next) {
        this.addGraphElementToWorkflow(
          buildContext,
          child,
          false,
          false,
          lastChildId
        );
        const childElement = buildContext.findElementByKey(child.key);
        if (!childElement) {
          throw new Error(
            `childElement is undefined ${JSON.stringify(child, null, 2)}`
          );
        }
        lastChildId = childElement.id;
      }
    }
    if (element.parallel) {
      for (const child of element.parallel) {
        this.addGraphElementToWorkflow(
          buildContext,
          child,
          true,
          false,
          step.id
        );
      }
    }
  }
}
