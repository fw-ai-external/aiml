import type { RunEvent } from "../types";
import type { APIStreamEvent } from "../types";

export enum StreamState {
  INITIAL = "INITIAL",
  STREAMING = "STREAMING",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

export class ReplayableAsyncIterableStream<
    T extends APIStreamEvent | RunEvent | string =
      | APIStreamEvent
      | RunEvent
      | string,
    Events extends T[] | (() => AsyncGenerator<T>) =
      | T[]
      | (() => AsyncGenerator<T>),
  >
  extends ReadableStream<T>
  implements AsyncIterable<T>
{
  private static readonly INTERNAL_DONE_EVENT = "__EOF__";
  private readonly _buffer: Array<
    T | typeof ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT
  > = [];
  private _streamLocked = false;
  private _closed = false;
  private _error: Error | undefined = undefined;
  private readonly _events: (() => AsyncGenerator<T>) | undefined = undefined;

  constructor(
    events: T[] | (() => AsyncGenerator<T>),
    private readonly delay?: Events extends T[] ? number : never
  ) {
    super({
      start: (controller) => {
        setTimeout(() => {
          try {
            this.__pumpStream(controller);
          } catch (error) {
            this._error = error as Error;
          }
        }, 1);
      },
    });

    if (Array.isArray(events)) {
      this._buffer = [...events];
      this._buffer.push("__EOF__" as T);
    } else {
      this._events = events;
    }
  }

  private get done() {
    return this._buffer.includes(
      ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT
    );
  }

  private get needsToStream() {
    return this._buffer.length === 0;
  }

  private get streaming() {
    return this._buffer.length > 0;
  }

  public get buffer(): T[] {
    return this._buffer.filter(
      (event) => event !== ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT
    ) as T[];
  }

  public get locked() {
    return false;
  }

  public get state(): StreamState {
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

  public getReader(): ReadableStreamDefaultReader<T> {
    if (!this.needsToStream || this._streamLocked) {
      const stream = this;
      const cancelStream = super.cancel;

      class Reader {
        private index = 0;
        async read() {
          const chunk = stream._buffer[this.index];
          if (
            (stream.done && !chunk) ||
            chunk === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT
          ) {
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
            done:
              stream.done &&
              stream._buffer.findIndex(
                (v) => v === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT
              ) === this.index,
          };
          if (stream.delay) {
            await new Promise((resolve) => setTimeout(resolve, stream.delay));
          }
          this.index++;
          return result;
        }
        releaseLock() {}
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
      return new Reader() as ReadableStreamDefaultReader<T>;
    }
    return super.getReader() as ReadableStreamDefaultReader<T>;
  }

  public async __pumpStream(controller: ReadableStreamController<T>) {
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
        controller.enqueue(event as T & ArrayBufferView);

        if (this.delay) {
          await new Promise((resolve) => setTimeout(resolve, this.delay));
        }
        index++;
      }
    } else if (this._events) {
      this._streamLocked = false;
      const generator = await this._events();
      if ("next" in generator) {
        for await (const chunk of generator) {
          controller.enqueue(chunk as T & ArrayBufferView);
          this._buffer.push(chunk);
        }
        this._buffer.push(ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
      } else {
        // generator is not an AsyncGenerator
        controller.enqueue(generator);

        for await (const chunk of this._events()) {
          controller.enqueue(chunk as T & ArrayBufferView);
          this._buffer.push(chunk);
        }
        this._buffer.push(ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT);
      }
    }

    controller.close();
  }

  public async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let index = 1;
    while (true) {
      const event = this._buffer[index - 1];
      const nextEvent = this._buffer[index];
      if (!event || !nextEvent) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        continue;
      }
      if (nextEvent === ReplayableAsyncIterableStream.INTERNAL_DONE_EVENT) {
        return yield event as T;
      }

      yield event as T;
      if (this.delay) {
        await new Promise((resolve) => setTimeout(resolve, this.delay));
      }
      index++;
    }
  }
}
