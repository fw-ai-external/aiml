import { onEntryConfig } from '@fireworks/shared';
import { createElementDefinition } from '../createElementFactory';

export const OnEntry = createElementDefinition({
  ...onEntryConfig,
  role: 'action',
  elementType: 'onentry',
  onExecutionGraphConstruction: (buildContext) => {
    return {
      id: buildContext.attributes.id,
      key: buildContext.elementKey,
      type: 'action',
      subType: 'onentry',
      attributes: buildContext.attributes,
      next: [],
    };
  },
});
