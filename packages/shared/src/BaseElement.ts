import {
  type ElementType,
  type SerializedElement,
  type SerializedElementConfig,
  type ElementRole,
  type AllowedChildrenType,
  type BuildContext,
  type ExecutionGraphElement,
  type ElementExecutionContext,
  type RunstepOutput,
  ErrorCode,
  SerializedBaseElement,
} from "@fireworks/types";
import { z } from "zod";
import { ActionContext } from "@mastra/core";

export class BaseElement
  implements Omit<SerializedElement, "parent" | "children">
{
  public readonly inputSchema = z.object({
    input: z.any(),
  });
  public readonly outputSchema = z.object({
    result: z.any(),
  });
  public readonly id: string;
  public readonly key: string;
  public readonly tag: string;
  public readonly role: ElementRole;
  public readonly elementType: ElementType;
  public readonly attributes: Record<string, any>;
  public children: BaseElement[];
  public readonly allowedChildren: AllowedChildrenType;
  public readonly schema: z.ZodType<any>;
  public readonly propsSchema: any;
  public readonly description?: string;
  public readonly onExecutionGraphConstruction: (
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
  private _execute?: (
    context: ElementExecutionContext,
    childrenNodes: BaseElement[]
  ) => Promise<any>; // Will be cast to StepValue

  constructor(
    config: Omit<SerializedElementConfig, "parent" | "children"> & {
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
    this._execute = config.execute;
    console.log(
      "=-------------------- config.execute internal",
      this.tag,
      config.execute,
      this._execute
    );
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

  // must be declared as a property arrow function to avoid binding issues
  execute = async (
    context: ActionContext<any>,
    childrenNodes: BaseElement[] = []
  ): Promise<{ result: any }> => {
    // Will be StepValue at runtime
    console.log("=-------------------- execute", this.tag);
    if (!this._isActive) {
      this._isActive = true;
      if (this.enter) await this.enter();
    }

    console.log("=-------------------- execute after enter", this.tag);

    if (!this._execute) {
      console.log("=-------------------- no execute", context);
      // this element is a pass-through element
      this._dataModel = {
        ...this._dataModel,
        [this.id]: null,
      };
      return {
        result: context.context.input,
      };
    }
    try {
      const result = await this._execute(
        {
          ...context,
          attributes: this.attributes,
          machine: {
            id: (context as any)?.machine?.id,
            secrets: {
              ...context,
            },
          },
          run: {
            id: (context as any)?.run?.id,
          },
          runId: (context as any)?.runId,
        } as any,
        childrenNodes
      ).catch((error) => {
        console.error("Error executing element:", error);
        console.error("Error executing element:", error);
        // Return an error object that will be handled by the runtime
        return {
          type: "error",
          code: ErrorCode.SERVER_ERROR,
          error: error instanceof Error ? error.message : String(error),
        };
      });
      console.log("=-------------------- execute after execute", this.tag);
      this._dataModel = {
        ...this._dataModel,
        [this.id]: result,
      };
      console.log(
        "=-------------------- execute result",
        this.tag,
        await result.type(),
        await result.value()
      );
      return {
        result,
      };
    } catch (error) {
      console.error("Error executing element:", error);
      return {
        result: {
          type: "error",
          code: ErrorCode.SERVER_ERROR,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };

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

  toJSON(): SerializedBaseElement {
    return {
      type: "element",
      id: this.id,
      key: this.key,
      tag: this.tag,
      role: this.role,
      parent: this.parent?.toJSON(),
      elementType: this.elementType,
      attributes: this.attributes,
      children: this.children.map((child) => child.toJSON()),
      lineStart: this.lineStart,
      lineEnd: this.lineEnd,
      columnStart: this.columnStart,
      columnEnd: this.columnEnd,
    };
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
