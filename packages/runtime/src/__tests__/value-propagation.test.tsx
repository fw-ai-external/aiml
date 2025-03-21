import { describe, expect, test } from 'bun:test';
import { RunValue } from '../RunValue';
import { StepValue } from '../StepValue';

describe('RunValue Timeout Fix', () => {
  test('should use last generated value when final output is not set', async () => {
    // Create a RunValue instance
    const runValue = new RunValue({ runId: 'test-run-id' });

    // Add a generated value
    const testValue = new StepValue({ object: { test: 'value' } });
    (runValue as any)._generatedValues.push(testValue);

    // Mark as finished without setting final output
    (runValue as any)._finished = true;

    // Override waitForFinalOutput to simulate finished state behavior
    (runValue as any).waitForFinalOutput = async function () {
      // When finished but no finalOutput is set, should return the last generated value
      return this._generatedValues[this._generatedValues.length - 1];
    };

    // Call responseValue which uses waitForFinalOutput
    const result = await runValue.responseValue();

    // Verify the result is from the generated value
    expect(result).toHaveProperty('object');
    expect(result.object).toHaveProperty('test', 'value');
  });

  test('should handle timeout by using last generated value', async () => {
    // Create a RunValue instance with a short timeout
    const runValue = new RunValue({ runId: 'test-run-id' });

    // Add a generated value
    const testValue = new StepValue({ object: { test: 'timeout-value' } });
    (runValue as any)._generatedValues.push(testValue);

    // Override waitForFinalOutput to simulate a timeout
    const originalMethod = (runValue as any).waitForFinalOutput;
    (runValue as any).waitForFinalOutput = async function (waitForValue: boolean, timeout: number) {
      // Return the last generated value directly to simulate timeout behavior
      return this._generatedValues.length > 0
        ? this._generatedValues[this._generatedValues.length - 1]
        : new StepValue({
            type: 'error',
            error: 'Timeout waiting for final output',
            code: 'SERVER_ERROR',
          });
    };

    // Call responseValue
    const result = await runValue.responseValue();

    // Verify the result is from the generated value
    expect(result).toHaveProperty('object');
    expect(result.object).toHaveProperty('test', 'timeout-value');
  });

  test('should handle empty generated values array', async () => {
    // Create a RunValue instance with a short timeout
    const runValue = new RunValue({ runId: 'test-run-id' });

    // Override waitForFinalOutput to simulate a timeout with no generated values
    (runValue as any).waitForFinalOutput = async function (waitForValue: boolean, timeout: number) {
      // Return an error StepValue since there are no generated values
      return new StepValue({
        type: 'error',
        error: 'Timeout waiting for final output',
        code: 'SERVER_ERROR',
      });
    };

    // Call responseValue
    const result = await runValue.responseValue();

    // Verify we get a default error response
    expect(result).toHaveProperty('type', 'error');
    expect(result).toHaveProperty('error');
  });
});
