import type {
  AllowedChildrenType,
  ElementRole,
  ElementType,
  ExecutionGraphElement,
  SerializedBaseElement,
  SerializedElement,
  SerializedElementConfig,
} from "@fireworks/shared";
import type { ActionContext as MastraActionContext } from "@mastra/core";
import { z } from "zod";
import { ElementExecutionContext } from "../ElementExecutionContext";
import type { BuildContext } from "../graphBuilder/Context";
import type { ExecutionReturnType, RuntimeElementDefinition } from "../types";
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
  public readonly _onExecutionGraphConstruction: (
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
  public readonly scope: ["root", ...string[]];
  constructor(
    config: Omit<RuntimeElementDefinition, "propsSchema"> &
      Omit<SerializedElementConfig, "parent" | "children"> & {
        children?: BaseElement[];
        parent?: WeakRef<BaseElement>;
        scope?: ["root", ...string[]];
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
    this._onExecutionGraphConstruction =
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

  /**
   * Implementation of executionGraphConstruction
   * @param buildContext The build context
   * @returns The execution graph element
   */
  public onExecutionGraphConstruction(
    buildContext: BuildContext
  ): ExecutionGraphElement {
    // No cache hit - proceed with normal construction
    const graphBuilder = buildContext.graphBuilder;

    // Check for loops using the graph builder
    const isLoop = graphBuilder.beginElementConstruction(this);

    try {
      if (isLoop) {
        // Return a minimal graph element that points to the error state
        return {
          id: this.id,
          key: buildContext.elementKey,
          type: "state",
          tag: this.tag,
          attributes: this.attributes,
          scope: this.scope,
          next: [
            {
              id: "error",
              key: "error",
              type: "error",
              tag: "error",
              sourceElement: buildContext.elementKey,
              attributes: {
                id: "error",
                sourceElement: buildContext.elementKey,
                message: `Loop detected in element: ${buildContext.elementKey}`,
              },
              scope: ["root", "error"],
            },
          ],
        };
      }

      // Check if we have a cached graph element
      const cachedGraph = buildContext.graphBuilder.getCachedGraphElement(
        this.key
      );
      if (cachedGraph) {
        return cachedGraph;
      }

      // No loop - proceed with normal graph construction
      const graphElement = this._onExecutionGraphConstruction(buildContext);

      // Cache the result
      buildContext.graphBuilder.setCachedGraphElement(this.key, graphElement);

      return graphElement;
    } finally {
      // Only finish construction if we weren't in a loop
      if (!isLoop && graphBuilder) {
        graphBuilder.finishElementConstruction(this.key);
      }
    }
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
    console.log("execute", this.tag, this.id);
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
    console.log("create executionContext", this.tag, this.id);

    let executionContext = new ElementExecutionContext({
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
          ...context?.context.triggerData?.secrets,
        },
      },
      run: {
        id: context.runId,
      },
      lastElement: {},
    });

    try {
      Object.entries(this.attributes).forEach(([key, value]) => {
        if (typeof value === "string" && value.startsWith("::FUNCTION::")) {
          executionContext.props[key] = eval(value.slice(12))(executionContext);
        } else if (
          typeof value === "string" &&
          value.startsWith("::FUNCTION-EXPRESSION::")
        ) {
          executionContext.props[key] = eval(
            value.replace("::FUNCTION-EXPRESSION::", "")
          )(executionContext);
        } else {
          executionContext.props[key] = value;
        }
      });
    } catch (error: any) {
      console.error("Error evaluating props:", error, error?.stack);
    }

    try {
      const executeResult = await this._execute(
        executionContext,
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
