import type { FireAgentNode } from "./types";

export function warnOnDuplicateKeys(
  usedKeys: Set<string>,
  node: FireAgentNode
) {
  if ("id" in node) {
    if (usedKeys.has(node.id)) {
      console.error("Duplicate id found in the config: ", node.id);
    }
    usedKeys.add(node.id);
  }
  if ("nodes" in node && node.nodes && Array.isArray(node.nodes)) {
    (node.nodes as FireAgentNode[]).forEach((child) =>
      warnOnDuplicateKeys(usedKeys, child)
    );
  }
}
