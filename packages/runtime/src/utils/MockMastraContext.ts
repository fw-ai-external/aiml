import { StepValue } from '@fireworks/shared';
import type { ElementExecutionContext as ElementExecutionContextInterface } from '@fireworks/shared';
import { type ActionContext, deepMerge } from '@mastra/core';

/**
 * A simplified mock implementation of ElementExecutionContext for use in elements package
 * This avoids the circular dependency with the runtime package
 */
export class MockMastraContext implements ActionContext<any> {
  public context: any;

  public runId: string;

  constructor(config: Partial<ElementExecutionContextInterface<any>>) {
    const input = new StepValue({ type: 'text', text: 'input text' });
    const defaultConfig: ElementExecutionContextInterface<any> = {
      input,
      workflowInput: {
        userMessage: '',
        chatHistory: [],
        clientSideTools: [],
      },
      datamodel: {},
      attributes: {},
      state: {
        id: 'test',
        attributes: {},
        input,
      },
      machine: {
        id: 'test',
        secrets: {
          system: {},
          user: {},
        },
      },
      run: {
        id: 'test',
      },
      runId: 'test',
      context: {},
      suspend: () => Promise.resolve(),
      serialize: () => Promise.resolve({}),
    };
    // Deeply merge the default config with the provided config
    this.context = deepMerge(defaultConfig, config);
    this.runId = config.runId || 'test';
  }

  public async suspend(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }
}
