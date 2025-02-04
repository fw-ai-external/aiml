import React from "react";
import type { LiteralUnion } from "type-fest";
import { z } from "zod";
import type { ReactElements } from "../parser/renderTSX";
import type { FireAgentNode } from "../parser/types";
import { StepContext } from "../runtime/StepContext";
import { StepValue } from "../runtime/StepValue";
import type { Element } from "../types/jsx";
import type { RunstepOutput } from "../types";
import { BaseElement, SCXMLNodeType, StepCondition } from "./BaseElement";
import { ExecutionGraphElement } from "../runtime/types";
import { BuildContext } from "../runtime/BuildContext";

export type AllowedChildrenType =
  | "any"
  | "none"
  | "text"
  | LiteralUnion<SCXMLNodeType, string>[];

export type ElementDefinition<
  Props extends z.infer<Schema>,
  Schema extends z.ZodType<any>,
  Tag extends string,
  AllowedChildTags extends AllowedChildrenType,
  AllProps extends Props & { children?: Element | Element[] },
> = {
  /**
   * The actual tag name used in the config/tsx
   */
  tag: Tag;

  /**
   * The props/options exposed to the schema by this element
   */
  propsSchema?: Schema;
  /**
   * The allowed children for this element as an array of tags or a function that returns an array of tags
   */
  allowedChildren?: AllowedChildTags | ((props: Props) => AllowedChildTags);

  enter?: () => Promise<void>;
  exit?: () => Promise<void>;
} & (
  | {
      /**
       * The function that renders sub-elements of this element, like a shadow-dom in html
       * this is used to componatize custom elements
       */
      render?: (
        props: AllProps & { nodes?: FireAgentNode[] }
      ) => React.JSX.Element;
    }
  | {
      /**
       * The function that executes the element when activated
       */
      execute: (
        ctx: StepContext<AllProps, RunstepOutput>,
        childrenNodes: BaseElement[]
      ) => Promise<StepValue | null>;

      /**
       * The function that initializes this element's workflow steps
       */
      onExecutionGraphConstruction: (
        buildContext: BuildContext
      ) => ExecutionGraphElement;

      /**
       * The conditions that determine when this element's step should execute.
       */
      elementShouldRun?: StepCondition;
    }
);

export type ReactTagNodeDefinition<
  Props extends Record<string, any> = Record<string, any>,
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

export type ReactTagNodeType<Props = any> = ReturnType<
  typeof createElementDefinition<Props, any, SCXMLNodeType, any, any>
>;

export const createElementDefinition = <
  Props extends z.infer<Schema>,
  Schema extends z.ZodType<any>,
  Tag extends SCXMLNodeType,
  AllProps extends AllowedChildTags extends "none"
    ? Props
    : Props & { children?: ReactElements },
  AllowedChildTags extends AllowedChildrenType,
>(
  config: ElementDefinition<Props, Schema, Tag, AllowedChildTags, AllProps>
) => {
  const ReactTagNode = function (
    props: AllProps & { children?: Element | Element[] }
  ) {
    const render = () => {
      if ("render" in config && config.render) {
        return config.render(props as any);
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

    // TODO  validate children too
    const childrenSchema = (() => {
      let allowedTags: AllowedChildTags | undefined;
      if (typeof config.allowedChildren === "function") {
        allowedTags = config.allowedChildren({} as Props);
      } else {
        allowedTags = config.allowedChildren;
      }
      if (!allowedTags) {
        return undefined;
      }

      if (allowedTags === "none") {
        return z.never();
      }
      if (allowedTags === "any") {
        return z.array(z.any()).optional();
      }

      if (allowedTags === "text") {
        return z.object({
          kind: z.literal("text"),
          text: z.string(),
        });
      }

      return z
        .array(
          z.object({
            tag: z.string(), //z.enum(allowedTags as [string, ...string[]]),
            attributes: z.record(z.any()).optional(),
            elements: z.any(),
          })
        )
        .optional();
    })();
    const allowedChildren = config.allowedChildren || "none";
    const verifiedProps = propsSchema
      .and(
        z
          .object({
            children: z.any(),
          })
          .or(
            z.object({
              // TODO: improve type validation when dealing with react elements
              children:
                allowedChildren !== "none" ? z.array(z.any()) : z.never(),
            })
          )
      )
      .safeParse(props);

    if (verifiedProps && !verifiedProps.success) {
      // TODO: improve error message
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
      : (config.allowedChildren as any as (props: Props) => AllowedChildTags[])(
          {} as any
        );
    return children.every(
      (child) => !child || allowedChildren.includes(child as any)
    );
  };

  ReactTagNode.initFromAttributesAndNodes = (
    props: Props,
    nodes: FireAgentNode[],
    parents: BaseElement[]
  ): BaseElement | BaseElement[] => {
    const validatedProps = ReactTagNode.validateProps(props);
    // TODO: follow up with matt to make sure this change is intended
    if ("children" in validatedProps) {
      throw new Error(
        "Children should not be props, they should be split out and converted to nodes"
      );
    }
    if (!("onExecutionGraphConstruction" in config)) {
      return nodes as BaseElement[];
    }
    validatedProps.children = nodes;

    const tagNode = new BaseElement({
      id: config.tag === "scxml" ? "Incoming Request" : props.id,
      tag: config.tag,
      elementType: config.tag as SCXMLNodeType,
      attributes: validatedProps,
      children: nodes,
      parent: parents[parents.length - 1],
      enter: config.enter,
      exit: config.exit,
      onExecutionGraphConstruction: config.onExecutionGraphConstruction,
    });

    return tagNode;
  };

  // Instance methods
  ReactTagNode.prototype.initFromAttributesAndNodes = (
    props: Props,
    nodes: FireAgentNode[],
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
