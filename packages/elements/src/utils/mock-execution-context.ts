import type { ElementExecutionContext as ElementExecutionContextInterface } from "@fireworks/types";

/**
 * A simplified mock implementation of ElementExecutionContext for use in elements package
 * This avoids the circular dependency with the runtime package
 */
export class MockElementExecutionContext<PropValues = any, InputValue = any>
  implements ElementExecutionContextInterface<PropValues, InputValue>
{
  public input: InputValue;
  public workflowInput: {
    userMessage: any;
    systemMessage?: string;
    chatHistory: Array<any>;
    clientSideTools: any[];
  };
  public datamodel: Record<string, any>;
  public attributes: PropValues & { children?: any[] };
  public state: {
    id: string;
    attributes: Record<string, any>;
    input: any;
  };
  public machine: {
    id: string;
    secrets: any;
  };
  public run: {
    id: string;
  };
  public runId: string;
  public context: any;

  constructor(config: {
    input: InputValue;
    workflowInput: {
      userMessage: any;
      systemMessage?: string;
      chatHistory: Array<any>;
      clientSideTools: any[];
    };
    datamodel: Record<string, any>;
    attributes: PropValues & { children?: any[] };
    state: {
      id: string;
      attributes: Record<string, any>;
      input: any;
    };
    machine: {
      id: string;
      secrets: any;
    };
    run: {
      id: string;
    };
    runId?: string;
    context?: any;
  }) {
    this.input = config.input;
    this.workflowInput = config.workflowInput;
    this.datamodel = config.datamodel;
    this.attributes = config.attributes;
    this.state = config.state;
    this.machine = config.machine;
    this.run = config.run;
    this.runId = config.runId || config.run.id;
    this.context = config.context || {};
  }

  public async suspend(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }

  public async serialize(): Promise<any> {
    // Mock implementation
    return {
      input: this.input,
      workflowInput: this.workflowInput,
      datamodel: this.datamodel,
      attributes: this.attributes,
      state: this.state,
      machine: this.machine,
      run: this.run,
      runId: this.runId,
    };
  }
}
