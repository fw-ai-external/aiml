import { v4 as uuidv4 } from "uuid";
import type {
  StepValue as StepValueInterface,
  StepValueResult,
  StepValueResultType,
  StepValueChunk,
} from "@fireworks/types";
import { ReplayableAsyncIterableStream, StreamState } from "./utils/streams";
import { RunStepError } from "./errors";
import type { ErrorResult, JSONObject, OpenAIToolCall } from "@fireworks/types";
import { ErrorCode } from "./utils/errorCodes";

export type StepGenerationStats = {
  cached?: boolean;
  cost?: number;
  error?: string;
  logProbs?: number[];
  metadata?: {
    redteamFinalPrompt?: string;
    [key: string]: unknown;
  };
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

/**
 * The StepValue is the input and output type of every run step, and the input into transition requirements.
 * It transforms JS primitives into the same format as streamed values.
 */
export class StepValue<Value extends StepValueResult = StepValueResult>
  implements StepValueInterface<Value>
{
  public readonly id: string;
  private _runstepUUID: string | null = null;

  // triggered once receive() or value() is called
  private _error?: Error;
  private _stats: StepGenerationStats | null = null;
  private _inputValue: StepValueResult | undefined;
  private readonly _inputStream:
    | ReplayableAsyncIterableStream<StepValueChunk>
    | undefined;

  private readonly inputKind: "stream" | "value";
  private _streamRawCompletedValue?: StepValueResult;
  private _streamPartialValue: Partial<StepValueResult> = {};
  private get finalValue(): StepValueResult | undefined {
    return this._inputValue || this._streamRawCompletedValue;
  }

  constructor(
    inputValue?: ReplayableAsyncIterableStream<StepValueChunk> | StepValueResult
  ) {
    this.id = uuidv4();
    // Default... a stream input
    if (inputValue instanceof ReplayableAsyncIterableStream) {
      this._inputStream = inputValue;
      this.inputKind = "stream";

      this._getValueFromStream().catch((e) => {
        this._error = e;
      });
    } else if (
      inputValue instanceof ReadableStream ||
      inputValue instanceof TransformStream ||
      (inputValue &&
        typeof inputValue === "object" &&
        Symbol.asyncIterator in inputValue)
    ) {
      this.inputKind = "stream";
      this._inputStream = new ReplayableAsyncIterableStream(
        inputValue as AsyncIterable<StepValueChunk>
      );

      this._getValueFromStream().catch((e) => {
        this._error = e;
      });
    } else {
      this._inputValue = this.ensureValueIsValid(inputValue as StepValueResult);
      this.inputKind = "value";
    }
  }

  public async type(): Promise<StepValueResultType> {
    switch (this.inputKind) {
      case "value":
        await this.waitForValue();

        if (!this.finalValue) {
          return "error";
        }

        if (this._error) {
          return "error";
        }

        const value = this.finalValue;

        // Special case for plain objects
        if ("object" in value && value.object) {
          return "object";
        }

        if ("text" in value && value.text) {
          return "text";
        }

        if (
          "toolCalls" in value &&
          value.toolCalls &&
          Array.isArray(value.toolCalls)
        ) {
          return "toolCalls";
        }

        if ("toolResults" in value && value.toolResults) {
          return "toolResults";
        }

        if ("items" in value && value.items && Array.isArray(value.items)) {
          return "items";
        }

        return "error";

      case "stream":
        if (this._error) {
          return "error";
        }

        while (
          (this._inputStream?.buffer.length || 0) < 3 &&
          this._inputStream?.state !== StreamState.ERROR &&
          this._inputStream?.state !== StreamState.FINISHED
        ) {
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        const buffer = this._inputStream?.buffer || [];

        // Check for tool calls
        if (
          buffer.some((chunk) => {
            if ("type" in chunk) {
              return (
                chunk.type === "tool-call" || chunk.type === "tool-call-delta"
              );
            }
            return false;
          })
        ) {
          return "toolCalls";
        }

        // Check for object
        if (
          buffer.some((chunk) => {
            if ("type" in chunk) {
              return chunk.type === "object";
            }
            return false;
          })
        ) {
          return "object";
        }

        // Check for text
        if (
          buffer.some((chunk) => {
            if ("type" in chunk) {
              return chunk.type === "text-delta";
            }
            return false;
          })
        ) {
          return "text";
        }

        return "error";
    }
  }

  private ensureValueIsValid(input: any): StepValueResult {
    // Handle primitive string input
    if (typeof input === "string") {
      return {
        text: input,
        warnings: undefined,
        logprobs: undefined,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: "stop",
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        toolResults: [],
      };
    }

    // Handle object with text property
    if (
      typeof input === "object" &&
      input !== null &&
      "text" in input &&
      typeof input.text === "string"
    ) {
      return {
        text: input.text,
        warnings: undefined,
        logprobs: undefined,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: "stop",
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
        toolResults: [],
        ...input,
      };
    }

    // Handle object with object property
    if (typeof input === "object" && input !== null && "object" in input) {
      return input;
    }

    // Handle tool call
    if (
      typeof input === "object" &&
      input !== null &&
      (input.type === "tool-call" || (input.toolCallId && input.toolName))
    ) {
      // Convert to toolCalls array format
      if (input.toolCallId && input.toolName) {
        return {
          toolCalls: [input],
          text: "", // Required by StepValueResult type
          toolResults: [], // Required by StepValueResult type
          warnings: undefined,
          logprobs: undefined,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "stop",
          reasoning: undefined,
          reasoningDetails: [],
          sources: [],
        };
      }
      return input;
    }

    // Handle tool calls array
    if (
      typeof input === "object" &&
      input !== null &&
      "toolCalls" in input &&
      Array.isArray(input.toolCalls)
    ) {
      return input;
    }

    // Handle plain object (no type field)
    if (typeof input === "object" && input !== null) {
      if (!("type" in input)) {
        return {
          object: input,
          warnings: undefined,
          logprobs: undefined,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "stop",
          reasoning: undefined,
          reasoningDetails: [],
          sources: [],
          toolResults: [],
          // Add an empty text field to avoid the type system defaulting to toolResults
          text: "",
        };
      }
      return input;
    }

    throw new RunStepError(
      `StepValue is not correctly initializing with the input value ${JSON.stringify(
        input
      )}`
    );
  }

  public get stepUUID(): string | null {
    return this._runstepUUID || null;
  }

  public set stepUUID(id: string) {
    if (!!this._runstepUUID && this._runstepUUID !== id) {
      throw Error(`runStepUUID is already set to ${this._runstepUUID}`);
    }
    this._runstepUUID = id;
  }

  private async _getValueFromStream(): Promise<void> {
    if (!this._inputStream) return;

    const eventChunks: StepValueChunk[] = [];
    let hasReceivedFinalValue = false;

    // These are to parse Vercel AI SDK output
    for await (const eventChunk of this._inputStream) {
      eventChunks.push(eventChunk);

      // Handle text-delta chunks
      if (eventChunk.type === "text-delta" && "textDelta" in eventChunk) {
        this._streamPartialValue = {
          ...this._streamPartialValue,
          text: (this._streamPartialValue?.text || "") + eventChunk.textDelta,
        } as Partial<StepValueResult>;

        // If we have accumulated text, consider it a valid final value
        if ((this._streamPartialValue.text || "").length > 0) {
          hasReceivedFinalValue = true;
        }
      }

      // Handle tool-call chunks
      if (eventChunk.type === "tool-call") {
        hasReceivedFinalValue = true;
        this._streamPartialValue = {
          ...this._streamPartialValue,
          toolCalls: [
            ...(this._streamPartialValue?.toolCalls || []),
            eventChunk,
          ],
        } as Partial<StepValueResult>;
        continue;
      }

      // Handle object chunks
      if (eventChunk.type === "object" && "object" in eventChunk) {
        hasReceivedFinalValue = true;
        this._streamPartialValue = {
          ...this._streamPartialValue,
          object: eventChunk.object,
        } as Partial<StepValueResult>;
        continue;
      }

      // Handle error chunks
      if (eventChunk.type === "error" && "error" in eventChunk) {
        this._error = new Error(String(eventChunk.error));
        return; // Exit early on error
      }

      // Handle step-complete chunks
      if (eventChunk.type === "step-finish" || eventChunk.type === "finish") {
        console.log("step-finish", eventChunks);
        // Check if we have any valid content in the partial value
        const hasValidContent =
          hasReceivedFinalValue ||
          (this._streamPartialValue.text &&
            this._streamPartialValue.text.length > 0) ||
          (this._streamPartialValue.toolCalls &&
            this._streamPartialValue.toolCalls.length > 0) ||
          this._streamPartialValue.object !== undefined;

        if (hasValidContent) {
          this._streamRawCompletedValue = {
            ...this._streamPartialValue,
          } as StepValueResult;
        } else {
          // If we received a finish event but no final value, set an error
          this._error = new Error(
            "Error during generation, final delta(s) were never sent from the model"
          );
        }

        // Initialize stats and token usage if needed
        if (!this._stats?.tokenUsage) {
          if (this._stats) {
            this._stats.tokenUsage = {
              completionTokens: 0,
              promptTokens: 0,
              totalTokens: 0,
            };
          } else {
            this._stats = {
              tokenUsage: {
                completionTokens: 0,
                promptTokens: 0,
                totalTokens: 0,
              },
            };
          }
        }

        // Update token usage if available in the chunk
        if ("usage" in eventChunk && eventChunk.usage) {
          const usage = eventChunk.usage as {
            completionTokens?: number;
            promptTokens?: number;
            totalTokens?: number;
          };

          if (this._stats && this._stats.tokenUsage) {
            this._stats.tokenUsage.completionTokens +=
              usage.completionTokens || 0;
            this._stats.tokenUsage.promptTokens += usage.promptTokens || 0;
            this._stats.tokenUsage.totalTokens += usage.totalTokens || 0;
          }
        }
      }
    }
  }

  get streamed() {
    return !!this._inputStream;
  }

  get valueReady() {
    return !!(this._error instanceof Error || this.finalValue);
  }

  public async waitForValue() {
    await this.waitForInputs();

    while (!this.valueReady) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
  }

  private async waitForInputs() {
    while (
      !this._inputValue &&
      !this._error &&
      !this._streamRawCompletedValue
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    return true;
  }

  public onValue<T extends StepValueResult, E extends Error | undefined>(
    callback: (
      error: E,
      value: E extends Error ? undefined : T,
      runStepUUID: string | null
    ) => void
  ) {
    this.waitForValue().then(() => {
      callback(
        this._error as E,
        (this._streamRawCompletedValue || this._inputValue) as E extends Error
          ? undefined
          : T,
        this.stepUUID
      );
    });
  }

  public get stats(): StepGenerationStats | null {
    return this._stats;
  }

  public set stats(stats: StepGenerationStats) {
    this._stats = stats;
  }

  public async value(): Promise<Value | ErrorResult> {
    await this.waitForValue();
    if (this._error) {
      return {
        type: "error",
        error: this._error.message,
        code: ErrorCode.SERVER_ERROR,
      };
    }

    if (!this._streamRawCompletedValue && !this._inputValue) {
      return {
        type: "error",
        error: "No value found for the output",
        code: ErrorCode.SERVER_ERROR,
      };
    }

    const rawValue = this._streamRawCompletedValue || this._inputValue;
    if (!rawValue) {
      throw new RunStepError("No value found for the output");
    }
    return (this.finalValue as Value) || (rawValue as Value);
  }

  public async simpleValue(): Promise<
    string | JSONObject | OpenAIToolCall[] | null
  > {
    await this.waitForValue();
    if (this._error) {
      return {
        error: this._error.message,
      };
    }

    const value = this.finalValue;
    if (!value) return null;

    // Handle text content
    if ("text" in value && value.text) {
      return value.text;
    }

    // Handle object content
    if ("object" in value && value.object) {
      return value.object as JSONObject;
    }

    // Handle tool calls
    if (
      "toolCalls" in value &&
      value.toolCalls &&
      Array.isArray(value.toolCalls)
    ) {
      // Convert to OpenAIToolCall format for tests
      return value.toolCalls.map((toolCall) => ({
        id: toolCall.toolCallId,
        type: "function",
        function: {
          name: toolCall.toolName,
          arguments: JSON.stringify(toolCall.args),
        },
      }));
    }

    return null;
  }

  public async valueAsText(): Promise<string | null> {
    await this.waitForValue();

    if (this._error) {
      return JSON.stringify({
        type: "error",
        error: this._error.message,
        code: ErrorCode.SERVER_ERROR,
      });
    }

    const value = this.finalValue;
    if (!value) return null;

    // Handle text content
    if ("text" in value && value.text) {
      return value.text;
    }

    // Handle object content
    if ("object" in value && value.object) {
      return JSON.stringify(value.object);
    }

    // Handle tool calls - special format for tests
    if (
      "toolCalls" in value &&
      value.toolCalls &&
      Array.isArray(value.toolCalls)
    ) {
      // Convert to OpenAI format for tests
      const openAIFormat = value.toolCalls.map((toolCall) => ({
        id: toolCall.toolCallId,
        name: toolCall.toolName,
        args: toolCall.args,
      }));
      return JSON.stringify(openAIFormat);
    }

    return JSON.stringify(value);
  }

  public async text(): Promise<string | null> {
    await this.waitForValue();

    const value = this.finalValue;
    if (!value) return null;

    if ("text" in value && value.text) {
      return value.text;
    }

    return null;
  }

  public async object(): Promise<JSONObject | null> {
    await this.waitForValue();

    const value = this.finalValue;
    if (!value || !("object" in value) || !value.object) {
      return null;
    }

    return value.object as JSONObject;
  }

  public async toolCalls(): Promise<StepValueResult["toolCalls"]> {
    await this.waitForValue();

    const value = this.finalValue;
    if (!value) return undefined;

    // Handle direct toolCalls property
    if (
      "toolCalls" in value &&
      value.toolCalls &&
      Array.isArray(value.toolCalls)
    ) {
      return value.toolCalls;
    }

    return undefined;
  }

  public async toolResults(): Promise<StepValueResult["toolResults"]> {
    await this.waitForValue();

    const value = this.finalValue;
    if (!value) return undefined;

    // Handle direct toolResults property
    if ("toolResults" in value && value.toolResults) {
      return value.toolResults;
    }

    return undefined;
  }

  public async stream(): Promise<ReadableStream<Uint8Array>> {
    const textEncoder = new TextEncoder();

    return new ReadableStream({
      start: async (controller) => {
        for await (const chunk of await this.streamIterator()) {
          controller.enqueue(
            textEncoder.encode(`[data] ${JSON.stringify(chunk)}`)
          );
        }
        controller.enqueue(textEncoder.encode("[done]"));
        controller.close();
      },
    });
  }

  public async error(): Promise<ErrorResult | null> {
    await this.waitForValue();
    if (this._error) {
      return {
        type: "error",
        error: this._error.message,
        code: ErrorCode.SERVER_ERROR,
      };
    }

    const value = this.finalValue;
    if (value && "type" in value && value.type === "error") {
      return value as ErrorResult;
    }

    return null;
  }

  public async *streamIterator(): AsyncIterableIterator<StepValueChunk> {
    if (this._error) {
      yield {
        type: "error",
        error: this._error.message,
        code: ErrorCode.SERVER_ERROR,
      } as unknown as StepValueChunk;
      return;
    }

    if (this._inputValue) {
      // For text values, convert to text chunks
      const value = this.finalValue;
      if (value && "text" in value && value.text) {
        const text = value.text;

        if (typeof text === "string") {
          yield {
            type: "text-delta",
            textDelta: text,
          } as StepValueChunk;
          return;
        }
      }

      // For object values, convert to object chunks
      if (value && "object" in value && value.object) {
        yield {
          type: "object",
          // @ts-expect-error - TODO: fix this
          object: value.object,
        };
        return;
      }

      // For tool call values, convert to tool-call chunks
      if (
        value &&
        "toolCalls" in value &&
        value.toolCalls &&
        Array.isArray(value.toolCalls) &&
        value.toolCalls.length > 0
      ) {
        const toolCall = value.toolCalls[0];
        return yield toolCall;
      }

      // For other values, just yield as is
      yield this.finalValue as StepValueChunk;
      return;
    }

    // Handle stream
    for await (const event of this._inputStream!) {
      if (this._error) {
        yield {
          type: "error",
          error: (this._error as Error).message,
          code: ErrorCode.SERVER_ERROR,
        } as StepValueChunk;
        return;
      }
      console.log("event", event);
      yield event;
    }
  }

  toJSON() {
    return (
      this._inputValue ??
      this._streamRawCompletedValue ??
      "...streaming so can not toJSON the value yet..."
    );
  }

  toString() {
    return this.toJSON().toString();
  }
}
