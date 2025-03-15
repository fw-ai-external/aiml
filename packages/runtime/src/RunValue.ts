import { ErrorCode } from "@fireworks/shared";
import { type ReplayableAsyncIterableStream } from "@fireworks/shared";
import type { StepValueChunk, RunEvent, RunstepOutput } from "@fireworks/types";
import { StepValue } from "@fireworks/shared";
import { ElementType } from "@fireworks/types";

export type RunStepStream = ReplayableAsyncIterableStream<StepValueChunk>;

function isStepValue(value: unknown): value is StepValue {
  return (
    value !== null && typeof value === "object" && "streamIterator" in value
  );
}

function maybeRunStepValue(
  value?: RunstepOutput | StepValue
): StepValue | null {
  if (!value) return null;
  return isStepValue(value) ? value : new StepValue(value);
}

// each stp is a new step in the execution or the transition to another state
// effectivly forming a tree of execution
export type RunStep = {
  id: string;
  path: string[]; // the parent elements with a role of state
  elementType: ElementType; // from the workflow graph
  status: string;
  input?: StepValue | null; // aka the triggerData
  output?: StepValue | null;
};

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
    this._runSteps.push({
      id: step.id,
      elementType: step.elementType,
      path: step.path,
      input: step.input
        ? (maybeRunStepValue(step.input) as StepValue)
        : undefined,
      status: step.status,
    });

    if (step.output) {
      const output = maybeRunStepValue(step.output);
      if (output) {
        if (step.elementType === "final") {
          this._finalOutput = output;
        } else {
          this._generatedValues.push(output);
        }
      }
    }
  }

  setStepOutput(id: string, output: RunstepOutput | StepValue) {
    const thisStep = this._runSteps.find((s) => s.id === id);
    if (thisStep) {
      thisStep.output = maybeRunStepValue(output);
      this.processValue(id, thisStep.elementType, output);
    } else {
      throw new Error(`Step ${id} not found, could not set output`);
    }
  }

  markStepAsFinished(id: string, output?: RunstepOutput | StepValue) {
    const thisStep = this._runSteps.find((s) => s.id === id);
    if (thisStep) {
      thisStep.status = "finished";
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
    value: RunstepOutput | StepValue
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
          type: "step-complete",
          runId: this.uuid,
          event: chunk,
        });
      }
    } catch (error) {
      // Handle stream iteration errors by adding an error to the buffer
      this._streamBuffer.push({
        step: elementType,
        uuid: stepID,
        type: "step-complete",
        runId: this.uuid,
        event: {
          type: "error" as any,
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
    // TODO refactor this to use events as this is CPU heavy and adds latency
    const statesWithActiveStreams = this._generatedValues.filter(
      (value) => !value.valueReady
    );

    // Add timeout to ensure we don't wait forever
    const timeout = 5000; // 5 second timeout
    const startTime = Date.now();

    while (statesWithActiveStreams.some((value) => !value.valueReady)) {
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
      const finalOutput = await this.waitForFinalOutput();

      // If we don't have a proper final output, create a fallback
      if (!finalOutput) {
        yield {
          text: "No valid output available",
        } as any;
        return;
      }

      // Check for error type
      const outputType = await finalOutput.type();
      if (outputType === "error") {
        const errorValue = await finalOutput.error();
        yield {
          type: "error" as any,
          error: errorValue?.error || "Unknown error",
          code: errorValue?.code || ErrorCode.SERVER_ERROR,
        } as any;
        return;
      }

      // Get the stream iterator from finalOutput
      const responseStream = await finalOutput.streamIterator();
      const hasYieldedChunk = new Set<string>();

      // Process all chunks from the stream
      for await (const chunk of responseStream) {
        if ((chunk as any).type === "step-complete") {
          // Ensure we're properly finished before yielding the completion chunk
          if (!this._finished) {
            await this.finalize();
          }

          yield {
            type: "step-complete" as any,
            finishReason: (chunk as any).finishReason || "stop",
            usage: this.getTotalTokens(),
          } as any;
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

      yield {
        type: "step-complete" as any,
        finishReason: "stop",
        usage: this.getTotalTokens(),
      } as any;
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

  public async responseValue(): Promise<RunstepOutput> {
    try {
      const finalOutput = await this.waitForFinalOutput();

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

      // If no error, check the type and return the appropriate value
      const outputType = await finalOutput.type();
      switch (outputType) {
        case "text": {
          const text = await finalOutput.text();
          return {
            text: text || "",
          } as any;
        }
        case "object": {
          const object = await finalOutput.object();
          return {
            object: object || {},
            raw: JSON.stringify(object),
          } as any;
        }
        case "toolCalls": {
          const toolCalls = await finalOutput.toolCalls();
          return {
            toolCalls: toolCalls || [],
          } as any;
        }
        case "error": {
          // This should be caught by the error check above, but just in case
          return {
            type: "error" as any,
            error: "Unknown error",
            code: ErrorCode.SERVER_ERROR,
          } as any;
        }
        default:
          // For any other type, return the raw value
          return (await finalOutput.value()) as any;
      }
    } catch (error) {
      console.error("Error in responseValue:", error);

      // If there's an error, return an error object with detailed information
      return {
        type: "error" as any,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error in responseValue",
        code: ErrorCode.SERVER_ERROR,
      } as any;
    }
  }

  private async waitForFinalOutput(
    timeout: number = 15_000
  ): Promise<StepValue> {
    // If we have a ready final output, return it immediately
    if (this._finalOutput && this._finalOutput.valueReady) {
      return this._finalOutput;
    }

    // Create a default output value if we don't have one already
    if (!this._finalOutput) {
      // If we're already finished, try to get the last ready generated value
      if (this._finished && this._generatedValues.length > 0) {
        // Find the last generated value that is ready
        const readyValues = this._generatedValues.filter(
          (value) => value.valueReady
        );
        if (readyValues.length > 0) {
          // Use non-null assertion since we know the array has elements
          const lastReadyValue = readyValues[readyValues.length - 1]!;
          this._finalOutput = lastReadyValue;
          return lastReadyValue;
        }
      }

      // If we couldn't find a ready value, create a default one
      this._finalOutput = new StepValue({
        text: "No final output available",
      } as any);
    }

    // Create a timeout promise that resolves after the timeout period
    const timeoutPromise = new Promise<StepValue>((resolve) => {
      setTimeout(() => {
        console.warn("Timeout waiting for final output");
        // Create a new error StepValue instead of using this._finalOutput to avoid race conditions
        resolve(
          new StepValue({
            type: "error" as any,
            error: "Timeout waiting for final output",
            code: ErrorCode.SERVER_ERROR,
          } as any)
        );
      }, timeout);
    });

    // Create a wait promise that polls for the final output
    const waitPromise = new Promise<StepValue>(async (resolve) => {
      // At this point we're guaranteed to have a finalOutput (not null)
      // Even if it's our default placeholder value
      const finalOutput = this._finalOutput as StepValue;

      // Wait for final output to be ready or until we're finished
      while (!finalOutput.valueReady && !this._finished) {
        await new Promise((r) => setTimeout(r, 10));
      }

      // If we're finished but don't have a ready final output yet, try to find a ready value
      if (
        this._finished &&
        !finalOutput.valueReady &&
        this._generatedValues.length > 0
      ) {
        const readyValues = this._generatedValues.filter(
          (value) => value.valueReady
        );
        if (readyValues.length > 0) {
          // Use non-null assertion since we know the array has elements
          const lastReadyValue = readyValues[readyValues.length - 1]!;
          this._finalOutput = lastReadyValue;
          // Return this value instead of continuing
          return resolve(lastReadyValue);
        }
      }

      // If our final value isn't ready yet, wait for it
      if (finalOutput && !finalOutput.valueReady) {
        await finalOutput.waitForValue();
      }

      // At this point finalOutput should be ready
      resolve(finalOutput);
    });

    // Race the timeout promise against the wait promise
    const result = await Promise.race([waitPromise, timeoutPromise]);
    // Update our final output with the race result
    this._finalOutput = result;
    return result;
  }

  public get runSteps() {
    return this._runSteps;
  }

  public get latestState() {
    const stateSteps = this._runSteps.filter(
      (step) => step.elementType === "state"
    );
    return stateSteps[stateSteps.length - 1];
  }
}
