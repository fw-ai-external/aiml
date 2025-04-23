// Source: https://github.com/AsyncBanana/microdiff

interface Difference {
  type: 'CREATE' | 'REMOVE' | 'CHANGE';
  path: (string | number)[];
  value?: any;
}
interface Options {
  cyclesFix: boolean;
}

const t = true;
const richTypes = { Date: t, RegExp: t, String: t, Number: t };

export function isEqual(oldObj: any, newObj: any): boolean {
  return (
    diff(
      {
        obj: oldObj,
      },
      { obj: newObj },
    ).length < 1
  );
}

export const isNotEqual = (oldObj: any, newObj: any) => !isEqual(oldObj, newObj);

function diff(
  obj: Record<string, any> | any[],
  newObj: Record<string, any> | any[],
  options: Partial<Options> = { cyclesFix: true },
  _stack: Record<string, any>[] = [],
): Difference[] {
  const diffs: Difference[] = [];
  const isObjArray = Array.isArray(obj);
  for (const key in obj) {
    const objKey = (obj as any)[key];
    const path = isObjArray ? Number(key) : key;
    if (!(key in newObj)) {
      diffs.push({
        type: 'REMOVE' as const,
        path: [path],
      });
      continue;
    }
    const newObjKey = (newObj as any)[key];
    const areObjects = typeof objKey === 'object' && typeof newObjKey === 'object';
    if (
      objKey &&
      newObjKey &&
      areObjects &&
      !richTypes[Object.getPrototypeOf(objKey).constructor.name as keyof typeof richTypes] &&
      (options.cyclesFix ? !_stack.includes(objKey) : true)
    ) {
      const nestedDiffs = diff(objKey, newObjKey, options, options.cyclesFix ? _stack.concat([objKey]) : []);
      // eslint-disable-next-line prefer-spread
      diffs.push.apply(
        diffs,
        nestedDiffs.map((difference) => {
          difference.path.unshift(path);

          return difference;
        }),
      );
    } else if (
      objKey !== newObjKey &&
      !(
        areObjects &&
        (Number.isNaN(objKey) ? String(objKey) === String(newObjKey) : Number(objKey) === Number(newObjKey))
      )
    ) {
      diffs.push({
        path: [path],
        type: 'CHANGE',
        value: newObjKey,
      });
    }
  }

  const isNewObjArray = Array.isArray(newObj);

  for (const key in newObj) {
    if (!(key in obj)) {
      diffs.push({
        type: 'CREATE',
        path: [isNewObjArray ? Number(key) : key],
        value: (newObj as any)[key],
      });
    }
  }

  return diffs;
}

export function stringDiff(str1: string, str2: string): string {
  let result = '';
  let i = 0;
  let j = 0;

  const MIN_CONTEXT = 30;

  function getContext(str: string, index: number, length: number, isPrefix: boolean): string {
    if (isPrefix) {
      const start = Math.max(0, index - length);
      return str.slice(start, index);
    } else {
      const end = Math.min(str.length, index + length);
      return str.slice(index, end);
    }
  }

  while (i < str1.length && j < str2.length) {
    if (str1[i] !== str2[j]) {
      const diffStart = j;
      while (j < str2.length && str1[i] !== str2[j]) {
        j++;
      }

      const prefixContext = getContext(str1, i, MIN_CONTEXT, true);
      const suffixContext = getContext(str1, i, MIN_CONTEXT, false);

      result += `${prefixContext}||++||${str2.slice(diffStart, j)}||++||${suffixContext}`;
      i = j;
    } else {
      i++;
      j++;
    }
  }

  if (j < str2.length) {
    const prefixContext = getContext(str1, str1.length, MIN_CONTEXT, true);
    result += `${prefixContext}||++||${str2.slice(j)}||++||`;
  }

  return result || str1;
}
