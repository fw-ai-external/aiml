import * as fs from "node:fs";
import * as path from "node:path";
import { findUpSync } from "find-up";
import { describe, expect, it } from "vitest";
import { fromXML } from "./fromXML";
import { BaseElement } from "../runtime/BaseElement";

describe("xml parser", () => {
  it("should parse scxml based XML", async () => {
    const scxmlDefinition = fs.readFileSync(
      path.resolve(
        __dirname,
        "../StateMachine/__fixtures__/scxml/assign-current-small-step/test0.scxml"
      ),
      {
        encoding: "utf-8",
      }
    );

    const result = await fromXML(scxmlDefinition);
    expect(result).toBeDefined();
    expect(result.elementType).toBe("scxml");
    expect(result.children).toBeDefined();
    expect(result.children?.length).toBe(5);
    expect(
      result.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual(["datamodel", "state", "state", "state", "state"]);

    const stateA = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "a"
    ) as BaseElement;
    expect(stateA).toBeDefined();
    expect(stateA?.children?.length).toBe(4);

    expect(
      stateA?.children?.map((child) => "name" in child && child.name)
    ).toEqual(["onentry", undefined, "transition", "onexit"]);

    const onentry = stateA?.children?.find(
      (child) => "elementType" in child && child.elementType === "onentry"
    ) as BaseElement;
    expect(onentry).toBeDefined();
    expect(onentry?.children?.length).toBe(3);
    expect(
      onentry?.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual([undefined, "assign", "assign"]);

    const assign1 = onentry?.children?.find(
      (child) => "elementType" in child && child.elementType === "assign"
    ) as BaseElement;
    expect(assign1).toBeDefined();
    expect(assign1?.attributes?.expr).toBe("-1");
    expect(assign1?.attributes?.location).toBe("x");

    const assign2 = onentry?.children?.find(
      (child, i: number) => i === 2
    ) as BaseElement;
    expect(assign2).toBeDefined();
    expect(assign2?.attributes?.expr).toBe("99");
    expect(assign2?.attributes?.location).toBe("x");

    const transition = stateA?.children?.find(
      (child) => "elementType" in child && child.elementType === "transition"
    ) as BaseElement;
    expect(transition).toBeDefined();
    expect(transition?.attributes?.cond).toBe("x === 99");
    expect(transition?.attributes?.target).toBe("b");

    const stateB = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "b"
    ) as BaseElement;
    expect(stateB).toBeDefined();
    expect(stateB?.children?.length).toBe(4);
    expect(
      stateB?.children?.map((child) => "name" in child && child.name)
    ).toEqual([undefined, "onentry", "transition", "transition"]);

    const onentryB = stateB?.children?.find(
      (child) => "elementType" in child && child.elementType === "onentry"
    ) as BaseElement;
    expect(onentryB).toBeDefined();
    expect(onentryB?.children?.length).toBe(2);
    expect(
      onentryB?.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual(["script", "assign"]);

    const assign4 = onentryB?.children?.find(
      (child) => "elementType" in child && child.elementType === "assign"
    ) as BaseElement;
    expect(assign4).toBeDefined();
    expect(assign4?.attributes?.expr).toBe("x * 2");
    expect(assign4?.attributes?.location).toBe("x");

    const transitionB1 = stateB?.children?.find(
      (child) => "elementType" in child && child.elementType === "transition"
    ) as BaseElement;
    expect(transitionB1).toBeDefined();
    expect(transitionB1?.attributes?.cond).toBe("x === 200");
    expect(transitionB1?.attributes?.target).toBe("c");

    const transitionB2 = stateB?.children?.find(
      (child, i: number) => i === 3
    ) as BaseElement;
    expect(transitionB2).toBeDefined();
    expect(transitionB2?.attributes?.target).toBe("f");

    const stateC = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "c"
    ) as BaseElement;
    expect(stateC).toBeDefined();

    const stateF = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "f"
    ) as BaseElement;
    expect(stateF).toBeDefined();
  });

  it("should parse scxml with conditionals", async () => {
    const TEST_FRAMEWORK = path.dirname(
      findUpSync("package.json", {
        cwd: require.resolve("@scion-scxml/test-framework"),
      }) as string
    );
    const scxmlDefinition = fs.readFileSync(
      path.resolve(
        __dirname,
        `${TEST_FRAMEWORK}/test/w3c-ecma/test147.txml.scxml`
      ),
      {
        encoding: "utf-8",
      }
    );
    expect(scxmlDefinition).toBeDefined();

    const result = await fromXML(scxmlDefinition);

    expect(result).toBeDefined();
    const state0 = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "s0"
    ) as BaseElement;

    expect(state0).toBeDefined();

    expect(state0.children?.length).toBe(3);
    expect(
      state0.children?.map((child) => "name" in child && child.name)
    ).toEqual(["onentry", "transition", "transition"]);
    const onentry = state0.children?.find(
      (child) => "elementType" in child && child.elementType === "onentry"
    ) as BaseElement;
    expect(onentry).toBeDefined();
  });

  it("should be able to parse the two-step agent", async () => {
    const xml = fs.readFileSync(
      path.resolve(
        __dirname,
        "../StateMachine/__fixtures__/fireagents/base/two_step_agent.scxml"
      ),
      {
        encoding: "utf-8",
      }
    );
    const result = await fromXML(xml);
    expect(result).toBeDefined();
    expect(result.elementType).toBe("scxml");
    expect(result.children?.length).toBe(3);
    expect(
      result.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual(["state", "state", "final"]);
  });

  it("should parse properly with text nodes", async () => {
    const fireAgentSpec = `
      <scxml initial="test">
        <state id="test">
          <GeneralAITask id="llm-transfer" model="accounts/fireworks/models/llama-v3p1-8b-instruct">
            <data id="input">What is the weather in San Francisco?</data>
          </GeneralAITask>
          <transition event="xstate.done.actor.llm-transfer" target="finished" />
        </state>
        <final id="finished" />
      </scxml>
    `;
    const result = await fromXML(fireAgentSpec);
    // printConfigTree(result);
    expect(result.elementType).toBe("scxml");
    const testState = result.children?.find(
      (child) =>
        "elementType" in child &&
        child.elementType === "state" &&
        child.id === "test"
    ) as BaseElement;
    expect(testState).toBeDefined();
    expect(testState.children?.length).toBe(2);
    expect(
      testState.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual(["GeneralAITask", "transition"]);

    const invokeTask = testState.children?.find(
      (child) => "tag" in child && child.tag === "GeneralAITask"
    ) as BaseElement;
    expect(invokeTask).toBeDefined();
    expect(invokeTask.children?.length).toBe(1);
    expect(
      invokeTask.children?.map(
        (child) => "elementType" in child && child.elementType
      )
    ).toEqual(["data"]);
  });
});
