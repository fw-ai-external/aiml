import React from "react";
import { z } from "zod";
import type {
  FireAgentNode,
  IBaseElement,
  SCXMLNodeType,
  ExecutionGraphElement,
  BuildContext,
  ElementExecutionContext,
} from "@fireworks/types";
import { BaseElement } from "./";
import { v4 as uuidv4 } from "uuid";

export type ElementProps = Record<string, any>;

export type ElementConfig<T> = z.ZodObject<any>;

export type AllowedChildrenType = string[] | "none" | "any" | "text";

function isBaseElement(
  node: FireAgentNode | BaseElement
): node is IBaseElement {
  return (
    node.type === "element" &&
    typeof node.id === "string" &&
    typeof node.key === "string" &&
    typeof node.tag === "string" &&
    typeof node.role === "string" &&
    typeof node.elementType === "string"
  );
}

function convertToBaseElement(node: FireAgentNode | BaseElement): BaseElement {
  console.log("=-------------------- convertToBaseElement", node.tag);
  if (isBaseElement(node)) {
    return node as BaseElement;
  }

  // Default values for line/column properties since they're required
  const defaultLineStart = 0;
  const defaultLineEnd = 0;
  const defaultColumnStart = 0;
  const defaultColumnEnd = 0;

  if ("kind" in node && node.kind === "tag") {
    return new BaseElement({
      id: node.key ?? uuidv4(),
      key: node.key ?? uuidv4(),
      tag: node.name ?? "unknown",
      role: "state",
      elementType: node.scxmlType ?? ("state" as SCXMLNodeType),
      attributes: node.attributes ?? {},
      children: node.nodes?.map(convertToBaseElement) || [],
      type: "element",
      lineStart: node.lineStart ?? defaultLineStart,
      lineEnd: node.lineEnd ?? defaultLineEnd,
      columnStart: node.columnStart ?? defaultColumnStart,
      columnEnd: node.columnEnd ?? defaultColumnEnd,
      allowedChildren: "any", // Add missing property
      schema: z.any(), // Add missing property
      onExecutionGraphConstruction: node.onExecutionGraphConstruction,
      execute: (node as any).execute,
    });
  }

  // For text, comment, and instruction nodes, create a minimal BaseElement
  return new BaseElement({
    id: node.key ?? uuidv4(),
    key: node.key ?? uuidv4(),
    tag: "text",
    role: "state",
    elementType: "text" as SCXMLNodeType,
    attributes: {},
    children: [],
    type: "element",
    lineStart: node.lineStart ?? defaultLineStart,
    lineEnd: node.lineEnd ?? defaultLineEnd,
    columnStart: node.columnStart ?? defaultColumnStart,
    columnEnd: node.columnEnd ?? defaultColumnEnd,
    allowedChildren: "any", // Add missing property
    schema: z.any(), // Add missing property
    onExecutionGraphConstruction: node.onExecutionGraphConstruction,
    execute: (node as any).execute,
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
    parentsOrMode?: WeakRef<BaseElement>[] | "render" | "spec"
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
    parentsOrMode?: WeakRef<BaseElement>[] | "render" | "spec"
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

    const defaultExecutionGraphConfig: ExecutionGraphElement = {
      id: buildContext.attributes.id || `${config.tag}_${uuidv4()}`,
      type: config.role || "action",
      key: buildContext.elementKey,
      subType: config.tag as SCXMLNodeType,
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
        nodes: FireAgentNode[] = [],
        parentsOrMode?: WeakRef<BaseElement>[] | "render" | "spec"
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

        console.log(
          "=-------------------- config.execute",
          config.tag,
          config.execute
        );
        const tagNode = new BaseElement({
          id:
            config.tag === "workflow"
              ? "Incoming Request"
              : props.id || uuidv4(),
          key: props.id || uuidv4(),
          tag: config.tag,
          role: config.role || "action",
          elementType: config.scxmlType || (config.tag as SCXMLNodeType),
          attributes: propsWithChildren,
          children: nodes.map(convertToBaseElement),
          parent,
          enter: config.enter,
          exit: config.exit,
          onExecutionGraphConstruction:
            (config.onExecutionGraphConstruction as any) ||
            defaultExecutionGraphConstruction,
          type: "element",
          lineStart: nodes[0]?.lineStart ?? 0,
          lineEnd: nodes[nodes.length - 1]?.lineEnd ?? 0,
          columnStart: nodes[0]?.columnStart ?? 0,
          columnEnd: nodes[nodes.length - 1]?.columnEnd ?? 0,
          allowedChildren:
            typeof config.allowedChildren === "function"
              ? config.allowedChildren({} as Props)
              : config.allowedChildren || "any", // Add missing property
          schema: config.propsSchema || z.any(), // Add missing property
          execute: config.execute as any,
        });

        return tagNode;
      },
    }
  ) as ReactTagNodeType<Props>;

  return ReactTagNode;
};
