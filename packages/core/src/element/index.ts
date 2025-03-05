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

export function getElementClassByTagName(tagName: string): ReactTagNodeType {
  const normalizedTagName = tagName.toLowerCase();
  const matchingKey = Object.keys(allElementDefinitions).find(
    (key) => key.toLowerCase() === normalizedTagName
  );
  if (!matchingKey) {
    throw new ElementError("Invalid tagName " + tagName, tagName);
  }
  return allElementDefinitions[matchingKey];
}
export function isSupportedElementName(tagName: string): boolean {
  return Object.keys(allElementDefinitions).some(
    (key) => key.toLowerCase() === tagName.toLowerCase()
  );
}

export * from "./actions";
export * from "./ai";
export * from "./control-flow";
export * from "./states";
export * from "./context";
