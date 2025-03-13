import { describe, it, expect } from "bun:test";
import { parseMDXToAIML } from "..";

describe("healFlowOrError Phase Tests", () => {
  // Helper function to log state tree for debugging
  function logStateTree(element, indent = 0) {
    if (!element) return;

    const spacing = " ".repeat(indent * 2);
    console.log(
      `${spacing}${element.tag || element.type} ${element.attributes?.id || ""}`
    );

    if (element.children) {
      for (const child of element.children) {
        if (child.type === "element") {
          logStateTree(child, indent + 1);
        }
      }
    }
  }
  // Test 1: Final state and error state should be added if none exists
  it("should add final state and error state to workflow if none exists", async () => {
    const input = `
<workflow id="test">
  <state id="start">
    <llm prompt="Hello" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    expect(result.nodes).toBeArrayOfSize(1);

    const workflow = result.nodes[0];
    expect(workflow.tag).toBe("workflow");
    expect(workflow.children).not.toBeUndefined();

    // Check for final state
    const finalState = workflow.children?.find(
      (child) => child.type === "element" && child.tag === "final"
    );
    expect(finalState).not.toBeUndefined();
    expect(finalState?.attributes?.id).toBe("final");

    // Check for error state
    const errorState = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "error"
    );
    expect(errorState).not.toBeUndefined();
  });

  // Test 2: Direct child of workflow with next sibling should transition to that sibling
  it("should add transition to next sibling for workflow child states", async () => {
    const input = `
<workflow id="test">
  <state id="first">
    <llm prompt="First state" />
  </state>
  <state id="second">
    <llm prompt="Second state" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find the first state
    const firstState = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "first"
    );
    expect(firstState).not.toBeUndefined();

    // Check if there's a transition to the second state
    const transition = firstState?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "transition" &&
        child.attributes?.target === "second"
    );
    expect(transition).not.toBeUndefined();
  });

  // Test 3: Direct child of workflow without next sibling should transition to final state
  it("should add transition to final state for last workflow child state", async () => {
    const input = `
<workflow id="test">
  <state id="first">
    <llm prompt="First state" />
  </state>
  <state id="last">
    <llm prompt="Last state" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find the last state
    const lastState = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "last"
    );
    expect(lastState).not.toBeUndefined();
    expect(lastState?.attributes?.id).toBe("last");

    console.log(workflow.children?.map((c) => c.attributes?.id));

    // Expect a transition to final state
    const finalState = workflow.children?.find(
      (child) => child.type === "element" && child.tag === "final"
    );
    expect(finalState).not.toBeUndefined();
    expect(finalState?.attributes?.id).toBe("final");

    // Verify there is a transition from the last state
    const transitions = lastState?.children?.filter(
      (child) => child.type === "element" && child.tag === "transition"
    );
    expect(transitions?.length).toBeGreaterThan(0);

    // Check if at least one transition targets the final element
    const hasTransitionToFinal = transitions?.some(
      (t) => t.attributes?.target === finalState?.attributes?.id
    );
    expect(hasTransitionToFinal).toBe(true);
  });

  // Test 4: Nested state with next sibling should transition to that sibling
  it("should add transition to next sibling for nested states", async () => {
    const input = `
<workflow id="test">
  <state id="parent">
    <state id="nested1">
      <llm prompt="Nested 1" />
    </state>
    <state id="nested2">
      <llm prompt="Nested 2" />
    </state>
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find the parent state
    const parentState = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "parent"
    );
    expect(parentState).not.toBeUndefined();

    // Find the first nested state
    const nested1 = parentState?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "nested1"
    );
    expect(nested1).not.toBeUndefined();

    // Check for transition to nested2
    const transition = nested1?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "transition" &&
        child.attributes?.target === "nested2"
    );
    expect(transition).not.toBeUndefined();
  });

  // Test 5: Nested state without next sibling should transition to parent's next sibling or final
  it("should add transition to parent's next sibling for last nested state", async () => {
    const input = `
<workflow id="test">
  <state id="parent1">
    <state id="nested">
      <llm prompt="Nested state" />
    </state>
  </state>
  <state id="parent2">
    <llm prompt="Parent 2" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find parent1 state
    const parent1 = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "parent1"
    );
    expect(parent1).not.toBeUndefined();

    // Find nested state
    const nested = parent1?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "nested"
    );
    expect(nested).not.toBeUndefined();

    // Check for transition to parent2
    const transition = nested?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "transition" &&
        child.attributes?.target === "parent2"
    );
    expect(transition).not.toBeUndefined();
  });

  // Test 6: Deeply nested state transitions correctly through hierarchy
  it("should find the nearest available transition target in the hierarchy", async () => {
    const input = `
<workflow id="test">
  <state id="grandparent">
    <state id="parent">
      <state id="child">
        <llm prompt="Deeply nested" />
      </state>
    </state>
  </state>
  <state id="next">
    <llm prompt="Next state" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Navigate to the deeply nested child state
    const grandparent = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "grandparent"
    );
    expect(grandparent).not.toBeUndefined();

    const parent = grandparent?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "parent"
    );
    expect(parent).not.toBeUndefined();

    const child = parent?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "child"
    );
    expect(child).not.toBeUndefined();

    // The child should have a transition that ultimately targets 'next'
    const transition = child?.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "transition" &&
        child.attributes?.target === "next"
    );
    expect(transition).not.toBeUndefined();
  });

  // Test 7: States that already have conditionless transitions should not be modified
  it("should not add transitions to states that already have conditionless transitions", async () => {
    const input = `
<workflow id="test">
  <state id="state1">
    <llm prompt="State 1" />
    <transition target="custom" />
  </state>
  <state id="state2">
    <llm prompt="State 2" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find state1
    const state1 = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "state1"
    );
    expect(state1).not.toBeUndefined();

    // Check that there's exactly one transition
    const transitions = state1?.children?.filter(
      (child) => child.type === "element" && child.tag === "transition"
    );
    expect(transitions).toBeArrayOfSize(1);

    // And it should be the original one pointing to "custom"
    expect(transitions?.[0].attributes?.target).toBe("custom");
  });

  // Test 8: States with conditional transitions only should still get conditionless transitions
  it("should add conditionless transitions even if conditional transitions exist", async () => {
    const input = `
<workflow id="test">
  <state id="state1">
    <llm prompt="State 1" />
    <transition target="special" cond="data.special === true" />
  </state>
  <state id="state2">
    <llm prompt="State 2" />
  </state>
</workflow>
    `;

    const result = await parseMDXToAIML(input);
    const workflow = result.nodes[0];

    // Find state1
    const state1 = workflow.children?.find(
      (child) =>
        child.type === "element" &&
        child.tag === "state" &&
        child.attributes?.id === "state1"
    );
    expect(state1).not.toBeUndefined();

    // Check all transitions
    const transitions = state1?.children?.filter(
      (child) => child.type === "element" && child.tag === "transition"
    );
    expect(transitions?.length).toBeGreaterThan(1);

    // There should be one conditional transition and one added conditionless transition
    const conditionalTransition = transitions?.find(
      (t) => t.attributes?.cond === "data.special === true"
    );
    expect(conditionalTransition).not.toBeUndefined();
    expect(conditionalTransition?.attributes?.target).toBe("special");

    const conditionlessTransition = transitions?.find(
      (t) => !t.attributes?.cond
    );
    expect(conditionlessTransition).not.toBeUndefined();
    expect(conditionlessTransition?.attributes?.target).toBe("state2");
  });
});
