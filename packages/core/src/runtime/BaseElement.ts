import { ElementExecutionContext } from "./ElementExecutionContext";
import { StepValue } from "./StepValue";
import type { RunstepOutput } from "../types";
import { z } from "zod";
import { BuildContext } from "./BuildContext";
import { ExecutionGraphElement } from "./types";
import type { SCXMLNodeType } from "@fireworks/element-types";
import { ErrorCode } from "../utils/errorCodes";

/** Represents a single SCXML element. */
export type Component<P> = BaseElement;

/**
 * A Literal represents a literal value.
 */
export type Literal = string | number | null | undefined | boolean;

export type SCXMLContext = {
  dataModel: Record<string, unknown>;
  eventQueue: Array<{ name: string; data: unknown }>;
};

export type StepCondition = {
  when: (
    context: ElementExecutionContext<any, RunstepOutput>
  ) => Promise<boolean>;
};

// Define base schema types
const BaseSchema = z.object({}).strict();

export type ApiRequest = {
  method: "POST" | "GET" | "PUT" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

export type ApiResponse = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
};

export type BaseStepResult =
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      result?: any;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args?: any;
    }
  | {
      type: "text";
      text: string;
    }
  | {
      type: "object";
      object: Record<string, unknown> | Record<string, unknown>[];
      raw: string;
      wasHealed?: boolean;
    }
  | {
      type: "error";
      code: ErrorCode;
      error: string;
      step?: string;
    }
  | {
      type: "api-call";
      apiName: string;
      operationId: string;
      request: ApiRequest;
    }
  | {
      type: "api-call-result";
      apiName: string;
      operationId: string;
      response: ApiResponse;
    };

export type StepResultItem = {
  value: BaseStepResult;
  name: string;
  index: number;
};

export type StepResult =
  | BaseStepResult
  | {
      type: "merged-results";
      results: StepResultItem[];
    };

export class BaseElement {
  readonly elementType: SCXMLNodeType;
  readonly tag: string;
  readonly role: "state" | "action" | "user-input" | "error" | "output";
  protected _dataModel: Record<string, unknown> = {};
  protected _eventQueue: Array<{ name: string; data: unknown }> = [];
  protected parent?: BaseElement;
  public readonly attributes: Record<string, string>;
  public readonly children: BaseElement[] = [];
  public readonly onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;

  public enter?: () => Promise<void>;
  public exit?: () => Promise<void>;

  private stepConditions?: StepCondition;
  private _isActive: boolean = false;
  public readonly key: string;
  public readonly id: string;

  constructor(config: {
    id: string;
    tag: string;
    role: "state" | "action" | "user-input" | "error" | "output";
    key: string;
    elementType: SCXMLNodeType;
    attributes?: Record<string, string>;
    parent?: BaseElement;
    children?: BaseElement[];
    onExecutionGraphConstruction?: (
      buildContext: BuildContext
    ) => ExecutionGraphElement;
    execute?: (
      ctx: ElementExecutionContext<any, RunstepOutput>,
      childrenNodes: BaseElement[]
    ) => Promise<StepValue<StepResult>>;
    enter?: () => Promise<void>;
    exit?: () => Promise<void>;
    stepConditions?: StepCondition;
  }) {
    this.id = config.id;
    this.role = config.role;
    this.elementType = config.elementType;
    this.tag = config.tag;
    this.key = config.key;
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

  public async execute(
    context: ElementExecutionContext<any, RunstepOutput>,
    childrenNodes: BaseElement[] = []
  ): Promise<StepValue<StepResult>> {
    const stepContext = new ElementExecutionContext<any, RunstepOutput>({
      input: new StepValue({}),
      datamodel: this._dataModel,
      workflowInput: {
        userMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      attributes: this.attributes,
      state: { id: this.id, attributes: {}, input: new StepValue({}) },
      machine: { id: "workflow", secrets: { system: {}, user: {} } },
      run: { id: "run" },
    });

    // Execute entry actions if becoming active
    if (!this._isActive) {
      this._isActive = true;
      await this.enter?.();
    }

    // Default result
    const result = new StepValue<StepResult>({
      type: "object",
      object: {},
      raw: "{}",
      wasHealed: false,
    });

    if (result) {
      this._dataModel = {
        ...this._dataModel,
        [this.id]: result,
      };
    }

    return result;
  }

  public async deactivate(): Promise<void> {
    if (this._isActive) {
      await this.exit?.();
      this._isActive = false;
    }
  }

  protected getDefaultStepConditions(): StepCondition | undefined {
    return undefined;
  }

  public getStepConditions(): StepCondition | undefined {
    return this.stepConditions ?? this.getDefaultStepConditions();
  }

  get dataModel(): Record<string, unknown> {
    return this.getRootElement()._dataModel;
  }

  set dataModel(value: Record<string, unknown>) {
    this.getRootElement()._dataModel = value;
  }

  protected evaluateExpr(expr: string, context: unknown): unknown {
    const fnBody = `with(_data) { with(context) { return ${expr}; } }`;
    return new Function("context", "_data", fnBody)(context, this.dataModel);
  }

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

export type Node = BaseElement | Literal | Node[];

export type ElementPredicate = (node: Node) => boolean;

export type PropsOfComponent<T extends Component<any>> =
  T extends Component<infer P> ? P : never;

export function isElement(value: unknown): value is BaseElement {
  return value !== null && typeof value === "object" && "tag" in value;
}

export function Fragment({ children }: { children: Node }): Node {
  return children;
}
