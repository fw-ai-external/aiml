import { v4 as uuidv4 } from "uuid";
import type {
  RunstepOutput,
  StepValue as StepValueInterface,
  StepValueResult,
  StepValueResultType,
  StepValueChunk,
} from "@fireworks/types";
import { ReplayableAsyncIterableStream, StreamState } from "./utils/streams";
import { InternalError, RunStepError } from "./errors";
import type { ErrorResult, JSONObject, OpenAIToolCall } from "@fireworks/types";
import { ErrorCode } from "./utils/errorCodes";

export type StepGenerationStats = {
  cached?: boolean;
  cost?: number;
  error?: string;
  logProbs?: number[];
  metadata?: {
    redteamFinalPrompt?: string;
    [key: string]: any;
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
  private _inputValue: RunstepOutput | undefined;
  private readonly _inputStream:
    | ReplayableAsyncIterableStream<StepValueChunk>
    | undefined;

  private readonly inputKind: "stream" | "value";
  private _streamRawCompletedValue?: RunstepOutput;
  private get finalValue(): RunstepOutput | undefined {
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
      (inputValue as any)[Symbol.asyncIterator]
    ) {
      this.inputKind = "stream";
      this._inputStream = new ReplayableAsyncIterableStream(inputValue as any);

      // A RunStepInput or RunstepOutput value that is not a stream
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

        const value = this.finalValue as any;

        if (value.text) {
          return "text";
        }

        if (value.toolCalls && Array.isArray(value.toolCalls)) {
          return "toolCalls";
        }

        if (value.toolResults) {
          return "toolResults";
        }

        if (
          value.object ||
          (typeof value === "object" && value.type !== "error")
        ) {
          return "object";
        }

        if (value.items && Array.isArray(value.items)) {
          return "items";
        }

        return "error";

      case "stream":
        while (
          (this._inputStream?.buffer.length || 0) < 2 &&
          this._inputStream?.state !== StreamState.ERROR &&
          this._inputStream?.state !== StreamState.FINISHED
        ) {
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        const firstChunk = this._inputStream?.buffer[0];
        const secondChunk = this._inputStream?.buffer[1];

        if (
          this._inputStream?.buffer.some((chunk) => {
            return (
              (chunk as any).type === "tool-call" ||
              (chunk as any).type === "tool-call-delta"
            );
          })
        ) {
          return "toolCalls";
        }

        if ((firstChunk as any)?.type === "object") {
          return "object";
        }

        if (
          (firstChunk as any)?.type === "text" ||
          (secondChunk as any)?.type === "text"
        ) {
          return "text";
        }

        return "error";
    }
  }

  private ensureValueIsValid(input: StepValueResult): RunstepOutput {
    if (typeof input === "string") {
      return {
        type: "text",
        text: input,
        warnings: undefined,
        logprobs: undefined,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: "stop",
        reasoning: undefined,
        reasoningDetails: [],
        sources: [],
      } as unknown as RunstepOutput;
    }

    if (typeof input === "object" && input !== null) {
      if (!("type" in input)) {
        return {
          type: "object",
          object: input as any,
          raw: JSON.stringify(input),
          warnings: undefined,
          logprobs: undefined,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "stop",
          reasoning: undefined,
          reasoningDetails: [],
          sources: [],
        } as unknown as RunstepOutput;
      }

      return input as RunstepOutput;
    }

    throw new RunStepError(
      `RunStepValue is not correctly initializing with the input value ${JSON.stringify(
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

    // These are to parse Vercel AI SDK output
    for await (const chunk of this._inputStream) {
      const eventChunk = chunk as any;

      switch (eventChunk.type) {
        case "error":
          if (eventChunk.error) {
            this._error = new RunStepError(eventChunk.error);
          }
          break;
        case "tool-call":
        case "text":
        case "object":
          this._streamRawCompletedValue = eventChunk as RunstepOutput;
          break;
        case "tool-call-delta":
          // Convert to tool-call format
          this._streamRawCompletedValue = {
            ...eventChunk,
            type: "tool-call",
          } as RunstepOutput;
          break;
        case "step-complete":
          if (!this._streamRawCompletedValue) {
            throw new InternalError(
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
          if (eventChunk.usage) {
            this._stats!.tokenUsage!.completionTokens +=
              eventChunk.usage.completionTokens || 0;
            this._stats!.tokenUsage!.promptTokens +=
              eventChunk.usage.promptTokens || 0;
            this._stats!.tokenUsage!.totalTokens +=
              eventChunk.usage.totalTokens || 0;
          }
          break;
        default:
          // ignore, we only care about final values
          break;
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

  public onValue<T extends RunstepOutput, E extends Error | undefined>(
    callback: (
      error: E,
      value: E extends Error ? undefined : T,
      runStepUUID: string | null
    ) => void
  ) {
    this.waitForValue().then(() => {
      callback(
        this._error as E,
        this._streamRawCompletedValue as E extends Error ? undefined : T,
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
        error: (this._error as any).message,
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
    return (this.finalValue as Value) || rawValue;
  }

  public async simpleValue(): Promise<
    string | JSONObject | OpenAIToolCall[] | null
  > {
    await this.waitForValue();
    if (this._error) {
      return {
        error: (this._error as any).message,
      };
    }

    const value = this.finalValue as any;
    if (!value) return null;

    // Handle text content
    if (value.text) {
      return value.text;
    }

    // Handle object content
    if (value.object) {
      return value.object as JSONObject;
    }

    // Handle tool calls
    if (value.toolCalls && Array.isArray(value.toolCalls)) {
      return value.toolCalls.map((tc: any) => ({
        id: tc?.id || "unknown-id",
        type: "function",
        function: {
          name: tc?.name || "unknown-name",
          arguments:
            typeof tc?.arguments === "string"
              ? tc.arguments
              : JSON.stringify(tc?.arguments || {}),
        },
      }));
    }

    // Handle legacy tool call format
    if (value.type === "tool-call") {
      return [
        {
          id: value.toolCallId || "unknown-id",
          type: "function",
          function: {
            name: value.toolName || "unknown-name",
            arguments: JSON.stringify(value.args || {}),
          },
        },
      ];
    }

    // Handle tool results
    if (value.type === "tool-result" && value.result) {
      return value.result;
    }

    return null;
  }

  public async valueAsText(): Promise<string | null> {
    await this.waitForValue();

    if (this._error) {
      return JSON.stringify({
        type: "error",
        error: (this._error as any).message,
        code: ErrorCode.SERVER_ERROR,
      });
    }

    const value = this.finalValue as any;
    if (!value) return null;

    // Handle text content
    if (value.text) {
      return value.text;
    }

    // Handle object content
    if (value.object) {
      return JSON.stringify(value.object);
    }

    // Handle tool calls
    if (value.type === "tool-call") {
      return JSON.stringify({
        id: value.toolCallId,
        name: value.toolName,
        args: value.args,
      });
    }

    return JSON.stringify(value);
  }

  public async text(): Promise<string | null> {
    await this.waitForValue();

    const value = this.finalValue as any;
    if (!value) return null;

    if (value.text) {
      return value.text;
    }

    return null;
  }

  public async object(): Promise<JSONObject | null> {
    await this.waitForValue();

    const value = this.finalValue as any;
    if (!value || !value.object) {
      return null;
    }

    return value.object as JSONObject;
  }

  public async toolCalls(): Promise<any> {
    await this.waitForValue();

    const value = this.finalValue as any;
    if (!value) return null;

    // Handle direct toolCalls property
    if (value.toolCalls && Array.isArray(value.toolCalls)) {
      return value.toolCalls;
    }

    // Handle legacy tool-call type
    if (value.type === "tool-call" && value.toolCallId && value.toolName) {
      return [
        {
          id: value.toolCallId,
          name: value.toolName,
          arguments: value.args || {},
        },
      ];
    }

    return null;
  }

  public async toolResults(): Promise<any> {
    await this.waitForValue();

    const value = this.finalValue as any;
    if (!value) return null;

    // Handle direct toolResults property
    if (value.toolResults) {
      return value.toolResults;
    }

    // Handle legacy tool-result type
    if (value.type === "tool-result" && value.result) {
      return value.result;
    }

    return null;
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

    const value = this.finalValue as any;
    if (value && value.type === "error") {
      return value as ErrorResult;
    }

    return null;
  }

  public async *streamIterator(): AsyncIterableIterator<StepValueChunk> {
    if (this._error) {
      yield {
        type: "error",
        error: (this._error as Error).message,
        code: ErrorCode.SERVER_ERROR,
      } as unknown as StepValueChunk;
      return;
    }

    if (this._inputValue) {
      // For text values, convert to text chunks
      const value = this.finalValue as any;
      if (value && value.type === "text") {
        const text = value.text;
        if (typeof text === "string") {
          yield {
            type: "text-delta",
            textDelta: text,
          } as unknown as StepValueChunk;
          return;
        }
      }

      // For other values, just yield as is
      yield this.finalValue as unknown as StepValueChunk;
      return;
    }

    // Handle stream
    for await (const event of this._inputStream!) {
      if (this._error) {
        yield {
          type: "error",
          error: (this._error as Error).message,
          code: ErrorCode.SERVER_ERROR,
        } as unknown as StepValueChunk;
        return;
      }

      yield event;
    }
  }
}
