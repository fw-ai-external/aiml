import { describe, expect, it } from 'vitest';
import { atPath, setPath } from './object';

describe('object.atPath', () => {
  it('should show the right path', () => {
    const obj = { a: { b: { c: 'value' } } };
    const result = atPath(obj, ['a', 'b', 'c']);
    expect(result).toEqual('value');
  });

  it('when the path is not found, it should return null', () => {
    const obj = { a: { b: { c: 'value' } } };
    const result = atPath(obj, ['a', 'b', 'd']);
    expect(result).toEqual(null);
    expect(typeof result).toEqual('object');
  });

  it('should return undefined if the path to the target is not found', () => {
    const obj = {};
    expect(atPath(obj, ['a'])).toBe(undefined);
    expect(atPath(obj, ['a', 'b'])).toBe(undefined);
  });
});

describe('object.setPath', () => {
  it('should create and set the right path', () => {
    const obj = {};
    const result = setPath(obj, ['a', 'b', 'c'], 'value');
    expect(result).toEqual({ a: { b: { c: 'value' } } });
  });

  it('should set scalar at the right level', () => {
    const obj = { a: { b: { c: 'value' } }, d: 'irrelevant' };
    const result = setPath(obj, ['a', 'b', 'c'], 'value2');
    expect(result).toEqual({ a: { b: { c: 'value2' } }, d: 'irrelevant' });
  });
});
