import { type Effect, ZodType, type ZodTypeDef, z } from "zod";
import { ZodObject } from "zod";
import {
  type AnyZodObject,
  type UnknownKeysParam,
  type ZodEffects,
  type ZodError,
  type ZodRawShape,
  type ZodTypeAny,
  type objectInputType,
  type objectOutputType,
} from "zod";
import { fromError } from "zod-validation-error";

export const mergeWithEffect = <
  Incoming extends AnyZodObject,
  T extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = UnknownKeysParam,
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<T, Catchall, UnknownKeys>,
  Input = objectInputType<T, Catchall, UnknownKeys>,
>(
  a: ZodEffects<ZodObject<T, UnknownKeys, Catchall, Output, Input>>,
  b: Incoming
) => {
  return addEffect(a.innerType().merge(b), a._def.effect);
};

export const mergeWithEffects = <
  aT extends ZodRawShape,
  bT extends ZodRawShape,
  aUnknownKeys extends UnknownKeysParam = UnknownKeysParam,
  aCatchall extends ZodTypeAny = ZodTypeAny,
  bUnknownKeys extends UnknownKeysParam = UnknownKeysParam,
  bCatchall extends ZodTypeAny = ZodTypeAny,
  aOutput = objectOutputType<aT, aCatchall, aUnknownKeys>,
  aInput = objectInputType<aT, aCatchall, aUnknownKeys>,
  bOutput extends { [x: string]: unknown } = objectOutputType<
    bT,
    bCatchall,
    bUnknownKeys
  >,
  bInput extends { [x: string]: unknown } = objectInputType<
    bT,
    bCatchall,
    bUnknownKeys
  >,
>(
  a: ZodEffects<ZodObject<aT, aUnknownKeys, aCatchall, aOutput, aInput>>,
  b: ZodEffects<ZodObject<bT, bUnknownKeys, bCatchall, bOutput, bInput>>
) => {
  const base = a.innerType().merge(b.innerType());
  return addEffect(addEffect(base, a._def.effect), b._def.effect);
};

export const addEffect = <
  Output = unknown,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
  Base extends ZodType<Output, Def, Input> = ZodType<Output, Def, Input>,
>(
  base: Base,
  effect: Effect<unknown>
) => {
  switch (effect.type) {
    case "preprocess":
      return z.preprocess(effect.transform, base);
    case "transform":
      return base.transform(effect.transform);
    case "refinement":
      return base.superRefine(effect.refinement);
  }
};
export function formatZodError(error: ZodError) {
  try {
    if ("errors" in error) {
      return error.errors.map((err) => {
        if (err.message === "Required") {
          return `${err.path.join(".")} is required but not provided in element's props`;
        }
        if (err.code === "unrecognized_keys") {
          return `Unrecognized keys in element's props: ${err.keys.join(", ")}`;
        }
        let errorString = fromError(error).toString();
        if (errorString === "Unknown error") {
          errorString = JSON.stringify(error);
        }
        return errorString;
      });
    } else {
      let errorString = fromError(error).toString();
      if (errorString === "Unknown error") {
        errorString = JSON.stringify(error);
      }

      return [fromError(error).toString()];
    }
  } catch (e) {
    console.error("formatZodError", e);
    return null;
  }
}
