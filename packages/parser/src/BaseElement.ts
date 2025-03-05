import type {
  ElementType,
  IBaseElement,
  IBaseElementConfig,
  ElementRole,
  AllowedChildrenType,
} from "@fireworks/types";
import { z } from "zod";

export class BaseElement implements IBaseElement {
  id: string;
  key: string;
  tag: string;
  role: ElementRole;
  elementType: ElementType;
  attributes: Record<string, any>;
  children: IBaseElement[];
  parent?: WeakRef<IBaseElement>;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  readonly propsSchema: any;
  readonly description?: string;
  readonly onExecutionGraphConstruction?: (buildContext: any) => any;
  readonly enter?: () => Promise<void>;
  readonly exit?: () => Promise<void>;
  type: "element" = "element";
  lineStart: number = 0;
  lineEnd: number = 0;
  columnStart: number = 0;
  columnEnd: number = 0;

  constructor(config: IBaseElementConfig) {
    this.id = config.id;
    this.key = config.key;
    this.tag = config.tag;
    this.role = config.role;
    this.elementType = config.elementType;
    this.attributes = config.attributes ?? {};
    this.children = config.children ?? [];
    this.parent = config.parent ? new WeakRef(config.parent) : undefined;
    this.allowedChildren = config.allowedChildren;
    this.schema = config.schema;
    this.onExecutionGraphConstruction = config.onExecutionGraphConstruction;
    this.enter = config.enter;
    this.exit = config.exit;
    this.propsSchema = config.propsSchema ?? z.object({});
    this.description = config.description;

    // Set position information if provided
    if (config.lineStart !== undefined) this.lineStart = config.lineStart;
    if (config.lineEnd !== undefined) this.lineEnd = config.lineEnd;
    if (config.columnStart !== undefined) this.columnStart = config.columnStart;
    if (config.columnEnd !== undefined) this.columnEnd = config.columnEnd;
  }
}
