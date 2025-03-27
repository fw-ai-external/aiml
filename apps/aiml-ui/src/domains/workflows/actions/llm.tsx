import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExecutionGraphElement, LLMProps } from "@fireworks/shared";

export const LLMActionDetails = ({
  action,
  extraInfo,
}: {
  action: ExecutionGraphElement<LLMProps>;
  extraInfo: any;
}) => {
  return (
    <>
      <div>
        <h3 className="text-lg font-semibold text-white">Model</h3>
        <Input
          className="mt-2 text-gray-300"
          value={action.attributes.model}
          readOnly
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">
          Developer Instruction template
        </h3>
        <Textarea
          className="mt-2 text-gray-300"
          value={action.attributes.instructions}
          readOnly
        />
      </div>
      {action.attributes.includeChatHistory && (
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
          value={action.attributes.prompt}
          readOnly
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white">Tool Choices</h3>
        <p className="mt-2 text-gray-300 capitalize">
          {action.attributes.tools
            ? action.attributes.tools.map((tool: any) => tool.name).join(", ")
            : "None"}
        </p>
      </div>
    </>
  );
};
