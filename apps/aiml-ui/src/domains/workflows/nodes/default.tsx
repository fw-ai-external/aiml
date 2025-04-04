import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { Sparkles, FileText, MoreVertical } from "lucide-react";

import { Text } from "@/components/ui/text";

import { cn } from "@/lib/utils";

export type DefaultNode = Node<
  {
    label: string;
    trackingNumber?: string;
    arrivalDate?: string;
    withoutTopHandle?: boolean;
    withoutBottomHandle?: boolean;
  },
  "default-node"
>;

export function WorkflowDefaultNode({ data }: NodeProps<DefaultNode>) {
  const {
    label,
    trackingNumber,
    arrivalDate,
    withoutTopHandle,
    withoutBottomHandle,
  } = data;
  return (
    <div className={cn("bg-[#1B2B3A] rounded-lg w-[274px]")}>
      {!withoutTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ visibility: "hidden" }}
        />
      )}

      <div className="p-1">
        {/* Header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <Text size="sm" weight="medium" className="text-blue-400">
              {label}
            </Text>
          </div>
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </div>
        <div
          className={cn("bg-[#0e0f11] border border-gray-600 rounded-lg p-2")}
        >
          {/* Title */}
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <Text size="sm" weight="medium" className="text-white">
              {label}
            </Text>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {trackingNumber && (
              <div>
                <Text size="sm" className="text-gray-500">
                  Tracking Number
                </Text>
                <Text size="sm" className="text-white">
                  {trackingNumber}
                </Text>
              </div>
            )}
            {arrivalDate && (
              <div>
                <Text size="sm" className="text-gray-500">
                  Arrival Date
                </Text>
                <Text size="sm" className="text-white">
                  {arrivalDate}
                </Text>
              </div>
            )}
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
