import { describe, expect, it } from "bun:test";
import type { SerializedBaseElement } from "@aiml/shared";
import { validateConfig } from "./validateConfig";

describe("validateConfig", () => {
  it("should validate the config", () => {
    const config: SerializedBaseElement = {
      type: "element",
      key: "parent" as any,
      tag: "scxml",
      role: "state",
      attributes: {},
      children: [],
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
    };
    expect(validateConfig(config as any)).toEqual({
      errors: [],
      config: config as any,
    });
  });
});
