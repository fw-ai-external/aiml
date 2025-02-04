import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useLogs = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/logs");
        if (!res.ok) {
          const error = await res.json();
          setLogs([]);
          console.error("Error fetching logs", error);
          toast({
            variant: "destructive",
            title: error?.error || "Error fetching logs",
          });
          return;
        }
        const data = await res.json();
        setLogs(data);
      } catch (error) {
        setLogs([]);
        console.error("Error fetching logs", error);
        toast({
          variant: "destructive",
          title: "Error fetching logs",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return { logs, isLoading };
};

export const useLogsByRunId = (runId: string) => {
  const [logs, setLogs] = useState<
    { timestamp: string; level: string; message: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fetchLogs = async (_runId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs/${_runId ?? runId}`);
      if (!res.ok) {
        const error = await res.json();
        setLogs([]);
        console.error("Error fetching logs", error);
        toast({
          variant: "destructive",
          title: error?.error || "Error fetching logs",
        });
        return;
      }
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      setLogs([]);
      console.error("Error fetching logs", error);
      toast({
        variant: "destructive",
        title: "Error fetching logs",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(runId);
  }, [runId]);

  return { logs, isLoading, refetchLogs: fetchLogs };
};
