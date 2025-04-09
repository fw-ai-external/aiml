import { aimlElements } from "./elements";

export function isAIMLElement(nodeName: string): boolean {
  return aimlElements.includes(nodeName as (typeof aimlElements)[number]);
}

export type Unpack<T> = {
  [K in keyof T]: T[K] extends object ? Unpack<T[K]> : T[K];
};
