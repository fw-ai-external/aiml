import { arrayIncludes } from "./utils";
import { StackNode, Token } from "./types";
import { ElementNode } from "./parser";

interface StringifyOptions {
  voidTags: string[];
}

interface Attribute {
  key: string;
  value: string | null;
}

function formatAttributes(attributes: Attribute[]): string {
  return attributes.reduce((attrs: string, attribute: Attribute) => {
    const { key, value } = attribute;
    if (value === null) {
      return `${attrs} ${key}`;
    }
    const quoteEscape = value.indexOf("'") !== -1;
    const quote = quoteEscape ? '"' : "'";
    return `${attrs} ${key}=${quote}${value}${quote}`;
  }, "");
}

function toHTML(
  tree: (Token | ElementNode | StackNode)[],
  options: StringifyOptions
): string {
  return tree
    .map((node) => {
      if ("type" in node && node.type === "text") {
        return (node as Token).content;
      }
      if ("type" in node && node.type === "comment") {
        return `<!--${(node as Token).content}-->`;
      }
      const { tagName, propsRaw, children } = node as ElementNode;
      // @TODO update prop parsing to keep new lines
      const propsString = propsRaw ? propsRaw : "";
      const isSelfClosing = arrayIncludes(
        options.voidTags,
        tagName.toLowerCase()
      );
      if (isSelfClosing || (node as ElementNode).isSelfClosing) {
        const trailingSpace =
          propsString[propsString.length - 1] === " " ? "" : " ";
        return `<${tagName}${propsString}${trailingSpace}/>`;
      }
      return `<${tagName}${propsString}>${toHTML(children, options)}</${tagName}>`;
    })
    .join("");
}

export { formatAttributes, toHTML };
