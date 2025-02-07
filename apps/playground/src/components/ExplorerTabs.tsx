import { Copy, MessageCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  { id: "files", icon: Copy },
  { id: "chat", icon: MessageCircle },
] as const;

export function ExplorerTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: (typeof tabs)[number]["id"];
  onTabChange: (tab: (typeof tabs)[number]["id"]) => void;
}) {
  const currentTab = activeTab || "files";

  const handleTabChange = (value: string) => {
    onTabChange(value as (typeof tabs)[number]["id"]);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="bg-transparent border-none">
        {tabs.map(({ id, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none px-3 transition-all"
          >
            <Icon className="h-4 w-4 text-gray-300" />
            <span className="sr-only">
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
