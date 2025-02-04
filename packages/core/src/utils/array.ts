export function typeFilter<T, R extends T>(a: T[], f: (e: T) => e is R): R[] {
  const r: R[] = [];
  a.forEach((e) => {
    if (f(e)) r.push(e);
  });
  return r;
}
