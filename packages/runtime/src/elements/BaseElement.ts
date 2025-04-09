import type {
  AllowedChildrenType,
  ElementType,
  SerializedBaseElement,
} from "@fireworks/shared";
import type { ActionContext as MastraActionContext } from "@mastra/core";
import { z } from "zod";
import { ElementExecutionContext } from "../ElementExecutionContext";
import type { BuildContext } from "../graphBuilder/Context";
import type { ExecutionReturnType, RuntimeElementDefinition } from "../types";
import { defaultStepExecutionGraphMapper } from "../utils";
import type { DataModelRegistry } from "../DataModelRegistry";
import type { ElementSubType } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
export class BaseElement
  implements
    Omit<SerializedBaseElement, "parent" | "children" | "astSourceType">
{
  // Used by Mastra to validate the input and output of the element
  // without it we wont get values
  public readonly inputSchema = z.object({
    input: z.any(),
    getDatamodel: z.any(),
  });
  // Used by Mastra to validate the output of the element
  public readonly outputSchema = z.object({
    result: z.any(),
  });
  public readonly id: string | undefined;
  public readonly key: string;
  public readonly tag: string;
  public readonly type: ElementType;
  public readonly subType: ElementSubType;
  public readonly attributes: Record<string, any>;
  public children: BaseElement[];
  public readonly allowedChildren: AllowedChildrenType;
  public readonly propsSchema: z.ZodType<any>;
  public readonly description?: string;
  public readonly _onExecutionGraphConstruction: (
    buildContext: BuildContext
  ) => void;
  public readonly enter?: () => Promise<void>;
  public readonly exit?: () => Promise<void>;
  public readonly lineStart: number;
  public readonly lineEnd: number;
  public readonly columnStart: number;
  public readonly columnEnd: number;

  // Internal state and helpers
  protected _eventQueue: Array<{ name: string; data: unknown }> = [];
  protected _parent?: WeakRef<BaseElement>;
  protected _parentElementId?: string;
  protected _childrenIds: string[] = [];
  private stepConditions?: {
    when: (
      context: InstanceType<typeof ElementExecutionContext>
    ) => Promise<boolean>;
  };
  private _execute?: (
    context: InstanceType<typeof ElementExecutionContext<any, any>>,
    childrenNodes: BaseElement[]
  ) => Promise<ExecutionReturnType>;
  public readonly scope: ["root", ...string[]];
  constructor(
    config: Omit<RuntimeElementDefinition, "propsSchema"> &
      Omit<SerializedBaseElement, "parent" | "children" | "astSourceType"> & {
        children?: BaseElement[];
        parent?: WeakRef<BaseElement>;
        scope?: ["root", ...string[]];
        propsSchema?: z.ZodType<any>;
      }
  ) {
    this.id = config.id;
    this.key = config.key;
    this.tag = config.tag;
    this.type = config.type;
    this.subType = config.subType ?? "error";
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
    this.allowedChildren =
      typeof config.allowedChildren === "function"
        ? (config.allowedChildren({}) as AllowedChildrenType)
        : (config.allowedChildren ?? []);
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
  public onExecutionGraphConstruction(ctx: BuildContext): void {
    // No cache hit - proceed with normal construction
    const graphBuilder = ctx.graphBuilder;

    if (graphBuilder.hasReachedEnd) {
      return;
    }

    graphBuilder.enterElementContext(this);

    try {
      console.log(
        "_onExecutionGraphConstruction",
        this.tag,
        (graphBuilder as any).currentConstructionPath.get(this.key)
      );
      // No loop - proceed with normal graph construction
      this._onExecutionGraphConstruction(ctx);
    } finally {
      graphBuilder.leaveElementContext();
    }
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

      return {
        result: context.context.input,
      };
    }
    const datamodel: DataModelRegistry =
      context.context.triggerData.getDatamodel();
    const scopedDatamodel = datamodel.getScopedDataModel(this.scope.join("."));
    console.log("create executionContext2", this.tag, this.id, context);

    let executionContext = new ElementExecutionContext({
      ...context,
      input: context.context.input,
      requestInput: context.context.workflowInput || {},
      datamodel: scopedDatamodel,
      state: {
        id: this.id ?? uuidv4(),
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
      // lastElement: {}
    });

    try {
      Object.entries(this.attributes).forEach(([key, value]) => {
        if (typeof value === "string" && value.startsWith("::FUNCTION::")) {
          executionContext.props[key] = new Function(value.slice(12))(
            executionContext
          );
        } else if (
          typeof value === "string" &&
          value.startsWith("::FUNCTION-EXPRESSION::")
        ) {
          executionContext.props[key] = new Function(
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

  /**
   * Add a child element and establish the parent-child relationship
   */
  addChild(child: BaseElement): void {
    if (child.id && !this._childrenIds.includes(child.id)) {
      this._childrenIds.push(child.id);
      child._parentElementId = this.id;
    }
  }

  protected getRootElement(): BaseElement {
    let current: BaseElement = this;
    while (current._parent) {
      current = current._parent.deref() as BaseElement;
    }
    return current;
  }

  toJSON(): SerializedBaseElement {
    return {
      astSourceType: "element",
      id: this.id,
      key: this.key,
      tag: this.tag,
      type: this.type,
      subType: this.subType,
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
