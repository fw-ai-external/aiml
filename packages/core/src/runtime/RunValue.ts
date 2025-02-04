import { ErrorCode } from "../utils/errorCodes";
import { ReplayableAsyncIterableStream } from "../utils/streams";
import type { RunEvent, APIStreamEvent, RunstepOutput } from "../types";
import { StepValue } from "./StepValue";

export type RunStepStream = ReplayableAsyncIterableStream<APIStreamEvent>;

function maybeRunStepValue(
  value?: RunstepOutput | StepValue
): StepValue | null {
  if (!value) return null;
  return "streamIterator" in value ? value : new StepValue(value);
}

// each stp is a new step in the execution or the transition to another state
// effectivly forming a tree of execution
export type RunStep = {
  id: string;
  node: any;
  type: "state" | "action-entry" | "transition";
  childNodes?: RunStep[];
  input?: StepValue;
  output?: RunstepOutput;
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

  public addState(event: any) {
    this._runSteps.push({
      id: event.id,
      node: event.node,
      type: "state",
      input: event.input
        ? (maybeRunStepValue(event.input) as StepValue)
        : undefined,
    });

    if (event.path.length === 0) {
      if (event.output) {
        const output = maybeRunStepValue(event.output);
        if (event.node.scxmlType === "final" || event.node.name === "final") {
          this._finalOutput = output;
        }
        if (!this._generatedValues.find((value) => value.id === output?.id)) {
          this._generatedValues.push(output!);
        }
      } else {
        this._finalOutput = new StepValue({
          type: "text",
          text: "No output",
        });
      }
    }

    this.processValue(event).catch(() => {
      // TODO: Handle error
    });
  }

  public addActionEntry(event: any) {
    this._runSteps.push({
      id: event.id,
      node: event.node,
      type: "action-entry",
      input: event.input
        ? (maybeRunStepValue(event.input) as StepValue)
        : undefined,
      output: event.output as any,
    });

    this.processValue(event).catch(() => {
      // TODO: Handle error
    });
  }

  private async processValue(event: any) {
    if (
      "output" in event &&
      event.output &&
      !this._runStepValuesProcessed.has((event.output as any)?.id ?? event.id)
    ) {
      if ("id" in event.output) {
        this._runStepValuesProcessed.add(event.output.id);
      } else {
        this._runStepValuesProcessed.add(event.id);
      }

      // Ensure all values are streamable
      const output: StepValue =
        "streamIterator" in event.output
          ? event.output
          : new StepValue(event.output);

      for await (const chunk of output.streamIterator()) {
        this._streamBuffer.push({
          step: event.node.attributes.id?.toString() ?? event.node.name,
          uuid: event.id,
          type: event.node.name,
          runId: this.uuid,
          event: chunk,
        });
      }
    }
  }
  private async waitForStateStreamsToFinish() {
    // TODO refactor this to use events as this is CPU heavy and adds latency
    const statesWithActiveStreams = this._generatedValues.filter(
      (values) => !values.valueReady
    );
    while (statesWithActiveStreams.some((values) => !values.valueReady)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Ensures the values inside RunValue are final.
   * Note that even if StateMachine Actor is finished, the values inside RunValue still may not be final.
   */
  public async finalize() {
    await Promise.race([
      this.waitForStateStreamsToFinish(),
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      }),
    ]);

    this._finished = true;
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
  }

  public getTotalTokens() {
    return {
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      totalTokens: this.totalPromptTokens + this.totalCompletionTokens,
      reasoningTokens: this.reasoningTokens,
    };
  }

  // TODO enable this for our full API
  // public async multiplexedStream(): Promise<ReadableStream<Uint8Array>> {
  //   const textEncoder = new TextEncoder();
  //   const stream = new ReadableStream({
  //     start: async (controller) => {
  //       let enqueueChunkIndex = 0;
  //       while (!this.finished) {
  //         if (this._streamBuffer[enqueueChunkIndex]) {
  //           controller.enqueue(textEncoder.encode(`[data] ${JSON.stringify(this._streamBuffer[enqueueChunkIndex])}`));
  //           enqueueChunkIndex++;
  //         }
  //         await new Promise((resolve) => setTimeout(resolve, 2));
  //       }
  //       controller.enqueue(textEncoder.encode('[done]'));
  //       controller.close();
  //     },
  //   });
  //   return stream;
  // }

  // public async multiplexedValues(): Promise<RunOutput[]> {
  //   while (!this.finished) {
  //     await new Promise((resolve) => setTimeout(resolve, 2));
  //   }

  //   return await Promise.all(
  //     this._runSteps
  //       .filter((value) => value.type === 'transition')
  //       .map(async (value) => ({
  //         step: value.node.name,
  //         uuid: value.id,
  //         type: value.type,
  //         runId: this.uuid,
  //         output: 'value' in value.output ? await value.output?.value() : value.output,
  //       })),
  //   );
  // }

  // public async *multiplexedIterator(): AsyncIterableIterator<RunOutput> {
  //   let index = 0;
  //   while (true) {
  //     while (!this._runStepValues[index] || !this._runStepValues[index]?.result) {
  //       await new Promise((resolve) => setTimeout(resolve, 2));
  //       continue;
  //     }
  //     const step = this._runStepValues[index];

  //     const value = {
  //       step: step.name,
  //       uuid: step.id,
  //       type: step.type,
  //       runId: this.uuid,
  //       output: await step.result?.value(),
  //     };

  //     if (this.machine.isFinishedState(step.name) || this.machine.isErrorState(step.name)) {
  //       return yield value;
  //     }
  //     yield value;
  //     index++;
  //   }
  // }

  public async responseStream(): Promise<ReadableStream<Uint8Array>> {
    const textEncoder = new TextEncoder();
    const stream = new ReadableStream({
      start: async (controller) => {
        for await (const chunk of await this.responseIterator()) {
          controller.enqueue(
            textEncoder.encode(`[data] ${JSON.stringify(chunk)}`)
          );
        }
        controller.enqueue(textEncoder.encode("[done]"));
        controller.close();
      },
    });
    return stream;
  }

  public async *responseIterator(): AsyncIterableIterator<APIStreamEvent> {
    const finalOutput = await this.waitForFinalOutput();

    const responseStream = finalOutput.streamIterator();

    for await (const chunk of responseStream) {
      if (chunk.type !== "step-complete") {
        yield chunk;
      } else {
        while (!this._finished) {
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        return yield {
          type: "step-complete",
          finishReason: (chunk as any).finishReason,
          usage: this.getTotalTokens(),
        };
      }
    }
  }

  public async responseValue(): Promise<RunstepOutput> {
    const finalOutput = await this.waitForFinalOutput();

    const outputType = await finalOutput.type();
    if (outputType === "error") {
      return finalOutput.error() as any;
    }

    const responseValue = finalOutput.value();

    return responseValue as any;
  }

  private async waitForFinalOutput(
    timeout: number = 15_000
  ): Promise<StepValue> {
    while (!this._finalOutput) {
      await new Promise((resolve) =>
        setTimeout(() => {
          timeout -= 2;
          if (timeout <= 0) {
            this._finalOutput = new StepValue({
              type: "error",
              error: "Timeout waiting for final output",
              code: ErrorCode.SERVER_ERROR,
            });
          }
          resolve(true);
        }, 2)
      );
    }

    return this._finalOutput;
  }

  public get runSteps() {
    return this._runSteps;
  }

  public get latestState() {
    const stateSteps = this._runSteps.filter((step) => step.type === "state");
    return stateSteps[stateSteps.length - 1];
  }
}
