import { aimlElements, type ElementType } from "./index";

export function isAIMLElement(nodeName: string): boolean {
  return aimlElements.includes(nodeName as ElementType);
}
