import type * as React from 'react';

import { WorkflowHeader } from '@/domains/workflows/workflow-header';
import { WorkflowProvider } from '@/hooks/use-workflows';

export default async function WorkflowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;

  return (
    <WorkflowProvider workflow={null}>
      <div className="flex flex-col h-full overflow-hidden">
        <WorkflowHeader workflowId={workflowId} />

        {children}
      </div>
    </WorkflowProvider>
  );
}
