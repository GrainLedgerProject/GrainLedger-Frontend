import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { labReportEndpoints } from "@/api/compliance";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function TraceLabStart({ onSelect }: { onSelect: (reportId: string, resultId: string) => void }) {
  const text = useWorkflowText();
  const [page, setPage] = useState(1);
  const [reportId, setReport] = useState("");
  const [resultId, setResult] = useState("");
  const list = useQuery({
    queryKey: ["trace-lab-reports", page],
    queryFn: () => labReportEndpoints.getLabReports({ page, pageSize: 20 }),
  });
  const detail = useQuery({
    queryKey: ["trace-lab-report-detail", reportId],
    queryFn: () => labReportEndpoints.getLabReport(reportId),
    enabled: Boolean(reportId),
  });
  return <form className="space-y-2" onSubmit={e => { e.preventDefault(); if (resultId) onSelect(reportId, resultId); }}>
    <label>{text("Báo cáo đã xác nhận", "Confirmed laboratory report")} *
      <select name="reportId" required value={reportId} onChange={e => { setReport(e.target.value); setResult(""); }}>
        <option value="" disabled>—</option>
        {list.data?.items.filter(row => row.status === "CONFIRMED").map(row => <option key={row.id} value={row.id}>{row.reportNumber} · {row.laboratoryName}</option>)}
      </select>
    </label>
    <div className="flex items-center gap-2">
      <button type="button" disabled={page === 1 || list.isFetching} onClick={() => { setReport(""); setResult(""); setPage(page - 1); }}>{text("Trang trước", "Previous")}</button>
      <button type="button" disabled={!list.data?.hasMore || list.isFetching} onClick={() => { setReport(""); setResult(""); setPage(page + 1); }}>{text("Trang sau", "Next")}</button>
    </div>
    {reportId && <label>{text("Kết quả xét nghiệm", "Laboratory result")} *
      <select name="resultId" required value={resultId} onChange={e => setResult(e.target.value)}>
        <option value="" disabled>—</option>
        {detail.data?.resultSets.filter(row => row.confirmedSampleId && row.sourceLotId).flatMap(row => row.results.map(result =>
          <option key={result.id} value={result.id}>{row.statedSampleCode ?? row.laboratorySampleReference} · {result.testLabel} · {result.originalResultText}</option>))}
      </select>
    </label>}
    <Feedback pending={list.isPending || detail.isFetching} error={list.error ?? detail.error} />
    <button type="submit" disabled={!reportId}>{text("Truy vết từ kết quả", "Trace from result")}</button>
  </form>;
}
