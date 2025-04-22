export const runStepTypes = [
  'ROUTER',
  'TEXT_REPHRASING',
  'CALL_EXTERNAL_API',
  'SELF_REFLECTION',
  'GENERIC_AI_TASK',
  'GENERATE_CONVERSATIONAL_RESPONSE',
  'SEND_LAST_STATE_OUTPUT_TO_USER',
  'NO_NEXT_STEP',
  'ERROR',
  'USER_INPUT',
  'CLASSIFICATION',
  'TRANSCRIPTION',
  'PASSTHROUGH',
];

export type RunStepType = (typeof runStepTypes)[number];

export type GraphNode<Type extends 'requirement' | 'step' | undefined = undefined> = {
  name: string;
  type: Type extends undefined ? 'requirement' | 'step' : Type;
} & (Type extends undefined
  ? { subType?: RunStepType | undefined }
  : Type extends 'step'
    ? { subType: RunStepType }
    : { subType: never });

export function processGraph(mermaidGraph: string): GraphNode[] {
  const nodeRegex = /([A-Za-z0-9]+)\s*\[(["'])(.*?)\2\]/g;
  const conditionRegex = /([A-Za-z0-9]+)\s*\{\s*(.*?)\s*\}/g;

  const nodesMap: Record<string, GraphNode> = {};

  let match: RegExpExecArray | null;
  // Match regular nodes
  while ((match = nodeRegex.exec(mermaidGraph)) !== null) {
    const id = match[1];
    const label = match[3]; // Text inside the brackets

    // Extract name and subtype from label
    const subtypeMatch = label.match(/^(.*)\s*\((.*)\)$/);
    let name = label;
    let subType;
    if (subtypeMatch) {
      name = subtypeMatch[1].trim();
      subType = subtypeMatch[2].trim();
    }

    let type: 'step' = 'step';
    if (!runStepTypes.includes(subType as RunStepType)) {
      console.warn(`Invalid subType "${subType}" for node "${id}"`);
      subType = undefined;
    }

    nodesMap[id] = {
      name,
      type,
      subType: subType as RunStepType,
    };
  }

  // Match condition nodes
  while ((match = conditionRegex.exec(mermaidGraph)) !== null) {
    const id = match[1];
    const label = match[2]; // Text inside the braces

    const conditionMatch = label.match(/^(.*)\s*\[Condition\]$/);
    let name = label;
    if (conditionMatch) {
      name = conditionMatch[1].trim();
    }

    nodesMap[id] = {
      name,
      type: 'requirement',
    };
  }

  return Object.values(nodesMap);
}
