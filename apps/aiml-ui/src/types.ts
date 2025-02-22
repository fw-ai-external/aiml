export interface Message {
  id: string;
  role: "user" | "assistant";
  content: any;
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
  content: string;
  timestamp: Date;
  status: "original" | "active" | "published" | "draft";
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
