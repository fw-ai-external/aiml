import { describe, expect, it } from "bun:test";
import {
  SimulatedClock,
  type SnapshotFrom,
  createActor,
  waitFor,
} from "xstate";
import { toMachine } from "./scxml";

async function runActor(
  tree: string,
  subscribe: (state: SnapshotFrom<any>) => void
) {
  const machine = toMachine(tree);
  // console.log('machine', machine);
  const actor = createActor(machine, {
    logger: () => void 0,
    clock: new SimulatedClock(),
  });
  actor.subscribe(subscribe);
  actor.start();
  const snapshot = await waitFor(
    actor,
    (state) => {
      //console.log('inspect state', Object.keys(state), state.output);
      return state.value === "finished";
    },
    {
      timeout: 3_000, // 3 seconds
    }
  );

  return { snapshot, actor };
}

describe("scxml", () => {
  it("test multiple", async () => {
    const tree = `
      <scxml name="test" initial="s1">
        <datamodel>
          <data id="a" />
          <data id="b" />
        </datamodel>
        <state id="s1">
        <onentry>
            <assign location="a" expr="10" />
        </onentry>
        <transition target="finished" />
        <onexit>
          <if cond="a == 10">
            <assign location="b" expr="20" />
          </if>
        </onexit>
        </state>
        <final id="finished" />
      </scxml>
    `;

    const { snapshot } = await runActor(tree, (state) => {});
    expect(snapshot.value).toBe("finished");
  });

  it("test multiple eventless transitions", async () => {
    const tree = `
      <scxml name="test" initial="s1">
        <datamodel>
          <data id="a" />
        </datamodel>
        <state id="s1">
          <onentry>
            <assign location="a" expr="10" />
          </onentry>
          <transition cond="a == 9" target="s2" />
          <transition cond="a == 10" target="s3" />
        </state>
        <state id="s2">
          <onentry>
            <assign location="a" expr="20" />
          </onentry>
          <transition target="finished" />
        </state>
        <state id="s3">
          <onentry>
            <assign location="a" expr="30" />
          </onentry>
          <transition target="finished" />
        </state>
        <final id="finished" />
      </scxml>
    `;

    const { snapshot } = await runActor(tree, (state) => {});
    expect(snapshot.value).toBe("finished");
  });

  it("test if else", async () => {
    const tree = `
      <scxml name="test" initial="a"> 
        <datamodel>
          <data id="x" expr="12" />
          <data id="y" expr="50" />
        </datamodel>
        <state id="a">
          <onentry>
          <if cond="x === 10">
            <assign location="x" expr="20" />
            <assign location="y" expr="30" />
            <log label="x" expr="x" />
            <else />
              <assign location="x" expr="30" />
              <assign location="y" expr="40" />
            </if>
          </onentry>
          <transition target="finished" cond="x === 30" />
          <log label="x" expr="x" />
        </state>
        <final id="finished" />
      </scxml>
    `;

    const { snapshot } = await runActor(tree, (state) => {});
    expect(snapshot.value).toBe("finished");
    expect(snapshot.context.x).toBe(30);
    expect(snapshot.context.y).toBe(40);
  });
});
