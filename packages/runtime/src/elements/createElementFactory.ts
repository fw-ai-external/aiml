/**
 * Element Definition Module
 *
 * This module provides a way to create element definitions with React components.
 * It uses the factory pattern from factory.ts to reduce code duplication and
 * improve maintainability.
 */

import type { ElementRole, ElementType, SerializedBaseElement } from '@fireworks/shared';
import { v4 as uuidv4 } from 'uuid';
import type { z } from 'zod';
import type { BuildContext } from '../graphBuilder/Context';
import type { ExecutionGraphElement, RuntimeElementDefinition } from '../types';
import { BaseElement } from './BaseElement';

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
  config: RuntimeElementDefinition<PropsSchema, Props>,
) => {
  const {
    tag,
    role,
    elementType,
    propsSchema,
    description,
    documentation,
    allowedChildren = 'none',
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
        throw new Error(`Invalid props for the "${tag}" element: ${JSON.stringify(result.error.errors)}`);
      }
      return result.data as Props;
    },

    areChildrenAllowed: (children: string[]): boolean => {
      if (children.length === 0) {
        return true;
      }

      if (allowedChildren === 'any' || allowedChildren === 'text') {
        return true;
      }

      if (allowedChildren === 'none') {
        return false;
      }

      const allowedChildrenArray = Array.isArray(allowedChildren)
        ? allowedChildren
        : typeof allowedChildren === 'function'
          ? allowedChildren({} as Props)
          : [];

      return children.every((child) => !child || allowedChildrenArray.includes(child));
    },

    initFromAttributesAndNodes: (
      props: Partial<Props>,
      nodes: SerializedBaseElement[] = [],
      parent?: WeakRef<BaseElement>,
    ): BaseElement => {
      const validatedProps = factory.validateProps(props as Props);

      // Convert nodes to BaseElement instances if needed
      const childElements: BaseElement[] = nodes.every((n) => n instanceof BaseElement)
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
        onExecutionGraphConstruction:
          onExecutionGraphConstruction || createDefaultExecutionGraphConstruction(tag, role),
        type: 'element',
        lineStart: nodes[0]?.lineStart ?? 0,
        lineEnd: nodes[nodes.length - 1]?.lineEnd ?? 0,
        columnStart: nodes[0]?.columnStart ?? 0,
        columnEnd: nodes[nodes.length - 1]?.columnEnd ?? 0,
        allowedChildren: typeof allowedChildren === 'function' ? allowedChildren({} as Props) : allowedChildren,
        schema: propsSchema,
        execute: execute as any,
        description,
      });

      return element;
    },

    initFromSerialized: (serialized: SerializedBaseElement, parent?: WeakRef<BaseElement>): BaseElement => {
      if (serialized.type !== 'element') {
        throw new Error(`Cannot create element from non-element node: ${serialized.type}`);
      }

      return new BaseElement({
        id: serialized.id || uuidv4(),
        key: serialized.key,
        tag: serialized.tag as ElementType,
        role: serialized.role as ElementRole,
        elementType: serialized.elementType as ElementType,
        attributes: serialized.attributes || {},
        children: [],
        parent,
        onExecutionGraphConstruction:
          onExecutionGraphConstruction || createDefaultExecutionGraphConstruction(tag, role),
        type: 'element',
        lineStart: serialized.lineStart,
        lineEnd: serialized.lineEnd,
        columnStart: serialized.columnStart,
        columnEnd: serialized.columnEnd,
        allowedChildren: typeof allowedChildren === 'function' ? allowedChildren({} as Props) : allowedChildren,
        schema: propsSchema,
        execute: execute as any,
        description,
      });
    },
  };

  return factory;
};

/**
 * Creates a default execution graph construction function
 */
function createDefaultExecutionGraphConstruction(tag: ElementType, role: ElementRole) {
  return (buildContext: BuildContext): ExecutionGraphElement => {
    // If we already built this node, return the cached version.
    const existing = buildContext.getCachedGraphElement(buildContext.attributes.id);
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
      [buildContext.attributes.id || defaultExecutionGraphConfig.id, defaultExecutionGraphConfig.key].filter(Boolean),
      defaultExecutionGraphConfig,
    );

    return defaultExecutionGraphConfig;
  };
}
