import React from "react";
import { z } from "zod";
import type {
  FireAgentNode,
  IBaseElement,
  SCXMLNodeType,
} from "@fireworks/types";
import { ElementExecutionContext } from "../runtime/ElementExecutionContext";
import { BaseElement } from "../runtime/BaseElement";
import { ExecutionGraphElement } from "../runtime/types";
import { BuildContext } from "../runtime/BuildContext";
import { v4 as uuidv4 } from "uuid";

export type ElementProps = Record<string, any>;

export type ElementConfig<T> = z.ZodObject<any>;

export type AllowedChildrenType = string[] | "none" | "any" | "text";

function isBaseElement(node: FireAgentNode): node is IBaseElement {
  return (
    "elementType" in node &&
    "tag" in node &&
    "role" in node &&
    !("kind" in node)
  );
}

function convertToBaseElement(node: FireAgentNode): BaseElement {
  if (isBaseElement(node)) {
    return new BaseElement({
      id: node.id,
      key: node.key,
      tag: node.tag,
      role: node.role,
      elementType: node.elementType,
      attributes: node.attributes,
      children: node.children.map((child) =>
        child instanceof BaseElement
          ? child
          : convertToBaseElement(child as FireAgentNode)
      ),
    });
  }

  if ("kind" in node && node.kind === "tag") {
    return new BaseElement({
      id: node.key,
      key: node.key,
      tag: node.name,
      role: "state",
      elementType: node.scxmlType,
      attributes: node.attributes as Record<string, any>,
      children: node.nodes?.map(convertToBaseElement) || [],
    });
  }

  // For text, comment, and instruction nodes, create a minimal BaseElement
  return new BaseElement({
    id: node.key || uuidv4(),
    key: node.key || uuidv4(),
    tag: "text",
    role: "state",
    elementType: "text" as SCXMLNodeType,
    attributes: {
      text:
        "text" in node
          ? String(node.text)
          : "comment" in node
            ? node.comment
            : "instruction" in node
              ? node.instruction
              : "",
    },
    children: [],
  });
}

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
    parentsOrMode?: BaseElement[] | "render" | "spec"
  ) => BaseElement | BaseElement[];
  areChildrenAllowed(children: string[]): boolean;
};

export type ReactTagNodeType<
  Props extends { id?: string } & Record<string, any> = any,
> = React.FC<Props & { children?: React.ReactNode }> & {
  tag: string;
  validateProps: (props: Props) => Props;
  areChildrenAllowed: (children: string[]) => boolean;
  initFromAttributesAndNodes: (
    props: Props,
    nodes: FireAgentNode[],
    parentsOrMode?: BaseElement[] | "render" | "spec"
  ) => BaseElement | BaseElement[];
};

export const createElementDefinition = <
  Props extends { id?: string } & Record<string, any>,
>(
  config: ElementDefinition<Props>
) => {
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

  const ReactTagNode = Object.assign(
    (props: Props & { children?: React.ReactNode }) => {
      const render = () => {
        if ("render" in config && config.render) {
          return config.render(props as any, [] as any);
        }
        return React.createElement(config.tag, props, props.children);
      };

      return render();
    },
    {
      tag: config.tag,
      validateProps: (props: Props) => {
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
      },
      areChildrenAllowed: (children: string[]): boolean => {
        if (children.length === 0) {
          return true;
        }
        if (
          config.allowedChildren === "any" ||
          config.allowedChildren === "text"
        ) {
          return true;
        }
        if (config.allowedChildren === "none") {
          return false;
        }

        const allowedChildren = Array.isArray(config.allowedChildren)
          ? config.allowedChildren
          : typeof config.allowedChildren === "function"
            ? config.allowedChildren({} as Props)
            : [];
        return children.every(
          (child) => !child || allowedChildren.includes(child)
        );
      },
      initFromAttributesAndNodes: (
        props: Props,
        nodes: FireAgentNode[],
        parentsOrMode?: BaseElement[] | "render" | "spec"
      ): BaseElement | BaseElement[] => {
        const validatedProps = ReactTagNode.validateProps(props) as Props & {
          children?: BaseElement[];
        };
        if (!("onExecutionGraphConstruction" in config) && "render" in config) {
          return nodes.map(convertToBaseElement);
        }

        // Merge validated props with nodes as children
        const propsWithChildren = {
          ...validatedProps,
          children: nodes,
        };

        const parent = Array.isArray(parentsOrMode)
          ? parentsOrMode[parentsOrMode.length - 1]
          : undefined;

        const tagNode = new BaseElement({
          id:
            config.tag === "scxml" ? "Incoming Request" : props.id || uuidv4(),
          key: uuidv4(),
          tag: config.tag,
          role: config.role || "action",
          elementType: config.scxmlType || (config.tag as SCXMLNodeType),
          attributes: propsWithChildren,
          children: nodes.map(convertToBaseElement),
          parent,
          enter: config.enter,
          exit: config.exit,
          onExecutionGraphConstruction:
            "onExecutionGraphConstruction" in config
              ? config.onExecutionGraphConstruction
              : defaultExecutionGraphConstruction,
        });

        return tagNode;
      },
    }
  ) as ReactTagNodeType<Props>;

  return ReactTagNode;
};
