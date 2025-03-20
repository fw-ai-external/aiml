import { z } from "zod";
import { createElementDefinition, StepValue } from "@fireworks/shared";
import type { BaseElement } from "@fireworks/shared";
import type { ElementExecutionContext } from "@fireworks/types";
import { dataConfig } from "@fireworks/element-config";

import {
  ValueType,
  DataElementMetadata as ImportedDataElementMetadata,
  JSONSchema as ImportedJSONSchema,
  validateValueType as validateValueTypeImported,
  getDefaultForType as getDefaultForTypeImported,
} from "@fireworks/types";
import { ExecutionReturnType } from "@fireworks/types";

// Re-export for backward compatibility
export { ValueType };
export type DataElementMetadata = ImportedDataElementMetadata;
export type JSONSchema = ImportedJSONSchema;

// Use the imported functions but provide wrappers for backward compatibility
export function validateValueType(
  value: any,
  type: ValueType | string,
  schema?: JSONSchema
): any {
  return validateValueTypeImported(value, type, schema);
}

export function getDefaultForType(
  type: ValueType | string,
  schema?: JSONSchema
): any {
  return getDefaultForTypeImported(type, schema);
}

// Define our own schema that extends the dataConfig schema
const dataSchema = z.object({
  id: z.string(),
  src: z.string().optional(),
  expr: z.string().optional(),
  content: z.string().optional(),
  type: z
    .enum([
      ValueType.STRING,
      ValueType.NUMBER,
      ValueType.BOOLEAN,
      ValueType.JSON,
    ])
    .default(ValueType.STRING),
  readonly: z.boolean().default(false),
  fromRequest: z.boolean().default(false),
  defaultValue: z.any().optional(),
  schema: z.any().optional(), // Schema for JSON type
});

type DataProps = z.infer<typeof dataSchema>;

export const Data = createElementDefinition({
  ...dataConfig,
  tag: "data" as const,
  role: "state" as const,
  elementType: "data" as const,
  propsSchema: dataSchema as z.ZodType<DataProps>,
  allowedChildren: "none" as const,
  async execute(
    ctx: ElementExecutionContext<DataProps>,
    childrenNodes: BaseElement[]
  ): Promise<ExecutionReturnType> {
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
    } = ctx.attributes;

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
          value =
            defaultValue !== undefined ? defaultValue : getDefaultForType(type);
        }
      } else if (expr) {
        // Evaluate expression and assign result
        try {
          // Use a safer approach for expression evaluation
          try {
            // Get the scoped data model
            const scopedModel = (ctx as any).scopedDataModel;
            if (!scopedModel) {
              throw new Error("No scoped data model available in context");
            }

            // Get all variables from the scoped data model
            const variables = scopedModel.getAllVariables();

            // Create a function with the variables as parameters
            const fn = new Function(
              ...Object.keys(variables),
              `return ${expr}`
            );

            // Call the function with the variable values
            value = fn(...Object.values(variables));
          } catch (evalError) {
            // If the expression fails, log and use default
            console.error(`Error evaluating expression: ${evalError}`);
            value =
              defaultValue !== undefined
                ? defaultValue
                : getDefaultForType(type);
          }
        } catch (error) {
          console.error(`Error evaluating expression ${expr}:`, error);
          value =
            defaultValue !== undefined ? defaultValue : getDefaultForType(type);
        }
      } else if (content) {
        // If no src or expr, use the text content as a JSON string
        try {
          const textContent = content.trim();
          value = textContent ? JSON.parse(textContent) : null;
        } catch (error) {
          console.error(`Error parsing content as JSON:`, error);
          value =
            defaultValue !== undefined ? defaultValue : getDefaultForType(type);
        }
      } else if (fromRequest) {
        // Get value from the request context
        value = ctx.workflowInput.userMessage;
      } else if (defaultValue !== undefined) {
        // Use default value if provided
        value = defaultValue;
      } else {
        // This should not happen due to the schema refinement, but just in case
        throw new Error(
          "Either fromRequest must be true or expr/src must be set"
        );
      }

      // Validate value against type and schema
      try {
        value = validateValueType(value, type, schema as JSONSchema);
      } catch (error) {
        console.error(`Type validation error for ${id}:`, error);
        value = getDefaultForType(type, schema as JSONSchema);
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
        throw new Error("No scoped data model available in context");
      }
      scopedModel.setValue(id, value, metadata);

      const result = new StepValue({
        type: "object",
        object: { id, value, metadata },
      });

      return { result };
    } catch (error) {
      const result = new StepValue({
        type: "error",
        code: "DATA_ERROR",
        error: `Failed to process data element: ${error}`,
      });

      return {
        result,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});
