import { redirect } from "next/navigation";
import * as React from "react";

export default async function AgentPage({ params }: any) {
  const resolvedParams = React.use(params);
  redirect(`/agents/${(resolvedParams as any).agentId as string}/chat`);
}
