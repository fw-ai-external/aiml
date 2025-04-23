import { ErrorCode } from "@aiml/shared";
import type { ReplayableAsyncIterableStream } from "@aiml/shared";
import type {
  OpenAIChatCompletion,
  RunEvent,
  StepValueChunk,
  StepValueResult,
} from "@aiml/shared";
import type { ElementType } from "@aiml/shared";
import type { FinishReason } from "ai";
import { StepValue } from "./StepValue";
import {
  stepValueChunkToOpenAIChatCompletionChunk,
  stepValueResultToOpenAIChatCompletion,
} from "./responses/openai.chat";
import type { ExecutionGraphStep } from "@aiml/shared";

export type RunStepStream = ReplayableAsyncIterableStream<StepValueChunk>;

function isStepValue(value: unknown): value is StepValue {
  return (
    value !== null && typeof value === "object" && "streamIterator" in value
  );
}

function maybeRunStepValue(value?: StepValue): StepValue | null {
  if (!value) return null;
  return isStepValue(value) ? value : new StepValue(value);
}
export interface RunStep extends ExecutionGraphStep {
  /**
   * The duration of the node in milliseconds.
   */
  duration?: number;

  /**
   * The status of the node.
   */
  status?:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "streaming"
    | "waitingForStream";

  input: StepValue | null;

  datamodel: Record<string, any>;
  output?: StepValue | null;
}

export class RunValue {
  public uuid: string;
  private _runSteps: RunStep[] = [];
  private _finalOutput: StepValue | null = null;
  private _runStepValuesProcessed: Set<string> = new Set();
  private _generatedValues: Array<StepValue> = [];
  private _streamBuffer: Array<RunEvent> = [];

  private totalPromptTokens: number = 0;
  private totalCompletionTokens: number = 0;
  private reasoningTokens: number = 0;

  private _finished: boolean = false;

  constructor(init: { runId: string }) {
    this.uuid = init.runId;
  }

  public get finished() {
    return this._finished;
  }

  public get allValues() {
    return this._generatedValues;
  }

  public addActiveStep(step: RunStep) {
    this._runSteps.push(step);

    if (step.output) {
      const output = maybeRunStepValue(step.output);
      if (output) {
        if (step.subType === "output" || step.subType === "error") {
          this._finalOutput = output;
        }
        this._generatedValues.push(output);
      }
    }
  }

  setStepOutput(id: string, output: StepValue) {
    const thisStep = this._runSteps.find((s) => s.id === id);
    if (thisStep) {
      thisStep.output = maybeRunStepValue(output);
      if (thisStep.output) {
        if (thisStep.subType === "output" || thisStep.subType === "error") {
          this._finalOutput = thisStep.output;
        } else {
          this._generatedValues.push(thisStep.output);
        }
      }
      this.processValue(id, thisStep.elementType, output);
    } else {
      throw new Error(`Step ${id} not found, could not set output`);
    }
  }

  markStepAsFinished(id: string, output?: StepValue) {
    const thisStep = this._runSteps.find((s) => s.id === id);
    if (thisStep) {
      thisStep.status = "completed";
      if (output) {
        this.setStepOutput(id, output);
      }
    } else {
      throw new Error(`Step ${id} not found, could not mark as finished`);
    }
  }

  private async processValue(
    stepID: string,
    elementType: ElementType,
    value: StepValue
  ) {
    if ("id" in value) {
      this._runStepValuesProcessed.add(value.id);
    } else {
      this._runStepValuesProcessed.add(stepID);
    }

    // Ensure all values are streamable
    const output = maybeRunStepValue(value);
    if (!output) return;

    try {
      // Process all chunks from the stream iterator
      for await (const chunk of output.streamIterator()) {
        this._streamBuffer.push({
          step: elementType,
          uuid: stepID,
          type: chunk.type,
          runId: this.uuid,
          event: chunk,
        });
      }
    } catch (error) {
      // Handle stream iteration errors by adding an error to the buffer
      this._streamBuffer.push({
        step: elementType,
        uuid: stepID,
        type: "error",
        runId: this.uuid,
        event: {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during stream processing",
          code: ErrorCode.SERVER_ERROR,
        } as any,
      });
    }
  }

  private async waitForStateStreamsToFinish() {
    // Add timeout to ensure we don't wait forever
    const timeout = 5000; // 5 second timeout
    const startTime = Date.now();

    while (
      this._generatedValues
        .filter((value) => !value.valueReady)
        .some((value) => !value.valueReady)
    ) {
      // Check for timeout
      if (Date.now() - startTime > timeout) {
        console.warn("Timeout waiting for state streams to finish");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Ensures the values inside RunValue are final.
   * Note that even if StateMachine Actor is finished, the values inside RunValue still may not be final.
   */
  public async finalize() {
    // Set the finished state immediately
    this._finished = true;

    try {
      await Promise.race([
        this.waitForStateStreamsToFinish(),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 100);
        }),
      ]);

      const nonFinalValues = this._generatedValues.filter(
        (value) => value.id !== this._finalOutput?.id
      );

      if (nonFinalValues.length === 1) {
        const stepValue = nonFinalValues[0];
        const stats = stepValue?.stats;
        this.totalPromptTokens += stats?.tokenUsage?.promptTokens ?? 0;
        this.totalCompletionTokens += stats?.tokenUsage?.completionTokens ?? 0;
        // no reasoning tokens for a single step
      } else {
        for (const stepValue of nonFinalValues) {
          // attribute the first stepValue's prompt token that is not filtered out to this.promptTokens
          // and the last stepValue's completion tokens that is not filtered out to this.completionTokens
          const stats = stepValue?.stats;

          if (nonFinalValues.indexOf(stepValue) === 0) {
            this.totalPromptTokens += stats?.tokenUsage?.promptTokens ?? 0;
            this.reasoningTokens += stats?.tokenUsage?.completionTokens ?? 0;
          } else if (
            nonFinalValues.indexOf(stepValue) ===
            nonFinalValues.length - 1
          ) {
            this.totalCompletionTokens +=
              stats?.tokenUsage?.completionTokens ?? 0;
            this.reasoningTokens += stats?.tokenUsage?.promptTokens ?? 0;
          } else {
            this.reasoningTokens += stats?.tokenUsage?.promptTokens ?? 0;
            this.reasoningTokens += stats?.tokenUsage?.completionTokens ?? 0;
          }
        }
      }
    } catch (error) {
      console.error("Error in finalize:", error);
      // If there was an error, we still want to ensure the RunValue is marked as finished
      this._finished = true;
    }
  }

  public getTotalTokens() {
    return {
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      totalTokens: this.totalPromptTokens + this.totalCompletionTokens,
      reasoningTokens: this.reasoningTokens,
    };
  }

  // Converts each chunk into a OpenAI data stream chunk
  public async openaiChatStream(): Promise<ReadableStream<Uint8Array>> {
    return new ReadableStream({
      start: async (controller) => {
        const iterator = stepValueChunkToOpenAIChatCompletionChunk(
          await this.responseIterator()
        );
        const textEncoder = new TextEncoder();
        for await (const chunk of iterator) {
          controller.enqueue(
            textEncoder.encode(`[data] ${JSON.stringify(chunk)}\n`)
          );
        }
        controller.enqueue(textEncoder.encode("[done]"));
        controller.close();
      },
    });
  }

  public async openaiChatResponse(): Promise<OpenAIChatCompletion> {
    const finalOutput = await this.waitForFinalOutput(true);

    const value = await finalOutput.value().catch((error) => {
      return {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    });

    if (
      value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "error"
    ) {
      throw new Error("No final output available");
    }

    // Add the missing files property if not present
    let completeValue: StepValueResult;
    if ("type" in value && value.type === "error") {
      completeValue = value as StepValueResult;
    } else if (!("files" in value)) {
      completeValue = { ...value, files: [] } as StepValueResult;
    } else {
      completeValue = value as StepValueResult;
    }

    const openaiValue = stepValueResultToOpenAIChatCompletion(completeValue);
    if (!openaiValue) {
      throw new Error("No OpenAI value available");
    }
    return openaiValue;
  }

  // TODO emit this as an ai SDK data stream
  public async responseStream(): Promise<ReadableStream<Uint8Array>> {
    const textEncoder = new TextEncoder();
    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          const iterator = await this.responseIterator();
          for await (const chunk of iterator) {
            // Encode and send the chunk data
            controller.enqueue(
              textEncoder.encode(`[data] ${JSON.stringify(chunk)}`)
            );
          }
        } catch (error) {
          // If there's an error, send an error message with detailed information
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error in response stream";

          console.error("Error in responseStream:", errorMessage);

          controller.enqueue(
            textEncoder.encode(
              `[data] ${JSON.stringify({
                type: "error",
                error: errorMessage,
                code: ErrorCode.SERVER_ERROR,
              })}`
            )
          );
        } finally {
          // Always send the done message and close the stream
          controller.enqueue(textEncoder.encode("[done]"));
          controller.close();
        }
      },
    });
    return stream;
  }

  public async *responseIterator(): AsyncIterableIterator<StepValueChunk> {
    try {
      await this.waitForFinalOutput();
      // Check for error type
      const outputType = await this._finalOutput?.type();

      if (outputType === "error") {
        const errorValue = await this._finalOutput?.error();
        yield {
          type: "error" as any,
          error: errorValue?.error || "Unknown error",
          code: errorValue?.code || ErrorCode.SERVER_ERROR,
        } as any;
        return;
      }

      // Get the stream iterator from finalOutput
      const responseStream = await this._finalOutput?.streamIterator();
      if (!responseStream) {
        throw new Error("No response stream available");
      }
      const hasYieldedChunk = new Set<string>();

      // Process all chunks from the stream
      for await (const chunk of responseStream) {
        if (chunk.type === "finish") {
          // Ensure we're properly finished before yielding the completion chunk
          if (!this._finished) {
            await this.finalize();
          }

          yield {
            type: "finish",
            // @ts-expect-error not sure why this is an error
            finishReason:
              "finishReason" in chunk
                ? (chunk.finishReason as FinishReason)
                : "stop",
            usage: this.getTotalTokens(),
          };
          return;
        } else if ((chunk as any).type === "error") {
          // If we encounter an error chunk, yield it and then return
          yield chunk;
          return;
        } else {
          // For other chunk types (like text-delta, tool-call, etc.)
          // Create a unique identifier for the chunk to avoid duplicates
          const chunkId = JSON.stringify(chunk);

          if (!hasYieldedChunk.has(chunkId)) {
            hasYieldedChunk.add(chunkId);
            yield chunk;
          }
        }
      }

      // If we didn't encounter a step-complete chunk, yield one now
      if (!this._finished) {
        await this.finalize();
      }
    } catch (error) {
      console.error("Error in responseIterator:", error);

      // If there's an error, yield an error message with detailed information
      yield {
        type: "error" as any,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in response iterator",
        code: ErrorCode.SERVER_ERROR,
      } as any;
    }
  }

  public async responseValue(): Promise<StepValueResult> {
    try {
      const finalOutput = await this.waitForFinalOutput(true);

      // If we don't have a final output, return a default value
      if (!finalOutput) {
        return {
          text: "No output available",
        } as any;
      }

      // First check if there's an error
      const errorValue = await finalOutput.error();
      if (errorValue) {
        return {
          type: "error" as any,
          error: errorValue.error || "Unknown error",
          code: errorValue.code || ErrorCode.SERVER_ERROR,
        } as any;
      }

      const result = await finalOutput.value();

      // Handle the result type appropriately
      let completeValue: StepValueResult;
      if ("type" in result && result.type === "error") {
        completeValue = result as StepValueResult;
      } else if (!("files" in result)) {
        completeValue = { ...result, files: [] } as StepValueResult;
      } else {
        completeValue = result as StepValueResult;
      }

      return completeValue;
    } catch (error) {
      console.error("Error in responseValue:", error);
      return {
        type: "error" as any,
        error: error instanceof Error ? error.message : "Unknown error",
      } as any;
    }
  }

  private async waitForFinalOutput(
    waitForValue: boolean = false,
    timeout: number = 15_000
  ): Promise<StepValue> {
    // If we have a ready final output, return it immediately
    if (this._finalOutput && (!waitForValue || this._finalOutput.valueReady)) {
      return this._finalOutput;
    }

    // Create a timeout promise that resolves after the timeout period
    const timeoutPromise = new Promise<StepValue>((resolve) => {
      setTimeout(() => {
        // Create a new error StepValue instead of using this._finalOutput to avoid race conditions
        resolve(
          new StepValue({
            type: "error",
            error: "Timeout waiting for final output",
            code: ErrorCode.SERVER_ERROR,
          })
        );
      }, timeout);
    });

    // Create a wait promise that polls for the final output
    const waitPromise = new Promise<StepValue>(async (resolve) => {
      // Wait for final output to be ready or until we're finished
      while (
        (!this._finalOutput && !waitForValue) ||
        (!this._finalOutput?.valueReady && !this._finished)
      ) {
        // console.log(
        //   "waiting for final output",
        //   this._finalOutput,
        //   waitForValue,
        //   this._finished
        // );
        await new Promise((r) => setTimeout(r, 10));
      }

      // At this point finalOutput should be ready
      resolve(this._finalOutput as StepValue);
    });

    // Race the timeout promise against the wait promise
    const result = await Promise.race([waitPromise, timeoutPromise]);
    // Update our final output with the race result
    this._finalOutput = result;
    return result;
  }
}
