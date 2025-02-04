import { describe, expect, test } from 'vitest';
import { CompositionError } from './index';

describe('CompositionError', () => {
  test('should be able to capture children errors', () => {
    const error = new CompositionError('test', { childrenError: ['parent', 'child'] });
    expect(error.asUserError()).toBeInstanceOf(Error);
    expect(error.asUserError().message).toBe('child is not a valid child for parent');
  });

  test('should be able to capture multiple root elements', () => {
    const error = new CompositionError('test', { multipleRootElements: 2 });
    expect(error.asUserError()).toBeInstanceOf(Error);
    expect(error.asUserError().message).toBe('Root of a FireAgent machine can only be a single element, got 2 instead');
  });
});
