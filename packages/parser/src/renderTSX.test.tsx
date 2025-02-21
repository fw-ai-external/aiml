// biome-ignore lint: needed for our jsx
import React from "react";
import { describe, expect, it } from "bun:test";
import { renderTSX } from "./renderTSX";
import type { FireAgentSpecNode } from "@fireworks/core";
import { printConfigTree } from ".";
import { SCXML, State, Final, Parallel } from "@fireworks/core";
import { OnEntry, Transition } from "@fireworks/core";
import { Assign, Log, Script } from "@fireworks/core";
import { Data, DataModel } from "@fireworks/core";
import { BaseElement } from "@fireworks/core";
import { Runtime } from "@fireworks/core";
import { parseSpec } from "../parser";
import { LLM } from "@fireworks/core";

function isBaseElement(
  node: FireAgentSpecNode | undefined | false
): node is BaseElement {
  return node instanceof BaseElement;
}

describe("tsx parser", () => {
  // TODO figure out how to run paralel states based on foreach
  it.skip("Should run an advanced machine", async () => {
    const fireAgentMachine = (
      <SCXML name="foreach_example" datamodel="ecmascript">
        <Parallel id="parallel_root">
          <State id="foreach_state">
            {/* TODO: Implement foreach logic */}
            <Transition id="translate_to_language" />
          </State>
        </Parallel>

        <State id="translate_to_language">
          <LLM
            id="translate_to_language"
            prompt="Translate the following text to ${input}: ${userInput.text}"
            model="fireworks/qwen2p5-72b-instruct"
            temperature={0}
          />
          <Transition id="finished" />
        </State>
        <Final id="finished" />
      </SCXML>
    );

    const result = renderTSX(fireAgentMachine);
    expect(result).toBeDefined();
    expect(isBaseElement(result) && result.elementType).toBe("scxml");
    const rootChildren = isBaseElement(result) && result.children;
    expect(rootChildren && rootChildren.length).toBe(3);
    expect(
      rootChildren &&
        rootChildren.map((child) => isBaseElement(child) && child.elementType)
    ).toEqual(["parallel", "state", "final"]);
  });

  it("should support intrinsic elements", async () => {
    const scxmlAsJSX = (
      <SCXML datamodel="ecmascript">
        <DataModel>
          <Data id="x" />
        </DataModel>

        <State id="a">
          <OnEntry>
            <Assign location="x" expr="-1" />
            <Assign location="x" expr="99" />
          </OnEntry>

          <Transition event="t" target="b" cond="x === 99">
            <Assign location="x" expr="x + 1" />
          </Transition>
        </State>

        <State id="b">
          <OnEntry>
            <Assign location="x" expr="x * 2" />
          </OnEntry>

          <Transition target="c" cond="x === 200" />
          <Transition target="f" />
        </State>

        <State id="c" />

        <State id="f" />
      </SCXML>
    );

    const result = renderTSX(scxmlAsJSX);
    expect(result).toBeDefined();

    expect(isBaseElement(result) && result.elementType).toBe("scxml");
    const rootChildren = isBaseElement(result) && result.children;
    expect(rootChildren && rootChildren.length).toBe(5);
    expect(
      rootChildren &&
        rootChildren.map((child) => isBaseElement(child) && child.elementType)
    ).toEqual(["datamodel", "state", "state", "state", "state"]);

    const stateA =
      rootChildren &&
      rootChildren.find(
        (child) =>
          isBaseElement(child) &&
          child.elementType === "state" &&
          child.attributes?.id === "a"
      );
    expect(stateA).toBeDefined();
    expect(
      isBaseElement(stateA) && stateA.children && stateA.children.length
    ).toBe(2);
    expect(
      isBaseElement(stateA) &&
        stateA.children &&
        stateA.children.map(
          (child) => isBaseElement(child) && child.elementType
        )
    ).toEqual(["onentry", "transition"]);

    const onentry =
      isBaseElement(stateA) &&
      stateA.children &&
      stateA.children.find(
        (child) => isBaseElement(child) && child.elementType === "onentry"
      );
    expect(onentry).toBeDefined();
    expect(
      isBaseElement(onentry) && onentry.children && onentry.children.length
    ).toBe(2);
    expect(
      isBaseElement(onentry) &&
        onentry.children &&
        onentry.children.map(
          (child) => isBaseElement(child) && child.elementType
        )
    ).toEqual(["assign", "assign"]);

    const assign1 =
      isBaseElement(onentry) &&
      onentry.children &&
      onentry.children.find(
        (child) => isBaseElement(child) && child.elementType === "assign"
      );
    expect(assign1).toBeDefined();
    expect(isBaseElement(assign1) && assign1.attributes?.expr).toBe("-1");
    expect(isBaseElement(assign1) && assign1.attributes?.location).toBe("x");

    const assign2 =
      isBaseElement(onentry) && onentry.children && onentry.children[1];
    expect(assign2).toBeDefined();
    expect(isBaseElement(assign2) && assign2.attributes?.expr).toBe("99");
    expect(isBaseElement(assign2) && assign2.attributes?.location).toBe("x");

    const transition =
      isBaseElement(stateA) &&
      stateA.children &&
      stateA.children.find(
        (child) => isBaseElement(child) && child.elementType === "transition"
      );
    expect(transition).toBeDefined();
    expect(isBaseElement(transition) && transition.attributes?.cond).toBe(
      "x === 99"
    );
    expect(isBaseElement(transition) && transition.attributes?.target).toBe(
      "b"
    );

    const assign3 =
      isBaseElement(transition) &&
      transition.children &&
      transition.children.find(
        (child) => isBaseElement(child) && child.elementType === "assign"
      );
    expect(assign3).toBeDefined();
    expect(isBaseElement(assign3) && assign3.attributes?.expr).toBe("x + 1");
    expect(isBaseElement(assign3) && assign3.attributes?.location).toBe("x");

    const stateB =
      rootChildren &&
      rootChildren.find(
        (child) =>
          isBaseElement(child) &&
          child.elementType === "state" &&
          child.attributes?.id === "b"
      );
    expect(stateB).toBeDefined();
    expect(
      isBaseElement(stateB) && stateB.children && stateB.children.length
    ).toBe(3);
    expect(
      isBaseElement(stateB) &&
        stateB.children &&
        stateB.children.map(
          (child) => isBaseElement(child) && child.elementType
        )
    ).toEqual(["onentry", "transition", "transition"]);

    const onentryB =
      isBaseElement(stateB) &&
      stateB.children &&
      stateB.children.find(
        (child) => isBaseElement(child) && child.elementType === "onentry"
      );
    expect(onentryB).toBeDefined();
    expect(
      isBaseElement(onentryB) && onentryB.children && onentryB.children.length
    ).toBe(1);
    expect(
      isBaseElement(onentryB) &&
        onentryB.children &&
        onentryB.children.map(
          (child) => isBaseElement(child) && child.elementType
        )
    ).toEqual(["assign"]);

    const assign4 =
      isBaseElement(onentryB) &&
      onentryB.children &&
      onentryB.children.find(
        (child) => isBaseElement(child) && child.elementType === "assign"
      );
    expect(assign4).toBeDefined();
    expect(isBaseElement(assign4) && assign4.attributes?.expr).toBe("x * 2");
    expect(isBaseElement(assign4) && assign4.attributes?.location).toBe("x");

    const transitionB1 =
      isBaseElement(stateB) &&
      stateB.children &&
      stateB.children.find(
        (child) => isBaseElement(child) && child.elementType === "transition"
      );
    expect(transitionB1).toBeDefined();
    expect(isBaseElement(transitionB1) && transitionB1.attributes?.cond).toBe(
      "x === 200"
    );
    expect(isBaseElement(transitionB1) && transitionB1.attributes?.target).toBe(
      "c"
    );

    const transitionB2 =
      isBaseElement(stateB) && stateB.children && stateB.children[2];
    expect(transitionB2).toBeDefined();
    expect(isBaseElement(transitionB2) && transitionB2.attributes?.target).toBe(
      "f"
    );

    const stateC =
      rootChildren &&
      rootChildren.find(
        (child) =>
          isBaseElement(child) &&
          child.elementType === "state" &&
          child.attributes?.id === "c"
      );
    expect(stateC).toBeDefined();

    const stateF =
      rootChildren &&
      rootChildren.find(
        (child) =>
          isBaseElement(child) &&
          child.elementType === "state" &&
          child.attributes?.id === "f"
      );
    expect(stateF).toBeDefined();
  });

  it("after rendering, should only have sync-scxml elements", () => {
    const fireAgentMachine = (
      <SCXML name="sync_scxml_example" datamodel="ecmascript">
        <State id="a">
          <OnEntry>
            <Assign location="x" expr="-1" />
            <Assign location="x" expr="99" />
          </OnEntry>
          <Transition target="b" />
        </State>
        <State id="b">
          <OnEntry>
            <Assign location="x" expr="x * 2" />
          </OnEntry>
          <Transition target="finished" />
        </State>
        <State id="c">
          <OnEntry>
            <Log label="[log]" expr="'test'" />
            <Script>console.log('log from script scxml element');</Script>
          </OnEntry>
        </State>
        <Final id="finished" />
      </SCXML>
    );

    const result = renderTSX(fireAgentMachine);
    expect(result).toBeDefined();
    expect(isBaseElement(result) && result.elementType).toBe("scxml");

    function expectSyncSCXMLNode(node: FireAgentSpecNode | undefined) {
      if (!node) {
        return;
      }
      if (!isBaseElement(node)) {
        return;
      }
      const name = node.elementType;
      expect(name).toBeDefined();
      expect(name! in SCXMLNodeTypes).toBe(true);
      if (node.children) {
        node.children.forEach((child: FireAgentSpecNode) =>
          expectSyncSCXMLNode(child)
        );
      }
    }

    expectSyncSCXMLNode(result);
  });

  it("Should support async elements with State", async () => {
    const fireAgentMachine = (
      <SCXML
        name="async_example"
        initial="actions_with_async_script"
        datamodel="ecmascript"
      >
        <DataModel>
          <Data
            id="someData"
            expr={`{
            languages: ['en', 'fr', 'de'],
          }`}
          />
        </DataModel>
        <State id="actions_with_async_script">
          <OnEntry>
            <Assign
              location="someData.languages"
              expr={JSON.stringify(["en", "fr", "de"])}
            />
            <Script>console.log('log from script scxml element');</Script>
          </OnEntry>
          <Transition target="call_custom_async_action" />
        </State>

        <State id="call_custom_async_action">
          <LLM
            id="talking to the AI"
            prompt="Translate the following text to ${input}: ${userInput.text}"
            model="fireworks/qwen2p5-72b-instruct"
            temperature={0}
          />
          <Transition target="finished" />
        </State>
        <Final id="finished" />
      </SCXML>
    );

    const spec = await parseSpec(fireAgentMachine);
    const runtime = new Runtime(spec);
    const result = await runtime.run({
      userInput: {
        text: "test",
      },
    });
    expect(result.results.finished.status).toBe("success");
  });

  it("should parse properly with text nodes", () => {
    const fireAgentSpec = (
      <SCXML initial="test">
        <State id="test">
          <LLM
            id="llm-transfer"
            model="accounts/fireworks/models/llama-v3p1-8b-instruct"
            prompt="What is the weather in San Francisco?"
          />
          <Transition
            event="xstate.done.actor.llm-transfer"
            target="finished"
          />
        </State>
        <Final id="finished" />
      </SCXML>
    );
    const result = renderTSX(fireAgentSpec);
    printConfigTree(result);
    expect(result.elementType).toBe("scxml");
    const testState = result?.children?.find(
      (child) =>
        isBaseElement(child) &&
        child.elementType === "state" &&
        child.attributes?.id === "test"
    )!;
    expect(testState).toBeDefined();
    expect((testState as BaseElement)?.children?.length).toBe(2);
    expect(
      (testState as BaseElement)?.children?.map(
        (child) => (child as BaseElement).elementType
      )
    ).toEqual(["GeneralAITask", "transition"]);

    const invokeTask = (testState as BaseElement)?.children?.find(
      (child) => (child as BaseElement).tag === "GeneralAITask"
    )!;
    expect(invokeTask).toBeDefined();
    expect((invokeTask as BaseElement)?.children?.length).toBe(1);
    expect(
      (invokeTask as BaseElement)?.children?.map(
        (child) => (child as BaseElement).elementType
      )
    ).toEqual(["data"]);
  });

  it.todo("Should support async elements with Step", async () => {
    const fireAgentMachine = (
      <SCXML name="async_example" initial="step1">
        <State id="step1">
          <OnEntry>
            <Assign
              location="userInput.languages"
              expr={JSON.stringify(["en", "fr", "de"])}
            />
          </OnEntry>
          <Transition target="step2" />
        </State>

        <State id="step2">
          <LLM
            id="talking to the AI"
            prompt="Translate the following text to ${input}: ${userInput.text}"
            model="fireworks/qwen2p5-72b-instruct"
            temperature={0}
          />
          <Assign location="userInput.languages" expr={`input.text`} />

          <Transition target="finished" />
        </State>

        <Final id="finished" />
      </SCXML>
    );

    const spec = await parseSpec(fireAgentMachine);
    const runtime = new Runtime(spec);
    const result = await runtime.run({
      userInput: {
        text: "test",
      },
    });

    expect(result).toBeDefined();
    expect(result.results.finished.status).toBe("success");
    expect((result.results.finished as any).payload).toBe("text");
  });
});
