import { JsonSchema7AnyType, JsonSchema7Type } from 'zod-to-json-schema';

export function generateDefaultFromSchema(schema: JsonSchema7AnyType): any {
  if ('default' in schema && schema.default !== undefined) {
    return schema.default;
  }

  if ('type' in schema) {
    switch (schema.type) {
      case 'object':
        const obj: Record<string, any> = {};
        if ('properties' in schema && typeof schema.properties === 'object' && schema.properties !== null) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (
              ('required' in schema && Array.isArray(schema.required) && schema.required.includes(key)) ||
              ('default' in propSchema && propSchema.default !== undefined)
            ) {
              obj[key] = generateDefaultFromSchema(propSchema as JsonSchema7AnyType);
            }
          }
        }
        return obj;
      case 'array':
        return 'items' in schema && schema.items ? [generateDefaultFromSchema(schema.items as JsonSchema7AnyType)] : [];

      case 'string':
        return '';

      case 'number':
      case 'integer':
        return 0;

      case 'boolean':
        return false;

      case 'null':
        return null;

      default:
        return undefined;
    }
  }
}

export function convertJsonSchemaToTsType(schema: JsonSchema7Type | JsonSchema7Type[]): string {
  function addComment(type: string, schema: JsonSchema7Type): string {
    const comments: string[] = [];
    if (schema.description) {
      comments.push(schema.description);
    }
    if (schema.default !== undefined) {
      comments.push(`Default: ${JSON.stringify(schema.default)}`);
    }
    if (comments.length > 0) {
      return `/** ${comments.join('. ')} */\n${type}`;
    }
    return type;
  }

  if ('enum' in schema && schema.enum) {
    return addComment(schema.enum.map((item) => (typeof item === 'string' ? `'${item}'` : item)).join(' | '), schema);
  }

  if (!('type' in schema)) {
    return 'any';
  }

  let type: string;
  switch (schema.type) {
    case 'string':
      type = 'string';
      break;
    case 'number':
    case 'integer':
      type = 'number';
      break;
    case 'boolean':
      type = 'boolean';
      break;
    case 'null':
      type = 'null';
      break;
    case 'array':
      if ('items' in schema && schema.items) {
        type = `Array<${convertJsonSchemaToTsType(schema.items)}>`;
      } else {
        type = 'any[]';
      }
      break;
    case 'object':
      if ('properties' in schema && schema.properties) {
        const properties = Object.entries(schema.properties).map(([key, value]) => {
          const isRequired = schema.required?.includes(key);
          const propertyType = convertJsonSchemaToTsType(value);
          return `${addComment(propertyType, value)}\n${key}${isRequired ? '' : '?'}: ${propertyType.split('\n').join('\n  ')}`;
        });
        type = `{\n  ${properties.join(';\n  ')}\n}`;
      } else {
        type = 'Record<string, any>';
      }
      break;
    default:
      type = 'any';
  }

  return addComment(type, schema);
}
