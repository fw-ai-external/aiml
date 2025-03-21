import { createElementDefinition } from '../createElementFactory';

import {
  type DataElementMetadata as ImportedDataElementMetadata,
  type JSONSchema as ImportedJSONSchema,
  ValueType,
  dataConfig,
  validateValueType,
} from '@fireworks/shared';

// Re-export for backward compatibility
export { ValueType };
export type DataElementMetadata = ImportedDataElementMetadata;
export type JSONSchema = ImportedJSONSchema;

export const Data = createElementDefinition({
  ...dataConfig,
  tag: 'data' as const,
  role: 'state' as const,
  elementType: 'data' as const,
  allowedChildren: 'none' as const,
  async execute(ctx) {
    const {
      id,
      src,
      expr,
      content,
      type = ValueType.STRING,
      readonly = false,
      fromRequest = false,
      defaultValue,
      schema,
    } = ctx.props;

    // If fromRequest is true, readonly should also be true
    const isReadonly = readonly || fromRequest;

    if (!id) {
      throw new Error("Data element requires an 'id' attribute");
    }

    try {
      let value;
      if (src) {
        // Load data from external source
        try {
          const response = await fetch(src);
          value = await response.json();
        } catch (error) {
          console.error(`Error fetching data from ${src}:`, error);
          return {
            result: ctx.input,
            exception: error instanceof Error ? error : new Error(String(error)),
          };
        }
      } else if (expr) {
        // Evaluate expression and assign result
        try {
          // Use a safer approach for expression evaluation
          try {
            // Get the scoped data model
            const scopedModel = (ctx as any).scopedDataModel;
            if (!scopedModel) {
              throw new Error('No scoped data model available in context');
            }

            // Get all variables from the scoped data model
            const variables = scopedModel.getAllVariables();

            // Create a function with the variables as parameters
            const fn = new Function(...Object.keys(variables), `return ${expr}`);

            // Call the function with the variable values
            value = fn(...Object.values(variables));
          } catch (evalError) {
            // If the expression fails, log and use default
            console.error(`Error evaluating expression: ${evalError}`);
            return {
              result: ctx.input,
              exception: evalError instanceof Error ? evalError : new Error(String(evalError)),
            };
          }
        } catch (error) {
          console.error(`Error evaluating expression ${expr}:`, error);
          return {
            result: ctx.input,
            exception: error instanceof Error ? error : new Error(String(error)),
          };
        }
      } else if (content) {
        // If no src or expr, use the text content as a JSON string
        try {
          const textContent = content.trim();
          value = textContent ? JSON.parse(textContent) : null;
        } catch (error) {
          console.error(`Error parsing content as JSON:`, error);
          return {
            result: ctx.input,
            exception: error instanceof Error ? error : new Error(String(error)),
          };
        }
      } else if (fromRequest) {
        // Get value from the request context
        value = ctx.requestInput.userMessage;
      } else if (defaultValue !== undefined) {
        // Use default value if provided
        value = defaultValue;
      } else {
        // This should not happen due to the schema refinement, but just in case
        return {
          result: ctx.input,
          exception: new Error('No value provided for data element'),
        };
      }

      // Validate value against type and schema
      try {
        value = validateValueType(value, type, schema as JSONSchema);
      } catch (error) {
        return {
          result: ctx.input,
          exception: error instanceof Error ? error : new Error(String(error)),
        };
      }

      // Store metadata about the data element
      const metadata: DataElementMetadata = {
        type,
        readonly: isReadonly, // Use the calculated readonly value
        id,
        fromRequest,
        parentStateId: ctx.state?.id || null,
        schema: schema as JSONSchema,
      };

      // Get scoped data model and set value with metadata
      const scopedModel = (ctx as any).scopedDataModel;
      if (!scopedModel) {
        throw new Error('No scoped data model available in context');
      }
      scopedModel.setValue(id, value, metadata);

      return { result: ctx.input };
    } catch (error) {
      return {
        result: ctx.input,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
