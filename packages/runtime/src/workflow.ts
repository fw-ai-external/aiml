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
import { BaseElement } from "./elements/BaseElement";
import type { WorkflowGraph } from "@aiml/shared";
import type { DataModel, FieldValues } from "@aiml/shared";
import { DataModelRegistry } from "./DataModelRegistry";
import { WorkflowGraphBuilder } from "./graphBuilder";
import { v4 as uuidv4 } from "uuid";
export type RuntimeOptions = {
  onTransition?: (state: WorkflowRunState) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

/**
 * Workflow runner
 */
export class Workflow<
  InputSchema extends z.AnyZodObject,
  InputType extends z.infer<InputSchema>,
> {
  private debug: string = "";
  private graphBuilder: WorkflowGraphBuilder;
  private workflow: MastraWorkflow;
  private activeStates: Set<string> = new Set();
  private value: RunValue | null = null;
  private executionGraph: WorkflowGraph;
  public datamodel: DataModelRegistry;

  // TODO this is a temp solution. Workflows should be able to define their own input
  // schema in addition to the default config
  private defaultInputSchema = z.object({
    chatHistory: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    ),
    userInput: z.string(),
    secrets: z.record(z.any()),
  }) as unknown as InputSchema;
  constructor(
    private readonly spec: BaseElement,
    datamodel: {
      scopedDataModels: Record<string, DataModel>;
      fieldValues: Record<string, FieldValues>;
    },
    private options?: RuntimeOptions
  ) {
    this.datamodel = DataModelRegistry.rehydrateFromDump(datamodel);
    this.graphBuilder = new WorkflowGraphBuilder();
    // Build the execution graph
    this.executionGraph = this.graphBuilder.build(this.spec);

    this.workflow = new MastraWorkflow({
      name: "workflow",
      triggerSchema: this.defaultInputSchema,
    });
    // this.workflow.__setLogger(
    //   createLogger({
    //     name: "Mastra Core Runtime",
    //     level: "debug",
    //   })
    // );

    this.initMastraWorkflow(this.executionGraph);
    // Mastra workflow code initialized
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
      const element = this.findElementByIdOrKey(stateId);
      // const input = state?.context.steps?.[stateId].payload;
      if (element) {
        this.value?.addActiveStep({
          ...element,
          status: "running",
          input: null,
          datamodel: {},
          id: element.id ?? uuidv4(),
        });
      }
    }

    // Handle state exits
    for (const stateId of currentlyActiveStates) {
      if (
        failedStates.includes(stateId) ||
        state.context.steps[stateId]?.status === "success"
      ) {
        const element = this.findElementByIdOrKey(stateId);
        if (element) {
          this.value?.markStepAsFinished(
            element.id ?? uuidv4(),
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

  private findElementByIdOrKey(
    idOrKey: string,
    element: BaseElement = this.spec
  ): BaseElement | undefined {
    if (element.key === idOrKey || element.id === idOrKey) {
      return element;
    }

    for (const child of element.children) {
      if (child instanceof BaseElement) {
        const found = this.findElementByIdOrKey(idOrKey, child);
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
        input: new StepValue(input.userMessage),
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
      // Workflow execution completed
      await this.value?.finalize();
    });

    return this.value?.openaiChatResponse();
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
      // Workflow execution completed
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
    const fields = this.datamodel.getAllFieldDefinitions();
    // for each field, get the value
    const result: Record<string, any> = {};
    const scopes = this.datamodel.getAllScopes();
    for (const scope of scopes) {
      for (const [fieldName, fieldDef] of fields) {
        // Get the field value from all relevant scopes
        result[fieldName] =
          this.datamodel.getFieldValue(scope, fieldName) ||
          fieldDef.defaultValue ||
          null;
      }
    }
    return result;
  }

  /**
   * Rehydrates context values into the workflow
   * @param contextValues The context values to set
   */
  public rehydrateContextValues(contextValues: Record<string, any>): void {
    const runId = contextValues.__runId;
    if (runId) {
      // Rehydrated workflow context with run ID
    }
    if (!contextValues || typeof contextValues !== "object") {
      return;
    }

    try {
      // Recreate the workflow instance
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
      this.initMastraWorkflow(this.executionGraph);

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

  private initMastraWorkflow(graph: WorkflowGraph) {
    let lastStepId: string | undefined;
    for (const step of graph) {
      const element = this.findElementByIdOrKey(step.key);
      if (!element) {
        console.log(JSON.stringify(this.spec, null, 2));
        throw new Error(
          `Invalid graph, no element found for key: ${step.key} - ${JSON.stringify(
            step,
            null,
            2
          )}`
        );
      }

      if (step.tag === "workflow") {
        this.workflow.step(element, {
          variables: {
            input: element
              ? { step: "trigger", path: "input" as any }
              : { step: { id: lastStepId! } as any, path: "result" as any },
            getDatamodel: { step: "trigger", path: "getDatamodel" as any },
          },
        });
      } else if (step.runParallel && "steps" in step && step.steps.length > 0) {
        step.steps.forEach((thread) => {
          // each thread is a parallel step, and gets the same initial input
          this.workflow.step(element, {
            variables: {
              input: {
                step: { id: lastStepId! } as any,
                path: "result" as any,
              },
              getDatamodel: { step: "trigger", path: "getDatamodel" as any },
            },
          });
          this.initMastraWorkflow(thread.slice(1));
        });
      } else {
        if (step.if) {
          this.workflow.if(async (args) => {
            // TODO use actual evaluation
            return step.if
              ? new Function(step.if)(
                  this.datamodel.getScopedDataModel(step.scope.join("."))
                )
              : true;
          });
        } else if (step.else) {
          this.workflow.else();
        } else if (step.when) {
          this.workflow.then(element, {
            when: async (args) => {
              // TODO use actual evaluation
              return step.when
                ? new Function(step.when)(
                    this.datamodel.getScopedDataModel(step.scope.join("."))
                  )
                : true;
            },
          });
        } else if (step.while) {
          this.workflow.while(async (args) => {
            // TODO use actual evaluation
            return step.while
              ? new Function(step.while)(
                  this.datamodel.getScopedDataModel(step.scope.join("."))
                )
              : true;
          }, element);
        } else {
          this.workflow.then(element, {
            variables: {
              input: {
                step: { id: lastStepId! } as any,
                path: "result" as any,
              },
              getDatamodel: { step: "trigger", path: "getDatamodel" as any },
            },
          });
        }
      }

      lastStepId = step.key;
    }
    //   if (element.runAfter) {
    //     this.debug = `${this.debug}.runAfter([${element.runAfter.join(",")}])`;
    //     this.workflow.after(
    //       element.runAfter.map((key: string) =>
    //         buildContext.findElementByKey(key)
    //       ) as any
    //     ) as any;
    //   }
    //   // Add the current element to the workflow

    //   const step = buildContext.findElementByKey(element.key, buildContext.spec);

    //   // Should never happen, so we add this here to catch issues/bugs
    //   if (
    //     !step ||
    //     ((element.key !== step.key || element.tag !== step.tag) &&
    //       element.next?.[0]?.type !== "error" &&
    //       element.subType !== "error")
    //   ) {
    //     throw new Error(
    //       `Step mismatch: ${element.key} !== ${step?.key} || ${element.tag} !== ${step?.tag}`
    //     );
    //   }

    //   if (parallel || root) {
    //     this.debug = root
    //       ? `mastraWorkflow.step(${step.tag})`
    //       : `${this.debug}.step(${step.tag})`;

    //     this.workflow.step(step, {
    //       variables: {
    //         input: root
    //           ? { step: "trigger", path: "input" as any }
    //           : { step: { id: parentId! } as any, path: "result" as any },
    //         getDatamodel: { step: "trigger", path: "getDatamodel" as any },
    //       },
    //       // create a function that evaluates the when expression
    //       // this serves as a guard for the step
    //       // TODO use Step context here
    //       // when: async ({ context }: { context: Record<string, any> }) =>
    //       //   element.when ? eval(element.when) : true,
    //     });
    //   } else {
    //     this.debug = `${this.debug}.then(Step: ${step.tag} Id:${step.id} ParentId:${parentId!})`;
    //     this.workflow.then(step, {
    //       variables: {
    //         input: { step: { id: parentId! }, path: "result" },
    //         getDatamodel: { step: "trigger" as any, path: "getDatamodel" as any },
    //       },
    //       // create a function that evaluates the when expression
    //       // this serves as a guard for the step
    //       // TODO use Step context here
    //       // when: async ({ context }: { context: Record<string, any> }) =>
    //       //   element.when ? eval(element.when) : true,
    //     });
    //   }
    // }
  }
}
