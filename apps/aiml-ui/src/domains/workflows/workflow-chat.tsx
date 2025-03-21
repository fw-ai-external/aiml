import { Thread } from '@/components/assistant-ui/thread';

export function WorkflowChat({
  workflowId,
  setRunId,
}: {
  workflowId: string;
  setRunId: (runId: string) => void;
}) {
  return (
    <div className="h-[calc(100vh-126px)] pt-2 px-4 pb-4 text-xs w-full">
      <Thread />
    </div>
  );
}
