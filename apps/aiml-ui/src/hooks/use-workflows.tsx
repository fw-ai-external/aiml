"use client";
import type { Workflow } from "@mastra/core/workflows";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { SerializedBaseElement } from "@fireworks/types";
import { BaseElement } from "@fireworks/shared";

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/workflows");
        if (!res.ok) {
          const error = await res.json();
          setWorkflows({});
          console.error("Error fetching workflows", error);
          toast.error(error?.error || "Error fetching workflows");
          return;
        }
        const data = await res.json();
        setWorkflows(data);
      } catch (error) {
        setWorkflows({});
        console.error("Error fetching workflows", error);
        toast.error("Error fetching workflows");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  return { workflows, isLoading };
};
// Assuming createContext and useContext are imported from "react" in the module's top-level imports.

type WorkflowContextType = {
  workflow:
    | (Workflow & {
        prompt: string;
        ast?: {
          nodes: SerializedBaseElement[];
          diagnostics: any[];
        };
        stepGraph?: any;
        elementTree?: BaseElement;
        executionGraph?: any;
      })
    | null;
  isLoading: boolean;
  setWorkflow: (workflow: WorkflowContextType["workflow"]) => void;
  setIsLoading: (isLoading: boolean) => void;
};

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined
);

export function WorkflowProvider({
  children,
  workflow: initialWorkflow,
}: {
  children: React.ReactNode;
  workflow: WorkflowContextType["workflow"];
}) {
  const [workflow, setWorkflow] =
    useState<WorkflowContextType["workflow"]>(initialWorkflow);
  const [isLoading, setIsLoading] = useState(true);
  return (
    <WorkflowContext.Provider
      value={{ workflow, isLoading, setWorkflow, setIsLoading }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export const useWorkflow = (workflowId: string) => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useWorkflowContext must be used within a WorkflowProvider"
    );
  }
  const { workflow, setWorkflow, isLoading, setIsLoading } = context;

  const [isUpdating, setIsUpdating] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    setIsLoading(true);

    try {
      if (!workflowId) {
        setWorkflow(null);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) {
        const error = await res.json();
        setWorkflow(null);
        console.error("Error fetching workflow", error);
        toast.error(error?.error || "Error fetching workflow");
        return;
      }
      const workflow = await res.json();
      setWorkflow(workflow);
    } catch (error) {
      setWorkflow(null);
      console.error("Error fetching workflow", error);
      toast.error("Error fetching workflow");
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    // const interval = setInterval(() => {
    fetchWorkflow();
    // }, 1000);
    // return () => clearInterval(interval);
  }, [workflowId]);

  const updatePrompt = useCallback(
    async (prompt: string) => {
      setIsUpdating(true);
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "POST",
        body: JSON.stringify({ ...workflow, prompt }),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error?.error || "Error updating workflow");
      } else {
        const data = await res.json();

        setWorkflow(data);
      }

      setIsUpdating(false);
    },
    [workflowId, workflow]
  );

  return {
    name: workflow?.name,
    prompt: workflow?.prompt,
    astNodes: workflow?.ast?.nodes,
    astDiagnostics: workflow?.ast?.diagnostics,
    stepGraph: workflow?.stepGraph,
    stepSubscriberGraph: workflow?.stepSubscriberGraph,
    elementTree: workflow?.elementTree,
    triggerSchema: workflow?.triggerSchema,
    executionGraph: workflow?.executionGraph,
    isLoading,
    isUpdating,
    updatePrompt,
  };
};

export const useExecuteWorkflow = () => {
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

  const executeWorkflow = async ({
    workflowId,
    input,
  }: {
    workflowId: string;
    input: any;
  }) => {
    try {
      setIsExecutingWorkflow(true);
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error || "Error executing workflow");
        return;
      }

      return await response.json();
    } catch (error) {
      console.error("Error executing workflow:", error);
      throw error;
    } finally {
      setIsExecutingWorkflow(false);
    }
  };

  return { executeWorkflow, isExecutingWorkflow };
};

export const useWatchWorkflow = () => {
  const [isWatchingWorkflow, setIsWatchingWorkflow] = useState(false);
  const [watchResult, setWatchResult] = useState<any>(null);

  const watchWorkflow = async ({ workflowId }: { workflowId: string }) => {
    try {
      setIsWatchingWorkflow(true);
      const response = await fetch(`/api/workflows/${workflowId}/watch`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Error watching workflow");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("No reader available");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);

        const records = buffer.split("\x1E");

        buffer = records.pop() || "";

        for (const record of records) {
          if (record.trim()) {
            const data = JSON.parse(record);
            setWatchResult({
              activePaths: data.activePaths,
              context: data.context,
              timestamp: data.timestamp,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error watching workflow:", error);
      throw error;
    } finally {
      setIsWatchingWorkflow(false);
    }
  };

  return { watchWorkflow, isWatchingWorkflow, watchResult };
};

export const useResumeWorkflow = () => {
  const [isResumingWorkflow, setIsResumingWorkflow] = useState(false);

  const resumeWorkflow = async ({
    workflowId,
    stepId,
    runId,
    context,
  }: {
    workflowId: string;
    stepId: string;
    runId: string;
    context: any;
  }) => {
    try {
      setIsResumingWorkflow(true);
      const response = await fetch(`/api/workflows/${workflowId}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stepId, runId, context }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error || "Error resuming workflow");
        return;
      }

      return await response.json();
    } catch (error) {
      console.error("Error resuming workflow:", error);
      throw error;
    } finally {
      setIsResumingWorkflow(false);
    }
  };

  return { resumeWorkflow, isResumingWorkflow };
};
