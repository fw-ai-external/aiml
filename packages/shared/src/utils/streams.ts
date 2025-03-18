export enum StreamState {
  ACTIVE = "active",
  FINISHED = "finished",
  ERROR = "error",
}

/**
 * A stream that can be replayed multiple times.
 */
export class ReplayableAsyncIterableStream<T> implements AsyncIterable<T> {
  public readonly buffer: T[] = [];
  private buffering = false;
  public state: StreamState = StreamState.ACTIVE;
  private readonly iterator: AsyncIterator<T>;
  private error?: Error;

  constructor(iterable: AsyncIterable<T>) {
    this.iterator = iterable[Symbol.asyncIterator]();
    this.buffer = [];
  }

  public async *[Symbol.asyncIterator](): AsyncIterator<T> {
    // Keep track of how many buffer items we've already yielded
    let bufferedItemsYielded = 0;

    // Yield all currently buffered values
    if (this.buffering) {
      while (
        bufferedItemsYielded < this.buffer.length ||
        this.state === StreamState.ACTIVE
      ) {
        if (bufferedItemsYielded < this.buffer.length) {
          yield this.buffer[bufferedItemsYielded];
          bufferedItemsYielded++;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      return;
    }

    this.buffering = true;

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
      console.error("*** ReplayableAsyncIterableStream error", error);
      this.error = error as Error;
      this.state = StreamState.ERROR;
      throw error;
    }
  }
}
