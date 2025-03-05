import { NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { parseMDXToAIML } from "@fireworks/parser";
import { Runtime, astToRunnableBaseElementTree } from "@fireworks/core";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const resolvedParams = await params;

  console.log("resolvedParams", resolvedParams);
  // Mock data for now - replace with actual API call
  let workflow = {};
  try {
    const fileContent = fs.readFileSync(
      `./.workflows/${resolvedParams.workflowId}.json`,
      "utf8"
    );
    workflow = JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `Error reading workflow file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    // Continue with empty workflow object
  }
  if (workflow && Object.keys(workflow).length > 0) {
    return NextResponse.json(workflow);
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
    },
    elementTree: {},
  });
}

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
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
      elementTree: z.any().optional(),
      stepSubscriberGraph: z.record(z.any()).optional(),
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
    console.log("ast", ast);
    const elementTree = astToRunnableBaseElementTree(ast.nodes);
    console.log("elementTree", elementTree);
    const workflow = new Runtime(elementTree as any);

    console.log("workflow", workflow);

    // Save workflow data to file
    fs.writeFileSync(
      `${dir}/${workflowId}.json`,
      JSON.stringify(
        {
          ...body,
          stepGraph: workflow.toGraph(),
          ast,
          elementTree,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log("Workflow updated successfully");

    return NextResponse.json({ ...body, stepGraph: workflow.toGraph() });
  } catch (error) {
    console.error(
      `Error updating workflow: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    console.log("error", error);
    return NextResponse.json(
      {
        error: "Failed to update workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
