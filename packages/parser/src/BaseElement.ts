import type {
  SCXMLNodeType,
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
  elementType: SCXMLNodeType;
  attributes: Record<string, any>;
  children: IBaseElement[];
  parent?: IBaseElement;
  allowedChildren: AllowedChildrenType;
  schema: z.ZodType<any>;
  readonly propsSchema: any;
  readonly description?: string;
  readonly onExecutionGraphConstruction?: (buildContext: any) => any;
  readonly enter?: () => Promise<void>;
  readonly exit?: () => Promise<void>;

  constructor(config: IBaseElementConfig) {
    this.id = config.id;
    this.key = config.key;
    this.tag = config.tag;
    this.role = config.role;
    this.elementType = config.elementType;
    this.attributes = config.attributes ?? {};
    this.children = config.children ?? [];
    this.parent = config.parent;
    this.allowedChildren = config.allowedChildren;
    this.schema = config.schema;
    this.onExecutionGraphConstruction = config.onExecutionGraphConstruction;
    this.enter = config.enter;
    this.exit = config.exit;
    this.propsSchema = config.propsSchema ?? z.object({});
    this.description = config.description;
  }
}
