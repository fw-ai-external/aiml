import type { ElementExecutionContext as ElementExecutionContextInterface } from "../ElementExecutionContext";
import { type ActionContext, deepMerge } from "@mastra/core";
import { StepValue } from "../StepValue";
import {
  DataModelRegistry,
  ScopedDataModelRegistry,
} from "../DataModelRegistry";
import { ElementExecutionContext } from "../ElementExecutionContext/index";

/**
 * A simplified mock implementation of ElementExecutionContext for use in elements package
 * This avoids the circular dependency with the runtime package
 */
export class MockMastraContext implements ActionContext<any> {
  public context: any;

  public runId: string;

  constructor(config: Partial<ElementExecutionContextInterface<any>>) {
    const input = new StepValue({ type: "text", text: "input text" });
    const defaultConfig = new ElementExecutionContext({
      input,
      requestInput: {
        userMessage: "",
        chatHistory: [],
        clientSideTools: [],
        secrets: {
          system: {},
          user: {},
        },
      },
      datamodel: new ScopedDataModelRegistry(new DataModelRegistry(), "root"),
      props: {},
      state: {
        id: "test",
        props: {},
        input,
      },
      machine: {
        id: "test",
        secrets: {
          system: {},
          user: {},
        },
      },
      run: {
        id: "test",
      },
    });
    // Deeply merge the default config with the provided config
    this.context = deepMerge(defaultConfig, config);
    this.runId = config.runId || "test";
  }

  public async suspend(): Promise<void> {
    // Mock implementation
    return Promise.resolve();
  }
}
