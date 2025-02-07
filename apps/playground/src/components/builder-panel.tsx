import type React from "react";
import { Lightbulb, ArrowUpDown, Image, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ReusablePanel } from "./reusable-panel";

export function BuilderPanel(props: React.ComponentProps<"div">) {
  const additionalOptions = [
    {
      label: "Clear History",
      onClick: () => console.log("Clearing history..."),
    },
    { label: "Export", onClick: () => console.log("Exporting...") },
  ];

  return (
    <ReusablePanel
      header={<h2 className="text-2xl font-semibold">Builder</h2>}
      additionalOptions={additionalOptions}
      panelType="builder"
    >
      <div className="flex flex-col h-full">
        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent">
            <TabsTrigger
              value="builder"
              className="data-[state=active]:bg-[#25262b] rounded-lg"
            >
              Builder
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-[#25262b] rounded-lg"
            >
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-3xl font-semibold mb-2">
            <span className="text-rose-400">Trae-Builder</span>
            <span className="text-gray-500"> Mode</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Easily build a project from scratch. In Builder mode, any changes to
            code files will be automatically saved.
          </p>

          <div className="mt-8 bg-[#25262b] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-medium">Did You Know?</span>
            </div>
            <p className="text-gray-400">
              Uploading design drafts or reference images can enhance front-end
              development efficiency.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <ArrowUpDown className="h-4 w-4" />
            <span>to navigate input history,</span>
            <span>↵</span>
            <span>to insert a new line</span>
          </div>
          <div className="flex gap-2">
            <Input
              className="flex-1 bg-[#25262b] border-0 focus-visible:ring-1 focus-visible:ring-gray-600"
              placeholder="Ask anything..."
            />
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </ReusablePanel>
  );
}
