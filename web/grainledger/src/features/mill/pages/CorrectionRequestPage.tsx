import { ledgerEndpoints } from "@/api/ledger";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

interface OperationOption {
  id: string;
  kind?: string;
  status?: string;
  occurredAt?: string;
}

function parseOperations(value: unknown): OperationOption[] {
  const items = Array.isArray(value) ? value :
    value && typeof value === "object" && "items" in value ? (value as { items: unknown }).items : [];
  return Array.isArray(items) ? items.filter((item): item is OperationOption =>
    Boolean(item && typeof item === "object" && typeof item.id === "string" &&
      item.status === "COMMITTED")) : [];
}

export const CorrectionRequestPage = () => {
  const navigate = useNavigate();
  const [operations, setOperations] = useState<OperationOption[]>([]);
  const [operationId, setOperationId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ledgerEndpoints.getOperations().then((response) => {
      if (active) setOperations(parseOperations(response));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải công đoạn.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!operations.some((operation) => operation.id === operationId) || !reason.trim()) {
      setError("Cần chọn công đoạn đã chốt và nhập lý do sửa đổi.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ledgerEndpoints.createCorrection({ operationId, reason: reason.trim() });
      navigate("/mill/corrections/pending");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo yêu cầu sửa đổi.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="mx-auto max-w-2xl space-y-6">
    <header className="border-b border-ink-tertiary/15 pb-4">
      <Link to="/mill/corrections/pending" className="text-sm text-accent-primary">← Danh sách yêu cầu sửa đổi</Link>
      <h1 className="mt-3 text-2xl font-display font-bold text-ink-primary">Yêu cầu sửa công đoạn</h1>
      <p className="mt-1 text-sm text-ink-secondary">Chọn công đoạn đã chốt từ máy chủ và ghi rõ lý do cần sửa.</p>
    </header>
    {loading && <GrainLoader label="Đang tải công đoạn" />}
    {error && <p role="alert" className="rounded-xl border border-accent-danger/30 bg-functional-rejected-bg p-3 text-sm text-accent-danger">{error}</p>}
    {!loading && <form onSubmit={(event) => void submit(event)}
      className="space-y-5 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6">
      <label className="block text-sm font-semibold text-ink-primary">Công đoạn đã chốt
        <select required value={operationId} onChange={(event) => setOperationId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-ink-tertiary/20 bg-surface-base p-2 text-sm">
          <option value="">Chọn công đoạn</option>
          {operations.map((operation) => <option key={operation.id} value={operation.id}>
            {operation.kind || "Công đoạn"} · {operation.id}
          </option>)}
        </select>
      </label>
      {operations.length === 0 && <p className="text-sm text-ink-secondary">Không có công đoạn đã chốt trong danh sách hiện tại.</p>}
      <label className="block text-sm font-semibold text-ink-primary">Lý do sửa đổi
        <textarea required value={reason} onChange={(event) => setReason(event.target.value)}
          rows={5} className="mt-2 w-full rounded-lg border border-ink-tertiary/20 bg-surface-base p-2 text-sm" />
      </label>
      <button type="submit" disabled={submitting || operations.length === 0}
        className="rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </form>}
  </div>;
};
