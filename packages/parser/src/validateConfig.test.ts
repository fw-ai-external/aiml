import { describe, expect, it } from "bun:test";
import { validateConfig } from "./validateConfig";
import { AIMLNode } from "@fireworks/types";

describe("validateConfig", () => {
  it("should validate the config", () => {
    const config: AIMLNode = {
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
