import { labReportEndpoints } from "@/api/compliance";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface LabReport {
  id: string;
  laboratoryName: string;
  reportNumber: string;
  issuedOn: string;
  status: string;
  assessmentStatus: string;
  assessmentReasons: string[];
  resultSets: unknown[];
}

function parseReports(value: unknown): { items: LabReport[]; hasMore: boolean } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("Danh sách báo cáo kiểm nghiệm từ máy chủ không hợp lệ.");
  }
  const response = value as { items: LabReport[]; hasMore?: boolean };
  return { items: response.items, hasMore: Boolean(response.hasMore) };
}

export const MrlComplianceCheckPage = () => {
  const { id } = useParams<{ id?: string }>();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [selected, setSelected] = useState<LabReport | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const request = id ? labReportEndpoints.getLabReport(id) :
      labReportEndpoints.getLabReports({ page, pageSize: 20 });
    request.then((response) => {
      if (!active) return;
      if (id) {
        const report = response as LabReport;
        setReports(report ? [report] : []);
        setSelected(report || null);
        setHasMore(false);
      } else {
        const parsed = parseReports(response);
        setReports(parsed.items);
        setHasMore(parsed.hasMore);
      }
      setError(null);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo kiểm nghiệm.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page]);

  return <div className="space-y-6">
    <header className="border-b border-ink-tertiary/15 pb-4">
      <h1 className="text-2xl font-display font-bold text-ink-primary">Báo cáo kiểm nghiệm</h1>
      <p className="mt-1 text-sm text-ink-secondary">Trạng thái đánh giá được lấy trực tiếp từ máy chủ. Chỉ báo cáo được xác nhận mới có giá trị nghiệp vụ.</p>
    </header>
    {error && <p role="alert" className="rounded-xl border border-accent-danger/30 bg-functional-rejected-bg p-3 text-sm text-accent-danger">{error}</p>}
    {loading ? <GrainLoader label="Đang tải báo cáo kiểm nghiệm" /> :
      reports.length === 0 ? <p className="rounded-2xl border border-ink-tertiary/15 bg-surface-base p-6 text-sm text-ink-secondary">Chưa có báo cáo kiểm nghiệm.</p> :
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => <article key={report.id}
          className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5">
          <h2 className="font-semibold text-ink-primary">{report.reportNumber}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{report.laboratoryName}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Ngày phát hành</dt><dd className="text-ink-primary">{report.issuedOn}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Trạng thái</dt><dd className="text-ink-primary">{report.status}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-secondary">Đánh giá</dt><dd className="font-semibold text-ink-primary">{report.assessmentStatus}</dd></div>
          </dl>
          <button type="button" onClick={() => setSelected(report)}
            className="mt-4 rounded-lg border border-ink-tertiary/20 px-3 py-2 text-sm text-accent-primary">
            Xem chi tiết
          </button>
        </article>)}
      </div>}
    {selected && <section className="rounded-2xl border border-accent-primary/20 bg-surface-base p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display font-bold text-ink-primary">Chi tiết {selected.reportNumber}</h2>
        <button type="button" onClick={() => setSelected(null)} className="text-sm text-ink-secondary">Đóng</button>
      </div>
      <p className="mt-3 text-sm text-ink-secondary">Số bộ kết quả: {selected.resultSets?.length || 0}</p>
      {selected.assessmentReasons?.length > 0 &&
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-secondary">
          {selected.assessmentReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>}
    </section>}
    {!id && <nav aria-label="Trang báo cáo kiểm nghiệm" className="flex items-center justify-end gap-3 text-sm">
      <button type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(page - 1); }}
        className="rounded-lg border border-ink-tertiary/20 px-3 py-2 text-ink-primary disabled:opacity-50">Trước</button>
      <span className="text-ink-secondary">Trang {page}</span>
      <button type="button" disabled={!hasMore || loading} onClick={() => { setLoading(true); setPage(page + 1); }}
        className="rounded-lg border border-ink-tertiary/20 px-3 py-2 text-ink-primary disabled:opacity-50">Sau</button>
    </nav>}
  </div>;
};
