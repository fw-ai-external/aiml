import * as actions from "./actions/index";
import * as controlFlow from "./control-flow/index";
import * as states from "./states/index";
import * as ai from "./ai/index";
import { ElementError } from "../errors";
import type { ReactTagNodeType } from "./createElementDefinition";

const allElementDefinitions: Record<string, ReactTagNodeType> = {
  ...states,
  ...controlFlow,
  ...actions,
  ...ai,
} as const;

export function getNodeDefinitionClass(nodeType: string): ReactTagNodeType {
  const normalizedNodeType = nodeType.toLowerCase();
  const matchingKey = Object.keys(allElementDefinitions).find(
    (key) => key.toLowerCase() === normalizedNodeType
  );
  if (!matchingKey) {
    throw new ElementError("Invalid nodetype " + nodeType, nodeType);
  }
  return allElementDefinitions[matchingKey];
}
export function isSupportedNodeName(nodeName: string): boolean {
  return Object.keys(allElementDefinitions).some(
    (key) => key.toLowerCase() === nodeName.toLowerCase()
  );
}

export const SCXMLNodeTypes = [
  "scxml",
  "state",
  "parallel",
  "transition",
  "initial",
  "final",
  "onentry",
  "onexit",
  "history",
  "raise",
  "if",
  "elseif",
  "else",
  "foreach",
  "log",
  "datamodel",
  "data",
  "assign",
  "donedata",
  "content",
  "param",
  "script",
  "send",
  "cancel",
  "invoke",
  "finalize",
] as const;
export type SCXMLNodeType = (typeof SCXMLNodeTypes)[number];
