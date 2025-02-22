import { redirect } from "next/navigation";

export default function AgentPage({ params }: { params: { agentId: string } }) {
  redirect(`/agents/${params.agentId}/chat`);
}
