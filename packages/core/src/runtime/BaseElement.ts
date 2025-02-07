import { Step } from "@mastra/core";
import { StepContext } from "./StepContext";
import { StepValue } from "./StepValue";
import type { RunstepOutput } from "../types";
import { FireAgentSpecNode } from "../element/types";
import { z } from "zod";
import { BuildContext } from "./BuildContext";
import { ExecutionGraphElement } from "./types";

export type SCXMLNodeType =
  | "scxml"
  | "state"
  | "parallel"
  | "transition"
  | "initial"
  | "final"
  | "onentry"
  | "onexit"
  | "on"
  | "history"
  | "datamodel"
  | "data"
  | "assign"
  | "invoke"
  | "send"
  | "cancel"
  | "script"
  | "log"
  | "raise"
  | "if"
  | "elseif"
  | "else"
  | "foreach"
  | "finalize"
  | "llm";

/** Represents a single SCXML element. */
export type Component<P> = BaseElement; // (props: P, context: ComponentContext) => Renderable;

/**
 * A Literal represents a literal value.
 */
export type Literal = string | number | null | undefined | boolean;

export type SCXMLContext = {
  dataModel: Record<string, unknown>;
  eventQueue: Array<{ name: string; data: unknown }>;
};

export type StepCondition = {
  when: (context: StepContext<any, RunstepOutput>) => Promise<boolean>;
};
// | {
//     when: {
//       ref: { step: string; path: string };
//       query: { $eq: any };
//     };
//   }
// | {
//     when: Record<string, any>;
//   };

export class BaseElement extends Step<string, z.AnyZodObject, z.AnyZodObject> {
  readonly elementType: SCXMLNodeType;
  readonly tag: string;
  readonly role: "state" | "action" | "user-input" | "error" | "output";
  protected _dataModel: Record<string, unknown> = {};
  protected _eventQueue: Array<{ name: string; data: unknown }> = [];
  protected parent?: BaseElement;
  public readonly attributes: Record<string, string>;
  public readonly children: FireAgentSpecNode[] = [];
  public readonly onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;

  public enter?: () => Promise<void>;
  public exit?: () => Promise<void>;

  private stepConditions?: StepCondition;
  private _isActive: boolean = false;

  constructor(config: {
    id: string;
    tag: string;
    role: "state" | "action" | "user-input" | "error" | "output";
    elementType: SCXMLNodeType;
    attributes?: Record<string, string>;
    parent?: BaseElement;
    children?: FireAgentSpecNode[];
    onExecutionGraphConstruction?: (
      buildContext: BuildContext
    ) => ExecutionGraphElement;
    execute?: (
      ctx: StepContext<any, RunstepOutput>,
      childrenNodes: FireAgentSpecNode[]
    ) => Promise<StepValue | null>;
    enter?: () => Promise<void>;
    exit?: () => Promise<void>;
    stepConditions?: StepCondition;
  }) {
    super({
      id: config.id,
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      execute: async ({ context }) => {
        const stepContext = new StepContext<any, RunstepOutput>({
          input: new StepValue({}),

          datamodel: this._dataModel,
          workflowInput: {
            userMessage: "",
            chatHistory: [],
            clientSideTools: [],
          },

          attributes: this.attributes,
          state: { id: config.id, attributes: {}, input: new StepValue({}) },
          machine: { id: "workflow", secrets: { system: {}, user: {} } },
          run: { id: "run" },
        });

        // Execute entry actions if becoming active
        if (!this._isActive) {
          this._isActive = true;
          await this.enter?.();
        }

        // Execute main step logic
        const result = await config.execute?.(stepContext, this.children);

        // Update data model with step result
        if (result) {
          this._dataModel = {
            ...this._dataModel,
            [config.id]: result,
          };
        }

        return {
          elementType: this.elementType,
          dataModel: this._dataModel,
          isActive: this._isActive,
        };
      },
    });
    this.role = config.role;
    this.elementType = config.elementType;
    this.tag = config.tag;
    this.role = config.role;
    this.attributes = config.attributes ?? {};
    this.parent = config.parent;
    this.children = config.children ?? [];
    this.enter = config.enter;
    this.exit = config.exit;
    if (config.onExecutionGraphConstruction) {
      this.onExecutionGraphConstruction = config.onExecutionGraphConstruction;
    }
    this.stepConditions = config.stepConditions;
  }

  protected async deactivate(): Promise<void> {
    if (this._isActive) {
      await this.exit?.();
      this._isActive = false;
    }
  }

  /**
   * Get the default conditions that determine when this element's step should execute.
   * Override this in an element type subclass such as ActionElement to set the default conditions
   * for that element type.
   */
  protected getDefaultStepConditions(): StepCondition | undefined {
    return undefined;
  }

  /**
   * Get the per element conditions that determine when this element's step should execute.
   * for that element type.
   */
  public getStepConditions(): StepCondition | undefined {
    return this.stepConditions ?? this.getDefaultStepConditions();
  }

  get dataModel(): Record<string, unknown> {
    // TODO get the root data model, and also all the data models of the ancestors
    return this.getRootElement()._dataModel;
  }

  set dataModel(value: Record<string, unknown>) {
    this.getRootElement()._dataModel = value;
  }

  // Base functionality for all SCXML elements
  // TODO extract this to StepContext
  protected evaluateExpr(expr: string, context: unknown): unknown {
    return new Function(
      "context",
      "_data",
      `
      with(_data) {
        with(context) {
          return ${expr};
        }
      }
    `
    )(context, this.dataModel);
  }

  // Helper methods
  protected getParentOfType<T extends BaseElement>(
    type: SCXMLNodeType
  ): T | undefined {
    let current = this.parent;
    while (current) {
      if (current.elementType === type) {
        return current as T;
      }
      current = current.parent;
    }
    return undefined;
  }

  protected getRootElement(): BaseElement {
    let current: BaseElement = this;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  get eventQueue(): Array<{ name: string; data: unknown }> {
    return this.getRootElement()._eventQueue;
  }

  protected enqueueEvent(name: string, data?: unknown): void {
    this.getRootElement()._eventQueue.push({ name, data });
  }
}

/**
 * A Node represents an element of an exicution graph.
 */
export type Node = BaseElement | Literal | Node[];

/** @hidden */
export type ElementPredicate = (e: BaseElement) => boolean;

/** @hidden */
export type PropsOfComponent<T extends Component<any>> =
  T extends Component<infer P> ? P : never;

/** @hidden */
export function isElement(value: unknown): value is BaseElement {
  return value !== null && typeof value === "object" && "tag" in value;
}

/** @hidden */
export function Fragment({ children }: { children: Node }): Node {
  return children;
}
