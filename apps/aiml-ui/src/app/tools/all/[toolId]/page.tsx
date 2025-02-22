"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/ui/header";
import { Skeleton } from "@/components/ui/skeleton";

import { useTool } from "@/hooks/use-all-tools";

export default function ToolPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const resolvedParams = React.use(params);
  const { tool, isLoading } = useTool(resolvedParams.toolId);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full">
        <Header title="Tool" />
        <div className="p-4">
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!tool) {
    router.push("/tools");
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <Header title={tool.name} />
      <div className="p-4">
        <p className="text-aiml-el-2">{tool.description}</p>
      </div>
    </div>
  );
}
