import { describe, expect, it } from 'vitest';
import { encodeRemoteImage } from './image';

describe('image', () => {
  it('should encode remote image', async () => {
    const encodedImage = await encodeRemoteImage(
      'https://raw.githubusercontent.com/github/explore/main/topics/python/python.png',
    );
    expect(encodedImage).toBeDefined();
    expect(encodedImage).toBeTypeOf('string');
  });
});
