import type { SerializedBaseElement } from "@fireworks/shared";

export const DefaultActionDetails = ({
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
        <h3 className="text-lg font-semibold text-white">Status</h3>
        <p className="mt-2 text-gray-300 capitalize">{action.status}</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">Duration</h3>
        <p className="mt-2 text-gray-300">{action.duration}</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">Type</h3>
        <p className="mt-2 text-gray-300 capitalize">{action.type}</p>
      </div>
      {action.subType === "model" && extraInfo && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-white">Model</h3>
            <p className="mt-2 text-gray-300">{extraInfo.modelName}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Tokens</h3>
            <p className="mt-2 text-gray-300">
              Input: {extraInfo.inputTokens}, Output: {extraInfo.outputTokens}
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Latency</h3>
            <p className="mt-2 text-gray-300">{extraInfo.latency}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Temperature</h3>
            <p className="mt-2 text-gray-300">{extraInfo.temperature}</p>
          </div>
        </>
      )}
    </>
  );
};
