import { useMutation, useQuery } from "@tanstack/react-query";
import { DownloadSimple, Flask, SealCheck, ArrowSquareOut } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { labReportEndpoints, sampleEndpoints } from "@/api/compliance";
import { useAuthStore } from "@/app/store/authStore";
import { saveExportFile } from "@/features/export/model/saveExportFile";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Feedback } from "@/shared/ui/Workflow";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";

export function TraceSourceEvidence({
  sourceLotId,
  sourceLotCode,
  onTraceFromLab,
}: {
  sourceLotId: string;
  sourceLotCode?: string;
  onTraceFromLab?: (reportId: string, resultId: string) => void;
}) {
  const text = useWorkflowText();
  const canTrace = useAuthStore((s) =>
    s.user?.permissions.some((p) =>
      ["trace.read.tenant", "trace.read.all"].includes(p),
    ),
  );

  const samples = useQuery({
    queryKey: ["trace-source-samples", sourceLotId],
    queryFn: () =>
      sampleEndpoints.getSamples({ sourceLotId, pageSize: 25 }),
  });

  const reports = useQuery({
    queryKey: ["trace-source-lab-reports", sourceLotId],
    queryFn: () =>
      labReportEndpoints.getLabReports({ sourceLotId, pageSize: 25 }),
  });

  const downloadFile = useMutation({
    mutationFn: async ({
      reportId,
      reportNumber,
    }: {
      reportId: string;
      reportNumber: string;
    }) => {
      const blob = await labReportEndpoints.getLabReportFile(reportId);
      saveExportFile(blob, `lab-report-${reportNumber || reportId}.pdf`);
    },
  });

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2">
        <p className="font-semibold text-ink-primary flex items-center gap-1.5">
          <Flask size={15} className="text-accent-primary" />
          <span>
            {text("Chứng cứ nguồn (mẫu & kết quả kiểm nghiệm)", "Source evidence (samples & lab reports)")}
            {sourceLotCode ? ` · ${sourceLotCode}` : ""}
          </span>
        </p>
      </div>

      {(samples.isPending || reports.isPending) && (
        <div className="flex justify-center py-4">
          <GrainLoader
            size="sm"
            label={text(
              "Đang tải mẫu và báo cáo kiểm nghiệm...",
              "Loading samples and laboratory reports...",
            )}
          />
        </div>
      )}
      <Feedback error={samples.error ?? reports.error ?? downloadFile.error} />

      {samples.data && (
        <div className="space-y-1.5">
          <p className="font-semibold text-ink-secondary">
            {text("Mẫu đã thu", "Samples")} ({samples.data.items.length})
          </p>
          {samples.data.items.length === 0 ? (
            <p className="text-ink-tertiary">
              {text("Chưa có mẫu nào gắn với lô nguồn này.", "No samples attached to this source lot.")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {samples.data.items.map((sample) => (
                <li
                  key={sample.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-tertiary/15 bg-surface-base px-2.5 py-2"
                >
                  <div>
                    <span className="font-mono font-semibold text-ink-primary">
                      {sample.code || sample.id}
                    </span>
                    {sample.sealCode && (
                      <span className="ml-2 font-mono text-ink-secondary">
                        Seal: {sample.sealCode}
                      </span>
                    )}
                    <p className="text-[11px] text-ink-secondary">
                      {new Date(sample.collectedAt).toLocaleString()} ·{" "}
                      {text("Bàn giao", "Handovers")}: {sample.handoverCount}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {reports.data && (
        <div className="space-y-2">
          <p className="font-semibold text-ink-secondary">
            {text("Phiếu kết quả lab", "Laboratory reports")} ({reports.data.items.length})
          </p>
          {reports.data.items.length === 0 ? (
            <p className="text-ink-tertiary">
              {text("Chưa có phiếu kiểm nghiệm nào cho lô nguồn này.", "No lab reports linked to this source lot.")}
            </p>
          ) : (
            <div className="space-y-2">
              {reports.data.items.map((report) => {
                const confirmed =
                  report.confirmedAt != null || report.status === "CONFIRMED";
                return (
                  <div
                    key={report.id}
                    className="rounded-lg border border-ink-tertiary/15 bg-surface-base p-2.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-ink-primary">
                          {report.reportNumber}
                        </span>
                        <span className="text-ink-secondary">
                          {report.laboratoryName}
                        </span>
                        <StatusBadge
                          status={confirmed ? "COMPLIANT" : "PENDING"}
                          label={
                            confirmed
                              ? text("Đã xác nhận", "Confirmed")
                              : report.status
                          }
                          size="sm"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={downloadFile.isPending}
                        onClick={() =>
                          downloadFile.mutate({
                            reportId: report.id,
                            reportNumber: report.reportNumber,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-tertiary/20 bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-ink-primary hover:bg-surface-overlay"
                      >
                        <DownloadSimple size={13} />
                        <span>{text("Tải tệp lab", "Download file")}</span>
                      </button>
                    </div>

                    {report.resultSets?.length > 0 && (
                      <ul className="divide-y divide-ink-tertiary/10 border-t border-ink-tertiary/10 pt-1.5">
                        {report.resultSets.flatMap((rs) =>
                          (rs.results ?? []).map((res) => (
                            <li
                              key={res.id}
                              className="flex flex-wrap items-center justify-between gap-2 py-1"
                            >
                              <span>
                                <strong>{res.testLabel}</strong>:{" "}
                                <span className="font-mono">
                                  {res.numericValue
                                    ? `${res.numericValue} ${res.unit ?? ""}`
                                    : res.originalResultText}
                                </span>
                              </span>
                              {confirmed && rs.confirmedSampleId && canTrace && (
                                onTraceFromLab ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onTraceFromLab(report.id, res.id)
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                                  >
                                    <SealCheck size={13} />
                                    <span>
                                      {text("Truy xuôi từ kết quả", "Trace forward from result")}
                                    </span>
                                  </button>
                                ) : (
                                  <Link
                                    to={`${riskPaths.traceback}?reportId=${encodeURIComponent(report.id)}&resultId=${encodeURIComponent(res.id)}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                                  >
                                    <ArrowSquareOut size={13} />
                                    <span>
                                      {text("Truy xuôi từ kết quả", "Trace forward from result")}
                                    </span>
                                  </Link>
                                )
                              )}
                            </li>
                          )),
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
