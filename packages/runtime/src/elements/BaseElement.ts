import type {
  AllowedChildrenType,
  ElementRole,
  ElementType,
  SerializedBaseElement,
  SerializedElement,
  SerializedElementConfig,
} from "@fireworks/shared";
import type { ActionContext as MastraActionContext } from "@mastra/core";
import { z } from "zod";
import { ElementExecutionContext } from "../ElementExecutionContext";
import type { BuildContext } from "../graphBuilder/Context";
import type {
  ExecutionGraphElement,
  ExecutionReturnType,
  RuntimeElementDefinition,
} from "../types";
import { defaultStepExecutionGraphMapper } from "../utils";
import type { DataModelRegistry } from "../DataModelRegistry";

export class BaseElement
  implements Omit<SerializedElement, "parent" | "children">
{
  public readonly inputSchema = z.object({
    input: z.any(),
    getDatamodel: z.any(),
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
  protected _parentElementId?: string;
  protected _childrenIds: string[] = [];
  private stepConditions?: {
    when: (
      context: InstanceType<typeof ElementExecutionContext>
    ) => Promise<boolean>;
  };
  private _isActive: boolean = false;
  private _execute?: (
    context: InstanceType<typeof ElementExecutionContext<any, any>>,
    childrenNodes: BaseElement[]
  ) => Promise<ExecutionReturnType>;
  public readonly scope: string[];
  constructor(
    config: Omit<RuntimeElementDefinition, "propsSchema"> &
      Omit<SerializedElementConfig, "parent" | "children"> & {
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
    this.scope = (config as any).scope ?? ["root"];
    // Set parent ID if parent is provided
    if (this._parent) {
      const parent = this._parent.deref();
      if (parent) {
        this._parentElementId = parent.id;
        parent.addChild(this);
      }
    }
    this.allowedChildren = config.allowedChildren;
    this.schema = config.schema;
    this.onExecutionGraphConstruction =
      config.onExecutionGraphConstruction ?? defaultStepExecutionGraphMapper;
    this.enter = config.enter;
    this.exit = config.exit;
    this.propsSchema = config.propsSchema ?? z.object({});
    this.description = config.description;
    this.lineStart = config.lineStart ?? 0;
    this.lineEnd = config.lineEnd ?? 0;
    this.columnStart = config.columnStart ?? 0;
    this.columnEnd = config.columnEnd ?? 0;
    this._execute = config.execute;
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
          context: InstanceType<typeof ElementExecutionContext>
        ) => Promise<boolean>;
      }
    | undefined {
    return this.stepConditions;
  }

  set conditions(
    value:
      | {
          when: (
            context: InstanceType<typeof ElementExecutionContext>
          ) => Promise<boolean>;
        }
      | undefined
  ) {
    this.stepConditions = value;
  }

  // must be declared as a property arrow function to avoid binding issues
  execute = async (
    context: MastraActionContext<any>,
    childrenNodes: BaseElement[] = []
  ): Promise<ExecutionReturnType> => {
    if (!this._execute) {
      // Default execution if no _execute is defined
      // The element can still store its data in the datamodel
      this._dataModel = {
        ...this._dataModel,
        [this.id]: context.context.input,
      };
      return {
        result: context.context.input,
      };
    }

    const datamodel: DataModelRegistry = context.context.getDatamodel();
    const scopedDatamodel = datamodel.getScopedDataModel(this.scope.join("."));

    try {
      const executeResult = await this._execute(
        new ElementExecutionContext({
          ...context,
          input: context.context.input,
          requestInput: context.context.workflowInput || {},
          datamodel: scopedDatamodel,
          state: {
            id: this.id,
            props: this.attributes,
            input: context.context.input,
          },
          props: this.attributes,
          machine: {
            id: context.context.machine?.id,
            secrets: {
              system: {},
              ...context?.context.machine?.secrets,
            },
          },
          run: {
            id: context.runId,
          },
        }),
        childrenNodes
      ).catch((error) => {
        console.error("Error executing element:", error);
        console.error("Error executing element:", error);
        // Return an error object that will be handled by the runtime
        return {
          result: context.context.input,
          exception: error instanceof Error ? error : new Error(String(error)),
        } as ExecutionReturnType;
      });

      if (!executeResult?.result) {
        return {
          result: context.context.input,
          exception: new Error(
            "No result in element " + this.tag + " " + this.id
          ),
        } as ExecutionReturnType;
      }

      // Store the result in the datamodel
      this._dataModel = {
        ...this._dataModel,
        [this.id]: executeResult.result,
      };

      // Apply any context updates if provided
      if (executeResult.contextUpdate) {
        for (const [key, value] of Object.entries(
          executeResult.contextUpdate
        )) {
          this._dataModel[key] = value;
        }
      }

      return executeResult;
    } catch (error) {
      console.error("Error executing element:", error);
      return {
        result: context.context.input,
        exception: new Error(
          "Error executing element " + this.tag + " " + this.id
        ),
      } as ExecutionReturnType;
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
          context: InstanceType<typeof ElementExecutionContext>
        ) => Promise<boolean>;
      }
    | undefined {
    return undefined;
  }

  public getStepConditions():
    | {
        when: (
          context: InstanceType<typeof ElementExecutionContext>
        ) => Promise<boolean>;
      }
    | undefined {
    return this.stepConditions ?? this.getDefaultStepConditions();
  }

  protected evaluateExpr(expr: string, context: unknown): unknown {
    const fnBody = `with(_data) { with(context) { return ${expr}; } }`;
    return new Function("context", "_data", fnBody)(context, this._dataModel);
  }

  /**
   * Get the parent element ID
   */
  get parentElementId(): string | undefined {
    return this._parentElementId;
  }

  /**
   * Get the IDs of all child elements
   */
  get childrenIds(): string[] {
    return [...this._childrenIds]; // Return a copy to prevent direct modification
  }

  /**
   * Add a child element and establish the parent-child relationship
   */
  addChild(child: BaseElement): void {
    if (!this._childrenIds.includes(child.id)) {
      this._childrenIds.push(child.id);
      child._parentElementId = this.id;
    }
  }

  /**
   * Get all ancestor IDs in order from parent to root
   */
  getAncestorIds(): string[] {
    const ancestors: string[] = [];
    let current: BaseElement | undefined = this._parent?.deref();

    while (current) {
      ancestors.push(current.id);
      current = current._parent?.deref();
    }

    return ancestors;
  }

  protected getParentOfType<T extends BaseElement>(
    type: ElementType
  ): T | undefined {
    let current: BaseElement | undefined = this._parent?.deref();
    while (current) {
      if (current.elementType === type) {
        return current as T;
      }
      current = current._parent?.deref();
    }
    return undefined;
  }

  protected getRootElement(): BaseElement {
    let current: BaseElement = this;
    while (current._parent) {
      current = current._parent.deref() as BaseElement;
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
      elementType: this.elementType,
      attributes: this.attributes,
      scope: this.scope,
      children: this.children.map((child) => child.toJSON()),
      lineStart: this.lineStart,
      lineEnd: this.lineEnd,
      columnStart: this.columnStart,
      columnEnd: this.columnEnd,
    };
  }
  toString(): string {
    return JSON.stringify(this.toJSON());
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
