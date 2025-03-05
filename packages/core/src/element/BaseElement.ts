import type {
  ElementType,
  IBaseElement,
  IBaseElementConfig,
  ElementRole,
  AllowedChildrenType,
  BuildContext,
  ExecutionGraphElement,
  ElementExecutionContext,
  RunstepOutput,
} from "@fireworks/types";
import { z } from "zod";
import { StepValue } from "../runtime/StepValue";
export class BaseElement implements Omit<IBaseElement, "parent" | "children"> {
  public readonly id: string;
  public readonly key: string;
  public readonly tag: string;
  public readonly role: ElementRole;
  public readonly elementType: ElementType;
  public readonly attributes: Record<string, any>;
  public readonly children: BaseElement[];
  public readonly allowedChildren: AllowedChildrenType;
  public readonly schema: z.ZodType<any>;
  public readonly propsSchema: any;
  public readonly description?: string;
  public readonly onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
  public readonly enter?: () => Promise<void>;
  public readonly exit?: () => Promise<void>;
  public readonly type: "element" = "element";
  public readonly lineStart: number;
  public readonly lineEnd: number;
  public readonly columnStart: number;
  public readonly columnEnd: number;

  // Internal state and helpers
  protected _dataModel: Record<string, unknown> = {};
  protected _eventQueue: Array<{ name: string; data: unknown }> = [];
  protected _parent?: WeakRef<BaseElement>;
  private stepConditions?: {
    when: (
      context: ElementExecutionContext<any, RunstepOutput>
    ) => Promise<boolean>;
  };
  private _isActive: boolean = false;

  constructor(
    config: Omit<IBaseElementConfig, "parent" | "children"> & {
      children?: BaseElement[];
      parent?: WeakRef<BaseElement>;
    }
  ) {
    this.id = config.id;
    this.key = config.key;
    this.tag = config.tag;
    this.role = config.role;
    this.elementType = config.elementType;
    this.attributes = config.attributes ?? {};
    this.children = config.children ?? [];
    this._parent = config.parent
      ? (config.parent as WeakRef<BaseElement>)
      : undefined;
    this.allowedChildren = config.allowedChildren;
    this.schema = config.schema;
    this.onExecutionGraphConstruction = config.onExecutionGraphConstruction;
    this.enter = config.enter;
    this.exit = config.exit;
    this.propsSchema = config.propsSchema ?? z.object({});
    this.description = config.description;
    this.lineStart = config.lineStart ?? 0;
    this.lineEnd = config.lineEnd ?? 0;
    this.columnStart = config.columnStart ?? 0;
    this.columnEnd = config.columnEnd ?? 0;
  }

  get parent(): BaseElement | undefined {
    return this._parent?.deref();
  }

  get isActive(): boolean {
    return this._isActive;
  }

  set isActive(value: boolean) {
    this._isActive = value;
  }

  get dataModel(): Record<string, unknown> {
    return this._dataModel;
  }

  set dataModel(value: Record<string, unknown>) {
    this._dataModel = value;
  }

  get eventQueue(): Array<{ name: string; data: unknown }> {
    return this._eventQueue;
  }

  set eventQueue(value: Array<{ name: string; data: unknown }>) {
    this._eventQueue = value;
  }

  get conditions():
    | {
        when: (
          context: ElementExecutionContext<any, RunstepOutput>
        ) => Promise<boolean>;
      }
    | undefined {
    return this.stepConditions;
  }

  set conditions(
    value:
      | {
          when: (
            context: ElementExecutionContext<any, RunstepOutput>
          ) => Promise<boolean>;
        }
      | undefined
  ) {
    this.stepConditions = value;
  }

  async execute(
    context: ElementExecutionContext<any, RunstepOutput>,
    childrenNodes: BaseElement[] = []
  ): Promise<StepValue> {
    if (!this._isActive) {
      this._isActive = true;
      if (this.enter) await this.enter();
    }

    let resultObject: Record<string, unknown> = {};
    if (["state", "user-input", "output"].includes(this.role)) {
      resultObject = { id: this.id, isActive: this._isActive };
    }

    const result = new StepValue({
      type: "object",
      object: resultObject,
      raw: JSON.stringify(resultObject),
      wasHealed: false,
    });

    this._dataModel = {
      ...this._dataModel,
      [this.id]: result,
    };

    return result;
  }

  async deactivate(): Promise<void> {
    if (this._isActive) {
      if (this.exit) await this.exit();
      this._isActive = false;
    }
  }

  protected getDefaultStepConditions():
    | {
        when: (
          context: ElementExecutionContext<any, RunstepOutput>
        ) => Promise<boolean>;
      }
    | undefined {
    return undefined;
  }

  public getStepConditions():
    | {
        when: (
          context: ElementExecutionContext<any, RunstepOutput>
        ) => Promise<boolean>;
      }
    | undefined {
    return this.stepConditions ?? this.getDefaultStepConditions();
  }

  protected evaluateExpr(expr: string, context: unknown): unknown {
    const fnBody = `with(_data) { with(context) { return ${expr}; } }`;
    return new Function("context", "_data", fnBody)(context, this._dataModel);
  }

  protected getParentOfType<T extends BaseElement>(
    type: ElementType
  ): T | undefined {
    let current: BaseElement | undefined = this.parent;
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

  protected enqueueEvent(name: string, data?: unknown): void {
    this.getRootElement()._eventQueue.push({ name, data });
  }
}
export type Literal = string | number | null | undefined | boolean;

export type Node = BaseElement | Literal | Node[];

export type ElementPredicate = (node: Node) => boolean;

// export type PropsOfComponent<T extends Component<any>> =
//   T extends Component<infer P> ? P : never;

export function isElement(value: unknown): value is BaseElement {
  return value !== null && typeof value === "object" && "tag" in value;
}

export function Fragment({ children }: { children: Node }): Node {
  return children;
}
