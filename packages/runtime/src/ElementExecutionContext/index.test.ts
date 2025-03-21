import { describe, expect, it } from "bun:test";
import { ElementExecutionContext } from ".";
import { StepValue } from "../StepValue";

describe("ElementExecutionContext", () => {
  it("builtinKeys array  should map 1:1 to serialized method's returnd keys ensuring validation of data elements works", async () => {
    const builtinKeys = ElementExecutionContext.builtinKeys.toSorted();
    const context = new ElementExecutionContext({
      input: new StepValue({ type: "text", text: "" }),
      datamodel: { values: {} },
      requestInput: {
        userMessage: "Hello, world!",
        systemMessage: "",
        chatHistory: [],
        clientSideTools: [],
        secrets: { system: {}, user: {} },
      },
      props: {},
      run: { id: "run_0" },
      state: {
        id: "rs_0",
        props: {},
        input: new StepValue({ type: "text", text: "" }),
      },
      machine: { id: "machine_0", secrets: { system: {} } },
    });
    const serialized = await context.serialize();
    const serializedKeys = Object.keys(serialized).toSorted();
    expect(serializedKeys).toEqual(builtinKeys);
  });
});
