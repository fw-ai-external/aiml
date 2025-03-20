/**
 * Element Definition Module
 *
 * This module provides a way to create element definitions with React components.
 * It uses the factory pattern from factory.ts to reduce code duplication and
 * improve maintainability.
 */

import React from "react";
import { z } from "zod";
import type {
  FireAgentNode,
  SerializedBaseElement,
  ExecutionGraphElement,
  BuildContext,
  ElementExecutionContext,
  ElementType,
  ElementRole,
  ExecutionReturnType,
} from "@fireworks/types";
import { BaseElement } from "./BaseElement";
import { v4 as uuidv4 } from "uuid";
// Define ElementProps since we're having import issues
type ElementProps = Record<string, any>;

export type AllowedChildrenType = string[] | "none" | "any" | "text";

/**
 * Checks if a node is a BaseElement
 */
function isBaseElement(node: FireAgentNode | BaseElement): node is BaseElement {
  return (
    node.type === "element" &&
    typeof node.id === "string" &&
    typeof node.key === "string" &&
    typeof node.tag === "string" &&
    typeof node.role === "string" &&
    typeof node.elementType === "string"
  );
}

/**
 * Element definition type
 */
export type ElementDefinition<
  Props extends ElementProps = ElementProps,
  Result = any,
> = {
  tag: ElementType;
  role: ElementRole;
  elementType: ElementType;
  propsSchema: z.ZodType<Props>;
  execute?: (
    ctx: ElementExecutionContext<Props>,
    childrenNodes: BaseElement[]
  ) => Promise<ExecutionReturnType>;
  render?: (
    ctx: ElementExecutionContext<Props>,
    childrenNodes: BaseElement[]
  ) => Promise<React.ReactNode>;
  allowedChildren?: AllowedChildrenType | ((props: Props) => string[]);
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  scxmlType?: ElementType;
  onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
  description?: string;
  documentation?: string;
};

/**
 * Creates an element definition with React component support
 * This is a wrapper around the factory pattern to maintain backward compatibility
 */
export const createElementDefinition = <
  Props extends { id?: string } & Record<string, any>,
>(
  config: ElementDefinition<Props>
) => {
  const {
    tag,
    role,
    elementType,
    propsSchema,
    description,
    documentation,
    allowedChildren = "none",
    execute,
    enter,
    exit,
    onExecutionGraphConstruction,
  } = config;

  const factory = {
    tag,

    validateProps: (props: Props) => {
      const result = propsSchema.safeParse(props);
      if (!result.success) {
        throw new Error(
          `Invalid props for the "${tag}" element: ${JSON.stringify(
            result.error.errors
          )}`
        );
      }
      return result.data as Props;
    },

    areChildrenAllowed: (children: string[]): boolean => {
      if (children.length === 0) {
        return true;
      }

      if (allowedChildren === "any" || allowedChildren === "text") {
        return true;
      }

      if (allowedChildren === "none") {
        return false;
      }

      const allowedChildrenArray = Array.isArray(allowedChildren)
        ? allowedChildren
        : typeof allowedChildren === "function"
          ? allowedChildren({} as Props)
          : [];

      return children.every(
        (child) => !child || allowedChildrenArray.includes(child)
      );
    },

    initFromAttributesAndNodes: (
      props: Partial<Props>,
      nodes: SerializedBaseElement[] = [],
      parent?: WeakRef<BaseElement>
    ): BaseElement => {
      const validatedProps = factory.validateProps(props as Props);

      // Convert nodes to BaseElement instances if needed
      const childElements: BaseElement[] = nodes.every(
        (n) => n instanceof BaseElement
      )
        ? nodes
        : // TODO this is wrong, we need a real init loop
          (nodes as BaseElement[]);

      const element = new BaseElement({
        id: props.id || uuidv4(),
        key: props.id || uuidv4(),
        tag,
        role,
        elementType,
        attributes: validatedProps,
        children: childElements,
        parent,
        enter,
        exit,
        onExecutionGraphConstruction:
          onExecutionGraphConstruction ||
          createDefaultExecutionGraphConstruction(tag, role),
        type: "element",
        lineStart: nodes[0]?.lineStart ?? 0,
        lineEnd: nodes[nodes.length - 1]?.lineEnd ?? 0,
        columnStart: nodes[0]?.columnStart ?? 0,
        columnEnd: nodes[nodes.length - 1]?.columnEnd ?? 0,
        allowedChildren:
          typeof allowedChildren === "function"
            ? allowedChildren({} as Props)
            : allowedChildren,
        schema: propsSchema,
        execute,
        description,
      });

      return element;
    },

    initFromSerialized: (
      serialized: SerializedBaseElement,
      parent?: WeakRef<BaseElement>
    ): BaseElement => {
      if (serialized.type !== "element") {
        throw new Error(
          `Cannot create element from non-element node: ${serialized.type}`
        );
      }

      return new BaseElement({
        id: serialized.id || uuidv4(),
        key: serialized.key,
        tag: serialized.tag || tag,
        role: serialized.role || role,
        elementType: serialized.elementType || elementType,
        attributes: serialized.attributes || {},
        children: [],
        parent,
        enter,
        exit,
        onExecutionGraphConstruction:
          onExecutionGraphConstruction ||
          createDefaultExecutionGraphConstruction(tag, role),
        type: "element",
        lineStart: serialized.lineStart,
        lineEnd: serialized.lineEnd,
        columnStart: serialized.columnStart,
        columnEnd: serialized.columnEnd,
        allowedChildren:
          typeof allowedChildren === "function"
            ? allowedChildren({} as Props)
            : allowedChildren,
        schema: propsSchema,
        execute,
        description,
      });
    },
  };

  return factory;
};

/**
 * Creates a default execution graph construction function
 */
function createDefaultExecutionGraphConstruction(
  tag: ElementType,
  role: ElementRole
) {
  return (buildContext: BuildContext): ExecutionGraphElement => {
    // If we already built this node, return the cached version.
    const existing = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (existing) {
      return existing;
    }

    const defaultExecutionGraphConfig: ExecutionGraphElement = {
      id: buildContext.attributes.id || `${tag}_${uuidv4()}`,
      type: role,
      key: buildContext.elementKey,
      subType: tag,
      attributes: buildContext.attributes,
    };

    // store it in the cache
    buildContext.setCachedGraphElement(
      [
        buildContext.attributes.id || defaultExecutionGraphConfig.id,
        defaultExecutionGraphConfig.key,
      ].filter(Boolean),
      defaultExecutionGraphConfig
    );

    return defaultExecutionGraphConfig;
  };
}
