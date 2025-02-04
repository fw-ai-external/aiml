interface Step {
  name: string;
  type: string;
}

interface Requirement {
  type: string;
  options?: {
    values?: string[];
    instruction?: string;
  };
}

interface Transition {
  name: string;
  requirements?: Requirement[];
  asEffect?: { name: string }[];
}

interface WorkflowStructure {
  runSteps: Step[];
  transitions: {
    [key: string]: Transition[];
  };
}

export function convertToMermaid(structure: WorkflowStructure): string {
  let mermaidSyntax = 'graph TD\n';

  // Add nodes
  structure.runSteps.forEach((step) => {
    mermaidSyntax += `  ${step.name}[${step.name}: ${step.type}]\n`;
  });

  // Add transitions
  Object.entries(structure.transitions).forEach(([from, transitions]) => {
    transitions.forEach((transition) => {
      const label = getTransitionLabel(transition);
      mermaidSyntax += `  ${from} -->|${label}| ${transition.name}\n`;
    });
  });

  return mermaidSyntax;
}

function getTransitionLabel(transition: Transition): string {
  const parts: string[] = [];

  if (transition.requirements) {
    parts.push(transition.requirements.map((req) => `${req.type}`).join(', '));
  }

  if (transition.asEffect) {
    parts.push(`Effect: ${transition.asEffect.map((effect) => effect.name).join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Transition';
}
