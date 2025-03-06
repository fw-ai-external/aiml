import { redirect } from "next/navigation";

export default async function WorkflowPage(props: any) {
  const params = await props.params;
  redirect(`/workflows/${(params as any).workflowId}/graph`);
}
