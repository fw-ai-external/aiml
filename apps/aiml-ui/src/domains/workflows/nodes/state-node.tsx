"use client";

import React from "react";
// Import components without type imports
import { Handle, Position } from "@xyflow/react";
import {
  Loader2,
  ChevronRight,
  Sparkles,
  User,
  FunctionSquare,
  Code,
} from "lucide-react";
import { motion } from "framer-motion";
import ActionSheet from "../workflow-action-popover";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Import only types
import type { Node, NodeProps } from "@xyflow/react";
import type {
  ExecutionGraphStep,
  SerializedBaseElement,
} from "@fireworks/shared";

const StatusColors = {
  pending: "text-yellow-500",
  running: "text-[#501ac5]",
  streaming: "text-purple-500",
  completed: "text-green-500",
  failed: "text-red-500",
  skipped: "text-gray-500",
  waitingForStream: "text-gray-500",
};

interface ActionItemComponentProps {
  action: SerializedBaseElement & {
    status: string;
    duration: number;
  };
  onClick: (
    action: SerializedBaseElement & {
      status: string;
      duration: number;
      label?: string;
    }
  ) => void;
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
      className={cn(
        "flex items-center justify-between cursor-pointer hover:bg-[#2c2e36] px-2 py-1 rounded transition-colors duration-200",
        isSelected && "bg-[#2c2e36]"
      )}
      onClick={() => onClick(action)}
    >
      <div className="flex items-center space-x-2">
        {orderNumber !== undefined && (
          <span className="text-xs text-gray-500 bg-[#2c2e36] rounded-full w-4 h-4 flex items-center justify-center">
            {orderNumber}
          </span>
        )}
        <Text size="sm" className="text-gray-300">
          {action.tag} -{" "}
          {action.attributes?.label ||
            action.attributes?.name ||
            action.id ||
            action.attributes?.instructions?.toString()?.slice(67, 80).trim() ||
            JSON.stringify(Object.keys(action.attributes || {}))}
          ...
        </Text>
      </div>
      {action.status === "running" && (
        <div className="flex items-center space-x-2">
          {action.type === "action" &&
            !!action.subType &&
            action.subType !== "human-input" && (
              <Text size="sm" className="text-gray-500">
                {action.duration}
              </Text>
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
              className={cn(
                "w-3 h-3",
                action.type === "action" &&
                  !!action.subType &&
                  action.subType !== "human-input"
                  ? "text-[#8a8d9b]"
                  : StatusColors[action.status || "pending"]
              )}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export type StateNodeProps = Node<
  ExecutionGraphStep & {
    children: Array<
      SerializedBaseElement & {
        status: string;
        duration: number;
        label?: string;
      }
    >;
  },
  "state-node"
>;

// interface StateNodeProps extends NodeProps<ExecutionGraphStep> {
//   onSubStepsClick: (nodeId: string, subSteps: SubStep[]) => void;
// }

export const StateNode: React.FC<NodeProps<StateNodeProps>> = ({
  data,
  selected,
}) => {
  const [selectedAction, setSelectedAction] = React.useState<
    | (SerializedBaseElement & {
        status: string;
        duration: number;
        label?: string;
      })
    | null
  >(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleActionClick = (
    action: SerializedBaseElement & {
      status: string;
      duration: number;
      label?: string;
    }
  ) => {
    setSelectedAction(action);
    setIsSheetOpen(true);
  };

  const actions =
    data.children?.filter(
      (action) => action.type === "action" && action.subType !== "transition"
    ) || [];

  const transitions = React.useMemo(() => {
    const directTransitions =
      data.children?.filter(
        (action) => action.type === "action" && action.subType === "transition"
      ) || [];

    // Find transitions nested within other actions in the same scope
    const nestedTransitions =
      data.children?.flatMap((action) =>
        (
          action.children?.filter(
            (subAction) =>
              subAction.type === "action" &&
              subAction.subType === "transition" &&
              subAction.scope?.includes(data.id)
          ) || []
        ).map((transition) => ({
          ...transition,
          // TODO we need access to the parent action to get the condition
          label: "IF (something)",
        }))
      ) || [];

    return [...directTransitions, ...nestedTransitions];
  }, [data.next, data.id]);

  // const calculateSubStepsProgress = () => {
  //   const totalSteps = data.next?.length || 0;
  //   const completedSteps =
  //     data.children?.filter((step) => step && step.status === "completed")
  //       .length || 0;
  //   const runningSteps =
  //     data.children?.filter((step) => step && step.status === "running")
  //       .length || 0;
  //   0;
  //   return totalSteps > 0
  //     ? ((completedSteps + runningSteps * 0.5) / totalSteps) * 100
  //     : 0;
  // };

  const primaryActionType =
    actions.find((action) => action?.subType === "model")?.subType ||
    actions
      ?.filter((action) => action.subType)
      .find((action) => action?.subType)?.subType ||
    "code";

  const actionColor: Record<typeof primaryActionType, string> = {
    model: "bg-[#7171B4]",
    "human-input": "bg-[#211106]",
    "tool-call": "bg-[#7171B4]",
    code: "bg-[#7171B4]",
    output: "bg-[#7171B4]",
    error: "bg-[#7171B4]",
    parallel: "bg-[#7171B4]",
    transition: "bg-[#7171B4]",
    "user-input": "bg-[#7171B4]",
    other: "bg-[#7171B4]",
    datamodel: "bg-[#7171B4]",
    prop: "bg-[#7171B4]",
    conditional: "bg-[#7171B4]",
  };

  const actionIconMap: Record<typeof primaryActionType, React.ReactNode> = {
    model: <Sparkles className="w-4 h-4 text-purple-500" />,
    "human-input": <User className="w-4 h-4 text-[#501ac5]" />,
    "tool-call": <FunctionSquare className="w-4 h-4 text-green-500" />,
    code: <Code className="w-4 h-4 text-green-500" />,
    other: <Code className="w-4 h-4 text-green-500" />,
    datamodel: <Code className="w-4 h-4 text-green-500" />,
    prop: <Code className="w-4 h-4 text-green-500" />,
    conditional: <Code className="w-4 h-4 text-green-500" />,
    "user-input": <User className="w-4 h-4 text-[#501ac5]" />,
    parallel: <Code className="w-4 h-4 text-green-500" />,
    transition: <Code className="w-4 h-4 text-green-500" />,
    output: <Code className="w-4 h-4 text-green-500" />,
    error: <Code className="w-4 h-4 text-green-500" />,
  };

  const ActionIcon = () => actionIconMap[primaryActionType];

  return (
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
      className={cn("rounded-lg w-[274px]", actionColor[primaryActionType])}
    >
      <div className="p-1">
        {/* Header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <ActionIcon />
            <Text size="sm" weight="medium" className="text-blue-400">
              {data.label}
            </Text>
          </div>
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
        </div>
        <div
          className={cn("bg-[#0e0f11] border border-gray-600 rounded-lg p-2")}
        >
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-purple-500"
          />

          {/* Actions */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {actions.length > 0 && (
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
            )}
          </div>

          {/* Transitions */}
          {transitions.length > 0 && (
            <div className="mt-4 m-2">
              <Text size="sm" weight="semibold" className="text-gray-400 mb-2">
                Transitions
              </Text>
              <div className="space-y-2">
                {transitions.map((transition) => (
                  <div
                    key={transition.id}
                    className="flex items-center justify-end relative"
                  >
                    <Text size="sm" className="text-gray-500">
                      {transition.attributes?.when ||
                        transition.attributes?.on ||
                        transition?.label ||
                        "On Success"}
                    </Text>
                    <div className="flex items-center space-x-2">
                      {(transition as any).status === "running" && (
                        <div className="flex items-center space-x-1">
                          <Loader2 className="w-3 h-3 text-[#8a8d9b] animate-spin" />
                          <Text size="sm" className="text-[#8a8d9b]">
                            Running sub-step
                          </Text>
                        </div>
                      )}
                      {(transition as any).internal ? (
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
                onClick={() => alert("Coming soon!")}
                className="text-xs text-[#8a8d9b] hover:text-[#a0a3b1] transition-colors duration-200"
              >
                View all {data.subSteps.length} sub-steps
              </button>
            </div>
          )}
        </div>
      </div>

      <ActionSheet
        action={selectedAction}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        extraInfo={
          selectedAction?.type === "action" && selectedAction.tag === "llm"
            ? {
                modelName: selectedAction.attributes?.modelName,
                inputTokens: selectedAction.attributes?.inputTokens,
                outputTokens: selectedAction.attributes?.outputTokens,
                latency: selectedAction.attributes?.latency,
                temperature: selectedAction.attributes?.temperature,
              }
            : undefined
        }
      />
    </motion.div>
  );
};
