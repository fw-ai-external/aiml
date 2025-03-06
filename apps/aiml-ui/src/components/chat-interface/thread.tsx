import { useToast } from "@/hooks/use-toast";
import { ThreadPrimitive } from "@assistant-ui/react";
import { ArrowDownIcon, PanelRightOpen, SquarePen } from "lucide-react";
import { Dispatch, FC, SetStateAction } from "react";
import { TooltipIconButton } from "./tooltip-icon-button";
import { TighterText } from "./header";
import { Composer } from "./composer";
import { AssistantMessage, UserMessage } from "./messages";
import { ThreadHistory } from "./thread-history";
import { ThreadWelcome } from "./welcome";

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-8 rounded-full disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

export interface ThreadProps {
  userId: string | undefined;
  hasChatStarted: boolean;
  setChatStarted: Dispatch<SetStateAction<boolean>>;
  searchEnabled: boolean;
  setChatCollapsed: (c: boolean) => void;
}

export const Thread: FC<ThreadProps> = (props: ThreadProps) => {
  const { setChatStarted, hasChatStarted } = props;
  const { toast } = useToast();

  const {
    searchOrCreateThread,
    modelName,
    setModelName,
    modelConfig,
    setModelConfig,
    modelConfigs,
    removeThreadIdQueryParam,
  } = useThreadContext();

  const handleCreateThread = async () => {
    // Remove the threadId param from the URL
    removeThreadIdQueryParam();

    setModelName(modelName);
    setModelConfig(modelName, modelConfig);
    setChatStarted(false);
    // Set `true` for `isNewThread` because we want to create a new thread
    // if the existing one has values.
    const thread = await searchOrCreateThread(true);
    if (!thread) {
      toast({
        title: "Failed to create a new thread",
        duration: 5000,
        variant: "destructive",
      });
    }
  };

  return (
    <ThreadPrimitive.Root className="flex flex-col h-full w-full">
      <div className="pr-3 pl-6 pt-3 pb-2 flex flex-row gap-4 items-center justify-between">
        <div className="flex items-center justify-start gap-2 text-gray-600">
          <ThreadHistory />
          <TighterText className="text-xl">Open Canvas</TighterText>
        </div>
        {hasChatStarted ? (
          <div className="flex flex-row flex-1 gap-2 items-center justify-end">
            <TooltipIconButton
              tooltip="Collapse Chat"
              variant="ghost"
              className="w-8 h-8"
              delayDuration={400}
              onClick={() => props.setChatCollapsed(true)}
            >
              <PanelRightOpen className="text-gray-600" />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="New chat"
              variant="ghost"
              className="w-8 h-8"
              delayDuration={400}
              onClick={handleCreateThread}
            >
              <SquarePen className="text-gray-600" />
            </TooltipIconButton>
          </div>
        ) : null}
      </div>
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto scroll-smooth bg-inherit px-4 pt-8">
        {!hasChatStarted && (
          <ThreadWelcome
            composer={
              <Composer
                chatStarted={false}
                userId={props.userId}
                searchEnabled={props.searchEnabled}
              />
            }
            searchEnabled={props.searchEnabled}
          />
        )}
        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            AssistantMessage: (prop) => (
              <AssistantMessage {...prop} runId={runId} />
            ),
          }}
        />
      </ThreadPrimitive.Viewport>
      <div className="mt-4 flex w-full flex-col items-center justify-end rounded-t-lg bg-inherit pb-4 px-4">
        <ThreadScrollToBottom />
        <div className="w-full max-w-2xl">
          {hasChatStarted && (
            <div className="flex flex-col space-y-2">
              <Composer
                chatStarted={true}
                userId={props.userId}
                searchEnabled={props.searchEnabled}
              />
            </div>
          )}
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
};
