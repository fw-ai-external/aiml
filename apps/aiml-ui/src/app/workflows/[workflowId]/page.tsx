import { redirect } from "next/navigation";

export default function WorkflowPage({ params }: any) {
  redirect(`/workflows/${(params as any).workflowId}/graph`);
}
