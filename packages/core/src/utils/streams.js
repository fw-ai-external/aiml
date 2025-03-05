export var StreamState;
(function (StreamState) {
    StreamState["INITIAL"] = "INITIAL";
    StreamState["STREAMING"] = "STREAMING";
    StreamState["FINISHED"] = "FINISHED";
    StreamState["ERROR"] = "ERROR";
})(StreamState || (StreamState = {}));
export class ReplayableAsyncIterableStream extends ReadableStream {
    delay;
    static INTERNAL_DONE_EVENT = "__EOF__";
    _buffer = [];
    _streamLocked = false;
    _closed = false;
    _error = undefined;
    _events = undefined;
    constructor(events, delay) {
        super({
            start: (controller) => {
                setTimeout(() => {
                    try {
                        this.__pumpStream(controller);
                    }
                    catch (error) {
                        this._error = error;
                    }
                }, 1);
            },
        });
        this.delay = delay;
        if (Array.isArray(events)) {
            this._buffer = [...events];
            this._buffer.push("__EOF__");
        }
        else {
            this._events = events;
        }
    }
    get done() {
        return this._buffer.includes(ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
    }
    get needsToStream() {
        return this._buffer.length === 0;
    }
    get streaming() {
        return this._buffer.length > 0;
    }
    get buffer() {
        return this._buffer.filter((event) => event !== ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
    }
    get locked() {
        return false;
    }
    get state() {
        if (this._error) {
            return StreamState.ERROR;
        }
        if (this.done) {
            return StreamState.FINISHED;
        }
        if (!this.streaming) {
            return StreamState.INITIAL;
        }
        if (this._events) {
            return StreamState.STREAMING;
        }
        return StreamState.ERROR;
    }
    getReader() {
        if (!this.needsToStream || this._streamLocked) {
            const stream = this;
            const cancelStream = super.cancel;
            class Reader {
                index = 0;
                async read() {
                    const chunk = stream._buffer[this.index];
                    if ((stream.done && !chunk) ||
                        chunk === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT) {
                        return {
                            value: undefined,
                            done: true,
                        };
                    }
                    while (!chunk) {
                        await new Promise((resolve) => setTimeout(resolve, 1));
                    }
                    const result = {
                        value: chunk,
                        done: stream.done &&
                            stream._buffer.findIndex((v) => v === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT) === this.index,
                    };
                    if (stream.delay) {
                        await new Promise((resolve) => setTimeout(resolve, stream.delay));
                    }
                    this.index++;
                    return result;
                }
                releaseLock() { }
                get closed() {
                    return new Promise(async (resolve) => {
                        while (!stream.done) {
                            await new Promise((resolve) => setTimeout(resolve, 1));
                        }
                        resolve(undefined);
                    });
                }
                async cancel() {
                    if (stream.streaming) {
                        await cancelStream();
                    }
                }
                async readMany() {
                    return {
                        value: stream._buffer,
                        done: stream._closed,
                        size: stream._buffer.length,
                    };
                }
            }
            return new Reader();
        }
        return super.getReader();
    }
    async __pumpStream(controller) {
        if (this.streaming || this._streamLocked) {
            this._streamLocked = true;
            let index = 0;
            while (true) {
                if (index >= this._buffer.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    continue;
                }
                const event = this._buffer[index];
                if (event === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT) {
                    break;
                }
                controller.enqueue(event);
                if (this.delay) {
                    await new Promise((resolve) => setTimeout(resolve, this.delay));
                }
                index++;
            }
        }
        else if (this._events) {
            this._streamLocked = false;
            const generator = await this._events();
            if ("next" in generator) {
                for await (const chunk of generator) {
                    controller.enqueue(chunk);
                    this._buffer.push(chunk);
                }
                this._buffer.push(ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
            }
            else {
                // generator is not an AsyncGenerator
                controller.enqueue(generator);
                for await (const chunk of this._events()) {
                    controller.enqueue(chunk);
                    this._buffer.push(chunk);
                }
                this._buffer.push(ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
            }
        }
        controller.close();
    }
    async *[Symbol.asyncIterator]() {
        let index = 1;
        while (true) {
            const event = this._buffer[index - 1];
            const nextEvent = this._buffer[index];
            if (!event || !nextEvent) {
                await new Promise((resolve) => setTimeout(resolve, 1));
                continue;
            }
            if (nextEvent === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT) {
                return yield event;
            }
            yield event;
            if (this.delay) {
                await new Promise((resolve) => setTimeout(resolve, this.delay));
            }
            index++;
        }
    }
}
//# sourceMappingURL=streams.js.map