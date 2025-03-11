import { v4 as uuidv4 } from "uuid";
import type {
  RunstepOutput,
  StepValue as StepValueInterface,
} from "@fireworks/types";

/**
 * A simplified mock implementation of StepValue for use in elements package
 * This avoids the circular dependency with the runtime package
 */
export class MockStepValue<
  Value extends RunstepOutput = RunstepOutput,
  Type extends RunstepOutput["type"] = RunstepOutput["type"],
> implements StepValueInterface<Value, Type>
{
  public readonly id: string;
  public readonly runStepUUID: string | null = null;
  private _stats: any | null = null;
  private _value: RunstepOutput;

  constructor(value: RunstepOutput, stats: any | null = null) {
    this.id = uuidv4();
    this._value = value;
    this._stats = stats;
  }

  public get stats(): any | null {
    return this._stats;
  }

  public async type(): Promise<"tool-call" | "text" | "object" | "error"> {
    if (this._value.type === "text") {
      return "text";
    }
    if (["tool-call", "text", "object", "error"].includes(this._value.type)) {
      return this._value.type as any;
    }
    if (typeof this._value === "object" && this._value.type !== "error") {
      return "object";
    }
    return "error";
  }

  public async value(): Promise<Value | any> {
    return this._value as Value;
  }

  public async simpleValue(): Promise<string | any | any[] | null> {
    switch (this._value.type) {
      case "text":
        return this._value.text;
      case "object":
        return this._value.object;
      default:
        return null;
    }
  }

  public async valueAsText(): Promise<string | null> {
    switch (this._value.type) {
      case "text":
        return this._value.text;
      case "object":
        return JSON.stringify(this._value.object);
      default:
        return JSON.stringify(this._value);
    }
  }

  public async text(): Promise<string | null> {
    if (this._value.type === "text") {
      return this._value.text;
    }
    return null;
  }

  public async object(): Promise<any | null> {
    if (this._value.type === "object") {
      return this._value.object;
    }
    return null;
  }

  public async toolCalls(): Promise<any> {
    if (this._value.type === "tool-call") {
      return [this._value];
    }
    return null;
  }

  public async stream(): Promise<ReadableStream<Uint8Array>> {
    const textEncoder = new TextEncoder();
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(textEncoder.encode(JSON.stringify(this._value)));
        controller.close();
      },
    });
  }

  public async error(): Promise<any | null> {
    if (this._value.type === "error") {
      return this._value;
    }
    return null;
  }

  public async *streamIterator(): AsyncIterableIterator<any> {
    yield this._value;
  }
}
