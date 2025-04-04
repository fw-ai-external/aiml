"use client";

import React from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import { Loader2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import ActionSheet from "../workflow-action-popover";
import type { ExecutionGraphElement } from "@fireworks/shared";

const StatusColors = {
  pending: "text-yellow-500",
  running: "text-blue-500",
  streaming: "text-purple-500",
  completed: "text-green-500",
  failed: "text-red-500",
  skipped: "text-gray-500",
  waitingForStream: "text-gray-500",
};

interface ActionItemComponentProps {
  action: ExecutionGraphElement;
  onClick: (action: ExecutionGraphElement) => void;
  isSelected: boolean;
  orderNumber?: number;
}

const ActionItemComponent: React.FC<ActionItemComponentProps> = ({
  action,
  onClick,
  isSelected,
  orderNumber,
}) => {
  return (
    <div
      className={`flex items-center justify-between cursor-pointer hover:bg-[#2c2e36] px-2 py-1 rounded transition-colors duration-200 ${isSelected ? "bg-[#2c2e36]" : ""}`}
      onClick={() => onClick(action)}
    >
      <div className="flex items-center space-x-2">
        {orderNumber !== undefined && (
          <span className="text-xs text-gray-500 bg-[#2c2e36] rounded-full w-4 h-4 flex items-center justify-center">
            {orderNumber}
          </span>
        )}
        <span className="text-gray-300 text-xs">
          {action.tag} -{" "}
          {action.attributes.label ||
            action.attributes.name ||
            action.id ||
            action.attributes.instructions?.slice(67, 80).trim() ||
            JSON.stringify(Object.keys(action.attributes))}
          ...
        </span>
      </div>
      {action.status === "running" && (
        <div className="flex items-center space-x-2">
          {action.type === "action" &&
            !!action.subType &&
            action.subType !== "human-input" && (
              <span className="text-xs text-gray-500">{action.duration}</span>
            )}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <Loader2
              className={`w-3 h-3 ${
                action.type === "action" &&
                !!action.subType &&
                action.subType !== "human-input"
                  ? "text-[#8a8d9b]"
                  : StatusColors[action.status || "pending"]
              }`}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export type StateNodeProps = Node<ExecutionGraphElement, "state-node">;

// interface StateNodeProps extends NodeProps<ExecutionGraphElement> {
//   onSubStepsClick: (nodeId: string, subSteps: SubStep[]) => void;
// }

export const StateNode: React.FC<StateNodeProps> = ({ data, selected }) => {
  const [selectedAction, setSelectedAction] =
    React.useState<ExecutionGraphElement | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleActionClick = (action: ExecutionGraphElement) => {
    setSelectedAction(action);
    setIsSheetOpen(true);
  };

  const actions =
    data.next?.filter(
      (action) => action.type === "action" && action.tag !== "transition"
    ) || [];

  const transitions =
    data.next?.filter(
      (action) => action.type === "action" && action.tag === "transition"
    ) || [];

  const calculateSubStepsProgress = () => {
    const totalSteps = data.next?.length || 0;
    const completedSteps =
      data.next?.filter((step) => step && step.status === "completed").length ||
      0;
    const runningSteps =
      data.next?.filter((step) => step && step.status === "running").length ||
      0;
    return totalSteps > 0
      ? ((completedSteps + runningSteps * 0.5) / totalSteps) * 100
      : 0;
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          boxShadow: data.isRunning
            ? [
                "0 0 10px 2px rgba(100, 100, 120, 0.2)",
                "0 0 20px 6px rgba(100, 100, 120, 0.3)",
                "0 0 15px 4px rgba(100, 100, 120, 0.2)",
                "0 0 25px 8px rgba(100, 100, 120, 0.4)",
                "0 0 12px 3px rgba(100, 100, 120, 0.2)",
              ]
            : selected
              ? "0 0 0 2px rgba(100, 100, 120, 0.5)"
              : "0 4 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
        transition={{
          duration: 0.3,
          boxShadow: {
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "easeInOut",
          },
        }}
        className={`rounded-lg p-3 min-w-[280px] max-w-[350px] ${
          data.isRunning ? "bg-[#1e1f25]" : "bg-[#23252b] ring-2 ring-[#2c2d35]"
        } ${selected ? "ring-2 ring-[#3d3f4b]" : ""}`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-purple-500"
        />
        <div className="font-bold mb-2 text-lg text-gray-200 flex items-center justify-between">
          {data.label}
          {data.isRunning && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Loader2 className="w-4 h-4 text-purple-500" />
            </motion.div>
          )}
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
          {actions.length > 0 && (
            <div>
              <div className="space-y-1">
                {actions.map((action, index) => (
                  <ActionItemComponent
                    key={action.id}
                    action={action}
                    onClick={handleActionClick}
                    isSelected={selectedAction?.id === action.id && isSheetOpen}
                    orderNumber={index + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transitions (Source Handles) */}
        {transitions.length > 0 && (
          <div className="mt-4 m-2">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">
              Transitions
            </h3>
            <div className="space-y-2">
              {transitions.map((transition) => (
                <div
                  key={transition.id}
                  className="flex items-center justify-end relative"
                >
                  <span className="text-xs text-gray-500">
                    {transition.attributes.when ||
                      transition.attributes.on ||
                      "On Success"}
                  </span>
                  <div className="flex items-center space-x-2">
                    {transition.running && (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 text-[#8a8d9b] animate-spin" />
                        <span className="text-xs text-[#8a8d9b]">
                          Running sub-step
                        </span>
                      </div>
                    )}
                    {transition.internal ? (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={transition.id}
                        className="w-3 h-3 bg-[#8a8d9b]"
                        style={{
                          right: -15,
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View all sub-steps link */}
        {data.subSteps && data.subSteps.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() =>
                /**onSubStepsClick(data.id, data.subSteps || []) **/ alert(
                  "Coming soon!"
                )
              }
              className="text-xs text-[#8a8d9b] hover:text-[#a0a3b1] transition-colors duration-200"
            >
              View all {data.subSteps.length} sub-steps
            </button>
          </div>
        )}
      </motion.div>
      <ActionSheet
        action={selectedAction}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        extraInfo={
          selectedAction?.type === "action" && selectedAction.tag === "llm"
            ? {
                modelName: selectedAction.attributes.modelName,
                inputTokens: selectedAction.attributes.inputTokens,
                outputTokens: selectedAction.attributes.outputTokens,
                latency: selectedAction.attributes.latency,
                temperature: selectedAction.attributes.temperature,
              }
            : undefined
        }
      />
    </div>
  );
};
