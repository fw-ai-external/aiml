import {
  type Node,
  type NodeProps,
  Position,
  useUpdateNodeInternals,
} from "@xyflow/react";

import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BaseNode } from "@/components/flow/base-node";
import {
  EditableHandle,
  EditableHandleDialog,
} from "@/components/flow/editable-handle";
import { LabeledHandle } from "@/components/flow/labeled-handle";
import {
  NodeHeader,
  NodeHeaderAction,
  NodeHeaderActions,
  NodeHeaderIcon,
  NodeHeaderTitle,
} from "@/components/flow/node-header";
import { NodeHeaderStatus } from "@/components/flow/node-header-status";
import { type Model, ModelSelector } from "@/components/model-selector";
import { Bot, Plus, Trash, BetweenVerticalEnd } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { createTheme } from "@uiw/codemirror-themes";
import { StreamLanguage } from "@codemirror/language";

export type GenerateTextData = {
  status: "processing" | "error" | "success" | "idle" | undefined;
  config: {
    model: Model;
    template: string;
  };
  dynamicHandles: {
    tools: {
      id: string;
      name: string;
      description?: string;
    }[];
    "template-tags": {
      id: string;
      name: string;
    }[];
  };
};

export type GenerateTextNode = Node<GenerateTextData, "generate-text">;

interface LLMNodeProps extends NodeProps<GenerateTextNode> {
  disableModelSelector?: boolean;
  onModelChange: (model: Model) => void;
  onCreateTool: (name: string, description?: string) => boolean;
  onRemoveTool: (handleId: string) => void;
  onUpdateTool: (
    toolId: string,
    newName: string,
    newDescription?: string
  ) => boolean;
  onDeleteNode: () => void;
  onPromptTextChange: (value: string) => void;
  onCreateInput: (name: string) => boolean;
  onRemoveInput: (handleId: string) => void;
  onUpdateInputName: (handleId: string, newLabel: string) => boolean;
}

const promptTheme = createTheme({
  theme: "dark",
  settings: {
    background: "transparent",
    foreground: "hsl(var(--foreground))",
    caret: "black",
    selection: "#3B82F6",
    lineHighlight: "transparent",
  },
  styles: [
    { tag: t.variableName, color: "#10c43d" },
    { tag: t.string, color: "hsl(var(--foreground))" },
    { tag: t.invalid, color: "#DC2626" },
  ],
});
// Create a function to generate the language with the current inputs
const createPromptLanguage = (validInputs: string[] = []) =>
  StreamLanguage.define({
    token(stream) {
      if (stream.match(/{{[^}]*}}/)) {
        const match = stream.current();
        const inputName = match.slice(2, -2);
        // Check if the input name is valid
        if (validInputs.includes(inputName)) {
          return "variableName";
        }
        return "invalid";
      }
      stream.next();
      return null;
    },
  });
export function LLMNode({
  id,
  selected,
  deletable,
  disableModelSelector,
  data,
  onModelChange,
  onCreateTool,
  onRemoveTool,
  onUpdateTool,
  onDeleteNode,
  onPromptTextChange,
  onCreateInput,
  onRemoveInput,
  onUpdateInputName,
}: LLMNodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const editorViewRef = useRef<EditorView>(null);

  const handleCreateInput = useCallback(
    (name: string) => {
      const result = onCreateInput(name);
      if (result) {
        updateNodeInternals(id);
      }
      return result;
    },
    [onCreateInput, id, updateNodeInternals]
  );

  const handleRemoveInput = useCallback(
    (handleId: string) => {
      onRemoveInput(handleId);
      updateNodeInternals(id);
    },
    [onRemoveInput, id, updateNodeInternals]
  );

  const handleUpdateInputName = useCallback(
    (handleId: string, newLabel: string) => {
      const result = onUpdateInputName(handleId, newLabel);
      if (result) {
        updateNodeInternals(id);
      }
      return result;
    },
    [onUpdateInputName, id, updateNodeInternals]
  );

  const insertInputAtCursor = useCallback((inputName: string) => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }

    const inputTag = `{{${inputName}}}`;
    const from = view.state.selection.main.from;
    view.dispatch({
      changes: { from, insert: inputTag },
      selection: { anchor: from + inputTag.length },
    });
    setIsPopoverOpen(false);
  }, []);

  // Create language with current inputs
  const extensions = useMemo(() => {
    const validLabels = (data.dynamicHandles["template-tags"] || []).map(
      (input) => input.name
    );
    return [createPromptLanguage(validLabels)];
  }, [data.dynamicHandles["template-tags"]]);
  const handleModelChange = useCallback(
    (value: string) => {
      onModelChange?.(value as Model);
    },
    [onModelChange]
  );

  const handleCreateTool = useCallback(
    (name: string, description?: string) => {
      if (!onCreateTool) {
        return false;
      }
      const result = onCreateTool(name, description);
      if (result) {
        updateNodeInternals(id);
      }
      return result;
    },
    [onCreateTool, id, updateNodeInternals]
  );

  const removeHandle = useCallback(
    (handleId: string) => {
      onRemoveTool?.(handleId);
      updateNodeInternals(id);
    },
    [onRemoveTool, id, updateNodeInternals]
  );

  return (
    <BaseNode
      selected={selected}
      className={cn("w-[350px] p-0 hover:ring-orange-500", {
        "border-orange-500": data.status === "processing",
        "border-red-500": data.status === "error",
      })}
    >
      <NodeHeader className="m-0">
        <NodeHeaderIcon>
          <Bot />
        </NodeHeaderIcon>
        <NodeHeaderTitle>Call LLM</NodeHeaderTitle>
        <NodeHeaderActions>
          <NodeHeaderStatus status={data.status} />
          {deletable && (
            <NodeHeaderAction
              onClick={onDeleteNode}
              variant="ghost"
              label="Delete node"
            >
              <Trash />
            </NodeHeaderAction>
          )}
        </NodeHeaderActions>
      </NodeHeader>
      <Separator />
      <div className="p-4 flex flex-col gap-4">
        <ModelSelector
          value={data.config.model}
          onChange={handleModelChange}
          disabled={disableModelSelector}
          disabledModels={[
            "gpt-4o",
            "gpt-4o-mini",
            "deepseek-r1-distill-llama-70b",
          ]}
        />
      </div>
      <div className="p-2">
        <div className="flex items-center gap-2 mb-1">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2">
                <BetweenVerticalEnd className="h-4 w-4 mr-1" />
                Insert Input into Prompt
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput placeholder="Search inputs..." />
                <CommandList>
                  <CommandEmpty>No inputs found.</CommandEmpty>
                  <CommandGroup>
                    {data.dynamicHandles["template-tags"]?.map(
                      (input) =>
                        input.name && (
                          <CommandItem
                            key={input.id}
                            onSelect={() => insertInputAtCursor(input.name)}
                            className="text-base"
                          >
                            {input.name}
                          </CommandItem>
                        )
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <CodeMirror
          value={data.config.template || ""}
          height="150px"
          theme={promptTheme}
          extensions={extensions}
          onChange={onPromptTextChange}
          onCreateEditor={(view) => {
            editorViewRef.current = view;
          }}
          className="nodrag border rounded-md overflow-hidden [&_.cm-content]:!cursor-text [&_.cm-line]:!cursor-text nodrag nopan nowheel"
          placeholder="Craft your prompt here... Use {{input-name}} to reference inputs"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
          }}
        />
      </div>
      <div className="grid grid-cols-[2fr,1fr] gap-2 pt-2 text-sm">
        <div className="flex flex-col gap-2 min-w-0">
          <LabeledHandle
            id="input"
            title="Input"
            type="target"
            position={Position.Left}
          />
          {/* <LabeledHandle
            id="prompt"
            title="Prompt"
            type="target"
            position={Position.Left}
            className="col-span-2"
          /> */}
        </div>
        <div className="justify-self-end">
          <LabeledHandle
            id="output"
            title="Output"
            type="source"
            position={Position.Right}
          />
        </div>
      </div>
      <div className="border-t border-border mt-2">
        <div>
          {/* <div className="flex items-center justify-between py-2 px-4 bg-muted">
            <span className="text-sm font-medium">Tool outputs</span>
            <EditableHandleDialog
              variant="create"
              onSave={handleCreateTool}
              align="end"
              showDescription
            >
              <Button variant="outline" size="sm" className="h-7 px-2">
                <Plus className="h-4 w-4 mr-1" />
                New tool output
              </Button>
            </EditableHandleDialog>
          </div> */}
          {/* <div className="flex flex-col">
            {data.dynamicHandles.tools.map((tool) => (
              <EditableHandle
                key={tool.id}
                nodeId={id}
                handleId={tool.id}
                name={tool.name}
                description={tool.description}
                type="source"
                position={Position.Right}
                wrapperClassName="w-full"
                onUpdateTool={onUpdateTool}
                onDelete={removeHandle}
                showDescription
              />
            ))}
          </div> */}
        </div>
      </div>
    </BaseNode>
  );
}
