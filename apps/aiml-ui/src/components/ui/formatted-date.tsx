import { format, formatDistanceToNow } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export function FormattedDate({ date }: { date: string }) {
  const formattedDate = {
    relativeTime: formatDistanceToNow(new Date(date), { addSuffix: true }),
    fullDate: format(new Date(date), "PPpp"),
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="text-left text-sm text-aiml-el-4">
          {formattedDate.relativeTime}
        </TooltipTrigger>
        <TooltipContent className="bg-aimlg-1 text-aiaiml1">
          <p className="text-sm">{formattedDate.fullDate}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
