import { describe, expect, test } from "bun:test";
import { ElementError } from "./index";

describe("ElementError", () => {
  test("should render user error", () => {
    const error = new ElementError("test", "element");
    expect(error.asUserError()).toBeInstanceOf(Error);
  });
});
