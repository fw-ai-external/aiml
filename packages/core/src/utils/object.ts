export function mapValues<P, O extends Record<string, unknown>>(
  collection: O,
  iteratee: (item: O[keyof O], key: keyof O, collection: O, i: number) => P
): { [key in keyof O]: P };
export function mapValues(
  collection: Record<string, unknown>,
  iteratee: (
    item: unknown,
    key: string,
    collection: Record<string, unknown>,
    i: number
  ) => unknown
) {
  const result: Record<string, unknown> = {};

  const collectionKeys = Object.keys(collection);
  for (let i = 0; i < collectionKeys.length; i++) {
    const key = collectionKeys[i];
    if (key === undefined) {
      throw new Error("Key cannot be undefined");
    }
    result[key] = iteratee(collection[key], key, collection, i);
  }

  return result;
}

export function atPath(obj: Record<string, any>, path: string[]): any {
  return path.reduce((acc, part) => {
    const value = acc && (acc["__NAMESPACED__" + part] || acc[part]);
    if (value === undefined && acc && Object.keys(acc).length > 0) {
      return null;
    }
    return value;
  }, obj);
}

export function setPath(
  obj: Record<string, any>,
  path: string[],
  value: any
): Record<string, any> {
  if (path.length === 0) return obj;

  const [first, ...rest] = path;
  const result = { ...obj };

  if (first === undefined) {
    throw new Error("Path cannot start with undefined");
  }

  if (rest.length === 0) {
    result[first] = value;
    return result;
  }

  result[first] = setPath(obj[first] || {}, rest, value);
  return result;
}
