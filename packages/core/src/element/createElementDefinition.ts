import React from "react";
import { z } from "zod";
import type { FireAgentNode } from "../parser/types";
import { ElementExecutionContext } from "../runtime/ElementExecutionContext";
import { BaseElement } from "../runtime/BaseElement";
import { ExecutionGraphElement } from "../runtime/types";
import { BuildContext } from "../runtime/BuildContext";
import { v4 as uuidv4 } from "uuid";
import type { SCXMLNodeType } from "@fireworks/element-types";

export type ElementProps = Record<string, any>;

export type ElementConfig<T> = z.ZodObject<any>;

export type AllowedChildrenType = string[] | "none" | "any";

export type ElementDefinition<
  Props extends ElementProps = ElementProps,
  Result = any,
> = {
  tag: string;
  role: "state" | "action" | "user-input" | "error" | "output";
  elementType: SCXMLNodeType;
  propsSchema: ElementConfig<Props>;
  execute?: (
    ctx: ElementExecutionContext<Props>,
    childrenNodes: BaseElement[]
  ) => Promise<Result>;
  render?: (
    ctx: ElementExecutionContext<Props>,
    childrenNodes: BaseElement[]
  ) => Promise<React.ReactNode>;
  allowedChildren?: AllowedChildrenType | ((props: Props) => string[]);
  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
  scxmlType?: SCXMLNodeType;
  onExecutionGraphConstruction?: (
    buildContext: BuildContext
  ) => ExecutionGraphElement;
};

export type ReactTagNodeDefinition<
  Props extends { id?: string } & Record<string, any> = Record<string, any>,
> = {
  tag: string;
  public: boolean;
  render(): React.ReactNode;
  initFromAttributesAndNodes: (
    props: Props,
    nodes: FireAgentNode[],
    initiatedfrom?: "render" | "spec"
  ) => BaseElement | BaseElement[];
  areChildrenAllowed(children: string[]): boolean;
};

export type ReactTagNodeType<
  Props extends { id?: string } & Record<string, any> = any,
> = ReturnType<typeof createElementDefinition<Props>>;

export const createElementDefinition = <
  Props extends { id?: string } & Record<string, any>,
>(
  config: ElementDefinition<Props>
) => {
  const ReactTagNode = function (
    props: Props & { children?: Element | Element[] }
  ) {
    const render = () => {
      if ("render" in config && config.render) {
        return config.render(props as any, [] as any);
      }
      return null;
    };

    return render();
  };

  // Static properties and methods
  ReactTagNode.tag = config.tag;
  ReactTagNode.prototype.tag = config.tag;
  ReactTagNode.prototype.public = true;

  // Static methods
  ReactTagNode.validateProps = (props: Props) => {
    const propsSchema = config.propsSchema || z.object({});

    const allowedChildren = config.allowedChildren || "none";
    const verifiedProps = propsSchema
      .and(
        z
          .object({
            children: z.any(),
          })
          .or(
            z.object({
              children:
                allowedChildren !== "none" ? z.array(z.any()) : z.never(),
            })
          )
      )
      .safeParse(props);

    if (verifiedProps && !verifiedProps.success) {
      throw new Error(
        `Invalid props for the "${config.tag}" element: ${JSON.stringify(
          verifiedProps.error.errors
        )}`
      );
    }
    return verifiedProps.data as Props;
  };

  ReactTagNode.areChildrenAllowed = (children: string[]): boolean => {
    if (children.length === 0) {
      return true;
    }
    if (config.allowedChildren === "any") {
      return true;
    }
    if (config.allowedChildren === "none") {
      return false;
    }

    const allowedChildren = Array.isArray(config.allowedChildren)
      ? config.allowedChildren
      : (config.allowedChildren as (props: Props) => string[])({} as Props);
    return children.every((child) => !child || allowedChildren.includes(child));
  };

  const defaultExecutionGraphConstruction = (
    buildContext: BuildContext
  ): ExecutionGraphElement => {
    // If we already built this node, return the cached version.
    const existing = buildContext.getCachedGraphElement(
      buildContext.attributes.id
    );
    if (existing) {
      return existing;
    }

    const llmNode: ExecutionGraphElement = {
      id: buildContext.attributes.id || `llm_${uuidv4()}`,
      type: config.role || "action",
      key: buildContext.elementKey,
      subType: config.tag as SCXMLNodeType,
      attributes: buildContext.attributes,
    };

    // store it in the cache
    buildContext.setCachedGraphElement(
      [buildContext.attributes.id || llmNode.id, llmNode.key].filter(Boolean),
      llmNode
    );

    return llmNode;
  };

  ReactTagNode.initFromAttributesAndNodes = (
    props: Props,
    nodes: BaseElement[],
    parents: BaseElement[]
  ): BaseElement | BaseElement[] => {
    const validatedProps = ReactTagNode.validateProps(props) as Props & {
      children?: BaseElement[];
    };
    if (!("onExecutionGraphConstruction" in config) && "render" in config) {
      return nodes as BaseElement[];
    }

    // Merge validated props with nodes as children
    const propsWithChildren = {
      ...validatedProps,
      children: nodes,
    };

    const tagNode = new BaseElement({
      id: config.tag === "scxml" ? "Incoming Request" : props.id || uuidv4(),
      key: uuidv4(),
      tag: config.tag,
      role: config.role || "action",
      elementType: config.scxmlType || (config.tag as SCXMLNodeType),
      attributes: propsWithChildren,
      children: nodes,
      parent: parents[parents.length - 1],
      enter: config.enter,
      exit: config.exit,
      onExecutionGraphConstruction:
        "onExecutionGraphConstruction" in config
          ? config.onExecutionGraphConstruction
          : defaultExecutionGraphConstruction,
    });

    return tagNode;
  };

  // Instance methods
  ReactTagNode.prototype.initFromAttributesAndNodes = (
    props: Props,
    nodes: BaseElement[],
    initiatedfrom?: "render" | "spec"
  ): BaseElement | BaseElement[] => {
    return ReactTagNode.initFromAttributesAndNodes(props, nodes, []);
  };

  ReactTagNode.prototype.areChildrenAllowed = (children: string[]): boolean => {
    return ReactTagNode.areChildrenAllowed(children);
  };

  return ReactTagNode as unknown as typeof ReactTagNode &
    ReactTagNodeDefinition<Props>;
};
