import React from "react";
import {
  BaseElement,
  ElementPredicate,
  Fragment,
  isElement,
  Node,
} from "./BaseElement";

const debugRepresentationSymbol = Symbol("Workflow.JSX debug representation");

export interface RenderContext {
  render: (
    node: Node,
    options: {
      stop: ElementPredicate;
      map: (frame: Node) => string;
    }
  ) => AsyncGenerator<Node, Node, unknown>;
  memo: (node: Node) => Node;
}

/**
 * Creates props that associate a debug representation with an element.
 */
export function debugRepresentation(fn: (element: BaseElement) => unknown) {
  return {
    [debugRepresentationSymbol]: fn,
  };
}

function isEmptyJSXValue(x: unknown) {
  return (
    x === undefined ||
    x === null ||
    typeof x === "boolean" ||
    (Array.isArray(x) && x.length == 0)
  );
}

function getTagName(tag: unknown): string {
  if (typeof tag === "function") {
    if (tag === Fragment) return "";
    return tag.name || "Anonymous";
  }
  return String(tag);
}

/**
 * Used by {@link DebugTree} to render a tree of {@link Node}s.
 * @hidden
 */
export function debug(
  value: unknown,
  expandJSXChildren: boolean = true,
  maxStringLength = 2048
): string {
  let remainingLength = maxStringLength;

  function debugRec(
    value: unknown,
    indent: string,
    context: "code" | "children" | "props"
  ): string {
    if (remainingLength <= 0) {
      return "{...}";
    }
    const result = debugRecHelper(value, indent, context);
    remainingLength -= result.length;
    return result;
  }

  function debugRecHelper(
    value: unknown,
    indent: string,
    context: "code" | "children" | "props"
  ): string {
    if (value === undefined) {
      return context === "props" ? "{undefined}" : "";
    }
    if (typeof value === "string") {
      let jsonified = JSON.stringify(value);
      if (jsonified.length > maxStringLength) {
        jsonified = `${jsonified.slice(0, maxStringLength)}...`;
      }
      if (context === "props" || context === "code") {
        return jsonified;
      }
      return `{${jsonified}}`;
    }
    if (typeof value === "number" || typeof value === "bigint") {
      if (context === "props" || context === "children") {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    if (typeof value === "boolean" || typeof value === "undefined") {
      return "";
    }
    if (value === null) {
      switch (context) {
        case "code":
          return "null";
        case "children":
          return "{null}";
        case "props":
          return "{null}";
      }
    } else if (isElement(value)) {
      if (debugRepresentationSymbol in value.attributes) {
        return debugRec(
          (value.attributes[debugRepresentationSymbol] as any)(value),
          indent,
          context
        );
      }

      const childIndent = `${indent}  `;
      const expandChildrenForThisElement = expandJSXChildren;

      let children = "";
      if (expandChildrenForThisElement) {
        children = debugRec(value.attributes.children, childIndent, "children");
      }

      const results = [];

      if (value.attributes) {
        for (const key of Object.keys(value.attributes)) {
          if (remainingLength <= 0) {
            results.push(" {...}");
            break;
          }

          const propValue = value.attributes[key];
          if (key === "children" || propValue === undefined) {
            continue;
          } else {
            results.push(` ${key}=${debugRec(propValue, indent, "props")}`);
          }
        }
      }

      const propsString = results.join("");
      const isFragmentComponent =
        typeof value.tag === "function" && value.tag === Fragment;
      const tagName = getTagName(value.tag);

      const child =
        children !== ""
          ? `<${tagName}${propsString}>\n${childIndent}${children}\n${indent}</${tagName}>`
          : isFragmentComponent
            ? "<></>"
            : `<${tagName}${propsString} />`;

      switch (context) {
        case "code":
        case "children":
          return child;
        case "props":
          return `{${child}}`;
      }
    } else if (Array.isArray(value)) {
      const values: string[] = [];

      for (const item of value) {
        if (remainingLength <= 0) {
          values.push("{...}");
          break;
        }
        if (context === "children" && isEmptyJSXValue(item)) {
          continue;
        }
        values.push(
          debugRec(item, indent, context === "children" ? "children" : "code")
        );
      }

      switch (context) {
        case "children":
          return values.join(`\n${indent}`);
        case "props":
          return `{[${values.join(", ")}]}`;
        case "code":
          return `[${values.join(", ")}]`;
      }
    } else if (typeof value === "object") {
      let stringified;
      try {
        stringified = JSON.stringify(value);
      } catch {
        stringified = "{/* ... */}";
      }
      if (context === "props" || context === "children") {
        return `{${stringified}}`;
      }
      return stringified;
    } else if (typeof value === "function") {
      const toRender = value.name === "" ? value.toString() : value.name;
      if (context === "props" || context === "children") {
        return `{${toRender}}`;
      }
      return toRender;
    } else if (typeof value === "symbol") {
      if (context === "props" || context === "children") {
        return `{${value.toString()}}`;
      }
      return value.toString();
    }
    return "";
  }
  return debugRec(value, "", "code");
}

/**
 * Render a tree of JSX elements as a string, yielding each step of the rendering process.
 */
export async function* debugTreeGenerator(
  props: { children: Node },
  context: RenderContext
): AsyncGenerator<Node, Node, unknown> {
  let current = props.children;
  while (true) {
    yield current;

    let elementToRender = null as BaseElement | null;
    const shouldStop: ElementPredicate = (element) => {
      if (elementToRender === null && isElement(element)) {
        elementToRender = element;
      }
      return element !== elementToRender;
    };

    current = yield* context.render(current, {
      stop: shouldStop,
      map: (frame) => debug(frame),
    });

    if (elementToRender === null) {
      return current;
    }
  }
}

interface DebugTreeProps {
  children: Node;
  context: RenderContext;
}

export function createDebugTree(props: DebugTreeProps): React.ReactElement {
  const [output, setOutput] = React.useState<string>("");

  React.useEffect(() => {
    const generator = debugTreeGenerator(props, props.context);
    let mounted = true;

    async function run() {
      for await (const frame of generator) {
        if (!mounted) break;
        setOutput(debug(frame));
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [props]);

  return React.createElement("pre", null, output);
}

export const DebugTree: React.FC<DebugTreeProps> = (props) => {
  return createDebugTree(props);
};
