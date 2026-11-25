import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flask } from "@phosphor-icons/react";
import { labReportEndpoints } from "@/api/compliance";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function TraceLabStart({
  onSelect,
}: {
  onSelect: (reportId: string, resultId: string) => void;
}) {
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

  return (
    <form
      className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/60 p-3.5 text-xs dark:bg-surface-overlay/40"
      onSubmit={(e) => {
        e.preventDefault();
        if (resultId) onSelect(reportId, resultId);
      }}
    >
      <div className="flex items-center gap-1.5 font-semibold text-ink-primary">
        <Flask size={15} className="text-accent-primary" />
        <span>
          {text("Chọn kết quả kiểm nghiệm làm điểm bắt đầu", "Choose laboratory result start point")}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="font-semibold text-ink-secondary">
          {text("Báo cáo đã xác nhận", "Confirmed laboratory report")} *
        </span>
        <select
          name="reportId"
          required
          value={reportId}
          onChange={(e) => {
            setReport(e.target.value);
            setResult("");
          }}
          className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-3 py-2 text-xs text-ink-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="" disabled>
            —
          </option>
          {list.data?.items
            .filter((row) => row.status === "CONFIRMED")
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.reportNumber} · {row.laboratoryName}
              </option>
            ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1 || list.isFetching}
          onClick={() => {
            setReport("");
            setResult("");
            setPage(page - 1);
          }}
          className="rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 text-[11px] font-medium disabled:opacity-40"
        >
          {text("Trang trước", "Previous")}
        </button>
        <button
          type="button"
          disabled={!list.data?.hasMore || list.isFetching}
          onClick={() => {
            setReport("");
            setResult("");
            setPage(page + 1);
          }}
          className="rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 text-[11px] font-medium disabled:opacity-40"
        >
          {text("Trang sau", "Next")}
        </button>
      </div>

      {reportId && (
        <label className="block space-y-1">
          <span className="font-semibold text-ink-secondary">
            {text("Kết quả xét nghiệm", "Laboratory result")} *
          </span>
          <select
            name="resultId"
            required
            value={resultId}
            onChange={(e) => setResult(e.target.value)}
            className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-3 py-2 text-xs text-ink-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="" disabled>
              —
            </option>
            {detail.data?.resultSets
              .filter((row) => row.confirmedSampleId && row.sourceLotId)
              .flatMap((row) =>
                row.results.map((result) => (
                  <option key={result.id} value={result.id}>
                    {row.statedSampleCode ?? row.laboratorySampleReference} ·{" "}
                    {result.testLabel} · {result.originalResultText}
                  </option>
                )),
              )}
          </select>
        </label>
      )}

      {(list.isPending || detail.isFetching) && (
        <div className="flex justify-center py-3">
          <GrainLoader
            size="sm"
            label={text(
              "Đang tải báo cáo và kết quả xét nghiệm...",
              "Loading laboratory reports and results...",
            )}
          />
        </div>
      )}
      <Feedback error={list.error ?? detail.error} />

      <button
        type="submit"
        disabled={!reportId || !resultId}
        className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-primary/90 disabled:opacity-50"
      >
        {text("Chọn kết quả này để truy vết", "Use result for tracing")}
      </button>
    </form>
  );
}
