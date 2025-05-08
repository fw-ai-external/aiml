export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Record<string, any>;
  isError?: boolean;
}

export interface ChatProps {
  agentId: string;
  agentName?: string;
  threadId?: string;
  initialMessages?: Message[];
  memory?: boolean;
}

export interface PromptVersion {
  id: string;
  content: string;
  timestamp: Date;
  status: 'original' | 'active' | 'published' | 'draft';
  analysis: string;
  evals?: EvalResult[];
}

export interface EvalResult {
  id: string;
  meta: {
    instructions: string;
  };
  input: string;
  output: string;
  createdAt: Date;
  result: {
    score: number;
    info: {
      reason: string;
    };
  };
}

export interface VersionActionsProps {
  version: PromptVersion;
  index: number;
  isUpdating: boolean;
  onSetActive: (version: PromptVersion, index: number) => void;
  onDelete: (version: PromptVersion, index: number) => void;
}
