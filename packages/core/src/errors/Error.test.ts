import { describe, expect, test } from "bun:test";
import { BaseError } from "./index";

describe("BaseError", () => {
  test("should have a name", () => {
    const error = new BaseError("test");
    expect(error.name).toBe("BaseError");
  });

  test("should separate internal and external messages", () => {
    const error = new BaseError("internal message");
    expect(error.message).toBe("internal message");
    expect(error.internalMessage).toBe("internal message"); // internal message
  });

  test("should render user error", () => {
    const error = new BaseError("internal message");
    expect(error.asUserError()).toBeInstanceOf(Error);
  });

  test("should log the error", () => {
    function testThrows() {
      throw new BaseError("internal message");
    }
    let succeed = false;
    try {
      testThrows();
      succeed = true;
    } catch (error) {
      expect(error).toBeInstanceOf(BaseError);
      expect((error as BaseError).internalMessage).toBe("internal message");
      expect((error as BaseError).stack).toBeDefined();
    }
    expect(succeed).toBe(false);
  });
});
