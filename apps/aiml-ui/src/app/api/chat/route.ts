import fs from "node:fs";
import { Workflow, hydreateElementTree } from "@fireworks/runtime";
import type { Diagnostic } from "@fireworks/shared";
import type { SerializedBaseElement } from "@fireworks/shared";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, workflowId } = await req.json();
  console.log("workflowId", workflowId);
  console.log("messages", messages);

  let persistedWorkflow: {
    ast: {
      nodes: SerializedBaseElement[];
      diagnostics: Set<Diagnostic>;
    };
    datamodel: any;
    elementTree: SerializedBaseElement;
  };
  try {
    const fileContent = fs.readFileSync(
      `./.workflows/${workflowId}.json`,
      "utf8"
    );
    persistedWorkflow = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      `Error reading workflow file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    // Continue with empty workflow object
  }

  const elementTree = hydreateElementTree(
    persistedWorkflow.ast.nodes,
    persistedWorkflow.ast.diagnostics
  );
  const workflow = new Workflow(
    elementTree.elementTree!,
    persistedWorkflow.datamodel
  );

  const result = workflow.runStream({
    userMessage: messages[messages.length - 1].content,
    secrets: {
      system: {
        FIREWORKS_API_KEY: process.env.FIREWORK_API_KEY,
        FIREWORKS_BASE_URL: process.env.FIREWORKS_BASE_URL,
      },
    },
    systemMessage: messages.find((m: any) => m.role === "system")?.content,
    chatHistory: messages.filter(
      (m: any, i: number) => i !== messages.length - 1 && m.role !== "system"
    ),
  });

  return new Response(await result.openaiChatStream());
}
