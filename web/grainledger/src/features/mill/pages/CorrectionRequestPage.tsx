import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowsClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Factory,
  MagnifyingGlass,
  PencilSimpleLine,
  Scales,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import { ledgerEndpoints } from "@/api/ledger";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  CorrectionRequestForm,
  type CommittedOperationOption,
} from "../components/CorrectionRequestForm";
import { CorrectionStatusBadge } from "../components/CorrectionStatusBadge";
import { parseCorrectionsResponse, type CorrectionRecord } from "../model/correction";
import { millPaths, reconciliationPath } from "../paths";

export function CorrectionRequestPage() {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();

  const [operations, setOperations] = useState<CommittedOperationOption[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [opsError, setOpsError] = useState<string | null>(null);

  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const refreshData = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingOps(true);
      setLoadingCorrections(true);
      setOpsError(null);

      const opsPromise = (async () => {
        try {
          const res = (await ledgerEndpoints.getOperations()) as unknown;
          const items = Array.isArray(res)
            ? res
            : res && typeof res === "object" && "items" in res
              ? (res as { items: unknown }).items
              : [];
          const committedOps = Array.isArray(items)
            ? items.filter((item): item is CommittedOperationOption =>
                Boolean(
                  item &&
                    typeof item === "object" &&
                    typeof (item as CommittedOperationOption).id === "string" &&
                    (item as CommittedOperationOption).status === "COMMITTED",
                ),
              )
            : [];
          if (active) setOperations(committedOps);
        } catch (err: unknown) {
          if (active) {
            setOpsError(
              err instanceof Error
                ? err.message
                : t("mill.corrections.loadOperationsError", "Không thể tải danh sách công đoạn."),
            );
          }
        } finally {
          if (active) setLoadingOps(false);
        }
      })();

      const corrPromise = (async () => {
        try {
          const res = await ledgerEndpoints.getCorrections({ page: 1, pageSize: 20 });
          if (active) setCorrections(parseCorrectionsResponse(res));
        } catch {
          if (active) setCorrections([]);
        } finally {
          if (active) setLoadingCorrections(false);
        }
      })();

      await Promise.all([opsPromise, corrPromise]);
    }
    void load();
    return () => {
      active = false;
    };
  }, [reloadTick, t]);

  const pendingCount = corrections.filter((c) => c.status === "PENDING_REVIEW").length;
  const resolvedCount = corrections.filter(
    (c) => c.status === "RECONCILED" || c.status === "COMMITTED",
  ).length;

  const filteredCorrections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return corrections;
    return corrections.filter((item) =>
      `${item.id} ${item.operationId} ${item.reason}`.toLowerCase().includes(q),
    );
  }, [corrections, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("ĐỀ XUẤT ĐIỀU CHỈNH SỔ CÁI · ISO 22095", "LEDGER CORRECTION REQUEST · ISO 22095")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("mill.corrections.modalTitle", "Yêu cầu sửa công đoạn")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {t(
              "mill.corrections.modalSubtitle",
              "Gửi đề xuất sửa đổi công đoạn đã chốt sổ cái để đối soát",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.operation}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Factory size={15} aria-hidden="true" />
            <span>{t("nav.mill.operations", "Ghi bước chế biến")}</span>
          </Link>
          <Link
            to={millPaths.reconciliations}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Scales size={15} aria-hidden="true" />
            <span>{t("nav.mill.reconciliations", "Đối soát & Xác nhận")}</span>
          </Link>
          <button
            type="button"
            onClick={refreshData}
            disabled={loadingOps || loadingCorrections}
            aria-label={text("Tải lại dữ liệu", "Reload records")}
            title={text("Tải lại dữ liệu", "Reload records")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={loadingOps || loadingCorrections ? "motion-safe:animate-spin text-accent-primary" : undefined}
            />
          </button>
        </div>
      </header>

      {successNotice && (
        <div role="status" className="record-success justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
            <Link
              to={millPaths.reconciliations}
              className="font-bold underline underline-offset-2"
            >
              {t("nav.mill.reconciliations", "Đối soát & Xác nhận")}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice("")}
            aria-label={text("Đóng thông báo", "Dismiss notice")}
            className="rounded-full p-1 text-accent-primary/80 transition-colors hover:bg-accent-primary/10 hover:text-accent-primary"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Công đoạn đã chốt khả dụng", "Committed operations")}
            </span>
            <CheckCircle size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{operations.length}</div>
          <p className="text-[11px] text-ink-tertiary">
            {text("Công đoạn COMMITTED có thể đề xuất bù sổ cái", "COMMITTED operations eligible for correction")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Chờ Quản lý đối soát", "Pending manager review")}
            </span>
            <ClockCounterClockwise size={16} className="text-accent-warning" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{pendingCount}</div>
          <p className="text-[11px] text-ink-tertiary">
            {text("Yêu cầu đang chờ xác minh bằng chứng thực tế", "Requests awaiting reconciliation verification")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Đã đối soát / Chốt bù", "Reconciled / Committed")}
            </span>
            <ShieldCheck size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{resolvedCount}</div>
          <p className="text-[11px] text-ink-tertiary">
            {text("Hồ sơ đã hoàn tất đối soát hoặc chốt gói bù", "Records reconciled or committed")}
          </p>
        </div>
      </div>

      {/* Main 2-column workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CorrectionRequestForm
            variant="inline"
            operationsData={{
              items: operations,
              loading: loadingOps,
              error: opsError,
            }}
            onClose={refreshData}
            onCreated={() => {
              setSuccessNotice(
                t(
                  "mill.corrections.createSuccess",
                  "Đã gửi yêu cầu sửa công đoạn thành công. Chờ Quản lý đối soát phê duyệt.",
                ),
              );
              refreshData();
            }}
          />
        </div>

        <section className="record-card lg:col-span-5">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <ClockCounterClockwise size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {text("Yêu cầu sửa gần đây", "Recent correction requests")}
                  </h2>
                  <StatusBadge status="ACTIVE" size="sm" label={`${filteredCorrections.length}`} />
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text(
                    "Theo dõi trạng thái xử lý của các đề xuất điều chỉnh đã gửi.",
                    "Track review status of submitted correction requests.",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={text("Tìm yêu cầu sửa", "Search correction requests")}
                placeholder={text("Tìm mã yêu cầu, mã công đoạn, lý do...", "Search request ID, operation ID, reason...")}
                className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-10 placeholder:text-ink-tertiary dark:bg-surface-overlay"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={text("Xóa tìm kiếm", "Clear search")}
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {loadingCorrections ? (
              <div className="flex justify-center py-8">
                <GrainLoader
                  size="sm"
                  label={text("Đang tải yêu cầu sửa...", "Loading correction requests...")}
                />
              </div>
            ) : filteredCorrections.length > 0 ? (
              <ul className="space-y-2.5">
                {filteredCorrections.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 text-xs dark:bg-surface-overlay/25"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-accent-primary">
                        {item.id.slice(0, 12)}...
                      </span>
                      <CorrectionStatusBadge status={item.status} />
                    </div>
                    <p className="font-mono text-[11px] text-ink-secondary">
                      {text("Công đoạn:", "Operation:")} {item.operationId}
                    </p>
                    <p className="line-clamp-2 text-ink-primary">{item.reason}</p>
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-ink-tertiary">
                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString(i18n.language)
                          : "—"}
                      </span>
                      <Link
                        to={reconciliationPath(item.id)}
                        className="font-semibold text-accent-primary hover:underline"
                      >
                        {text("Mở hồ sơ đối soát →", "Open workbench →")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="record-empty py-8">
                <span aria-hidden="true" className="text-ink-tertiary opacity-60">
                  <PencilSimpleLine size={30} />
                </span>
                <p className="font-semibold text-ink-primary">
                  {corrections.length === 0
                    ? text("Chưa có yêu cầu sửa nào.", "No correction requests yet.")
                    : text("Không tìm thấy yêu cầu phù hợp.", "No matching requests.")}
                </p>
                {corrections.length > 0 && searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="record-button mt-2 rounded-full"
                  >
                    {text("Xóa bộ lọc tìm kiếm", "Clear search filter")}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
