import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { MoreVertical, NetworkIcon } from "lucide-react";

import { Text } from "@/components/ui/text";

import { cn } from "@/lib/utils";

export type IncomingRequestNodeProps = Node<
  {
    label: string;
    messages: any[];
    files: any[];
    systemPrompt: string;
    withoutTopHandle?: boolean;
    withoutBottomHandle?: boolean;
  },
  "default-node"
>;

export function IncomingRequestNode({
  data,
}: NodeProps<IncomingRequestNodeProps>) {
  const {
    label,
    messages = [],
    files = [],
    systemPrompt,
    withoutBottomHandle,
  } = data;
  return (
    <div className={cn("bg-[#1B2B3A] rounded-lg w-[274px]")}>
      <div className="p-1">
        {/* Header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <NetworkIcon className="w-4 h-4 text-blue-400" />
            <Text size="sm" weight="medium" className="text-blue-400">
              {label}
            </Text>
          </div>
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </div>
        <div
          className={cn("bg-[#0e0f11] border border-gray-600 rounded-lg p-2")}
        >
          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Text size="sm" className="text-gray-500">
                Messages in context
              </Text>
              <Text size="sm" className="text-white">
                {messages.length}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="sm" className="text-gray-500">
                Files in context
              </Text>
              <Text size="sm" className="text-white">
                {files.length}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text size="sm" className="text-gray-500">
                Custom System Prompt
              </Text>
              <Text size="sm" className="text-white">
                {systemPrompt ? "True" : "False"}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {!withoutBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ visibility: "hidden" }}
        />
      )}
    </div>
  );
}
