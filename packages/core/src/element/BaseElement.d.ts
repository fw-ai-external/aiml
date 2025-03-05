import type { ElementType, IBaseElement, IBaseElementConfig, ElementRole, AllowedChildrenType, BuildContext, ExecutionGraphElement, ElementExecutionContext, RunstepOutput } from "@fireworks/types";
import { z } from "zod";
import { StepValue } from "../runtime/StepValue";
export declare class BaseElement implements Omit<IBaseElement, "parent" | "children"> {
    readonly id: string;
    readonly key: string;
    readonly tag: string;
    readonly role: ElementRole;
    readonly elementType: ElementType;
    readonly attributes: Record<string, any>;
    readonly children: BaseElement[];
    readonly allowedChildren: AllowedChildrenType;
    readonly schema: z.ZodType<any>;
    readonly propsSchema: any;
    readonly description?: string;
    readonly onExecutionGraphConstruction?: (buildContext: BuildContext) => ExecutionGraphElement;
    readonly enter?: () => Promise<void>;
    readonly exit?: () => Promise<void>;
    readonly type: "element";
    readonly lineStart: number;
    readonly lineEnd: number;
    readonly columnStart: number;
    readonly columnEnd: number;
    protected _dataModel: Record<string, unknown>;
    protected _eventQueue: Array<{
        name: string;
        data: unknown;
    }>;
    protected _parent?: WeakRef<BaseElement>;
    private stepConditions?;
    private _isActive;
    constructor(config: Omit<IBaseElementConfig, "parent" | "children"> & {
        children?: BaseElement[];
        parent?: WeakRef<BaseElement>;
    });
    get parent(): BaseElement | undefined;
    get isActive(): boolean;
    set isActive(value: boolean);
    get dataModel(): Record<string, unknown>;
    set dataModel(value: Record<string, unknown>);
    get eventQueue(): Array<{
        name: string;
        data: unknown;
    }>;
    set eventQueue(value: Array<{
        name: string;
        data: unknown;
    }>);
    get conditions(): {
        when: (context: ElementExecutionContext<any, RunstepOutput>) => Promise<boolean>;
    } | undefined;
    set conditions(value: {
        when: (context: ElementExecutionContext<any, RunstepOutput>) => Promise<boolean>;
    } | undefined);
    execute(context: ElementExecutionContext<any, RunstepOutput>, childrenNodes?: BaseElement[]): Promise<StepValue>;
    deactivate(): Promise<void>;
    protected getDefaultStepConditions(): {
        when: (context: ElementExecutionContext<any, RunstepOutput>) => Promise<boolean>;
    } | undefined;
    getStepConditions(): {
        when: (context: ElementExecutionContext<any, RunstepOutput>) => Promise<boolean>;
    } | undefined;
    protected evaluateExpr(expr: string, context: unknown): unknown;
    protected getParentOfType<T extends BaseElement>(type: ElementType): T | undefined;
    protected getRootElement(): BaseElement;
    protected enqueueEvent(name: string, data?: unknown): void;
}
export type Literal = string | number | null | undefined | boolean;
export type Node = BaseElement | Literal | Node[];
export type ElementPredicate = (node: Node) => boolean;
export declare function isElement(value: unknown): value is BaseElement;
export declare function Fragment({ children }: {
    children: Node;
}): Node;
//# sourceMappingURL=BaseElement.d.ts.map