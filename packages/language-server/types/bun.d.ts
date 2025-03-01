declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;

  export const expect: {
    <T>(actual: T): {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toBeDefined(): void;
      toBeInstanceOf(expected: any): void;
      toContain(expected: any): void;
      toMatch(expected: string | RegExp): void;
      toThrow(expected?: string | RegExp | Error): void;
      toHaveLength(expected: number): void;
      toHaveProperty(property: string, value?: any): void;
      toBeGreaterThan(expected: number): void;
      toBeGreaterThanOrEqual(expected: number): void;
      toBeLessThan(expected: number): void;
      toBeLessThanOrEqual(expected: number): void;
      toBeCloseTo(expected: number, precision?: number): void;
      not: any;
    };
  };
}
