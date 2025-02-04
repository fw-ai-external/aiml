export type SmooshedObjectUnion<T> = {
  [K in T extends infer P ? keyof P : never]: T extends infer P ? (K extends keyof P ? P[K] : never) : never;
};

/**
 * Finds the first object containing a specific key-value pair
 * @param obj The target object to search
 * @param key The key to find
 * @param value The value to match
 * @returns The object containing the key-value pair or undefined if not found
 */
export function deepFind<T extends object>(obj: T, key: string, value: any): object | undefined {
  const stack: any[] = [obj];
  const seen = new Set();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== 'object' || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (key in current && current[key] === value) {
      return current;
    }

    if (Array.isArray(current)) {
      for (let i = current.length - 1; i >= 0; i--) {
        stack.push(current[i]);
      }
    } else {
      for (const val of Object.values(current)) {
        stack.push(val);
      }
    }
  }

  return undefined;
}
