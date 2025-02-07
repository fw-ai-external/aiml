import type React from "react";
import { useState } from "react";
import { Minus, Maximize2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePanelContext } from "../context/PanelContext";

interface PanelOption {
  label: string;
  onClick: () => void;
}

interface ReusablePanelProps {
  tabs?: Array<{
    id: string;
    name: string;
    content: React.ReactNode;
  }>;
  children?: React.ReactNode;
  additionalOptions?: PanelOption[];
  header?: React.ReactNode;
  panelType: "explorer" | "codeEditor" | "builder";
}

export function ReusablePanel({
  tabs = [],
  children,
  additionalOptions = [],
  header,
  panelType,
}: ReusablePanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(
    tabs.length > 0 ? tabs[0].id : null
  );
  const { togglePanelVisibility, toggleMaximizePanel, isPanelMaximized } =
    usePanelContext();

  return (
    <div className="flex flex-col h-full bg-[#191a1f] rounded-xl">
      <div className="flex items-center justify-between p-2">
        {header}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => togglePanelVisibility(panelType)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleMaximizePanel(panelType)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => togglePanelVisibility(panelType)}
              >
                Close
              </DropdownMenuItem>
              <DropdownMenuItem>Move</DropdownMenuItem>
              {additionalOptions.map((option, index) => (
                <DropdownMenuItem key={index} onClick={option.onClick}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div
        className={`flex-1 overflow-auto ${isPanelMaximized(panelType) ? "fixed inset-0 z-50 bg-[#191a1f]" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
