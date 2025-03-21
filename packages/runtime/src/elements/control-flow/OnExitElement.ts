import { onExitConfig } from '@fireworks/shared';
import { v4 as uuidv4 } from 'uuid';
import { StepValue } from '../../StepValue';
import { createElementDefinition } from '../createElementFactory';

export const OnExit = createElementDefinition({
  ...onExitConfig,
  tag: 'onexit' as const,
  allowedChildren: 'any',
  role: 'action',
  elementType: 'onexit',
  async execute(ctx, childrenNodes) {
    // Execute all child actions in sequence
    const results: any[] = [];
    for (const child of childrenNodes) {
      if (typeof child.execute === 'function') {
        // Pass the context directly to child execution
        const result = await child.execute(ctx as any);
        if (result) {
          results.push(result);
        }
      }
    }

    return {
      result: new StepValue({
        object: {
          id: ctx.props.id ?? uuidv4(),
          results,
        },
      }),
    };
  },
});
