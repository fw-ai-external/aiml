import type {
  StepValueChunk,
  StepValueResult,
  StepValueResultType,
} from "@aiml/shared";
import {
  ReplayableAsyncIterableStream,
  stepValueResultToReplayableStream,
} from "@aiml/shared";
import type { ErrorResult, JSONObject, OpenAIToolCall } from "@aiml/shared";
import { ErrorCode } from "@aiml/shared";
import { v4 as uuidv4 } from "uuid";

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
export class StepValue<Value extends StepValueResult = StepValueResult> {
  public readonly id: string;
  private _runstepUUID: string | null = null;

  // triggered once receive() or value() is called
  private _error?: Error;
  private _stats: StepGenerationStats | null = null;
  private readonly _inputStream:
    | ReplayableAsyncIterableStream<StepValueChunk>
    | undefined;

  private _finalValue?: StepValueResult;

  private set finalValue(value: StepValueResult) {
    this._finalValue = this.cleanValue(value);
  }

  private get finalValue(): StepValueResult | undefined {
    return this._finalValue;
  }

  private _streamPartialValue: Partial<StepValueResult> = {};

  constructor(
    inputValue:
      | ReplayableAsyncIterableStream<StepValueChunk>
      | StepValueResult
      | ReadableStream<StepValueChunk>
      | string
      | JSONObject
      | Array<any>
  ) {
    this.id = uuidv4();

    // Convert primitive input types to StepValueResult format
    if (typeof inputValue === "string") {
      this.finalValue = {
        text: inputValue,
      } as StepValueResult;
      this._inputStream = stepValueResultToReplayableStream(this.finalValue);
    } else if (Array.isArray(inputValue)) {
      this.finalValue = {
        items: inputValue,
      } as StepValueResult;
      this._inputStream = stepValueResultToReplayableStream(this.finalValue);
    } else if (typeof inputValue === "object" && inputValue !== null) {
      if (inputValue instanceof ReplayableAsyncIterableStream) {
        // already a ReplayableAsyncIterableStream
        this._inputStream = inputValue;
      } else if (Symbol.asyncIterator in inputValue) {
        // value is a stream, just not a ReplayableAsyncIterableStream
        // TODO: the chunks need to be verified to be valid
        this._inputStream = new ReplayableAsyncIterableStream(
          inputValue as AsyncIterable<StepValueChunk>
        );
      } else if (inputValue instanceof ReadableStream) {
        // Handle ReadableStream
        const asyncIterable = {
          [Symbol.asyncIterator]: async function* () {
            const reader = inputValue.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield value as StepValueChunk;
              }
            } finally {
              reader.releaseLock();
            }
          },
        };
        this._inputStream = new ReplayableAsyncIterableStream(asyncIterable);
      } else {
        // Check if the object matches StepValueResult structure
        if (this.isStepValueResult(inputValue)) {
          this.finalValue = this.cleanValue(inputValue as StepValueResult);
        } else if ("toolCalls" in inputValue) {
          // Handle objects with toolCalls (possible partial match)
          this.finalValue = {
            toolCalls: inputValue.toolCalls,
          } as StepValueResult;
        } else if ("toolResults" in inputValue) {
          // Handle objects with toolResults (possible partial match)
          this.finalValue = {
            toolResults: inputValue.toolResults,
          } as StepValueResult;
        } else if (
          "text" in inputValue &&
          typeof inputValue.text === "string"
        ) {
          // Handle objects with text (possible partial match)
          this.finalValue = {
            text: inputValue.text,
          } as StepValueResult;
        } else if ("object" in inputValue) {
          // Handle objects with object property
          this.finalValue = {
            object: inputValue.object,
          } as StepValueResult;
        } else {
          // For any other plain object, wrap it as an object
          this.finalValue = {
            object: inputValue,
          } as StepValueResult;
        }

        this._inputStream = stepValueResultToReplayableStream(this.finalValue);
      }
    } else {
      // Handle null, undefined, or other unexpected types with an error
      this._error = new Error("Invalid input type provided to StepValue");
      this.finalValue = {
        type: "error",
        error: "Invalid input type provided to StepValue",
        code: ErrorCode.SERVER_ERROR,
      } as StepValueResult;
      this._inputStream = stepValueResultToReplayableStream(this.finalValue);
    }

    this._getValueFromStream().catch((err) => {
      this._error = err;
      this.finalValue = {
        type: "error",
        error: err.message,
        code: ErrorCode.SERVER_ERROR,
      } as StepValueResult;
    });
  }

  private cleanChunk(chunk: StepValueChunk): StepValueChunk {
    // Remove warnings key from chunk if present
    const { warnings, providerMetadata, response, ...restWithExperimental } =
      chunk as any;
    const rest = Object.fromEntries(
      Object.entries(restWithExperimental).filter(
        ([key]) => !key.startsWith("experimental_")
      )
    );
    return rest as StepValueChunk;
  }

  private cleanValue(value: StepValueResult): StepValueResult {
    const {
      isContinued,
      request,
      response,
      providerMetadata,
      stepType,
      ...restWithExperimental
    } = value as any;

    const rest = Object.fromEntries(
      Object.entries(restWithExperimental).filter(
        ([key]) => !key.startsWith("experimental_")
      )
    );
    return rest as StepValueResult;
  }

  /**
   * Helper method to check if an object conforms to StepValueResult structure
   */
  private isStepValueResult(obj: any): boolean {
    // Check for common properties in StepValueResult
    return (
      obj &&
      typeof obj === "object" &&
      (("text" in obj && typeof obj.text === "string") ||
        "object" in obj ||
        ("toolCalls" in obj && Array.isArray(obj.toolCalls)) ||
        "toolResults" in obj ||
        ("items" in obj && Array.isArray(obj.items)) ||
        (obj.type === "error" && "error" in obj))
    );
  }

  public async type(): Promise<StepValueResultType> {
    if (this._error) {
      return "error";
    }
    if (this.finalValue) {
      // Special case for plain objects
      if ("object" in this.finalValue && this.finalValue.object) {
        return "object";
      }

      if ("text" in this.finalValue && this.finalValue.text) {
        return "text";
      }

      if (
        "toolCalls" in this.finalValue &&
        this.finalValue.toolCalls &&
        Array.isArray(this.finalValue.toolCalls)
      ) {
        return "toolCalls";
      }

      if ("toolResults" in this.finalValue && this.finalValue.toolResults) {
        return "toolResults";
      }

      if (
        "items" in this.finalValue &&
        this.finalValue.items &&
        Array.isArray(this.finalValue.items)
      ) {
        return "items";
      }

      return "error";
    }

    const buffer = await this._inputStream?.buffer(3);

    if (this._error) {
      return "error";
    }

    if (!buffer) {
      return "error";
    }

    // Check for tool calls
    if (
      buffer.some((chunk) => {
        if ("type" in chunk) {
          return chunk.type === "tool-call" || chunk.type === "tool-call-delta";
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
        // Check if we have any valid content in the partial value
        const hasValidContent =
          hasReceivedFinalValue ||
          (this._streamPartialValue.text &&
            this._streamPartialValue.text.length > 0) ||
          (this._streamPartialValue.toolCalls &&
            this._streamPartialValue.toolCalls.length > 0) ||
          this._streamPartialValue.object !== undefined;

        if (hasValidContent) {
          this.finalValue = {
            ...this._streamPartialValue,
          } as StepValueResult;
        } else {
          // If we received a finish event but no final value, set an error
          this._error = new Error(
            `Error during generation, final delta(s) were never sent from the model ${JSON.stringify(eventChunk)}`
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

  get valueReady() {
    return !!(this._error || this.finalValue);
  }

  public async waitForValue() {
    await this.waitForInputs();
    while (!this.valueReady) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
  }

  private async waitForInputs() {
    while (!this._error && !this.finalValue) {
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
        this.finalValue as E extends Error ? undefined : T,
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
    await this.waitForValue().catch((err) => {
      this._error = err;
    });
    if (this._error) {
      return {
        type: "error",
        error: this._error.message,
        code: ErrorCode.SERVER_ERROR,
      };
    }

    if (!this.finalValue) {
      return {
        type: "error",
        error: "No value found for the output",
        code: ErrorCode.SERVER_ERROR,
      };
    }

    return this.finalValue as Value;
  }

  public async simpleValue(): Promise<
    string | JSONObject | OpenAIToolCall[] | any[] | null
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

    // Handle array/items content
    if ("items" in value && value.items && Array.isArray(value.items)) {
      return value.items;
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
      yield this.cleanChunk(event);
    }
    return;
  }

  toJSON() {
    return this.finalValue ?? "...streaming so can not toJSON the value yet...";
  }

  toString() {
    return this.toJSON().toString();
  }
}
