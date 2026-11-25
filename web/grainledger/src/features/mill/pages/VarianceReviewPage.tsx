import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowsClockwise,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Factory,
  LockSimple,
  MagnifyingGlass,
  Package,
  Scales,
  Sliders,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ledgerEndpoints, type CorrectionOperation, type SetupApiResponse } from "@/api/ledger";
import { pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { CorrectionEvidence } from "../components/CorrectionEvidence";
import { millPaths } from "../paths";

const evidenceWrapperClass =
  "rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-4 dark:bg-surface-overlay/30 [&_button]:mt-1 [&_button]:inline-flex [&_button]:min-h-10 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-4 [&_button]:py-2 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:bg-surface-raised [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay dark:[&_button]:hover:bg-surface-raised [&_input[type=file]]:p-2 [&_input[type=file]]:text-sm [&_input[type=file]::file-selector-button]:mr-3 [&_input[type=file]::file-selector-button]:rounded-full [&_input[type=file]::file-selector-button]:border-0 [&_input[type=file]::file-selector-button]:bg-accent-primary/10 [&_input[type=file]::file-selector-button]:px-3 [&_input[type=file]::file-selector-button]:py-1.5 [&_input[type=file]::file-selector-button]:text-xs [&_input[type=file]::file-selector-button]:font-semibold [&_input[type=file]::file-selector-button]:text-accent-primary [&_legend]:font-display [&_legend]:text-sm [&_legend]:font-bold [&_legend]:text-ink-primary [&_p[role=status]]:mt-1 [&_p[role=status]]:inline-flex [&_p[role=status]]:items-center [&_p[role=status]]:gap-1.5 [&_p[role=status]]:rounded-lg [&_p[role=status]]:bg-functional-balanced-bg [&_p[role=status]]:px-3 [&_p[role=status]]:py-2 [&_p[role=status]]:text-xs [&_p[role=status]]:font-semibold [&_p[role=status]]:text-accent-primary";

function hasNonZeroVariance(varianceKg?: string | null): boolean {
  return varianceKg != null && !/^[+-]?0+(?:\.0+)?$/.test(varianceKg);
}

export function VarianceReviewPage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const cache = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const confirm = user?.role === "MILL_MANAGER" && user.permissions.includes("conversions.confirm");
  const commit = user?.role === "MILL_OPERATOR" && user.permissions.includes("conversions.write");
  const hasAccess = Boolean(user && (confirm || commit));

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("ĐỐI SOÁT CHÊNH LỆCH & GHI NHẬN CÔNG ĐOẠN", "OPERATION VARIANCE & LEDGER COMMIT")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("workflows.variance.title")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {t(confirm ? "workflows.variance.managerIntro" : "workflows.variance.operatorIntro")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.operation}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Factory size={15} aria-hidden="true" />
            <span>{t("nav.mill.operations")}</span>
          </Link>
          <Link
            to={millPaths.stock}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Package size={15} aria-hidden="true" />
            <span>{t("nav.stock.overview")}</span>
          </Link>
          {hasAccess && user && (
            <button
              type="button"
              onClick={() => void cache.invalidateQueries({ queryKey: ["operation-variance", user.id] })}
              aria-label={t("workflows.reload")}
              title={t("workflows.reload")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {hasAccess && user ? (
        <VarianceQueue key={user.id} userId={user.id} confirm={Boolean(confirm)} />
      ) : (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Giới hạn quyền đối soát", "Variance review restricted")}
              </h2>
              <p role="alert" className="text-sm text-ink-secondary">
                {t("field.seasons.forbidden")}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function VarianceQueue({ userId, confirm }: { userId: string; confirm: boolean }) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const key = ["operation-variance", userId];
  const queue = useQuery({
    queryKey: [...key, "queue", page, confirm],
    queryFn: async () => {
      const data = await ledgerEndpoints.getOperations({
        page,
        pageSize: 20,
        status: "DRAFT",
        queueOnly: confirm || undefined,
      });
      return {
        items: pageItems<CorrectionOperation>(data).filter(
          (row) => !row.boundCorrectionId && !row.outputs.some((output) => output.originalLotId),
        ),
        hasMore: !Array.isArray(data) && Boolean((data as ApiPage<CorrectionOperation>).hasMore),
      };
    },
  });
  const detail = useQuery({
    queryKey: [...key, "detail", id],
    queryFn: async () => (await ledgerEndpoints.getOperation(id)) as CorrectionOperation,
    enabled: Boolean(id),
  });
  const lookup = useQuery({
    queryKey: [...key, "lookup"],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
  });
  const facility = (facilityId: string) =>
    lookup.data?.facilities?.find((row) => row.id === facilityId)?.name ?? facilityId;

  const items = queue.data?.items ?? [];
  const q = searchQuery.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((row) => {
        const outputLabel = row.outputs.map((line) => line.code || line.stage).join(" ");
        return `${outputLabel} ${row.kind} ${facility(row.facilityId)} ${row.varianceKg ?? "0"}`
          .toLowerCase()
          .includes(q);
      })
    : items;

  const nonzeroCount = items.filter((row) => hasNonZeroVariance(row.varianceKg)).length;
  const confirmedCount = items.filter((row) => row.confirmedVersion === row.version).length;

  return (
    <div className="space-y-6">
      {message && (
        <div role="status" className="record-success">
          <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Bản nháp trong trang", "Drafts on this page")}
            </span>
            <Scales size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{items.length}</div>
          <p className="text-[11px] text-ink-tertiary">
            {confirm
              ? text("Hàng đợi xác nhận chênh lệch", "Variance confirmation queue")
              : text("Phiếu chế biến trạng thái nháp", "Draft processing operations")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Có chênh lệch khối lượng", "With mass variance")}
            </span>
            <WarningCircle size={16} className="text-accent-warning" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{nonzeroCount}</div>
          <p className="text-[11px] text-ink-tertiary">
            {text("Yêu cầu Quản lý xác minh & đính kèm chứng cứ", "Requires manager approval & evidence")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Đã xác nhận chênh lệch", "Variance confirmed")}
            </span>
            <CheckCircle size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{confirmedCount}</div>
          <p className="text-[11px] text-ink-tertiary">
            {text("Sẵn sàng để Vận hành viên ghi sổ cái", "Ready for operator commit")}
          </p>
        </div>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <section className="record-card lg:col-span-5">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <Scales size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {t(confirm ? "workflows.variance.queue" : "workflows.variance.drafts")}
                  </h2>
                  <StatusBadge status="ACTIVE" size="sm" label={`${filteredItems.length}`} />
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text("Chọn bản nháp để xem chi tiết đầu vào/ra.", "Select a draft to inspect inputs & outputs.")}
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
                aria-label={text("Tìm bản nháp chênh lệch", "Search variance drafts")}
                placeholder={text("Tìm mã lô, công đoạn, cơ sở...", "Search lot code, kind, facility...")}
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

            {(queue.error ?? lookup.error) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3 text-xs text-accent-danger"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                  <Feedback error={queue.error ?? lookup.error} />
                </div>
              </div>
            )}

            {queue.isPending ? (
              <div className="flex justify-center py-10">
                <GrainLoader label={text("Đang tải hàng đợi chênh lệch...", "Loading variance queue...")} />
              </div>
            ) : filteredItems.length > 0 ? (
              <ul className="space-y-2.5">
                {filteredItems.map((row) => {
                  const selected = id === row.id;
                  const isConfirmed = row.confirmedVersion === row.version;
                  const nonzero = hasNonZeroVariance(row.varianceKg);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setId(row.id);
                          setMessage("");
                        }}
                        className={`w-full space-y-2 rounded-xl border p-3.5 text-start transition-all ${
                          selected
                            ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                            : "border-ink-tertiary/20 bg-surface-raised/40 hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay/25 dark:hover:bg-surface-overlay"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-ink-primary [overflow-wrap:anywhere]">
                            {row.outputs.map((line) => line.code || line.stage).join(", ") || row.kind}
                          </span>
                          <StatusBadge
                            status={isConfirmed ? "COMPLIANT" : nonzero ? "HOLD" : "STALE"}
                            size="sm"
                            label={t(isConfirmed ? "workflows.variance.confirmed" : "workflows.variance.draft")}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
                          <span className="truncate">{facility(row.facilityId)}</span>
                          <span
                            className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                              nonzero
                                ? "border-functional-hold-border bg-functional-hold-bg text-ink-primary"
                                : "border-ink-tertiary/20 bg-surface-base text-ink-secondary dark:bg-surface-raised"
                            }`}
                          >
                            {row.varianceKg ?? "0"} kg
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="record-empty py-8">
                <span aria-hidden="true" className="text-ink-tertiary opacity-60">
                  <Scales size={30} />
                </span>
                <p className="font-semibold text-ink-primary">
                  {items.length === 0
                    ? t("workflows.empty")
                    : text("Không tìm thấy bản nháp phù hợp.", "No matching drafts.")}
                </p>
                {items.length > 0 && searchQuery && (
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 bg-surface-raised/60 px-4 py-3 dark:bg-surface-overlay/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || queue.isFetching}
                onClick={() => setPage(page - 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <CaretLeft size={13} aria-hidden="true" />
                <span>{t("field.seasons.prev")}</span>
              </button>
              <button
                type="button"
                disabled={!queue.data?.hasMore || queue.isFetching}
                onClick={() => setPage(page + 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <span>{t("field.seasons.next")}</span>
                <CaretRight size={13} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void cache.invalidateQueries({ queryKey: key })}
              className="record-button min-h-9 rounded-full px-3"
            >
              <ArrowsClockwise
                size={13}
                aria-hidden="true"
                className={queue.isFetching ? "motion-safe:animate-spin text-accent-primary" : undefined}
              />
              <span>{t("workflows.reload")}</span>
            </button>
          </div>
        </section>

        <section className="record-card lg:col-span-7">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <Sliders size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ink-primary">
                  {t("workflows.variance.detail")}
                </h2>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text(
                    "Kiểm tra khối lượng đầu vào, đầu ra, hao hụt công bố và xác nhận vào sổ cái.",
                    "Inspect input/output masses, declared loss, and submit verification.",
                  )}
                </p>
              </div>
            </div>
            {detail.data && (
              <StatusBadge
                status={detail.data.confirmedVersion === detail.data.version ? "COMPLIANT" : "IN_PROGRESS"}
                size="sm"
                label={detail.data.kind}
              />
            )}
          </div>

          <div className="p-4 sm:p-6">
            {!id ? (
              <div className="record-empty py-12">
                <span aria-hidden="true" className="text-ink-tertiary opacity-60">
                  <Scales size={34} />
                </span>
                <p className="font-semibold text-ink-primary">
                  {text("Chưa chọn bản nháp", "No draft selected")}
                </p>
                <p className="max-w-sm text-xs text-ink-secondary">
                  {text(
                    "Chọn một bản nháp trong danh sách bên cạnh để kiểm tra chi tiết chênh lệch và xác nhận.",
                    "Select a draft operation from the list to inspect variance metrics and take action.",
                  )}
                </p>
              </div>
            ) : (
              <>
                {detail.error && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                  >
                    <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                      <Feedback error={detail.error} />
                    </div>
                  </div>
                )}

                {detail.isPending ? (
                  <div className="flex justify-center py-12">
                    <GrainLoader label={text("Đang tải chi tiết công đoạn...", "Loading operation details...")} />
                  </div>
                ) : (
                  detail.data && (
                    <VarianceDetail
                      key={`${id}:${detail.data.version}`}
                      operation={detail.data}
                      confirm={confirm}
                      loading={detail.isFetching}
                      lookup={lookup.data}
                      onRefresh={() => cache.invalidateQueries({ queryKey: key })}
                      onSaved={async () => {
                        setMessage(
                          t(confirm ? "workflows.variance.confirmedSaved" : "workflows.variance.committed"),
                        );
                        setId("");
                        await cache.invalidateQueries({ queryKey: key });
                      }}
                    />
                  )
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function VarianceDetail({
  operation,
  confirm,
  loading,
  lookup,
  onRefresh,
  onSaved,
}: {
  operation: CorrectionOperation;
  confirm: boolean;
  loading: boolean;
  lookup?: SetupApiResponse;
  onRefresh: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const [evidenceId, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const current = operation.confirmedVersion === operation.version;
  const nonzero = hasNonZeroVariance(operation.varianceKg);
  const valid =
    operation.status === "DRAFT" &&
    !operation.boundCorrectionId &&
    (confirm ? nonzero && !current : !nonzero || current);
  const mutation = useMutation({
    mutationFn: () =>
      confirm
        ? ledgerEndpoints.confirmOperation(operation.id, {
            version: operation.version,
            evidenceId,
            reason: reason.trim(),
          })
        : ledgerEndpoints.commitOperation(operation.id, {}),
    onSuccess: onSaved,
    onError: async () => {
      setReviewed(false);
      await onRefresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      valid &&
      reviewed &&
      !loading &&
      !mutation.isPending &&
      (!confirm || Boolean(reason.trim() && evidenceId))
    ) {
      mutation.mutate();
    }
  }

  const location = (id: string) => lookup?.locations?.find((row) => row.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
          <dt className="text-xs font-medium text-ink-secondary">{t("workflows.variance.mass")}</dt>
          <dd className="mt-1 font-display text-xl font-bold text-ink-primary">
            <span className="font-mono">{operation.varianceKg ?? "—"}</span>{" "}
            <span className="text-xs font-semibold text-ink-secondary">kg</span>
          </dd>
        </div>
        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
          <dt className="text-xs font-medium text-ink-secondary">{t("workflows.variance.loss")}</dt>
          <dd className="mt-1 font-mono text-base font-bold text-ink-primary">
            {operation.declaredLossKg} kg
          </dd>
        </div>
        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
          <dt className="text-xs font-medium text-ink-secondary">{t("receivingThreshold.revision")}</dt>
          <dd className="mt-1 break-all font-mono text-xs font-semibold text-ink-primary">
            {operation.version}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-primary">
              <ArrowDownLeft size={15} className="text-accent-primary" aria-hidden="true" />
              <span>{t("workflows.variance.inputs")}</span>
            </h3>
            <span className="rounded-full bg-surface-base px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
              {operation.inputs.length}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {operation.inputs.map((row) => (
              <li
                className="rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 break-all dark:bg-surface-raised"
                key={`${row.lotId}:${row.locationId}`}
              >
                <span className="font-mono font-bold text-ink-primary">{row.quantityKg} kg</span>
                <span className="text-ink-secondary">
                  {" "}
                  · {location(row.locationId)} · <span className="font-mono">{row.lotId}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-primary">
              <ArrowUpRight size={15} className="text-accent-primary" aria-hidden="true" />
              <span>{t("workflows.variance.outputs")}</span>
            </h3>
            <span className="rounded-full bg-surface-base px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
              {operation.outputs.length}
            </span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {operation.outputs.map((row) => (
              <li
                className="rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 break-all dark:bg-surface-raised"
                key={row.id}
              >
                <span className="font-mono font-bold text-accent-primary">{row.code ?? row.stage}</span>
                <span className="text-ink-secondary">
                  {" "}
                  · <span className="font-mono font-semibold text-ink-primary">{row.quantityKg} kg</span> ·{" "}
                  {location(row.locationId)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!valid ? (
        <div className="rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 px-4 py-3 text-xs font-medium text-ink-secondary">
          {t(current ? "workflows.variance.confirmed" : "workflows.variance.wait")}
        </div>
      ) : (
        <form
          method="post"
          onSubmit={submit}
          className="record-form space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25"
        >
          {confirm && (
            <>
              <div className={evidenceWrapperClass}>
                <CorrectionEvidence
                  original={operation}
                  value={evidenceId}
                  onChange={(value) => {
                    setEvidence(value);
                    setReviewed(false);
                  }}
                />
              </div>
              <label htmlFor="variance-reason">
                <span>{t("receivingThreshold.reason")}</span>
                <textarea
                  id="variance-reason"
                  name="reason"
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                />
              </label>
            </>
          )}

          <label
            htmlFor="variance-review-check"
            className="!flex-row cursor-pointer items-start gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-base p-3 text-xs font-medium text-ink-primary dark:bg-surface-raised"
          >
            <input
              id="variance-review-check"
              name="reviewed"
              type="checkbox"
              required
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-accent-primary"
            />
            <span>{t(confirm ? "workflows.variance.reviewed" : "workflows.variance.commitCheck")}</span>
          </label>

          <div className="record-form-footer items-center">
            {confirm && (
              <div className="mr-auto">
                {evidenceId ? (
                  <StatusBadge
                    status="COMPLIANT"
                    size="sm"
                    label={text("Đã đính kèm chứng cứ", "Evidence attached")}
                  />
                ) : (
                  <span className="text-xs text-ink-tertiary">
                    {text("Tải lên tệp chứng cứ trước khi xác nhận", "Upload evidence before confirming")}
                  </span>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || mutation.isPending || (confirm && !evidenceId)}
              className="record-button record-primary rounded-full px-6"
            >
              <CheckCircle size={16} weight="bold" aria-hidden="true" />
              <span>{t(confirm ? "workflows.variance.confirm" : "workflows.variance.commit")}</span>
            </button>
          </div>
        </form>
      )}

      {mutation.isPending && (
        <div className="flex justify-center py-2">
          <GrainLoader size="sm" label={text("Đang gửi xác nhận...", "Submitting confirmation...")} />
        </div>
      )}

      {mutation.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={mutation.error} />
          </div>
        </div>
      )}
    </div>
  );
}
