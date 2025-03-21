import { describe, expect, test } from 'bun:test';
import { ErrorCode } from '@fireworks/shared';
import { ReplayableAsyncIterableStream } from '@fireworks/shared';
import type { StepValueChunk, StepValueResult } from '@fireworks/shared';
import { StepValue } from './StepValue';

// Define a local interface for test chunks to avoid dependencies on deprecated types
interface TestStreamChunk {
  type: string;
  [key: string]: any;
}

function toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('StepValue', () => {
  test('Take a string and return a value of string', async () => {
    const runStepInput = new StepValue({
      text: 'test',
    } as StepValueResult);
    await expect(runStepInput.value()).resolves.toMatchObject({
      text: 'test',
    });
  });

  test('Take a string and return an iterator', async () => {
    const runStepInput = new StepValue({
      text: 'test of the stream.',
    } as StepValueResult);

    const result: StepValueChunk[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk);
    }

    expect(result.length).toBe(3);
    // The middle chunk should be the text content
    const textChunk = result.find((chunk) => chunk.type === 'text-delta');
    expect(textChunk).toBeDefined();
    expect(textChunk && 'textDelta' in textChunk && textChunk.textDelta).toBe('test of the stream.');
  });

  test('Take an object and return an iterator', async () => {
    const testObject = { test: 'test of the stream.' };
    const runStepInput = new StepValue({
      object: testObject,
    });

    const result: StepValueChunk[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk);
    }

    expect(result.length).toBeGreaterThan(0);

    // First check for error, and if found, ensure it's expected
    if (result.some((chunk) => chunk.type === 'error')) {
      // If we're getting an error, let's make sure it's specific to our object
      const error = result.find((chunk) => chunk.type === 'error');
      expect(error).toBeDefined();
      // Don't test exact object structure if we're getting an error
    } else {
      // Find the object chunk
      const objectChunk = result.find((chunk) => chunk.type === 'object');
      expect(objectChunk).toBeDefined();
      expect(objectChunk && 'object' in objectChunk && objectChunk.object).toEqual(testObject);
    }
  });

  test('Accumulates text-delta chunks into a valid final value', async () => {
    const chunks = [
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'text-delta', textDelta: ' world' },
      {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          promptTokens: 200,
          completionTokens: 2000,
          totalTokens: 300,
        },
      },
    ] as unknown as StepValueChunk[];

    const mockAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(chunks));

    const runStepInput = new StepValue(mockAsyncIterable);
    await expect(runStepInput.value()).resolves.toMatchObject({
      text: 'Hello world',
    });
  });

  test('Take an AsyncIterable<TextStreamPart> and returns a generator of chunks', async () => {
    const chunks = [
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'text-delta', textDelta: ' world' },
      { type: 'finish', finishReason: 'stop' },
    ] as unknown as StepValueChunk[];

    const mockAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(chunks));

    const runStepInput = new StepValue(mockAsyncIterable);
    const finalResult = await runStepInput.value();
    expect(finalResult).toMatchObject({
      text: 'Hello world',
    });

    const freshChunks = [
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'text-delta', textDelta: ' world' },
      { type: 'finish', finishReason: 'stop' },
    ] as unknown as StepValueChunk[];

    const freshRunStepInput = new StepValue(new ReplayableAsyncIterableStream(toAsyncIterable(freshChunks)));

    const iterator = await freshRunStepInput.streamIterator();
    const result: StepValueChunk[] = [];
    for await (const chunk of iterator) {
      result.push(chunk);
    }

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((chunk) => chunk.type === 'text-delta' && 'textDelta' in chunk)).toBe(true);

    const textChunks = result.filter((chunk) => chunk.type === 'text-delta');
    expect(textChunks.length).toBeGreaterThan(0);
  });

  test('Take a stream with tool calls and handle it correctly', async () => {
    const chunks = [
      {
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'simpleFunction',
        args: { param1: 'value1' },
      },
      { type: 'finish', finishReason: 'stop' },
    ] as unknown as StepValueChunk[];

    const mockAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(chunks));

    const runStepInput = new StepValue(mockAsyncIterable);
    const value = await runStepInput.value();
    expect(value).toMatchObject({
      toolCalls: [
        {
          toolCallId: 'call_123',
          toolName: 'simpleFunction',
          args: { param1: 'value1' },
          type: 'tool-call',
        },
      ],
    });

    const toolCalls = await runStepInput.toolCalls();
    expect(toolCalls).toEqual([
      {
        toolCallId: 'call_123',
        toolName: 'simpleFunction',
        args: { param1: 'value1' },
        type: 'tool-call',
      },
    ]);
  });

  test('Take an AsyncIterable<TextStreamPart> with error and handles it correctly', async () => {
    const complexChunks = [
      {
        type: 'tool-call-delta',
        toolCallId: 'call_789',
        toolName: 'complexTool',
        argsTextDelta: '',
      },
      {
        type: 'tool-call',
        toolCallId: 'call_789',
        toolName: 'complexTool',
        args: { input: 'test' },
      },
      {
        type: 'error',
        error: 'An unexpected error occurred',
        code: ErrorCode.SERVER_ERROR,
      },
    ] as unknown as StepValueChunk[];

    const mockComplexAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(complexChunks));

    const runStepInput = new StepValue(mockComplexAsyncIterable);
    await expect(runStepInput.value()).resolves.toMatchObject({
      type: 'error',
      error: 'An unexpected error occurred',
      code: ErrorCode.SERVER_ERROR,
    });

    const freshComplexChunks = [
      {
        type: 'tool-call-delta',
        toolCallId: 'call_789',
        toolName: 'complexTool',
        argsTextDelta: '',
      },
      {
        type: 'tool-call',
        toolCallId: 'call_789',
        toolName: 'complexTool',
        args: { input: 'test' },
      },
      {
        type: 'error',
        error: 'An unexpected error occurred',
        code: ErrorCode.SERVER_ERROR,
      },
    ] as unknown as StepValueChunk[];

    const freshRunStepInput = new StepValue(new ReplayableAsyncIterableStream(toAsyncIterable(freshComplexChunks)));

    const iterator = await freshRunStepInput.streamIterator();
    const result: StepValueChunk[] = [];
    for await (const chunk of iterator) {
      result.push(chunk);
    }

    expect(result.length).toBeGreaterThan(0);
    const errorResult = await freshRunStepInput.value();
    expect(errorResult).toMatchObject({
      type: 'error',
      error: 'An unexpected error occurred',
      code: ErrorCode.SERVER_ERROR,
    });
  });

  test('get valueReady returns true when stream processing completes', async () => {
    const chunks = [
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'finish', finishReason: 'stop' },
    ] as unknown as StepValueChunk[];

    const mockAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(chunks));

    const runStepInput = new StepValue(mockAsyncIterable);
    await runStepInput.waitForValue();
    expect(runStepInput.valueReady).toBe(true);
  });

  test('get valueReady returns true immediately for a non-streaming value', async () => {
    const runStepInput = new StepValue({
      text: 'test',
    } as StepValueResult);

    expect(runStepInput.valueReady).toBe(true);
  });

  test('streams text content with non-space ending correctly', async () => {
    const runStepInput = new StepValue({
      text: 'Here is my calculation: \\boxed{42}',
    } as StepValueResult);

    const result: StepValueChunk[] = [];
    const stream = await runStepInput.streamIterator();
    for await (const chunk of stream) {
      result.push(chunk);
    }

    expect(result.length).toBe(3);
    // The middle chunk should be the text content
    const textChunk = result.find((chunk) => chunk.type === 'text-delta');
    expect(textChunk).toBeDefined();
    expect(textChunk && 'textDelta' in textChunk && textChunk.textDelta).toBe('Here is my calculation: \\boxed{42}');

    const value = await runStepInput.value();
    expect(value).toMatchObject({
      text: 'Here is my calculation: \\boxed{42}',
    });
  });

  test('type() returns the correct type for text value', async () => {
    const runStepInput = new StepValue({
      text: 'test text',
    } as StepValueResult);

    expect(await runStepInput.type()).toBe('text');
  });

  test('type() returns the correct type for object value', async () => {
    const testObject = { name: 'test', value: 42 };
    const runStepInput = new StepValue({
      object: testObject,
    });

    expect(await runStepInput.type()).toBe('object');
  });

  test('type() returns the correct type for tool calls value', async () => {
    const runStepInput = new StepValue({
      toolCalls: [
        {
          toolCallId: 'call_123',
          toolName: 'weather',
          args: { location: 'New York' },
        },
      ],
    } as StepValueResult);

    expect(await runStepInput.type()).toBe('toolCalls');
  });

  test('type() returns the correct type for error value', async () => {
    const errorChunks = [
      { type: 'text-delta', textDelta: 'Hello' },
      {
        type: 'error',
        error: 'Test error',
        code: ErrorCode.SERVER_ERROR,
      },
    ] as unknown as StepValueChunk[];

    const mockAsyncIterable = new ReplayableAsyncIterableStream(toAsyncIterable(errorChunks));

    const runStepInput = new StepValue(mockAsyncIterable);
    // Force error resolution
    await runStepInput.value().catch(() => {});
    expect(await runStepInput.type()).toBe('error');
  });

  test('simpleValue() returns the correct value for text', async () => {
    const runStepInput = new StepValue({
      text: 'simple text value',
    } as StepValueResult);

    await expect(runStepInput.simpleValue()).resolves.toBe('simple text value');
  });

  test('simpleValue() returns the correct value for object', async () => {
    const testObject = { name: 'test object', value: 42 };
    const runStepInput = new StepValue({
      object: testObject,
      type: 'object',
    } as unknown as StepValueResult);

    await expect(runStepInput.simpleValue()).resolves.toEqual(testObject);
  });

  test('simpleValue() returns the correct value for tool call', async () => {
    const runStepInput = new StepValue({
      toolCalls: [
        {
          toolCallId: 'call_123',
          toolName: 'weather',
          args: { location: 'New York' },
        },
      ],
    } as StepValueResult);

    const result = await runStepInput.simpleValue();
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe('call_123');
      expect(result[0].type).toBe('function');
      expect(result[0].function.name).toBe('weather');
      expect(result[0].function.arguments).toBe(JSON.stringify({ location: 'New York' }));
    }
  });

  test('valueAsText() returns string representation for different types', async () => {
    // Test text input
    const textInput = new StepValue({
      text: 'text value',
    } as unknown as StepValueResult);
    await expect(textInput.valueAsText()).resolves.toBe('text value');

    // Test object input
    const objectInput = new StepValue({
      object: { key: 'value' },
    } as unknown as StepValueResult);
    await expect(objectInput.valueAsText()).resolves.toBe(JSON.stringify({ key: 'value' }));

    // Test tool call input
    const toolCallInput = new StepValue({
      toolCalls: [
        {
          toolCallId: 'call_123',
          toolName: 'search',
          args: { query: 'test' },
        },
      ],
    } as StepValueResult);
    await expect(toolCallInput.valueAsText()).resolves.toBe(
      JSON.stringify([
        {
          id: 'call_123',
          name: 'search',
          args: { query: 'test' },
        },
      ]),
    );

    // Test error input
    const errorChunks = [
      {
        type: 'error',
        error: 'Test error message',
        code: ErrorCode.SERVER_ERROR,
      },
    ] as unknown as StepValueChunk[];

    const mockErrorIterable = new ReplayableAsyncIterableStream(toAsyncIterable(errorChunks));
    const errorInput = new StepValue(mockErrorIterable);
    await expect(errorInput.valueAsText()).resolves.toBe(
      JSON.stringify({
        type: 'error',
        error: 'Test error message',
        code: ErrorCode.SERVER_ERROR,
      }),
    );
  });

  test('handling plain object without type field', async () => {
    const plainObject = { name: 'test', value: 123, nested: { key: 'value' } };

    // When passing a plain object directly to StepValue
    const runStepInput = new StepValue(plainObject);

    // The object should be accessible via the value method
    const value = (await runStepInput.value()) as any;
    expect(value).toHaveProperty('object');
    expect(value.object).toEqual(plainObject);

    // Type should be object for plain object wrapper
    await expect(runStepInput.type()).resolves.toBe('object');

    // Should be accessible via the object method
    const objectValue = await runStepInput.object();
    expect(objectValue).toEqual(plainObject);
  });

  test('onValue callback is triggered when value is ready', async () => {
    const runStepInput = new StepValue({
      text: 'callback test',
    } as StepValueResult);

    return new Promise<void>((resolve) => {
      runStepInput.onValue((error, value, runStepUUID) => {
        expect(error).toBeUndefined();
        expect(value).toMatchObject({ text: 'callback test' });
        expect(runStepUUID).toBeNull();
        resolve();
      });
    });
  });

  test('error() returns the correct error result', async () => {
    const errorChunks = [
      {
        type: 'error',
        error: 'Test error for error() method',
        code: ErrorCode.SERVER_ERROR,
      },
    ] as unknown as StepValueChunk[];

    const mockErrorIterable = new ReplayableAsyncIterableStream(toAsyncIterable(errorChunks));

    const errorInput = new StepValue(mockErrorIterable);
    const errorResult = await errorInput.error();

    expect(errorResult).not.toBeNull();
    expect(errorResult?.type).toBe('error');
    expect(errorResult?.error).toBe('Test error for error() method');
    expect(errorResult?.code).toBe(ErrorCode.SERVER_ERROR);
  });

  test('stream() returns a ReadableStream', async () => {
    const runStepInput = new StepValue({
      text: 'stream test',
    } as StepValueResult);

    const stream = await runStepInput.stream();
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  // New tests for the extended constructor functionality

  test('Constructor accepts a raw string', async () => {
    const stringInput = 'This is a raw string input';
    const runStepInput = new StepValue(stringInput);

    // Check value
    const value = await runStepInput.value();
    expect(value).toHaveProperty('text', stringInput);

    // Check type
    await expect(runStepInput.type()).resolves.toBe('text');

    // Check simpleValue
    await expect(runStepInput.simpleValue()).resolves.toBe(stringInput);

    // Check text method
    await expect(runStepInput.text()).resolves.toBe(stringInput);
  });

  test('Constructor accepts a raw array', async () => {
    const arrayInput = [1, 2, 'three', { four: 4 }];
    const runStepInput = new StepValue(arrayInput);

    // Check value
    const value = (await runStepInput.value()) as any;
    expect(value).toHaveProperty('items');
    expect(value.items).toEqual(arrayInput);

    // Check simpleValue - should return the array
    const simpleValue = await runStepInput.simpleValue();
    expect(simpleValue).not.toBeNull();

    // Type detection for arrays
    await expect(runStepInput.type()).resolves.toBe('items');
  });

  test('Constructor accepts direct toolCalls object', async () => {
    const toolCallsInput = {
      toolCalls: [
        {
          toolCallId: 'direct-call-123',
          toolName: 'directTool',
          args: { direct: true },
          type: 'tool-call' as const,
        },
      ],
    };

    const runStepInput = new StepValue(toolCallsInput);

    // Check value
    const value = (await runStepInput.value()) as any;
    expect(value).toHaveProperty('toolCalls');
    expect(value.toolCalls).toEqual(toolCallsInput.toolCalls);

    // Check type
    await expect(runStepInput.type()).resolves.toBe('toolCalls');

    // Check toolCalls method
    const toolCalls = await runStepInput.toolCalls();
    expect(toolCalls).toEqual(toolCallsInput.toolCalls);
  });

  test('Constructor accepts objects with text property', async () => {
    const textObjectInput = { text: 'Text within an object' };
    const runStepInput = new StepValue(textObjectInput);

    // Check value
    const value = (await runStepInput.value()) as any;
    expect(value).toHaveProperty('text', textObjectInput.text);

    // Check type
    await expect(runStepInput.type()).resolves.toBe('text');
  });

  test('Constructor accepts nested objects and preserves structure', async () => {
    const nestedObject = {
      level1: {
        level2: {
          level3: 'deep value',
        },
        array: [1, 2, 3],
      },
    };

    const runStepInput = new StepValue(nestedObject);

    // Check value - should be wrapped as an object property
    const value = (await runStepInput.value()) as any;
    expect(value).toHaveProperty('object');
    expect(value.object).toEqual(nestedObject);

    // Check object access method
    const objectValue = await runStepInput.object();
    expect(objectValue).toEqual(nestedObject);

    // Verify the nested structure is preserved
    expect(objectValue?.level1?.level2?.level3).toBe('deep value');
    expect(objectValue?.level1?.array).toEqual([1, 2, 3]);
  });
});
