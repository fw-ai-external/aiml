import { describe, expect, it } from "bun:test";
import type { TagNodeDTO } from "./types";
import { validateConfig } from "./validateConfig";

describe("validateConfig", () => {
  it("should validate the config", () => {
    const config: TagNodeDTO = {
      kind: "tag",
      name: "scxml",
      scxmlType: "scxml",
      key: "parent" as any,
      attributes: {},
      nodes: [],
      parents: [],
    };
    expect(validateConfig(config as any)).toEqual({
      errors: [],
      config,
    });
  });
});
