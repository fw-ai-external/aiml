// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react";
import {
  State,
  SCXML,
  LLM,
  Final,
  Runtime,
  Transition,
  Script,
} from "@fireworks/core";
import { parseSpec } from "@fireworks/parser";

const userInput = "Hello, how are you?";
const basicWorkflow = (
  <SCXML datamodel="minimal">
    <State id="initial_state">
      <LLM
        model="accounts/fireworks/models/llama-v3p1-8b-instruct"
        system="You are a helpful assistant."
        prompt={userInput}
      />
      <Script>console.log("Hello, world!");</Script>
      {/* <Assign location="userInput" expr={userInput} /> */}
      <Transition target="final_state" />
    </State>
    <Final id="final_state" />
  </SCXML>
);
const spec = await parseSpec(basicWorkflow);
const runtime = new Runtime(spec as any);

export const basic = runtime.workflow;

export async function runBasic() {
  const result = await runtime.run({});
  console.log("result", result);
}
