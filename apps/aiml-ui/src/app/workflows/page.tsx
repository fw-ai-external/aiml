"use client";

import { Workflow } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { useWorkflows } from "@/hooks/use-workflows";

export default function Workflows() {
  const { workflows, isLoading } = useWorkflows();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <Header title="Workflows" />
      <main className="flex-1 relative overflow-hidden">
        <ScrollArea className="rounded-lg h-full">
          <Table>
            <TableHeader className="bg-[#171717] sticky top-0 z-10">
              <TableRow className="border-gray-6 border-b-[0.1px] text-[0.8125rem]">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="text-aiml-el-3 w-1/2">Name</TableHead>
                <TableHead className="text-aimll-3">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border-b border-gray-6">
              {isLoading ? (
                <TableRow className="border-b-gray-6 border-b-[0.1px] text-[0.8125rem]">
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(workflows).map(([key, workflow]) => (
                  <TableRow
                    key={key}
                    className="border-b-gray-6 border-b-[0.1px] text-[0.8125rem]"
                  >
                    <TableCell>
                      <div className="h-8 w-full flex items-center justify-center">
                        <Workflow className="h-4 w-4 text-aimll-5" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[500px] text-aimll-5">
                      {workflow.name}
                    </TableCell>
                    <TableCell className="text-aimll-5 text-sm">
                      <span
                        onClick={() => {
                          router.push(`/workflows/${key}/graph`);
                        }}
                        className="hover:no-underline"
                      >
                        <Button size="sm" variant="outline">
                          <Workflow className="h-4 w-4 text-inherit" />
                          View Workflow
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </main>
    </div>
  );
}
