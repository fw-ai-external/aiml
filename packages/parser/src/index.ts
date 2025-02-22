export * from "./BaseElement";
export * from "./fromXML";
export * from "./parser";
export * from "./renderTSX";
export * from "./types";

import type React from "react";
import format, { type XMLFormatterOptions } from "xml-formatter";
import { fromXML } from "./fromXML";
import { renderTSX } from "./renderTSX";
import type { FireAgentNode } from "./types";
import { type BaseElementDefinition } from "@fireworks/element-types";
import { z } from "zod";

function convertToBaseElementDefinition(
  element: FireAgentNode
): BaseElementDefinition {
  return {
    tag: "kind" in element ? element.kind : element.tag,
    role: "kind" in element ? "state" : element.role,
    scxmlType: "kind" in element ? "state" : element.elementType,
    propsSchema: z.object({
      id: z.string().optional(),
      ...("attributes" in element ? element.attributes : {}),
    }),
    description: "A parsed element",
    documentation: "A parsed element from XML or TSX",
    allowedChildren: "any",
  };
}

export async function parseSpec(
  config: string | React.ReactElement<any, any>
): Promise<BaseElementDefinition> {
  try {
    if (typeof config === "string") {
      const element = await fromXML(config);
      return convertToBaseElementDefinition(element);
    }
    const element = renderTSX(config);
    return convertToBaseElementDefinition(element);
  } catch (error: any) {
    // if (error instanceof BaseError) {
    //   error.log();
    //   throw error.asUserError();
    // }
    console.error(error);
    throw error;
  }
}

/**
 * Get the fully (scxml) pretty formatted rendered config tree as a string
 */
export function getConfigTreeXML(
  config: FireAgentNode,
  options: XMLFormatterOptions = {}
) {
  const xmlStr = config.toString();
  return format(xmlStr, options);
}

/**
 * Print the fully (scxml) rendered config tree
 */
export function printConfigTree(config: FireAgentNode) {
  console.log(getConfigTreeXML(config, { indentation: "  " }));
}

export function formatXML(xml: string, options?: XMLFormatterOptions): string {
  return format(xml, options);
}

export type { React };
