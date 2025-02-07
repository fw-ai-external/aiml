"use client";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  FileText,
  Folder,
  Settings,
  ChevronRight,
  X,
  CodeXmlIcon,
} from "lucide-react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { BuilderPanel } from "../components/builder-panel";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ReusablePanel } from "../components/reusable-panel";
import { PanelProvider, usePanelContext } from "../context/PanelContext";
import { ExplorerTabs } from "@/components/ExplorerTabs";
import { IDE } from "@/components/IDE";
import { cn } from "@/lib/utils";

interface FileTab {
  id: string;
  name: string;
  type: "xml" | "scxml";
}

interface ExplorerItemType {
  id: string;
  name: string;
  type: "xml" | "scxml";
  isFolder: boolean;
  children?: ExplorerItemType[];
}

function ExplorerItem({
  item,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: ExplorerItemType;
  onDragStart: (e: React.DragEvent, item: ExplorerItemType) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetItem: ExplorerItemType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!item) return null;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer"
          draggable={!item.isFolder}
          onDragStart={(e) => onDragStart(e, item)}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, item)}
        >
          {item.isFolder && (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isOpen ? "transform rotate-90" : ""}`}
              onClick={() => setIsOpen(!isOpen)}
            />
          )}
          {item.isFolder ? (
            <Folder className="h-4 w-4" />
          ) : (
            <CodeXmlIcon className="h-4 w-4" />
          )}
          <span className="text-sm">{item.name}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {item.isFolder ? (
          <>
            <ContextMenuItem>New File</ContextMenuItem>
            <ContextMenuItem>New Folder</ContextMenuItem>
            <ContextMenuItem>Rename</ContextMenuItem>
            <ContextMenuItem>Delete</ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem>Open</ContextMenuItem>
            <ContextMenuItem>Rename</ContextMenuItem>
            <ContextMenuItem>Delete</ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
      {item.isFolder && isOpen && item.children && (
        <div className="ml-4">
          {item.children.map((child) => (
            <ExplorerItem
              key={child.id}
              item={child}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </ContextMenu>
  );
}

export function Editor() {
  return (
    <PanelProvider>
      <EditorUI />
    </PanelProvider>
  );
}

function EditorUI() {
  const { isPanelVisible, togglePanelVisibility } = usePanelContext();
  const [activeExplorerTab, setActiveExplorerTab] = useState<"files" | "chat">(
    "files"
  );
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: "1",
      name: "FireAgentExample.scxml",
      type: "scxml",
    },
    {
      id: "2",
      name: "Chat.scxml",
      type: "scxml",
    },
    {
      id: "3",
      name: "ToolCalls.scxml",
      type: "scxml",
    },
  ]);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [explorerItems, setExplorerItems] = useState<ExplorerItemType[]>([
    {
      id: "1",
      name: "FireAgentExample.scxml",
      type: "scxml",
      isFolder: false,
    },
    {
      id: "2",
      name: "Chat.scxml",
      type: "scxml",
      isFolder: false,
    },
    {
      id: "3",
      name: "ToolCalls.scxml",
      type: "scxml",
      isFolder: false,
    },
  ]);

  const closeTab = (tabId: string) => {
    setTabs((tabs) => tabs.filter((tab) => tab.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab(tabs[0].id);
    }
  };

  const onDragStart = (e: React.DragEvent, item: ExplorerItemType) => {
    e.dataTransfer.setData("text/plain", item.id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetItem: ExplorerItemType) => {
    e.preventDefault();
    const draggedItemId = e.dataTransfer.getData("text");
    if (targetItem.isFolder && draggedItemId !== targetItem.id) {
      const updateItems = (items: ExplorerItemType[]): ExplorerItemType[] => {
        let draggedItem: ExplorerItemType | undefined;
        const newItems = items.reduce((acc: ExplorerItemType[], item) => {
          if (item.id === draggedItemId) {
            draggedItem = { ...item, id: `${item.id}-${Date.now()}` };
            return acc;
          }
          if (item.id === targetItem.id && draggedItem) {
            return [
              ...acc,
              {
                ...item,
                children: [...(item.children || []), draggedItem],
              },
            ];
          }
          if (item.children) {
            return [...acc, { ...item, children: updateItems(item.children) }];
          }
          return [...acc, item];
        }, []);

        return draggedItem ? newItems : items;
      };

      setExplorerItems(updateItems(explorerItems));
    }
  };

  const additionalOptions = [
    { label: "Format Code", onClick: () => console.log("Formatting code...") },
    { label: "Toggle Wrap", onClick: () => console.log("Toggling wrap...") },
  ];

  return (
    <div className="flex min-h-screen bg-[#25262b] text-white">
      <div className="w-full flex flex-col">
        <div className="h-12 flex items-center px-4">
          <Button variant="ghost" size="sm" className="text-xs rounded-lg">
            File
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs rounded-lg">
            Edit
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs rounded-lg">
            View
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs rounded-lg ml-auto"
            onClick={() => togglePanelVisibility("explorer")}
          >
            {isPanelVisible("explorer") ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        </div>

        <PanelGroup direction="horizontal" className="flex-1 px-2 mb-4">
          {isPanelVisible("explorer") && (
            <>
              <Panel defaultSize={20} minSize={10}>
                <ReusablePanel
                  header={
                    <ExplorerTabs
                      activeTab={activeExplorerTab}
                      onTabChange={setActiveExplorerTab}
                    />
                  }
                  panelType="explorer"
                >
                  <div className="space-y-2">
                    {activeExplorerTab === "files" &&
                      explorerItems.map((item) => (
                        <ExplorerItem
                          key={item.id}
                          item={item}
                          onDragStart={onDragStart}
                          onDragOver={onDragOver}
                          onDrop={onDrop}
                        />
                      ))}
                    {activeExplorerTab === "chat" && (
                      <div className="p-4">
                        <h2 className="text-lg font-semibold">Chat</h2>
                      </div>
                    )}
                  </div>
                </ReusablePanel>
              </Panel>
              <PanelResizeHandle className="w-1 flex items-center justify-center hover:bg-gray-600/20 transition-colors">
                <div className="w-1 h-16 rounded-full bg-gray-600" />
              </PanelResizeHandle>
            </>
          )}

          {isPanelVisible("codeEditor") && (
            <Panel minSize={30}>
              <ReusablePanel
                panelType="codeEditor"
                header={
                  <div className="flex-1 flex items-center overflow-x-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group flex items-center space-x-2 px-3 py-1 text-sm ${
                          activeTab === tab.id
                            ? "bg-[#25262b] text-white rounded-xl"
                            : "text-gray-400 hover:text-gray-300"
                        }`}
                      >
                        <span>{tab.name}</span>
                        <X
                          className={cn(
                            "h-4 w-4 ml-2 group-hover:opacity-100 hover:text-gray-300",
                            {
                              "opacity-40": activeTab === tab.id,
                              "opacity-0": activeTab !== tab.id,
                            }
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle tab close logic here
                          }}
                        />
                      </button>
                    ))}
                  </div>
                }
                additionalOptions={additionalOptions}
              >
                <IDE />
              </ReusablePanel>
            </Panel>
          )}

          {isPanelVisible("codeEditor") && isPanelVisible("builder") && (
            <PanelResizeHandle className="w-1 flex items-center justify-center hover:bg-gray-600/20 transition-colors">
              <div className="w-1 h-16 rounded-full bg-gray-600" />
            </PanelResizeHandle>
          )}

          {isPanelVisible("builder") && (
            <Panel defaultSize={25} minSize={20}>
              <BuilderPanel className="h-full" />
            </Panel>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
