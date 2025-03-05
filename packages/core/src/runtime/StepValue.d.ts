import type { z } from "zod";
import type { ErrorResult, OpenAIToolCall, ToolCall, ToolCallSchema } from "../types";
import type { JSONObject, RunStepInput, APIStreamEvent, RunstepOutput } from "../types";
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
export declare class StepValue<Value extends RunstepOutput = RunstepOutput, Type extends RunstepOutput["type"] = RunstepOutput["type"]> {
    readonly id: string;
    private _runstepUUID;
    private _error?;
    private _stats;
    private _inputValue;
    private readonly _inputStream;
    private readonly inputKind;
    private _streamRawCompletedValue?;
    private get finalValue();
    constructor(inputValue?: RunStepInput);
    type(): Promise<"tool-call" | "text" | "object" | "error">;
    private ensureValueIsRunstepOutput;
    get runStepUUID(): string | null;
    set runStepUUID(id: string);
    private _getValueFromStream;
    get streamed(): boolean;
    get valueReady(): boolean;
    waitForValue(): Promise<void>;
    private waitForInputs;
    onValue<T extends RunstepOutput, E extends Error | undefined>(callback: (error: E, value: E extends Error ? undefined : T, runStepUUID: string | null) => void): void;
    get stats(): StepGenerationStats | null;
    set stats(stats: StepGenerationStats);
    value(): Promise<Value | ErrorResult>;
    simpleValue(): Promise<string | JSONObject | OpenAIToolCall[] | null>;
    valueAsText(): Promise<string | null>;
    text(): Promise<string | null>;
    object(): Promise<JSONObject | null>;
    toolCalls(): Promise<Value extends z.infer<ToolCallSchema> ? [ToolCall<Value["toolName"], Value["args"]>] : null>;
    stream(): Promise<ReadableStream<Uint8Array>>;
    error(): Promise<ErrorResult | null>;
    streamIterator(): AsyncIterableIterator<APIStreamEvent>;
}
//# sourceMappingURL=StepValue.d.ts.map