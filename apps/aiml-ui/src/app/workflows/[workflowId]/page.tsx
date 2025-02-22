import { redirect } from "next/navigation";

export default function WorkflowPage({
  params,
}: {
  params: { workflowId: string };
}) {
  redirect(`/workflows/${params.workflowId}/graph`);
}
