import { useCallback } from "react";

import { Model } from "@/components/model-selector";
import { Node, NodeProps } from "@xyflow/react";
import { useState } from "react";
import { nanoid } from "nanoid";
import { StateNode } from "./state-node";

// Controller component to manage the LLM Node
export const StateNodeController = ({
  id,
  data,
  ...props
}: NodeProps<Node>) => {
  const [model, setModel] = useState<Model>("deepseek-chat");
  const [toolHandles, setToolHandles] = useState({
    tools: [{ id: "name", name: "name" }],
  });

  // Handle tool creation
  const handleCreateTool = useCallback(() => {
    setToolHandles({
      ...toolHandles,
      tools: [...toolHandles.tools, { id: nanoid(), name: "name" }],
    });
    return true;
  }, [toolHandles]);

  // Handle tool removal
  const handleRemoveTool = useCallback(
    (toolId: string) => {
      setToolHandles({
        ...toolHandles,
        tools: toolHandles.tools.filter((tool) => tool.id !== toolId),
      });
    },
    [toolHandles]
  );

  // Handle tool update
  const handleUpdateTool = useCallback(
    (toolId: string, newName: string, newDescription?: string) => {
      setToolHandles({
        ...toolHandles,
        tools: toolHandles.tools.map((tool) =>
          tool.id === toolId
            ? { ...tool, name: newName, description: newDescription }
            : tool
        ),
      });
      return true;
    },
    [toolHandles]
  );

  return (
    <StateNode
      id={id}
      data={{
        status: "idle",
        config: { model },
        dynamicHandles: toolHandles,
        ...data,
      }}
      {...props}
      onModelChange={(model) => setModel(model)}
      onCreateTool={handleCreateTool}
      onRemoveTool={handleRemoveTool}
      onUpdateTool={handleUpdateTool}
      onDeleteNode={() => {}}
    />
  );
};
