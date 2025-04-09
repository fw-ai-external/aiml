import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SerializedBaseElement } from "@fireworks/shared";
export const LLMActionDetails = ({
  action,
  extraInfo,
}: {
  action: SerializedBaseElement & {
    status: string;
    duration: number;
    label?: string;
  };
  extraInfo: any;
}) => {
  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-white">Model</h3>
        <Input
          className="mt-2 text-gray-300"
          value={action.attributes?.model?.toString()}
          readOnly
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">
          Developer Instruction template
        </h3>
        <Textarea
          className="mt-2 text-gray-300"
          value={action.attributes?.instructions
            ?.toString()
            .slice(67, action.attributes?.instructions?.toString().length - 2)
            .trim()}
          readOnly
        />
      </div>
      {action.attributes?.includeChatHistory && (
        <div>
          <h3 className="text-lg font-semibold text-white">Messages</h3>
          <p className="mt-2 text-gray-300">
            See request/response data for full chat history of the last request
          </p>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-white">
          User Message template
        </h3>
        <Textarea
          className="mt-2 text-gray-300"
          value={action.attributes?.prompt
            ?.toString()
            .slice(66, action.attributes?.prompt?.toString().length - 1)
            .trim()}
          readOnly
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white">Tool Choices</h3>
        <p className="mt-2 text-gray-300 capitalize">
          {action.attributes?.tools
            ? (action.attributes?.tools as unknown as any[])
                ?.map((tool: any) => tool.name)
                .join(", ")
            : "None"}
        </p>
      </div>
    </>
  );
};
