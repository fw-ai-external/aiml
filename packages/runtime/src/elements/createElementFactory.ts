/**
 * Element Definition Module
 *
 * This module provides a way to create element definitions with React components.
 * It uses the factory pattern from factory.ts to reduce code duplication and
 * improve maintainability.
 */

import type { aimlElements, SerializedBaseElement } from "@fireworks/shared";
import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import type { RuntimeElementDefinition } from "../types";
import { BaseElement } from "./BaseElement";
import { fromError } from "zod-validation-error";
import { defaultStepExecutionGraphMapper } from "../utils";

/**
 * Element definition type
 */

/**
 * Creates an element definition with React component support
 * This is a wrapper around the factory pattern to maintain backward compatibility
 */
export const createElementDefinition = <
  PropsSchema extends z.ZodObject<any> = z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
    } & Record<string, z.ZodTypeAny>
  >,
  Props extends z.infer<PropsSchema> = z.infer<PropsSchema>,
>(
  config: RuntimeElementDefinition<PropsSchema, Props>
) => {
  const {
    tag,
    propsSchema,
    description,
    allowedChildren = "none",
    execute,
    onExecutionGraphConstruction,
    type,
    subType,
    documentation,
  } = config;

  const factory = {
    tag,
    documentation,
    type,
    subType,
    validateProps: (props: Props) => {
      const result = propsSchema.safeParse(props);
      if (!result.success) {
        throw new Error(
          `Invalid props for the "${tag}" element: ${fromError(result.error).toString()}`
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
      parent?: WeakRef<BaseElement>,
      scope: ["root", ...string[]] = ["root"]
    ): BaseElement => {
      const validatedProps = factory.validateProps(props as Props);

      // Convert nodes to BaseElement instances if needed
      const childElements: BaseElement[] = nodes.every(
        (n) => n instanceof BaseElement
      )
        ? (nodes as BaseElement[])
        : // Map over nodes to properly convert them to BaseElements
          nodes.map((node) => {
            // If already a BaseElement, return as is
            if (node instanceof BaseElement) return node;
            // Otherwise, we need to create a BaseElement from the serialized node
            // This is a simplified approach - a real implementation would need proper element creation logic
            return factory.initFromSerialized(node, parent);
          });

      const element = new BaseElement({
        id: props.id || uuidv4(),
        key: props.id || uuidv4(),
        tag,
        type,
        subType: subType || "tool-call",
        scope,
        attributes: validatedProps,
        children: childElements,
        parent,
        onExecutionGraphConstruction:
          onExecutionGraphConstruction || defaultStepExecutionGraphMapper,
        lineStart: nodes[0]?.lineStart ?? 0,
        lineEnd: nodes[nodes.length - 1]?.lineEnd ?? 0,
        columnStart: nodes[0]?.columnStart ?? 0,
        columnEnd: nodes[nodes.length - 1]?.columnEnd ?? 0,
        allowedChildren:
          typeof allowedChildren === "function"
            ? allowedChildren({} as Props)
            : allowedChildren,
        propsSchema: propsSchema,
        execute: execute as any,
        description,
      });

      return element;
    },

    initFromSerialized: (
      serialized: SerializedBaseElement,
      parent?: WeakRef<BaseElement>
    ): BaseElement => {
      if (serialized.astSourceType !== "element") {
        throw new Error(
          `Cannot create element from non-element node: ${serialized.astSourceType}`
        );
      }

      if (!serialized.type || !serialized.subType) {
        throw new Error(
          `Cannot create element from serialized node: ${serialized.astSourceType}`
        );
      }

      // Convert nodes to BaseElement instances if needed
      const childElements: BaseElement[] = serialized.children?.every(
        (n) => n instanceof BaseElement
      )
        ? (serialized.children as BaseElement[])
        : // Map over nodes to properly convert them to BaseElements
          (serialized.children?.map((node) => {
            // If already a BaseElement, return as is
            if (node instanceof BaseElement) return node;
            // Otherwise, we need to create a BaseElement from the serialized node
            // This is a simplified approach - a real implementation would need proper element creation logic
            return factory.initFromSerialized(node, parent);
          }) ?? []);

      return new BaseElement({
        ...serialized,
        children: childElements,
        id: serialized.id || uuidv4(),
        key: serialized.id || uuidv4(),
        attributes: serialized.attributes || {},
        type: serialized.type || type || "action",
        subType: serialized.subType || subType || "tool-call",
        tag: serialized.tag! as (typeof aimlElements)[number],
        allowedChildren:
          typeof allowedChildren === "function"
            ? allowedChildren({} as Props)
            : allowedChildren,
        parent,
        scope: (serialized.scope || ["root"]) as ["root", ...string[]],
        onExecutionGraphConstruction:
          onExecutionGraphConstruction || defaultStepExecutionGraphMapper,
        propsSchema: propsSchema,
        execute: execute as any,
        description,
      });
    },
  };

  return factory;
};
