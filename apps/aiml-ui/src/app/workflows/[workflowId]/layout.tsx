"use client";

import * as React from "react";

import { WorkflowProvider } from "@/hooks/use-workflows";
import { WorkflowHeader } from "@/domains/workflows/workflow-header";

export default function WorkflowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workflowId: string };
}) {
  return (
    <WorkflowProvider workflow={null}>
      <div className="flex flex-col h-full overflow-hidden">
        <WorkflowHeader workflowId={params.workflowId} />

        {children}
      </div>
    </WorkflowProvider>
  );
}
