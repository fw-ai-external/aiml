import { describe, expect, it } from "vitest";
import { ElementExecutionContext } from "./ElementExecutionContext";
import { StepValue } from "./StepValue";

describe("ElementExecutionContext", () => {
  it("builtinKeys array  should map 1:1 to serialized method's returnd keys ensuring validation of data elements works", async () => {
    const builtinKeys = (ElementExecutionContext as any).builtinKeys.toSorted();
    const context = new ElementExecutionContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: {},
      workflowInput: {
        userMessage: "Hello, world!",
        systemMessage: "",
        chatHistory: [],
        clientSideTools: [],
      },
      attributes: {},
      run: { id: "run_0" },
      state: { id: "rs_0", name: "step_0" } as any,
      machine: { id: "machine_0", secrets: { system: {} } },
    });
    const serialized = context.serialize();
    const serializedKeys = Object.keys(serialized).toSorted();
    expect(serializedKeys).toEqual(builtinKeys);
  });
});
