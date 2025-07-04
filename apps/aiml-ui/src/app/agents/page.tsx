'use client';

import { Bot, BotMessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useAgents } from '@/hooks/use-agents';

export default function Agents() {
  const { agents, isLoading } = useAgents();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <Header title="Agents" />
      <main className="flex-1 relative overflow-hidden">
        <ScrollArea className="rounded-lg h-full">
          <Table>
            <TableHeader className="bg-[#171717] sticky top-0 z-10">
              <TableRow className="border-gray-6 border-b-[0.1px] text-[0.8125rem]">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="text-aiml-el-3">Name</TableHead>
                <TableHead className="text-aimll-3 w-1/2">Instruction</TableHead>
                <TableHead className="text-aimll-3">Provider</TableHead>
                <TableHead className="text-aimll-3">Model</TableHead>
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
                  <TableCell>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(agents).map(([key, agent]) => (
                  <TableRow key={key} className="border-b-gray-6 border-b-[0.1px] text-[0.8125rem]">
                    <TableCell>
                      <div className="h-8 w-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-aimll-5" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-aimll-5">{agent.name}</TableCell>
                    <TableCell className="truncate w-1/2 max-w-[500px] text-aimll-5">{agent.instructions}</TableCell>
                    <TableCell className="text-aimll-5 text-sm">{agent.provider?.toUpperCase()}</TableCell>
                    <TableCell className="text-aimll-5 text-sm">{agent.modelId}</TableCell>
                    <TableCell className="text-aimll-5 text-sm">
                      <span
                        onClick={() => {
                          router.push(`/agents/${key}/chat`);
                        }}
                        className="hover:no-underline"
                      >
                        <Button size="sm" variant="outline">
                          <BotMessageSquare className="h-4 w-4 text-inherit" />
                          Chat with agent
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
