import fs from 'node:fs';
import { parseMDXToAIML } from '@fireworks/parser';
import { Workflow, hydreateElementTree } from '@fireworks/runtime';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Helper function to strip circular references from any object
 */
function sanitizeForJSON(obj: any, seen = new WeakSet()): any {
  // Check for null or non-objects
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return '[Circular Reference]';
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
    if (key === 'parent' || key === '_parent') {
      continue;
    }
    result[key] = sanitizeForJSON(value, seen);
  }
  return result;
}

export async function GET(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const resolvedParams = await params;

  // Mock data for now - replace with actual API call
  let persistedWorkflow: any = {};
  try {
    const fileContent = fs.readFileSync(`./.workflows/${resolvedParams.workflowId}.json`, 'utf8');
    persistedWorkflow = JSON.parse(fileContent);

    const elementTree = hydreateElementTree(persistedWorkflow.ast.nodes);
    const workflow = new Workflow(elementTree);

    // Get the context values from the workflow
    const contextValues = workflow.getContextValues();

    // Sanitize the response to remove any circular references
    const responseData = {
      ...persistedWorkflow,
      ast: persistedWorkflow.ast,
      elementTree: elementTree.toJSON(),
      stepGraph: workflow.toGraph(),
      executionGraph: workflow.getExecutionGraph(),
      contextValues,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`Error reading workflow file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Continue with empty workflow object
  }
  if (persistedWorkflow && Object.keys(persistedWorkflow).length > 0) {
    return NextResponse.json(persistedWorkflow);
  }
  return NextResponse.json({
    id: resolvedParams.workflowId,
    name: 'Test Workflow',
    description: 'A test workflow',
    stepGraph: {
      initial: [
        {
          step: {
            id: 'step1',
            description: 'First step',
          },
        },
      ],
    },
    prompt: '',
    stepSubscriberGraph: {},
    ast: {
      nodes: [],
      diagnostics: [],
    },
    elementTree: {},
  });
}

export async function POST(request: Request, props: { params: Promise<{ workflowId: string }> }) {
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
            }),
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
      contextValues: z.record(z.any()).optional(),
    });

    const validationResult = WorkflowSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        {
          error: 'Invalid workflow data',
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    // Ensure directory exists
    const dir = './.workflows';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ast = await parseMDXToAIML(body.prompt);
    const elementTree = hydreateElementTree(ast.nodes);
    const workflow = new Workflow(elementTree);

    // Create a structure that excludes circular references for serialization
    const workflowData = {
      ...body,
      stepGraph: workflow.toGraph(),
      ast,
      elementTree: elementTree.toJSON(),
      executionGraph: workflow.getExecutionGraph(),
      contextValues: workflow.getContextValues(),
    };

    // Also check if we're rehydrating with existing context values
    if (body.contextValues && Object.keys(body.contextValues).length > 0) {
      try {
        workflow.rehydrateContextValues(body.contextValues);

        // Re-fetch the context values after rehydration to include in response
        workflowData.contextValues = workflow.getContextValues();
      } catch (error) {
        console.error('Error rehydrating context values:', error);
      }
    }

    // Sanitize the workflow data to remove any circular references
    const serializedWorkflow = sanitizeForJSON(workflowData);

    // Save workflow data to file
    fs.writeFileSync(`${dir}/${workflowId}.json`, JSON.stringify(workflowData, null, 2), 'utf8');
    console.log('saved workflow');

    // Return the sanitized response
    return NextResponse.json(workflowData);
  } catch (error) {
    console.error(`Error updating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      {
        error: 'Failed to update workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
