import type { Tool as BaseTool } from "@mastra/core/tools";

export interface ToolResponse extends BaseTool<any, any, any, any> {
  id: string;
  name: string;
  description: string;
}
