import { healXML } from "./xml";
import { describe, expect, test } from "bun:test";
import { xml2js } from "xml-js";

describe("healXML", () => {
  const assertParsable = (xml: string) => {
    expect(() => xml2js(xml)).not.toThrow();
  };

  test("handles empty input", () => {
    expect(healXML("")).toBe("");
    expect(healXML(" ")).toBe("");
  });

  test("heals unclosed tags", () => {
    const healed1 = healXML("<state");
    expect(healed1).toBe("<state></state>");
    assertParsable(healed1);

    const healed2 = healXML('<state id="test"');
    expect(healed2).toBe('<state id="test"></state>');
    assertParsable(healed2);
  });

  test("heals missing closing tags", () => {
    const healed1 = healXML("<state><transition");
    expect(healed1).toBe("<state><transition></transition></state>");
    assertParsable(healed1);

    const healed2 = healXML("<state>content");
    expect(healed2).toBe("<state>content</state>");
    assertParsable(healed2);
  });

  test("preserves properly formed XML", () => {
    const xml = '<state id="test"><transition target="next"/></state>';
    const healed = healXML(xml);
    expect(healed).toBe(xml);
    assertParsable(healed);
  });

  test("handles attributes with quotes", () => {
    const healed1 = healXML("<state id='test'");
    expect(healed1).toBe("<state id='test'></state>");
    assertParsable(healed1);

    const healed2 = healXML('<state id="test');
    expect(healed2).toBe('<state id="test"></state>');
    assertParsable(healed2);
  });

  test("escapes special characters in content", () => {
    const healed1 = healXML("text < > &");
    expect(healed1).toBe("");
    assertParsable(healed1);

    const healed2 = healXML("<state>a < b</state>");
    expect(healed2).toBe("<state>a &lt; b</state>");
    assertParsable(healed2);
  });

  test("handles nested tags", () => {
    const healed = healXML("<state><parallel><state>");
    expect(healed).toBe("<state><parallel><state></state></parallel></state>");
    assertParsable(healed);
  });

  test("handles self-closing tags", () => {
    const healed = healXML("<state><transition/>");
    expect(healed).toBe("<state><transition/></state>");
    assertParsable(healed);
  });

  test("handles multiple root elements", () => {
    const healed = healXML("<state></state><state>");
    expect(healed).toBe("<state></state><state></state>");
    assertParsable(healed);
  });

  test("ignores text before first element and after last element", () => {
    const healed1 = healXML("some text <state>content</state>");
    expect(healed1).toBe("<state>content</state>");
    assertParsable(healed1);

    const healed2 = healXML("<state>content</state> trailing text");
    expect(healed2).toBe("<state>content</state>");
    assertParsable(healed2);

    const healed3 = healXML("prefix text <state>content</state> suffix text");
    expect(healed3).toBe("<state>content</state>");
    assertParsable(healed3);

    const healed4 = healXML("text without xml");
    expect(healed4).toBe("");
  });

  test("handles newlines in XML", () => {
    const healed1 = healXML(`
      <state>
        <transition target="next"/>
      </state>
    `);
    expect(healed1).toBe(`<state>
        <transition target="next"/>
      </state>`);
    assertParsable(healed1);

    const healed2 = healXML(
      "text before\n<state>\ncontent\n</state>\ntext after"
    );
    expect(healed2).toBe("<state>\ncontent\n</state>");
    assertParsable(healed2);

    const healed3 = healXML(`<state
      id="test"
      target="next"
    >`);
    expect(healed3).toBe(`<state
      id="test"
      target="next"
    ></state>`);
    assertParsable(healed3);

    const healed4 = healXML(`<state><parallel>
      <state>nested content</state>
    </parallel>`);
    expect(healed4).toBe(`<state><parallel>
      <state>nested content</state>
    </parallel></state>`);
    assertParsable(healed4);
  });
});
