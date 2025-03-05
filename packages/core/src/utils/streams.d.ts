import type { RunEvent } from "../types";
import type { APIStreamEvent } from "../types";
export declare enum StreamState {
    INITIAL = "INITIAL",
    STREAMING = "STREAMING",
    FINISHED = "FINISHED",
    ERROR = "ERROR"
}
export declare class ReplayableAsyncIterableStream<T extends APIStreamEvent | RunEvent | string = APIStreamEvent | RunEvent | string, Events extends T[] | (() => AsyncGenerator<T>) = T[] | (() => AsyncGenerator<T>)> extends ReadableStream<T> implements AsyncIterable<T> {
    private readonly delay?;
    private static readonly INTERNAL_DONE_EVENT;
    private readonly _buffer;
    private _streamLocked;
    private _closed;
    private _error;
    private readonly _events;
    constructor(events: T[] | (() => AsyncGenerator<T>), delay?: (Events extends T[] ? number : never) | undefined);
    private get done();
    private get needsToStream();
    private get streaming();
    get buffer(): T[];
    get locked(): boolean;
    get state(): StreamState;
    getReader(): ReadableStreamDefaultReader<T>;
    __pumpStream(controller: ReadableStreamController<T>): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
//# sourceMappingURL=streams.d.ts.map