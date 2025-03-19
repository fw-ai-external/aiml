import { aimlElements, type ElementType } from "./index";

export function isAIMLElement(nodeName: string): boolean {
  return aimlElements.includes(nodeName as ElementType);
}

export type Unpack<T> = {
  [K in keyof T]: T[K] extends object ? Unpack<T[K]> : T[K];
};
