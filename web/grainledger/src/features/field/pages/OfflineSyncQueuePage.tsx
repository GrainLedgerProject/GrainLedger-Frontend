import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import {
  getQueuedProcurements,
  onProcurementQueueChanged,
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
import React, { useCallback, useEffect, useState } from "react";

export const OfflineSyncQueuePage: React.FC = () => {
  const { isOnline, setPendingOfflineCount } = useUiStore();
  const [records, setRecords] = useState<QueuedProcurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const queued = await getQueuedProcurements();
    setRecords(queued);
    setPendingOfflineCount(queued.length);
    setIsLoading(false);
  }, [setPendingOfflineCount]);

  useEffect(() => {
    void refresh();
    return onProcurementQueueChanged(() => void refresh());
  }, [refresh]);

  const synchronize = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSummary(null);
    try {
      const result = await syncQueuedProcurements();
      await refresh();
      setSummary(
        result.failed
          ? `Đã ghi sổ ${result.synced} phiếu; ${result.failed} phiếu còn chờ kết nối hoặc cần thử lại.`
          : `Đã đồng bộ an toàn ${result.synced} phiếu thu mua.`,
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="mx-auto space-y-6 w-full max-w-7xl">
      <header className="border-b border-ink-tertiary/15 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider">
            Hiện trường · Offline Capable
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tight text-ink-primary">
            Hàng đợi thu mua
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Mỗi phiếu giữ nguyên mã thao tác từ lúc cân đến khi ghi vào sổ cái,
            nên gửi lại không tạo bản ghi trùng.
          </p>
        </div>
        <button
          type="button"
          disabled={!isOnline || isSyncing || records.length === 0}
          onClick={() => void synchronize()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary text-white font-semibold text-xs shadow-sm active:scale-[.98] transition-transform disabled:opacity-50"
        >
          {isSyncing ? (
            <GrainLoader size="sm" label="Đang đồng bộ" />
          ) : (
            <>
              <ArrowsClockwise size={16} />
              <span>Đồng bộ {records.length ? `(${records.length})` : ""}</span>
            </>
          )}
        </button>
      </header>
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
        <div className="p-3.5 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border text-accent-primary text-xs flex items-center gap-2">
          <CheckCircle size={18} weight="fill" />
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
              const item = record.request.payload.items[0];
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
                    <p className="font-mono text-[11px] text-ink-secondary mt-1">
                      {item.measuredValue} kg · Độ ẩm {item.moisturePercent}%
                    </p>
                    <p className="text-[11px] text-ink-tertiary mt-1">
                      Ghi nhận{" "}
                      {new Date(record.capturedAt).toLocaleString("vi-VN")}
                    </p>
                    {record.lastError && (
                      <p className="text-[11px] mt-2 text-accent-warning flex gap-1.5">
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
