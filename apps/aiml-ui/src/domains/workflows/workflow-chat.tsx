import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { FC } from "react";
import { AssistantActionBar } from "@assistant-ui/react-ui";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";

export function WorkflowChat({
  workflowId,
  setRunId,
}: {
  workflowId: string;
  setRunId: (runId: string) => void;
}) {
  return (
    <div className="h-[calc(100vh-126px)] pt-2 px-4 pb-4 text-xs w-full">
      <Thread />
    </div>
  );
}

const Thread = () => {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport>
        <ThreadPrimitive.Messages
          components={{
            UserMessage: UserMessage,
            AssistantMessage: AssistantMessage,
            EditComposer: EditComposer, // <-- Show our new component during edit mode
          }}
        />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const UserMessage = () => {
  return (
    <MessagePrimitive.Root>
      <ActionBarPrimitive.Root>
        <ActionBarPrimitive.Edit /> {/* <-- add a button to enable edit mode */}
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage = () => {
  return (
    <MessagePrimitive.Root>
      <div className="...">
        <MessagePrimitive.Content
          components={{ tools: { Fallback: ToolFallback } }}
        />
      </div>
      <MyAssistantActionBar />
    </MessagePrimitive.Root>
  );
};

const MyAssistantActionBar: FC = () => {
  return (
    <AssistantActionBar.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
    >
      <AssistantActionBar.Copy />
      <AssistantActionBar.Reload />
    </AssistantActionBar.Root>
  );
};
// define a new component
const EditComposer = () => {
  return (
    // you can return a MessagePrimitive including a ComposerPrimitive, or only a ComposerPrimitive
    <MessagePrimitive.Root>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input />
        <ComposerPrimitive.Cancel />
        <ComposerPrimitive.Send />
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};
