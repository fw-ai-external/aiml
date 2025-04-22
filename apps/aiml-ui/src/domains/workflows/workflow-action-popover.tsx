import type React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Cpu } from "lucide-react";
import type { SerializedBaseElement } from "@aiml/shared";
import { DefaultActionDetails } from "@/domains/workflows/actions/default";
import { LLMActionDetails } from "@/domains/workflows/actions/llm";

interface ActionSheetProps {
  action:
    | (SerializedBaseElement & {
        status: string;
        duration: number;
        label?: string;
      })
    | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraInfo?: Record<string, any>;
}

const ActionSheet: React.FC<ActionSheetProps> = ({
  action,
  open,
  onOpenChange,
  extraInfo,
}) => {
  if (!action) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-aiml-bg-2 text-white border-gray-700">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-white flex items-center gap-2">
            {action.type === "action" && (
              <Cpu className="w-6 h-6 text-purple-500" />
            )}
            {action.id}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Details about the selected action
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {(() => {
            switch (action.tag) {
              case "llm":
                return (
                  <LLMActionDetails action={action} extraInfo={extraInfo} />
                );
              default:
                return (
                  <DefaultActionDetails action={action} extraInfo={extraInfo} />
                );
            }
          })()}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ActionSheet;
