export enum StreamState {
  ACTIVE = "active",
  FINISHED = "finished",
  ERROR = "error",
}

/**
 * A stream that can be replayed multiple times.
 */
export class ReplayableAsyncIterableStream<T> {
  public readonly buffer: T[] = [];
  public state: StreamState = StreamState.ACTIVE;
  private readonly iterator: AsyncIterator<T>;
  private error?: Error;

  constructor(iterable: AsyncIterable<T>) {
    this.iterator = iterable[Symbol.asyncIterator]();
    this.buffer = [];
  }

  public async *[Symbol.asyncIterator](): AsyncIterator<T> {
    // First yield all buffered values
    for (const value of this.buffer) {
      yield value;
    }

    // Then continue with the original iterator
    try {
      while (true) {
        const result = await this.iterator.next();
        if (result.done) {
          this.state = StreamState.FINISHED;
          return;
        }
        this.buffer.push(result.value);
        yield result.value;
      }
    } catch (error) {
      this.error = error as Error;
      this.state = StreamState.ERROR;
      throw error;
    }
  }
}
