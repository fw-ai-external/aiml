import type React from "react";
import format, { type XMLFormatterOptions } from "xml-formatter";
import { BaseError } from "../errors";
import { fromXML } from "./fromXML";
import { renderTSX } from "./renderTSX";
import type { FireAgentNode } from "./types";
import { BaseElement } from "../runtime/BaseElement";

export async function parseSpec(
  config: string | React.ReactElement<any, any>
): Promise<BaseElement> {
  try {
    if (typeof config === "string") {
      return await fromXML(config);
    }
    return renderTSX(config);
  } catch (error) {
    if (error instanceof BaseError) {
      error.log();
      throw error.asUserError();
    }
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
