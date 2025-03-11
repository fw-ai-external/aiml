import { z } from "zod";
import type {
  ElementRole,
  AllowedChildrenType,
  ElementType,
} from "@fireworks/types";

/**
 * Element props type
 */
export type ElementProps = Record<string, any>;

/**
 * Element configuration type
 */
export type ElementConfig<T> = z.ZodObject<any>;

/**
 * Context for element execution
 */
export type ElementExecutionContext<Props = ElementProps> = {
  attributes: Props;
  datamodel: Record<string, unknown>;
  workflowInput: {
    userMessage: string;
    chatHistory: Array<{ role: string; content: string }>;
    clientSideTools: Array<{
      name: string;
      description: string;
      parameters?: z.ZodObject<any>;
      execute?: (args: any) => Promise<any>;
    }>;
  };
  state: {
    id: string;
    attributes: Record<string, unknown>;
    input: any;
  };
  machine: {
    id: string;
    secrets: {
      system: Record<string, string>;
      user: Record<string, string>;
    };
  };
  run: {
    id: string;
  };
};

// StepValue type has been moved to @fireworks/runtime

/**
 * Base definition for an element
 */
export interface BaseElementDefinition {
  /**
   * The actual tag name used in the config/tsx
   */
  tag: ElementType;
  /**
   * The role of the element
   */
  role?: ElementRole;
  /**
   * The allowed children for this element as an array of tags or a function that returns an array of tags
   */
  allowedChildren?: AllowedChildrenType;
  /**
   * The props/options exposed to the schema by this element
   */
  propsSchema: z.ZodObject<any>;

  /**
   * Human-readable description of the element
   */
  description: string;

  /**
   * The documentation for the element in markdown format
   */
  documentation: string;

  /**
   * Array of parent elements that this element can be nested under
   */
  requiredParent?: string[];
  /**
   * Whether this element can be used as a root element
   */
  isRoot?: boolean;
}

/**
 * Definition for a specific element type
 */
export type ElementDefinition<
  Props = any,
  Tag extends ElementType = ElementType,
> = BaseElementDefinition & {
  tag: Tag;
  propsSchema?: z.ZodType<Props>;
  allowedChildren?:
    | AllowedChildrenType
    | ((props: Props) => AllowedChildrenType);
};
