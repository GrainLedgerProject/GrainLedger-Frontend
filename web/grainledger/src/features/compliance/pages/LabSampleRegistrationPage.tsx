import { sampleEndpoints } from "@/api/compliance";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface SampleSummary {
  id: string;
  sourceLotId: string;
  code: string;
  sealCode: string;
  collectedAt: string;
  handoverCount: number;
  materialDescription?: string | null;
}
interface SamplePage { items: SampleSummary[]; hasMore: boolean }

function parsePage(value: unknown): SamplePage {
  if (!value || typeof value !== "object" || !("items" in value) ||
    !Array.isArray(value.items)) throw new Error("Danh sách mẫu từ máy chủ không hợp lệ.");
  const data = value as { items: SampleSummary[]; hasMore?: boolean };
  return { items: data.items, hasMore: Boolean(data.hasMore) };
}

interface Props { defaultTab?: "LIST" | "CREATE" }
export const LabSampleRegistrationPage = ({ defaultTab = "LIST" }: Props) => {
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    sampleEndpoints.getSamples({ page, pageSize: 20 }).then((response) => {
      if (!active) return;
      const parsed = parsePage(response);
      setSamples(parsed.items);
      setHasMore(parsed.hasMore);
      setError(null);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải danh sách mẫu.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  return <div className="space-y-6">
    <header className="border-b border-ink-tertiary/15 pb-4">
      <h1 className="text-2xl font-display font-bold text-ink-primary">Mẫu niêm phong</h1>
      <p className="mt-1 text-sm text-ink-secondary">Danh sách mẫu được ghi nhận trên máy chủ.</p>
    </header>
    {defaultTab === "CREATE" && <p className="rounded-xl border border-accent-warning/30 bg-functional-stale-bg p-4 text-sm text-ink-primary">
      Tài khoản hiện tại chỉ có quyền xem mẫu. Việc lấy mẫu mới cần nhân viên thu mua có quyền ghi nhận.
      <Link to="/compliance/lab-samples" className="ml-2 font-semibold text-accent-primary underline">Xem danh sách mẫu</Link>
    </p>}
    {error && <p role="alert" className="rounded-xl border border-accent-danger/30 bg-functional-rejected-bg p-3 text-sm text-accent-danger">{error}</p>}
    {loading ? <GrainLoader label="Đang tải mẫu" /> :
      samples.length === 0 ? <p className="rounded-2xl border border-ink-tertiary/15 bg-surface-base p-6 text-sm text-ink-secondary">Chưa có mẫu nào.</p> :
      <div className="overflow-x-auto rounded-2xl border border-ink-tertiary/20 bg-surface-base">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised text-ink-secondary"><tr>
            <th scope="col" className="p-3">Mã mẫu</th>
            <th scope="col" className="p-3">Niêm phong</th>
            <th scope="col" className="p-3">Lô nguồn</th>
            <th scope="col" className="p-3">Lấy mẫu</th>
            <th scope="col" className="p-3">Lần bàn giao</th>
          </tr></thead>
          <tbody>{samples.map((sample) => <tr key={sample.id} className="border-t border-ink-tertiary/10">
            <td className="p-3 font-mono text-ink-primary">{sample.code}</td>
            <td className="p-3 font-mono text-ink-primary">{sample.sealCode}</td>
            <td className="p-3 font-mono text-ink-secondary">{sample.sourceLotId}</td>
            <td className="p-3 text-ink-secondary">{new Date(sample.collectedAt).toLocaleString("vi-VN")}</td>
            <td className="p-3 text-ink-primary">{sample.handoverCount}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <nav aria-label="Trang danh sách mẫu" className="flex items-center justify-end gap-3 text-sm">
      <button type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(page - 1); }}
        className="rounded-lg border border-ink-tertiary/20 px-3 py-2 text-ink-primary disabled:opacity-50">Trước</button>
      <span className="text-ink-secondary">Trang {page}</span>
      <button type="button" disabled={!hasMore || loading} onClick={() => { setLoading(true); setPage(page + 1); }}
        className="rounded-lg border border-ink-tertiary/20 px-3 py-2 text-ink-primary disabled:opacity-50">Sau</button>
    </nav>
  </div>;
};
