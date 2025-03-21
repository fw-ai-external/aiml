import { EventEmitter } from 'events';
import { simulateStreamingMiddleware } from 'ai';
import type { StepValueChunk, StepValueResult } from '../types';

export enum StreamState {
  ACTIVE = 'active',
  FINISHED = 'finished',
  ERROR = 'error',
}

/**
 * A stream that can be replayed multiple times.
 */
export class ReplayableAsyncIterableStream<T> implements AsyncIterable<T> {
  private readonly _buffer: T[] = [];
  public state: StreamState = StreamState.ACTIVE;
  private _iterator: AsyncIterator<T> | null = null;
  private readonly emitter = new EventEmitter();

  private error?: Error;

  constructor(private readonly input: AsyncIterable<T> | PromiseLike<{ stream: AsyncIterable<T> }>) {
    if (!('then' in this.input)) {
      this._iterator = this.input[Symbol.asyncIterator]();
    }
    this._buffer = [];
    this._pumpStream().catch((error) => {
      this.error = error;
      this.state = StreamState.ERROR;
      this.emitter.emit('error', error);
    });
  }

  public async buffer(count?: number): Promise<T[]> {
    // If no count is specified or we're not active, use the original behavior
    if (count === undefined) {
      if (this.state !== StreamState.ACTIVE) {
        if (this.error) {
          throw this.error;
        }
        return this._buffer;
      }

      return new Promise<T[]>((resolve, reject) => {
        this.emitter.once('finished', () => resolve(this._buffer));
        this.emitter.once('error', (error) => reject(error));
      });
    }

    // If we already have enough chunks, return them immediately
    if (this._buffer.length >= count) {
      return this._buffer.slice(0, count);
    }

    // If we're in error state, throw the error
    if (this.state === StreamState.ERROR && this.error) {
      throw this.error;
    }

    // If we're finished but don't have enough chunks, return what we have
    if (this.state === StreamState.FINISHED) {
      return this._buffer.slice(0, count);
    }

    // Otherwise, wait for enough chunks or stream completion
    return new Promise<T[]>((resolve, reject) => {
      const checkBuffer = () => {
        if (this._buffer.length >= count) {
          cleanup();
          resolve(this._buffer.slice(0, count));
        }
      };

      const onFinished = () => {
        cleanup();
        resolve(this._buffer.slice(0, count));
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        this.emitter.off('chunk', checkBuffer);
        this.emitter.off('finished', onFinished);
        this.emitter.off('error', onError);
      };

      this.emitter.on('chunk', checkBuffer);
      this.emitter.once('finished', onFinished);
      this.emitter.once('error', onError);

      // Check immediately in case chunks were added while setting up listeners
      checkBuffer();
    });
  }

  private async _pumpStream(): Promise<void> {
    if (!this._iterator) {
      this._iterator = ((await this.input) as { stream: AsyncIterable<T> }).stream[Symbol.asyncIterator]();
    }
    try {
      while (true) {
        const result = await this._iterator.next();
        if (result.done) {
          this.state = StreamState.FINISHED;
          this.emitter.emit('finished');
          return;
        }
        this._buffer.push(result.value);
        this.emitter.emit('chunk', result.value);
      }
    } catch (error) {
      this.error = error as Error;
      this.state = StreamState.ERROR;
      this.emitter.emit('error', this.error);
      throw error;
    }
  }

  public async *[Symbol.asyncIterator](): AsyncIterator<T> {
    // Keep track of how many buffer items we've already yielded
    let nextToYield = 0;

    // Yield all currently buffered values
    while (nextToYield < this._buffer.length || this.state === StreamState.ACTIVE) {
      if (nextToYield < this._buffer.length) {
        // Yield the current item at nextToYield index
        yield this._buffer[nextToYield];
        nextToYield++;
      } else {
        // Wait for more items to be added to the buffer
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    return;
  }
}

export function stepValueResultToReplayableStream(
  stepValueResult: StepValueResult,
): ReplayableAsyncIterableStream<StepValueChunk> {
  const aiMiddleware = simulateStreamingMiddleware();

  const stream = aiMiddleware.wrapStream?.({
    doGenerate: async () => {
      return stepValueResult;
    },
  } as any)!;
  // first chunck is step-start
  // then chunks based on the stepValueResult type
  // last chunks are step-finish and then finish

  // stepValueResult will need to be synthetically created from the stepValueResult

  const streamwrapped = new ReplayableAsyncIterableStream<StepValueChunk>(stream);
  return streamwrapped;
}
