import { v4 as uuidv4 } from "uuid";
import { InternalError, RunStepError } from "../errors";
import { ErrorCode } from "../utils/errorCodes";
import { ReplayableAsyncIterableStream, StreamState } from "../utils/streams";
/**
 * The StepValue is the input and output type of every run step, and the input into transition requirements.
 * It transforms JS primitives into the same format as streamed values.
 */
export class StepValue {
    id;
    _runstepUUID = null;
    // triggered once receive() or value() is called
    _error;
    _stats = null;
    _inputValue;
    _inputStream;
    inputKind;
    _streamRawCompletedValue;
    get finalValue() {
        return this._inputValue || this._streamRawCompletedValue;
    }
    constructor(inputValue) {
        this.id = uuidv4();
        // Default... a stream input
        if (inputValue instanceof ReplayableAsyncIterableStream) {
            this._inputStream = inputValue;
            this.inputKind = "stream";
            this._getValueFromStream().catch((e) => {
                this._error = e;
            });
        }
        else if (inputValue instanceof ReadableStream ||
            inputValue instanceof TransformStream ||
            inputValue[Symbol.asyncIterator]) {
            this.inputKind = "stream";
            this._inputStream = new ReplayableAsyncIterableStream(inputValue);
            // A RunStepInput or RunstepOutput value that is not a stream
        }
        else {
            this._inputValue = this.ensureValueIsRunstepOutput(inputValue);
            this.inputKind = "value";
        }
    }
    async type() {
        switch (this.inputKind) {
            case "value":
                await this.waitForValue();
                if (!this.finalValue) {
                    return "error";
                }
                if (this.finalValue.type === "text") {
                    return "text";
                }
                if (["tool-call", "text", "object", "error"].includes(this.finalValue.type)) {
                    return this.finalValue.type;
                }
                if (Array.isArray(this.finalValue) &&
                    this.finalValue.every((call) => call &&
                        typeof call === "object" &&
                        "type" in call &&
                        typeof call.type === "string" &&
                        call.type.includes("tool-call"))) {
                    return "tool-call";
                }
                if (typeof this.finalValue === "object" &&
                    this.finalValue.type !== "error") {
                    return "object";
                }
                return "error";
            case "stream":
                while ((this._inputStream?.buffer.length || 0) < 2 &&
                    this._inputStream?.state !== StreamState.ERROR &&
                    this._inputStream?.state !== StreamState.FINISHED) {
                    await new Promise((resolve) => setTimeout(resolve, 2));
                }
                const firstChunk = this._inputStream?.buffer[0];
                const secondChunk = this._inputStream?.buffer[1];
                if (this._inputStream?.buffer.some((chunk) => chunk.type.includes("tool-call"))) {
                    return "tool-call";
                }
                if (firstChunk?.type.includes("object")) {
                    return "object";
                }
                if (firstChunk?.type.includes("text") ||
                    secondChunk?.type.includes("text")) {
                    return "text";
                }
                return "error";
        }
    }
    ensureValueIsRunstepOutput(input) {
        if (typeof input === "string") {
            return { type: "text", text: input };
        }
        if (typeof input === "object" && !("type" in input)) {
            return {
                type: "object",
                object: input,
                raw: JSON.stringify(input),
            };
        }
        if ("type" in input) {
            return input;
        }
        throw new RunStepError(`RunStepValue is not correctly initalizing with the input value ${JSON.stringify(input)}`);
    }
    get runStepUUID() {
        return this._runstepUUID || null;
    }
    set runStepUUID(id) {
        if (!!this._runstepUUID && this._runstepUUID !== id) {
            throw Error(`runStepUUID is already set to ${this._runstepUUID}`);
        }
        this._runstepUUID = id;
    }
    async _getValueFromStream() {
        if (!this._inputStream)
            return;
        // These are to parse Vercel AI SDK output
        for await (const chunk of this._inputStream) {
            switch (chunk.type) {
                case "error":
                    this._error = new RunStepError(chunk.error);
                case "tool-call":
                case "text":
                case "object":
                    this._streamRawCompletedValue = chunk;
                    break;
                case "tool-call-delta":
                    this._streamRawCompletedValue = {
                        ...chunk,
                        type: "tool-call",
                    }; // TODO: with OpenAI it's recently omitting the last tool-call event and go straight to step-complete.
                    break;
                case "step-complete":
                    if (!this._streamRawCompletedValue) {
                        throw new InternalError("Error durring generation, final delta(s) were never sent from the model");
                    }
                    // TODO: make sure non streaming token counting also works
                    // https://linear.app/fireworks/issue/FIR-1549/make-sure-token-counting-for-non-streaming-also-works
                    if (!this._stats?.tokenUsage) {
                        if (this._stats) {
                            this._stats.tokenUsage = {
                                completionTokens: 0,
                                promptTokens: 0,
                                totalTokens: 0,
                            };
                        }
                        else {
                            this._stats = {
                                tokenUsage: {
                                    completionTokens: 0,
                                    promptTokens: 0,
                                    totalTokens: 0,
                                },
                            };
                        }
                    }
                    this._stats.tokenUsage.completionTokens +=
                        chunk.usage.completionTokens;
                    this._stats.tokenUsage.promptTokens += chunk.usage.promptTokens;
                    this._stats.tokenUsage.totalTokens += chunk.usage.totalTokens;
                    break;
                default:
                // ignore, we only care about final values
            }
        }
    }
    get streamed() {
        return !!this._inputStream;
    }
    get valueReady() {
        return !!(this._error instanceof Error || this.finalValue);
    }
    async waitForValue() {
        await this.waitForInputs();
        while (!this.valueReady) {
            await new Promise((resolve) => setTimeout(resolve, 2));
        }
    }
    async waitForInputs() {
        while (!this._inputValue &&
            !this._error &&
            !this._streamRawCompletedValue) {
            await new Promise((resolve) => setTimeout(resolve, 2));
        }
        return true;
    }
    onValue(callback) {
        this.waitForValue().then(() => {
            callback(this._error, this._streamRawCompletedValue, this.runStepUUID);
        });
    }
    get stats() {
        return this._stats;
    }
    set stats(stats) {
        this._stats = stats;
    }
    async value() {
        await this.waitForValue();
        if (this._error) {
            return {
                type: "error",
                error: this._error.message,
                code: ErrorCode.SERVER_ERROR,
            };
        }
        if (!this._streamRawCompletedValue?.type && !this._inputValue?.type) {
            return {
                type: "error",
                error: "No value type found for the output",
                code: ErrorCode.SERVER_ERROR,
            };
        }
        const rawValue = this._streamRawCompletedValue || this._inputValue;
        if (!rawValue) {
            throw new RunStepError("No value found for the output");
        }
        return this.finalValue || rawValue;
    }
    async simpleValue() {
        await this.waitForValue();
        if (this._error) {
            return {
                error: this._error.message,
            };
        }
        switch (this.finalValue?.type) {
            case "text":
                return this.finalValue.text;
            case "object":
                return this.finalValue.object;
            case "tool-call":
                return [
                    {
                        id: this.finalValue.toolCallId,
                        type: "function",
                        function: {
                            name: this.finalValue.toolName,
                            arguments: JSON.stringify(this.finalValue.args),
                        },
                    },
                ];
            case "tool-result":
                return this.finalValue.result;
            case "api-call":
                return JSON.stringify({
                    api: this.finalValue.apiName,
                    operation: this.finalValue.operationId,
                    request: this.finalValue.request,
                });
            default:
                return null;
        }
    }
    async valueAsText() {
        await this.waitForValue();
        if (this._error) {
            return JSON.stringify({
                type: "error",
                error: this._error.message,
                code: ErrorCode.SERVER_ERROR,
            });
        }
        switch (this.finalValue?.type) {
            case "text":
                return this.finalValue.text;
            case "object":
                return JSON.stringify(this.finalValue.object);
            case "tool-call":
                return JSON.stringify({
                    id: this.finalValue.toolCallId,
                    name: this.finalValue.toolName,
                    args: this.finalValue.args,
                });
            case "api-call":
                return JSON.stringify({
                    api: this.finalValue.apiName,
                    operation: this.finalValue.operationId,
                    request: this.finalValue.request,
                });
            default:
                return JSON.stringify(this.finalValue);
        }
    }
    async text() {
        await this.waitForValue();
        if (this.finalValue?.type === "text") {
            return this.finalValue.text;
        }
        return null;
    }
    async object() {
        await this.waitForValue();
        if (this.finalValue?.type !== "object") {
            return null;
        }
        return this.finalValue.object;
    }
    async toolCalls() {
        await this.waitForValue();
        if (this.finalValue?.type !== "tool-call") {
            return null;
        }
        return [this.finalValue];
    }
    async stream() {
        const textEncoder = new TextEncoder();
        return new ReadableStream({
            start: async (controller) => {
                for await (const chunk of await this.streamIterator()) {
                    controller.enqueue(textEncoder.encode(`[data] ${JSON.stringify(chunk)}`));
                }
                controller.enqueue(textEncoder.encode("[done]"));
                controller.close();
            },
        });
    }
    async error() {
        await this.waitForValue();
        if (this._error) {
            return {
                type: "error",
                error: this._error.message,
                code: ErrorCode.SERVER_ERROR,
            };
        }
        if (this.finalValue && this.finalValue.type === "error") {
            return this.finalValue;
        }
        return null;
    }
    async *streamIterator() {
        // if (!this.streamed && this._streamRawFinalValue) {
        //   return yield this._streamRawFinalValue as RunStepStreamEvent;
        // }
        if (this._error) {
            return yield {
                type: "error",
                error: this._error.message,
                code: ErrorCode.SERVER_ERROR,
            };
        }
        if (this._inputValue) {
            // TODO support function calling and json objects
            if (this.finalValue?.type === "text") {
                if (typeof this.finalValue.text !== "string") {
                    console.log("this.finalValue", this.finalValue);
                }
                const words = this.finalValue.text.split(/\s+/);
                let partial = "";
                for (const word of words) {
                    partial += word + " ";
                    if (word === words[words.length - 1]) {
                        return yield {
                            type: "text",
                            text: partial.trim(),
                        };
                    }
                    yield {
                        type: "text-delta",
                        partial,
                        delta: word + " ",
                    };
                }
                return;
            }
            return yield this.finalValue;
        }
        for await (const event of this._inputStream) {
            if (this._error) {
                return yield {
                    type: "error",
                    error: this._error.message,
                    code: ErrorCode.SERVER_ERROR,
                };
            }
            yield event;
        }
    }
}
//# sourceMappingURL=StepValue.js.map