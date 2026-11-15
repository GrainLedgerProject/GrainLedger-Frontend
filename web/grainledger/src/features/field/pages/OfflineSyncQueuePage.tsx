import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import {
  getQueuedProcurements,
  getUnassignedProcurementCount,
  isProcurementSyncing,
  onProcurementQueueChanged,
  onProcurementSyncStateChanged,
  syncQueuedProcurements,
  type QueuedProcurement,
} from "@/pwa/procurementQueue";
import {
  ArrowsClockwise,
  CheckCircle,
  CloudCheck,
  CloudSlash,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react";
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export const OfflineSyncQueuePage: React.FC = () => {
  const { isOnline, setPendingOfflineCount, procurementSyncMode, setProcurementSyncMode } = useUiStore();
  const [records, setRecords] = useState<QueuedProcurement[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isSyncing = useSyncExternalStore(onProcurementSyncStateChanged, isProcurementSyncing);
  const [summary, setSummary] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasFailures, setHasFailures] = useState(false);

  const refresh = useCallback(async () => {
    const [queued, unassigned] = await Promise.all([getQueuedProcurements(), getUnassignedProcurementCount()]);
    setRecords(queued);
    setUnassignedCount(unassigned);
    setPendingOfflineCount(queued.length);
    setIsLoading(false);
    return queued.length;
  }, [setPendingOfflineCount]);

  useEffect(() => {
    let active = true;
    void Promise.all([getQueuedProcurements(), getUnassignedProcurementCount()]).then(([queued, unassigned]) => {
      if (!active) return;
      setRecords(queued);
      setUnassignedCount(unassigned);
      setPendingOfflineCount(queued.length);
      setIsLoading(false);
    });
    const unsubscribe = onProcurementQueueChanged(() => void refresh());
    return () => { active = false; unsubscribe(); };
  }, [refresh, setPendingOfflineCount]);

  const synchronize = async () => {
    if (!isOnline || isSyncing) return;
    setSummary(null);
    setSyncError(null);
    setHasFailures(false);
    try {
      const result = await syncQueuedProcurements(() => useUiStore.getState().isOnline);
      const remaining = await refresh();
      setHasFailures(remaining > 0);
      setSummary(
        remaining > 0
          ? `Đã ghi sổ ${result.synced} phiếu; ${remaining} phiếu còn chờ kết nối hoặc cần thử lại.`
          : `Đã đồng bộ an toàn ${result.synced} phiếu thu mua.`,
      );
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Không thể đồng bộ. Phiếu vẫn được giữ trong hàng đợi để thử lại.");
    }
  };

  return (
    <div className="mx-auto space-y-6 w-full max-w-7xl">
      <header className="border-b border-ink-tertiary/15 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p data-ui-detail="secondary" className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider">
            Hiện trường · Offline Capable
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tight text-ink-primary">
            Hàng đợi thu mua
          </h1>
          <p data-ui-detail="secondary" className="text-xs text-ink-secondary mt-1">
            Mỗi phiếu giữ nguyên mã thao tác từ lúc cân đến khi ghi vào sổ cái,
            nên gửi lại không tạo bản ghi trùng.
          </p>
        </div>
        <button
          type="button"
          disabled={!isOnline || isSyncing || records.length === 0}
          onClick={() => void synchronize()}
          aria-busy={isSyncing}
          className="inline-flex h-10 min-w-[156px] shrink-0 items-center justify-center gap-2 px-4 rounded-xl bg-accent-primary text-white font-semibold text-xs shadow-sm active:scale-[.98] transition-transform disabled:opacity-50"
        >
          <ArrowsClockwise size={16} aria-hidden="true" className={`shrink-0 ${isSyncing ? "animate-spin motion-reduce:animate-none" : ""}`} />
          <span aria-live="polite">
            {isSyncing ? "Đang đồng bộ" : `Đồng bộ${records.length ? ` (${records.length})` : ""}`}
          </span>
        </button>
      </header>
      <section className="p-4 sm:p-5 rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-xs flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p id="procurement-sync-mode-label" className="font-semibold text-sm text-ink-primary">
            Tự động đồng bộ thu mua
          </p>
          <p id="procurement-sync-mode-description" className="mt-1 text-xs text-ink-secondary">
            Bật để tự gửi khi có kết nối; tắt để đồng bộ thủ công.
          </p>
        </div>
        <button
          type="button"
          id="procurement-sync-mode"
          role="switch"
          aria-checked={procurementSyncMode === "auto"}
          aria-labelledby="procurement-sync-mode-label"
          aria-describedby="procurement-sync-mode-description"
          onClick={() => setProcurementSyncMode(procurementSyncMode === "auto" ? "manual" : "auto")}
          className="group inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full"
        >
          <span aria-hidden="true" className={`relative h-7 w-12 rounded-full border transition-colors duration-150 group-hover:brightness-95 ${procurementSyncMode === "auto" ? "bg-accent-primary border-accent-primary" : "bg-ink-tertiary border-ink-tertiary"}`}>
            <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-150 ${procurementSyncMode === "auto" ? "translate-x-5" : "translate-x-0"}`} />
          </span>
        </button>
      </section>
      {syncError && <p role="alert" className="p-3.5 rounded-xl bg-functional-rejected-bg text-accent-danger text-xs">{syncError}</p>}
      {unassignedCount > 0 && (
        <p role="status" className="p-3.5 rounded-xl bg-functional-stale-bg text-accent-warning text-xs">
          Có {unassignedCount} phiếu được lưu bằng phiên bản cũ chưa xác định tài khoản. Các phiếu này được giữ trên thiết bị nhưng sẽ không tự gửi để tránh ghi sai tài khoản. Hãy liên hệ quản trị viên để đối chiếu trước khi nhập lại.
        </p>
      )}
      <section
        className={`p-4 rounded-2xl border flex items-center gap-3 ${isOnline ? "bg-functional-balanced-bg border-accent-primary/25" : "bg-functional-stale-bg border-functional-stale-border/40"}`}
        role="status"
      >
        {isOnline ? (
          <CloudCheck size={24} className="text-accent-primary" />
        ) : (
          <CloudSlash size={24} className="text-accent-warning" />
        )}
        <div className="text-xs">
          <p className="font-bold text-ink-primary">
            {isOnline
              ? "Đã có kết nối — sẵn sàng đồng bộ"
              : "Đang ở chế độ hiện trường ngoại tuyến"}
          </p>
          <p className="text-ink-secondary mt-0.5">
            {isOnline
              ? "Bạn có thể gửi các phiếu đang chờ bất cứ lúc nào."
              : "Các phiếu mới vẫn được lưu trữ trên thiết bị này."}
          </p>
        </div>
      </section>
      {summary && (
        <div role="status" className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${hasFailures ? "bg-functional-stale-bg border-functional-stale-border text-accent-warning" : "bg-functional-balanced-bg border-functional-balanced-border text-accent-primary"}`}>
          {hasFailures ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}
          <span className="font-semibold">{summary}</span>
        </div>
      )}
      <section className="rounded-2xl overflow-hidden border dark:border-surface-overlay border-ink-tertiary/20 bg-surface-base shadow-xs">
        <div className="dark:bg-surface-overlay bg-surface-raised px-5 py-3.5 border-b dark:border-surface-overlay border-ink-tertiary/15 flex justify-between items-center">
          <h2 className="font-semibold text-sm text-ink-primary">
            Phiếu chờ đồng bộ
          </h2>
          <span className="font-mono text-xs text-ink-tertiary">
            {records.length} phiếu
          </span>
        </div>
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader label="Đang mở hàng đợi trên thiết bị…" />
          </div>
        ) : records.length === 0 ? (
          <div className="dark:bg-surface-raised py-16 text-center">
            <CheckCircle
              size={36}
              weight="fill"
              className="mx-auto text-accent-primary mb-3"
            />
            <p className="font-semibold text-ink-primary">
              Không còn phiếu chờ
            </p>
            <p className="text-xs text-ink-secondary mt-1">
              Mọi dữ liệu thu mua trên thiết bị đã được ghi sổ.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-tertiary/10">
            {records.map((record) => {
              const item = record.request.payload?.items?.[0];
              return (
                <article key={record.id} className="p-4 sm:p-5 flex gap-3">
                  <div className="p-2 h-fit rounded-xl bg-accent-primary/10 text-accent-primary">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 justify-between items-start">
                      <p className="font-semibold text-sm text-ink-primary">
                        Phiếu thu mua lúa tươi
                      </p>
                      <span className="shrink-0 px-2 py-1 rounded-full bg-accent-warning/10 text-accent-warning text-[10px] font-bold">
                        CHỜ GỬI
                      </span>
                    </div>
                    <p className="font-mono text-xs text-ink-secondary mt-1">
                      {item?.measuredValue || "0"} kg · Độ ẩm {item?.moisturePercent || "0"}%
                    </p>
                    <p className="text-xs text-ink-tertiary mt-1">
                      Ghi nhận{" "}
                      {new Date(record.capturedAt).toLocaleString("vi-VN")}
                    </p>
                    {record.lastError && (
                      <p className="text-xs mt-2 text-accent-warning flex gap-1.5">
                        <WarningCircle size={14} className="shrink-0" />
                        {record.lastError}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
