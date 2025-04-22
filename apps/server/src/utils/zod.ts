// Not sure the right way to fix these types - but want to unblock other efforts
// @ts-nocheck
import Anthropic from '@anthropic-ai/sdk';
import { ZodError, ZodSchema, z } from 'zod';
import { JsonSchema7Type, getRefs, zodToJsonSchema } from 'zod-to-json-schema';
import { fromError } from 'zod-validation-error';

export function zodSchemaToToolSchema(zodSchema: ZodSchema): Anthropic.Messages.Tool.InputSchema {
  return omit(
    zodToJsonSchema(zodSchema as any, getRefs({ errorMessages: true, $refStrategy: 'none' })),
    '$ref',
    '$schema',
    'default',
    'definitions',
    'description',
    'markdownDescription',
  ) as Anthropic.Messages.Tool.InputSchema;
}

function omit(schema: any, ...keys: string[]) {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => !keys.includes(key)));
}

export function formatZodError(error: ZodError) {
  try {
    if ('errors' in error) {
      return error.errors.map((err) => {
        return fromError(err);
      });
    } else {
      return [fromError(error)];
    }
  } catch (e) {
    console.log('formatZodError', e);
  }
}

export function convertJsonSchemaToZod(schema: JsonSchema7Type): z.ZodType<any> {
  if (typeof schema === 'boolean') {
    return schema ? z.any() : z.never();
  }

  if (!('type' in schema)) {
    return z.any();
  }

  if ('enum' in schema) {
    return z.enum(schema.enum as [string, ...string[]]);
  }

  let zodSchema: any;

  if (Array.isArray(schema.type)) {
    zodSchema = z.union(schema.type.map((type) => convertJsonSchemaToZod({ ...schema, type }) as any) as any);
  } else {
    switch (schema.type) {
      case 'string':
        zodSchema = z.string();
        if ('pattern' in schema) {
          if (schema.minLength) zodSchema = zodSchema.min(schema.minLength);
          if (schema.maxLength) zodSchema = zodSchema.max(schema.maxLength);
          if (schema.pattern) zodSchema = zodSchema.regex(new RegExp(schema.pattern));
          if (schema.format === 'email') zodSchema = zodSchema.email();
          if (schema.format === 'uri') zodSchema = zodSchema.url();
        }
        break;

      case 'number':
      case 'integer':
        if ('minimum' in schema) {
          zodSchema = schema.type === 'integer' ? z.number().int() : z.number();
          if (schema.minimum !== undefined) zodSchema = zodSchema.min(schema.minimum);
          if (schema.maximum !== undefined) zodSchema = zodSchema.max(schema.maximum);
        }
        break;

      case 'boolean':
        zodSchema = z.boolean();
        break;

      case 'null':
        zodSchema = z.null();
        break;

      case 'array':
        zodSchema = schema.items
          ? Array.isArray(schema.items)
            ? z.tuple(schema.items.map((item) => convertJsonSchemaToZod(item)))
            : z.array(convertJsonSchemaToZod(schema.items))
          : z.array(z.unknown());
        break;

      case 'object':
        const shape: Record<string, z.ZodType<any>> = {};
        if (schema.properties) {
          for (const [key, value] of Object.entries(schema.properties)) {
            shape[key] = convertJsonSchemaToZod(value);
          }
        }
        zodSchema = z.object(shape);
        if (schema.required) {
          const requiredShape: Record<string, z.ZodType<any>> = {};
          for (const key of schema.required) {
            if (shape[key]) {
              requiredShape[key] = shape[key];
            }
          }
          zodSchema = zodSchema.extend(requiredShape);
        }
        break;

      default:
        if (schema.enum) {
          zodSchema = z.enum(schema.enum as [string, ...string[]]);
        } else if (schema.const !== undefined) {
          zodSchema = z.literal(schema.const);
        } else if (schema.anyOf) {
          zodSchema = z.union(schema.anyOf.map(convertJsonSchemaToZod));
        } else if (schema.allOf) {
          zodSchema = z.intersection(schema.allOf.map(convertJsonSchemaToZod));
        } else {
          zodSchema = z.unknown();
        }
    }
  }

  // Add description if present
  if (schema.description) {
    zodSchema = zodSchema.describe(schema.description);
  }

  return zodSchema;
}
