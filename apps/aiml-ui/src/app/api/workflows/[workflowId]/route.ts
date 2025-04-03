import fs from "node:fs";
import { parseMDXToAIML } from "@fireworks/parser";
import { Workflow, hydreateElementTree } from "@fireworks/runtime";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DiagnosticSeverity, ObjectSet } from "@fireworks/shared";

/**
 * Helper function to strip circular references from any object
 */
function sanitizeForJSON(obj: any, seen = new WeakSet()): any {
  // Check for null or non-objects
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return "[Circular Reference]";
  }
  seen.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJSON(item, seen));
  }

  // Handle objects
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip parent references entirely
    if (key === "parent" || key === "_parent") {
      continue;
    }
    result[key] = sanitizeForJSON(value, seen);
  }
  return result;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const resolvedParams = await params;

  // Mock data for now - replace with actual API call
  let persistedWorkflow: any = {};
  try {
    const fileContent = fs.readFileSync(
      `./.workflows/${resolvedParams.workflowId}.json`,
      "utf8"
    );
    persistedWorkflow = JSON.parse(fileContent);

    const { elementTree, diagnostics } = hydreateElementTree(
      persistedWorkflow.ast.nodes,
      new ObjectSet(persistedWorkflow.ast.diagnostics, "message")
    );
    if (!elementTree) {
      diagnostics.add({
        message: "Failed to parse AIML prompt",
        severity: DiagnosticSeverity.Error,
        source: "AIML",
        code: "0000",
        range: {
          start: {
            line: 0,
            column: 0,
          },
          end: {
            line: 0,
            column: 0,
          },
        },
      });
      return NextResponse.json({
        ast: {
          nodes: persistedWorkflow.ast.nodes,
          diagnostics: Array.from([
            ...persistedWorkflow.ast.diagnostics,
            ...diagnostics,
          ]),
        },
      });
    }
    const workflow = new Workflow(elementTree, persistedWorkflow.datamodel);

    // Get the context values from the workflow
    const contextValues = workflow.getContextValues();

    // Sanitize the response to remove any circular references
    const responseData = {
      ...persistedWorkflow,
      datamodel: workflow.datamodel,
      ast: {
        nodes: persistedWorkflow.ast.nodes,
        diagnostics: Array.from([
          ...persistedWorkflow.ast.diagnostics,
          ...diagnostics,
        ]),
      },
      elementTree: elementTree?.toJSON(),
      mastraStepGraph: workflow.toGraph(),
      executionGraph: workflow.getExecutionGraph(),
      contextValues,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(
      `Error reading workflow file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    // Continue with empty workflow object
  }
  if (persistedWorkflow && Object.keys(persistedWorkflow).length > 0) {
    return NextResponse.json(persistedWorkflow);
  }
  return NextResponse.json({
    id: resolvedParams.workflowId,
    name: "Test Workflow",
    description: "A test workflow",
    stepGraph: {
      initial: [
        {
          step: {
            id: "step1",
            description: "First step",
          },
        },
      ],
    },
    prompt: "",
    stepSubscriberGraph: {},
    ast: {
      nodes: [],
      diagnostics: [],
      datamodel: {},
    },
    elementTree: {},
  });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ workflowId: string }> }
) {
  const params = await props.params;
  try {
    const workflowId = params.workflowId;
    const body = await request.json();

    // Validate the workflow data using Zod
    const WorkflowSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      prompt: z.string().nullable().optional(),
      stepGraph: z
        .object({
          initial: z.array(
            z.object({
              step: z.object({
                id: z.string(),
                description: z.string().optional(),
              }),
            })
          ),
        })
        .optional(),
      ast: z
        .object({
          nodes: z.array(z.any()),
          diagnostics: z.array(z.any()),
        })
        .optional(),
      datamodel: z.any().optional(),
      elementTree: z.any().optional(),
      stepSubscriberGraph: z.record(z.any()).optional(),
      contextValues: z.record(z.any()).optional(),
    });

    const validationResult = WorkflowSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return NextResponse.json(
        {
          error: "Invalid workflow data",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Ensure directory exists
    const dir = "./.workflows";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ast = await parseMDXToAIML(body.prompt);

    const { elementTree, diagnostics } = hydreateElementTree(
      ast.nodes,
      new ObjectSet(ast.diagnostics, "message")
    );

    if (!elementTree) {
      diagnostics.add({
        message: "Failed to process prompt as AIML",
        severity: DiagnosticSeverity.Error,
        source: "AIML",
        code: "0000",
        range: {
          start: {
            line: 0,
            column: 0,
          },
          end: {
            line: body.prompt.split("\n").length,
            column:
              body.prompt.split("\n")[body.prompt.split("\n").length - 1]
                .length,
          },
        },
      });
    }
    let workflow: Workflow<any, any> | undefined;
    if (elementTree) {
      workflow = new Workflow(elementTree, {
        scopedDataModels: ast.datamodel || {},
        fieldValues: body.datamodel?.fieldValues || {},
      });
    }

    // Create a structure that excludes circular references for serialization
    const workflowData = {
      ...body,
      stepGraph: workflow?.toGraph(),
      ast: {
        nodes: ast.nodes,
        diagnostics: Array.from([...ast.diagnostics, ...diagnostics]),
      },
      datamodel: workflow?.datamodel,
      elementTree: elementTree?.toJSON(),
      executionGraph: workflow?.getExecutionGraph(),
      contextValues: workflow?.getContextValues(),
    };

    // Also check if we're rehydrating with existing context values
    if (body.contextValues && Object.keys(body.contextValues).length > 0) {
      try {
        workflow?.rehydrateContextValues(body.contextValues);

        // Re-fetch the context values after rehydration to include in response
        workflowData.contextValues = workflow?.getContextValues();
      } catch (error) {
        diagnostics.add({
          message: "Error rehydrating context values",
          severity: DiagnosticSeverity.Warning,
          source: "AIML",
          code: "R0001",
          range: {
            start: {
              line: 0,
              column: 0,
            },
            end: {
              line: 0,
              column: 0,
            },
          },
        });
        console.error("Error rehydrating context values:", error);
      }
    }

    // Save workflow data to file
    fs.writeFileSync(
      `${dir}/${workflowId}.json`,
      JSON.stringify(workflowData, null, 2),
      "utf8"
    );
    console.log("saved workflow");

    // Return the sanitized response
    return NextResponse.json(workflowData);
  } catch (error) {
    console.error(
      `Error updating workflow: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return NextResponse.json(
      {
        error: "Failed to update workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
