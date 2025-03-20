import { z } from "zod";
import { createElementDefinition } from "@fireworks/shared";
import type { ElementExecutionContext } from "@fireworks/types";
import { StepValue } from "@fireworks/shared";
import type { BaseElement } from "@fireworks/shared";
import { dataModelConfig } from "@fireworks/element-config";
import {
  ValueType,
  DataElementMetadata,
  validateValueType,
  getDefaultForType,
} from "@fireworks/types";
import type { ScopedDataModel } from "./ScopedDataModel";
import { ExecutionReturnType } from "@fireworks/types";

const dataModelSchema = z.object({
  id: z.string().optional(),
});

type DataModelProps = z.infer<typeof dataModelSchema>;

export const DataModel = createElementDefinition<DataModelProps>({
  ...dataModelConfig,
  tag: "datamodel" as const,
  role: "state" as const,
  elementType: "datamodel" as const,
  propsSchema: dataModelSchema,
  allowedChildren: ["data"] as const,

  async execute(
    ctx: ElementExecutionContext<DataModelProps>,
    childrenNodes: BaseElement[]
  ): Promise<ExecutionReturnType> {
    try {
      // Get the scoped data model
      const scopedModel = (ctx as any).scopedDataModel as ScopedDataModel;
      if (!scopedModel) {
        throw new Error("No scoped data model available in context");
      }

      // Initialize data elements
      const dataElements = childrenNodes.filter(
        (child) => child.elementType === "data"
      );

      // Process all data elements
      for (const data of dataElements) {
        await initializeDataElement(data, ctx);
      }

      // Validate the entire model
      validateDataModel(ctx);

      const result = new StepValue({
        type: "object",
        object: { initialized: true },
      });

      return { result };
    } catch (error) {
      console.error("Error in datamodel element:", error);
      const result = new StepValue({
        type: "error",
        code: "DATAMODEL_ERROR",
        error: `Failed to initialize datamodel: ${error}`,
      });

      return {
        result,
        exception: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
});

async function initializeDataElement(
  element: BaseElement,
  ctx: ElementExecutionContext<DataModelProps>
): Promise<void> {
  const id = element.id;
  const expr = element.attributes["expr"];
  const src = element.attributes["src"];
  const content = element.attributes["content"];
  const type = element.attributes["type"] || ValueType.STRING;
  const readonly = element.attributes["readonly"] || false;
  const fromRequest = element.attributes["fromRequest"] || false;
  const defaultValue = element.attributes["defaultValue"];

  // If fromRequest is true, readonly should also be true
  const isReadonly = readonly || fromRequest;

  let value;

  if (src) {
    try {
      const response = await fetch(src);
      value = await response.json();
    } catch (error) {
      console.error(`Error fetching data from ${src}:`, error);
      value =
        defaultValue !== undefined ? defaultValue : getDefaultForType(type);
    }
  } else if (expr) {
    try {
      // Create a function that evaluates expressions in the context of the datamodel
      const allVars = (ctx as any).scopedDataModel.getAllVariables();
      const fn = new Function(...Object.keys(allVars), `return ${expr}`);
      value = fn(...Object.values(allVars));
    } catch (error) {
      console.error(
        `Error evaluating expression for data element ${id}:`,
        error
      );
      value =
        defaultValue !== undefined ? defaultValue : getDefaultForType(type);
    }
  } else if (content) {
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
    try {
      value = ctx.workflowInput.userMessage;
    } catch (error) {
      console.error(
        `Error getting value from request for data element ${id}:`,
        error
      );
      value =
        defaultValue !== undefined ? defaultValue : getDefaultForType(type);
    }
  } else if (defaultValue !== undefined) {
    // Use default value if provided
    value = defaultValue;
  } else {
    // This should not happen due to the schema refinement, but just in case
    console.error(
      `Either fromRequest must be true or expr/src must be set for data element ${id}`
    );
    value = getDefaultForType(type);
  }

  // Validate value against type
  try {
    const schema = element.attributes["schema"];
    value = validateValueType(value, type, schema);
  } catch (error) {
    console.error(`Type validation error for data element ${id}:`, error);
    value = getDefaultForType(type, element.attributes["schema"]);
  }

  // Create metadata
  const metadata: DataElementMetadata = {
    type,
    readonly: isReadonly,
    id,
    fromRequest,
    // Track the parent state ID for scope determination
    parentStateId: ctx.state?.id || null,
    schema: element.attributes["schema"],
  };

  // Store the value and metadata using the scoped data model
  const scopedModel = (ctx as any).scopedDataModel as ScopedDataModel;
  scopedModel.setValue(id, value, metadata);
}

function validateDataModel(ctx: ElementExecutionContext<DataModelProps>): void {
  const scopedModel = (ctx as any).scopedDataModel as ScopedDataModel;
  const metadata = scopedModel.getAllMetadata();
  const ids = Object.keys(metadata);
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    throw new Error("Duplicate data element IDs found in datamodel");
  }

  // Additional validation logic can be added here
}
