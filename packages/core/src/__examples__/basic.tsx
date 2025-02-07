// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react";
import { State } from "../element/states/StateElement";
import { SCXML } from "../element/states/SCXMLElement";
import { LLM } from "../element/ai/LLMElement";
import { Final } from "../element/states/FinalElement";
import { Runtime } from "../runtime";
import { parseSpec } from "../parser";
import { Transition } from "../element/control-flow";

const userInput = "Hello, how are you?";
const basicWorkflow = (
  <SCXML datamodel="minimal">
    <State id="initial_state">
      <LLM
        model="accounts/fireworks/models/llama-v3p1-8b-instruct"
        system="You are a helpful assistant."
        prompt={userInput}
      />
      {/* <Assign location="userInput" expr={userInput} /> */}
      <Transition target="final_state" />
    </State>
    <Final id="final_state" />
  </SCXML>
);
const spec = await parseSpec(basicWorkflow);
const runtime = new Runtime(spec);

export const basic = runtime.workflow;

export async function runBasic() {
  const result = await runtime.run({});
  console.log("result", result);
}
