import { useQuery } from "@tanstack/react-query";
import { sampleEndpoints } from "@/api/compliance";
import { collectPages, pageItems } from "@/api/query";

type LabSample = { id: string; code: string; sealCode: string };

export function useLabSamples(companyId?: string) {
  return useQuery({ queryKey: ["lab-review-samples", companyId], queryFn: () => collectPages(async query => {
    const response = await sampleEndpoints.getSamples(query);
    return { items: pageItems<LabSample>(response), hasMore: !Array.isArray(response) && Boolean((response as { hasMore?: boolean })?.hasMore) };
  }) });
}
