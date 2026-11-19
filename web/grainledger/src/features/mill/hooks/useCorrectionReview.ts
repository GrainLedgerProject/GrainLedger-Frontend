import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { millPaths, reconciliationPath } from "../paths";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { type CorrectionRecord, parseCorrectionsResponse } from "../model/correction";

const emptyCorrections: CorrectionRecord[] = [];

export function useCorrectionReview() {
  const isOperator = useAuthStore(s => s.user?.role === "MILL_OPERATOR");
  const { id: routeCorrectionId } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["ledger-corrections"],
    queryFn: async () => {
      const records: CorrectionRecord[] = [];
      for (let page = 1; ; page++) {
        const response = await ledgerEndpoints.getCorrections({ page, pageSize: 100 });
        const items = parseCorrectionsResponse(response);
        records.push(...items);
        if (!response || typeof response !== "object" || !("hasMore" in response) || !response.hasMore) return records;
        if (!items.length) throw new Error("Invalid correction pagination");
      }
    },
    staleTime: 0,
  });
  const corrections = query.data ?? emptyCorrections;
  const loading = query.isFetching;
  const error = query.error?.message;
  const fetchCorrections = () => query.refetch();
  const [statusFilter, setStatusFilter] = useState<"ALL" | CorrectionRecord["status"]>(isOperator ? "RECONCILED" : "PENDING_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");

  const id = routeCorrectionId?.toLowerCase();
  const selectedCorrection = id && corrections.find(record =>
    record.id.toLowerCase() === id || record.operationId.toLowerCase() === id,
  );
  const handleOpenWorkbench = (record: CorrectionRecord) => {
    navigate({ pathname: reconciliationPath(record.id), search: location.search }, { state: { fromList: true } });
  };
  const closeWorkbench = () => {
    if (location.state?.fromList) navigate(-1);
    else navigate({ pathname: millPaths.reconciliations, search: location.search }, { replace: true });
  };
  const filteredCorrections = useMemo(() => {
    return corrections.filter((item) => {
      const matchStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.operationId.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        (item.createdBy && item.createdBy.toLowerCase().includes(q));

      return matchStatus && matchQuery;
    });
  }, [corrections, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const pending = corrections.filter(
      (c) => c.status === "PENDING_REVIEW",
    ).length;
    const reconciled = corrections.filter(
      (c) => c.status === "RECONCILED",
    ).length;
    const committed = corrections.filter(
      (c) => c.status === "COMMITTED",
    ).length;
    return { pending, reconciled, committed, total: corrections.length };
  }, [corrections]);
  return {
    notFound: Boolean(routeCorrectionId && !query.isPending && !query.error && !selectedCorrection),
    corrections, loading, error, statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    selectedCorrection, closeWorkbench,
    fetchCorrections, handleOpenWorkbench, filteredCorrections, stats,
  };
}
