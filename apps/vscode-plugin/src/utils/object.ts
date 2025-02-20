import dot from "dot-object";
export class DotObject {
  constructor(private obj: Record<string, any>) {}

  get(key: string) {
    dot.keepArray = true;

    return dot.pick(key, this.obj);
  }

  set(key: string, value: any) {
    dot.set(key, value, this.obj);
  }

  delete(key: string) {
    dot.delete(key, this.obj);
  }

  push(key: string, value: any) {
    dot.keepArray = true;

    const current = dot.pick(key, this.obj);
    if (current && !Array.isArray(current)) {
      throw new Error(`${key} is not an array`);
    }
    dot.set(key, [...current, value], this.obj);
  }

  values() {
    return deepValues(this.obj, true);
  }
}

/**
 * Get all values from an object that are strings or numbers, or arrays of strings or numbers
 * by calling Object.values recursively on all values that are objects, and optionally including arrays
 * @param obj
 * @param includeArrays
 * @returns
 */
export function deepValues(obj: Record<string, any>, includeArrays = false) {
  const values: (string | number | string[] | number[])[] = [];

  function traverse(obj: Record<string, any>) {
    for (const value of Object.values(obj)) {
      if (typeof value === "string" || typeof value === "number") {
        values.push(value);
      } else if (Array.isArray(value) && includeArrays) {
        if (value.every((v) => typeof v === "string")) {
          values.push(value as string[]);
        } else if (value.every((v) => typeof v === "number")) {
          values.push(value as number[]);
        }
      } else if (typeof value === "object" && value !== null) {
        traverse(value);
      }
    }
  }

  traverse(obj);
  return values;
}
