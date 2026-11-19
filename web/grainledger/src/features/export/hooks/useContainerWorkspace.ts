import { useQuery, useQueryClient } from "@tanstack/react-query";
import { containerExecutionEndpoints } from "@/api/containerExecution";

export function useContainerWorkspace(id: string) {
  const cache = useQueryClient();
  const execution = useQuery({ queryKey: ["container-execution", id], queryFn: () => containerExecutionEndpoints.getDetail(id), staleTime: 0, refetchOnWindowFocus: true });
  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["container-execution", id] }),
      cache.invalidateQueries({ queryKey: ["container-workflow", id] }),
      cache.invalidateQueries({ queryKey: ["container-production", id] }),
      cache.invalidateQueries({ queryKey: ["container-dossier", id] }),
      cache.invalidateQueries({ queryKey: ["container-execution-history", id] }),
      cache.invalidateQueries({ queryKey: ["export-container", id] }),
      cache.invalidateQueries({ queryKey: ["export-container-list"] }),
      cache.invalidateQueries({ queryKey: ["export-workspace-orders"] }),
      cache.invalidateQueries({ queryKey: ["review-decision"] }),
      cache.invalidateQueries({ queryKey: ["container-notifications"] }),
    ]);
  }
  return { execution, refresh };
}
