import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Footprints } from 'lucide-react';

import { Text } from '@/components/ui/text';

import { cn } from '@/lib/utils';

export type DefaultNode = Node<
  {
    label: string;
    description?: string;
    withoutTopHandle?: boolean;
    withoutBottomHandle?: boolean;
  },
  'default-node'
>;

export function WorkflowDefaultNode({ data }: NodeProps<DefaultNode>) {
  const { label, description, withoutTopHandle, withoutBottomHandle } = data;
  return (
    <div className={cn('bg-aiml-bg-8 rounded-md w-[274px]')}>
      {!withoutTopHandle && <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />}
      <div className="p-2">
        <div className="text-sm bg-aimlg-9 flex items-center gap-[6px] rounded-sm  p-2">
          <Footprints className="text-current w-4 h-4" />
          <Text size="xs" weight="medium" className="text-aimll-6 capitalize">
            {label}
          </Text>
        </div>
      </div>
      {description && (
        <div className="bg-aimlg-4 rounded-b-md p-2 text-[10px] text-left text-aiaiml4">{description}</div>
      )}
      {!withoutBottomHandle && <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />}
    </div>
  );
}
