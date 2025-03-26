import { Bot, DraftingCompass, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "../../lib/utils";

const links = [
  {
    name: "Workflows",
    url: "/workflows",
    icon: Workflow,
    enabled: true,
  },
  {
    name: "Federated MCP Server",
    url: "/mcp-server",
    icon: DraftingCompass,
    enabled: false,
  },
  {
    name: "Agents",
    url: "/agents",
    icon: Bot,
    enabled: false,
  },
];

export const Sidebar = () => {
  const path = usePathname();

  return (
    <div className="relative z-20 h-full text-aimll-6">
      <div className="bg-aimlg-1 h-full w-full p-4 flex gap-6 flex-col">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 px-2 items-center">
            <p className="text-medium text-sm  gradient py-[0.38rem] font-tasa">
              AIML Playground
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-0.5">
            {links.map((link) => {
              const [_, pagePath] = path.split("/");
              const lowercasedPagePath = link.name.toLowerCase();
              const isActive =
                link.url === path ||
                link.name === path ||
                pagePath === lowercasedPagePath;
              if (!link.enabled)
                return (
                  <a
                    key={link.name}
                    onClick={() => {
                      alert("Coming soon");
                    }}
                    className="flex cursor-pointer w-full px-2 items-center focus-visible:outline-none transition-colors focus-visible:ring-1 focus-visible:ring-aimlorder-4 gap-3 rounded-xs group text-small hover:bg-aiaiml6/5"
                  >
                    <link.icon
                      className={cn(
                        "w-[0.875rem] h-[0.875rem] text-aimll-3 group-hover:text-aiaiml6",
                        isActive ? "text-aimll-6" : ""
                      )}
                    />
                    <p
                      className={cn(
                        "py-[0.38rem] text-aimll-6/60 group-hover:text-aiaiml6 transition-all  capitalize ",
                        isActive ? "text-aimll-6" : ""
                      )}
                    >
                      {link.name}
                    </p>
                  </a>
                );
              return (
                <Link
                  key={link.name}
                  href={link.url}
                  className={cn(
                    "flex cursor-pointer w-full px-2 items-center focus-visible:outline-none transition-colors focus-visible:ring-1 focus-visible:ring-aimlorder-4 gap-3 rounded-xs group text-small hover:bg-aiaiml6/5",
                    isActive ? "bg-aimll-6/5" : ""
                  )}
                >
                  <link.icon
                    className={cn(
                      "w-[0.875rem] h-[0.875rem] text-aimll-3 group-hover:text-aiaiml6",
                      isActive ? "text-aimll-6" : ""
                    )}
                  />
                  <p
                    className={cn(
                      "py-[0.38rem] text-aimll-6/60 group-hover:text-aiaiml6 transition-all  capitalize ",
                      isActive ? "text-aimll-6" : ""
                    )}
                  >
                    {link.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex mt-auto gap-2 items-center justify-center">
          <a
            href="https://aiml.ai"
            target="_blank"
            rel="noopener"
            className="text-sm text-gray-300/60 hover:text-gray-100"
          >
            aiml.ai
          </a>
          <div className="w-1 h-1 bg-gray-300/60 rounded-full" />
          <a
            href="https://aiml.ai/docs"
            target="_blank"
            rel="noopener"
            className="text-sm text-gray-300/60 hover:text-gray-100"
          >
            Docs
          </a>
          <div className="w-1 h-1 bg-gray-300/60 rounded-full" />

          <a
            href="https://github.com/fw-ai/aiml"
            target="_blank"
            rel="noopener"
            className="text-sm text-gray-300/60 hover:text-gray-100"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
