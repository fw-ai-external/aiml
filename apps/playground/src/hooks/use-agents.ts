import { Agent } from "@mastra/core/agent";
import { useEffect, useState } from "react";
import { toast, useToast } from "@/hooks/use-toast";

export const useAgents = () => {
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) {
          const error = await res.json();
          setAgents({});
          console.error("Error fetching agents", error);
          toast({
            variant: "destructive",
            title: error?.error || "Error fetching agents",
          });
          return;
        }
        const data = await res.json();
        setAgents(data);
      } catch (error) {
        setAgents({});
        console.error("Error fetching agents", error);
        toast({
          variant: "destructive",
          title: "Error fetching agents",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  return { agents, isLoading };
};

export const useAgent = (agentId: string) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      setIsLoading(true);
      try {
        if (!agentId) {
          setAgent(null);
          setIsLoading(false);
          return;
        }
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) {
          const error = await res.json();
          setAgent(null);
          console.error("Error fetching agent", error);
          toast({
            variant: "destructive",
            title: error?.error || "Error fetching agent",
          });
          return;
        }
        const agent = await res.json();
        setAgent(agent);
      } catch (error) {
        setAgent(null);
        console.error("Error fetching agent", error);
        toast({
          variant: "destructive",
          title: "Error fetching agent",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  return { agent, isLoading };
};
