import { ledgerEndpoints } from "@/api/ledger";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { millPaths, reconciliationPath } from "../paths";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { type CorrectionRecord, parseCorrectionsResponse } from "../model/correction";

const emptyCorrections: CorrectionRecord[] = [];

export function useCorrectionReview() {
  const { id: routeCorrectionId } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["ledger-corrections"],
    queryFn: async () => parseCorrectionsResponse(await ledgerEndpoints.getCorrections()),
    staleTime: 0,
  });
  const corrections = query.data ?? emptyCorrections;
  const loading = query.isFetching;
  const error = query.error?.message;
  const fetchCorrections = () => query.refetch();
  const [statusFilter, setStatusFilter] = useState<"ALL" | CorrectionRecord["status"]>("PENDING_REVIEW");
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
    corrections, loading, error, statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    selectedCorrection, closeWorkbench,
    fetchCorrections, handleOpenWorkbench, filteredCorrections, stats,
  };
}
