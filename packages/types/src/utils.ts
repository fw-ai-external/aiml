import type { SCXMLNodeType } from "./index";

const supportedNodeTypes: SCXMLNodeType[] = [
  "scxml",
  "state",
  "parallel",
  "transition",
  "initial",
  "final",
  "onentry",
  "onexit",
  "on",
  "history",
  "datamodel",
  "data",
  "assign",
  "invoke",
  "send",
  "cancel",
  "script",
  "log",
  "raise",
  "if",
  "elseif",
  "else",
  "foreach",
  "finalize",
  "llm",
];

export function isSupportedNodeName(nodeName: string): boolean {
  return supportedNodeTypes.includes(nodeName as SCXMLNodeType);
}
