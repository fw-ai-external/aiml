import { describe, expect, it } from 'bun:test';
import { DotObject } from './object';

describe('DotObject', () => {
  it('should get nested values using dot notation', () => {
    const obj = new DotObject({
      user: {
        name: 'John',
        address: {
          city: 'New York',
        },
      },
    });

    expect(obj.get('user.name')).toBe('John');
    expect(obj.get('user.address.city')).toBe('New York');
  });

  it('should set nested values using dot notation', () => {
    const obj = new DotObject({
      user: {
        name: 'John',
      },
    });

    obj.set('user.age', 30);
    obj.set('user.address.city', 'New York');

    expect(obj.get('user.age')).toBe(30);
    expect(obj.get('user.address.city')).toBe('New York');
  });

  it('should delete nested values using dot notation', () => {
    const obj = new DotObject({
      user: {
        name: 'John',
        age: 30,
      },
    });

    obj.delete('user.age');

    expect(obj.get('user.age')).toBeUndefined();
    expect(obj.get('user.name')).toBe('John');
  });

  it('should push values to arrays using dot notation', () => {
    const obj = new DotObject({
      user: {
        hobbies: ['reading'],
      },
    });

    obj.push('user.hobbies', 'gaming');

    expect(obj.get('user.hobbies')).toEqual(['reading', 'gaming']);
  });

  it('should throw error when pushing to non-array', () => {
    const obj = new DotObject({
      user: {
        name: 'John',
      },
    });

    expect(() => obj.push('user.name', 'value')).toThrow('user.name is not an array');
  });

  it('should return all values of object', () => {
    const obj = new DotObject({
      user: {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'gaming'],
      },
      settings: {
        theme: 'dark',
      },
    });
    const values = obj.values();
    expect(values).toEqual(['John', 30, ['reading', 'gaming'], 'dark']);
  });
});
