import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowsClockwise,
  ArrowUpRight,
  Buildings,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Factory,
  FloppyDisk,
  LockSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Scales,
  Sliders,
  Stack,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  ledgerEndpoints,
  type CorrectionOperation,
  type SetupApiResponse,
} from "@/api/ledger";
import { collectPages, type ApiPage } from "@/api/query";
import { confirmAction } from "@/app/store/feedbackStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { MassValue } from "@/shared/ui/MassValue";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { checkMassBalance, toDecimal } from "@/shared/utils/decimalMass";
import { millPaths } from "../paths";

const scope = ["operation-drafts"];
const kinds = ["DRYING", "MILLING", "MERGE", "BLENDING", "BAGGING"] as const;
const rice = ["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE"];
const massPattern = "[0-9]{1,14}([.][0-9]{1,6})?";

type WorkflowTextFn = (vi: string, en: string) => string;

const OPERATION_LABELS: Record<string, { vi: string; en: string }> = {
  DRYING: { vi: "Sấy lúa", en: "Drying" },
  MILLING: { vi: "Xay xát", en: "Milling" },
  MERGE: { vi: "Gộp lô", en: "Merge" },
  BLENDING: { vi: "Phối trộn", en: "Blending" },
  BAGGING: { vi: "Đóng bao", en: "Bagging" },
};

const STAGE_LABELS: Record<string, { vi: string; en: string }> = {
  RAW_PADDY: { vi: "Lúa tươi", en: "Raw paddy" },
  DRIED_PADDY: { vi: "Lúa khô", en: "Dried paddy" },
  HEAD_RICE: { vi: "Gạo nguyên", en: "Head rice" },
  BROKEN_RICE: { vi: "Tấm", en: "Broken rice" },
  BRAN: { vi: "Cám", en: "Bran" },
  HUSK: { vi: "Trấu", en: "Husk" },
  BLENDED_RICE: { vi: "Gạo phối trộn", en: "Blended rice" },
  BAGGED_RICE: { vi: "Gạo đóng bao", en: "Bagged rice" },
};

function formatCodeLabel(
  labels: Record<string, { vi: string; en: string }>,
  code: string,
  text: WorkflowTextFn,
): string {
  const entry = labels[code];
  return entry ? `${text(entry.vi, entry.en)} (${code})` : code;
}

function hasNonZeroVariance(varianceKg?: string | null): boolean {
  return varianceKg != null && !/^[+-]?0+(?:\.0+)?$/.test(varianceKg);
}

const localTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const positionKey = (lotId: string, locationId: string) =>
  `${lotId}:${locationId}`;

interface InputLot {
  id: string;
  code: string;
  stage: string;
  commodityId: string;
  productIdentity: string;
  positions: {
    locationId: string;
    facilityId: string;
    availableKg: string;
    poolRevision?: number;
  }[];
}

function DraftStatusChip({
  operation,
  text,
}: {
  operation: CorrectionOperation;
  text: WorkflowTextFn;
}) {
  if (operation.boundCorrectionId) {
    return (
      <StatusBadge
        status="IN_PROGRESS"
        size="sm"
        label={text("Bù sổ cái", "Correction")}
      />
    );
  }
  if (operation.confirmedVersion === operation.version) {
    return (
      <StatusBadge
        status="COMPLIANT"
        size="sm"
        label={text("Đã xác nhận", "Confirmed")}
      />
    );
  }
  if (hasNonZeroVariance(operation.varianceKg)) {
    return (
      <StatusBadge
        status="PENDING"
        size="sm"
        label={text("Có chênh lệch", "Has variance")}
      />
    );
  }
  if (operation.varianceKg != null) {
    return (
      <StatusBadge
        status="BALANCED"
        size="sm"
        label={text("Cân bằng", "Balanced")}
      />
    );
  }
  return (
    <StatusBadge status="STALE" size="sm" label={text("Bản nháp", "Draft")} />
  );
}

export function OperationDraftsPage() {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [id, setId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "DRAFT" | "COMMITTED" | "CORRECTED" | "ALL"
  >("DRAFT");
  const [kindFilter, setKindFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "occurredAt" | "kind" | "owner" | "status" | ""
  >("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const workspaceRef = useRef<HTMLDivElement>(null);

  const setup = useQuery({
    queryKey: ["ledger-facility-setup"],
    queryFn: ledgerEndpoints.getSetup,
  });
  const drafts = useQuery({
    queryKey: [
      ...scope,
      "queue",
      {
        statusFilter,
        kindFilter,
        facilityFilter,
        ownerFilter,
        serverSearch,
        sortBy,
        sortDirection: sortBy ? sortDirection : "",
        page,
      },
    ],
    queryFn: async () =>
      (await ledgerEndpoints.getOperations({
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(kindFilter ? { kind: kindFilter } : {}),
        ...(facilityFilter ? { facilityId: facilityFilter } : {}),
        ...(ownerFilter ? { ownerId: ownerFilter } : {}),
        ...(serverSearch ? { search: serverSearch } : {}),
        ...(sortBy ? { sortBy, sortDirection } : {}),
        page,
        pageSize: 20,
      })) as ApiPage<CorrectionOperation>,
  });
  const detail = useQuery({
    queryKey: [...scope, "detail", id],
    queryFn: async () =>
      (await ledgerEndpoints.getOperation(id!)) as CorrectionOperation,
    enabled: Boolean(id),
  });
  const removal = useMutation({
    mutationFn: (row: CorrectionOperation) =>
      ledgerEndpoints.deleteOperation(row.id, { version: row.version }),
    onSuccess: () => {
      setId(null);
      setNotice(text("Đã bỏ bản nháp.", "Draft removed."));
      void client.invalidateQueries({ queryKey: scope });
      void client.invalidateQueries({ queryKey: ["operation-variance"] });
    },
  });

  const selected = detail.data;
  const canOpenEditor =
    id === "" ||
    Boolean(
      id &&
      selected?.canEdit &&
      selected.status === "DRAFT" &&
      !selected.boundCorrectionId,
    );
  const items = drafts.data?.items ?? [];

  const lookupFacility = (facilityId: string) =>
    setup.data?.facilities?.find((row) => row.id === facilityId)?.name ??
    facilityId;
  const lookupOwner = (ownerId: string) =>
    setup.data?.owners?.find((row) => row.id === ownerId)?.name ?? ownerId;
  const lookupLocation = (locationId: string) =>
    setup.data?.locations?.find((row) => row.id === locationId)?.name ??
    locationId;

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = query
    ? items.filter((row) => {
        const outputLabel = row.outputs
          .map((output) => `${output.code ?? ""} ${output.stage}`)
          .join(" ");
        const kindLabel = formatCodeLabel(OPERATION_LABELS, row.kind, text);
        return `${outputLabel} ${row.kind} ${kindLabel} ${lookupFacility(row.facilityId)} ${row.varianceKg ?? ""}`
          .toLowerCase()
          .includes(query);
      })
    : items;

  const nonzeroCount = items.filter((row) =>
    hasNonZeroVariance(row.varianceKg),
  ).length;
  const balancedOrConfirmedCount = items.filter(
    (row) =>
      row.confirmedVersion === row.version ||
      (row.varianceKg != null && !hasNonZeroVariance(row.varianceKg)),
  ).length;

  function focusWorkspace() {
    workspaceRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function startNewDraft() {
    setId("");
    setNotice("");
    focusWorkspace();
  }

  function handleReload() {
    void client.invalidateQueries({ queryKey: scope });
    void setup.refetch();
  }

  const pageError = drafts.error ?? removal.error ?? setup.error;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text(
              "CHẾ BIẾN ĐA LÔ & BẢN NHÁP SỔ CÁI",
              "MULTI-LOT PROCESSING & LEDGER DRAFTS",
            )}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text(
              "Công đoạn nhiều lô và bản nháp",
              "Multi-lot operations and drafts",
            )}
          </h1>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 text-xs text-ink-secondary"
          >
            {text(
              "Tạo, chỉnh sửa bản nháp chế biến nhiều lô đầu vào/ra và kiểm tra chênh lệch trước khi gửi hàng đợi duyệt & chốt sổ cái.",
              "Create and edit multi-lot processing drafts and inspect mass variance before sending to the review & commit queue.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.operation}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Factory size={15} aria-hidden="true" />
            <span>{text("Ghi công đoạn đơn", "Single-lot entry")}</span>
          </Link>
          <Link
            to={millPaths.varianceReview}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Scales size={15} aria-hidden="true" />
            <span>
              {text("Hàng đợi duyệt và chốt", "Review and commit queue")}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleReload}
            disabled={drafts.isFetching || setup.isFetching}
            aria-label={text("Tải lại dữ liệu", "Reload records")}
            title={text("Tải lại dữ liệu", "Reload records")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={
                drafts.isFetching || setup.isFetching
                  ? "motion-safe:animate-spin text-accent-primary"
                  : undefined
              }
            />
          </button>
          <button
            type="button"
            onClick={startNewDraft}
            className="record-button record-primary rounded-full px-4"
          >
            <Plus size={15} weight="bold" aria-hidden="true" />
            <span>{text("Tạo bản nháp", "New draft")}</span>
          </button>
        </div>
      </header>

      {notice && (
        <div role="status" className="record-success justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle
              size={18}
              weight="fill"
              className="shrink-0"
              aria-hidden="true"
            />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label={text("Đóng thông báo", "Dismiss notice")}
            className="rounded-full p-1 text-accent-primary/80 transition-colors hover:bg-accent-primary/10 hover:text-accent-primary"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={pageError} />
          </div>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Bản nháp trong trang", "Drafts on this page")}
            </span>
            <Stack
              size={16}
              className="text-accent-primary"
              aria-hidden="true"
            />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">
            {items.length}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {text(
              "Công đoạn chế biến đang ở trạng thái nháp",
              "Processing operations currently in draft status",
            )}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Có chênh lệch khối lượng", "With mass variance")}
            </span>
            <WarningCircle
              size={16}
              className="text-accent-warning"
              aria-hidden="true"
            />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">
            {nonzeroCount}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {text(
              "Cần Quản lý xác minh & đính kèm chứng cứ trước khi chốt",
              "Requires manager confirmation & evidence before commit",
            )}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Cân bằng / Đã xác nhận", "Balanced / Confirmed")}
            </span>
            <CheckCircle
              size={16}
              className="text-accent-primary"
              aria-hidden="true"
            />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">
            {balancedOrConfirmedCount}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {text(
              "Sẵn sàng chuyển sang hàng đợi chốt sổ cái",
              "Ready for the ledger commit queue",
            )}
          </p>
        </div>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left column: Draft queue */}
        <section className="record-card lg:col-span-5">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <Stack size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {statusFilter === "DRAFT"
                      ? text("Bản nháp chế biến", "Processing drafts")
                      : text("Danh sách công đoạn", "Ledger operations")}
                  </h2>
                  <StatusBadge
                    status="ACTIVE"
                    size="sm"
                    label={`${filteredItems.length}`}
                  />
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text(
                    "Chọn bản ghi để xem chi tiết, hoặc lọc công đoạn đã chốt / hiệu chỉnh.",
                    "Select an operation to inspect details, or filter committed/corrected records.",
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                aria-label={text("Trạng thái công đoạn", "Operation status")}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setPage(1);
                }}
                className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay font-semibold"
              >
                <option value="DRAFT">
                  {text("Bản nháp (DRAFT)", "Drafts (DRAFT)")}
                </option>
                <option value="COMMITTED">
                  {text("Đã chốt (COMMITTED)", "Committed (COMMITTED)")}
                </option>
                <option value="CORRECTED">
                  {text("Đã hiệu chỉnh (CORRECTED)", "Corrected (CORRECTED)")}
                </option>
                <option value="ALL">
                  {text("Tất cả trạng thái", "All statuses")}
                </option>
              </select>

              <select
                aria-label={text("Loại công đoạn", "Operation kind")}
                value={kindFilter}
                onChange={(e) => {
                  setKindFilter(e.target.value);
                  setPage(1);
                }}
                className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
              >
                <option value="">{text("Tất cả loại", "All kinds")}</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {formatCodeLabel(OPERATION_LABELS, k, text)}
                  </option>
                ))}
              </select>

              {!!setup.data?.facilities?.length && (
                <select
                  aria-label={text("Cơ sở nhà máy", "Facility")}
                  value={facilityFilter}
                  onChange={(e) => {
                    setFacilityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="">
                    {text("Tất cả cơ sở", "All facilities")}
                  </option>
                  {setup.data.facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              )}

              {!!setup.data?.owners?.length && (
                <select
                  aria-label={text("Chủ sở hữu", "Owner")}
                  value={ownerFilter}
                  onChange={(e) => {
                    setOwnerFilter(e.target.value);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="">
                    {text("Tất cả chủ sở hữu", "All owners")}
                  </option>
                  {setup.data.owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                aria-label={text("Sắp xếp công đoạn", "Sort operations")}
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setPage(1);
                }}
                className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
              >
                <option value="">
                  {text("Sắp xếp: Mặc định", "Sort: Default")}
                </option>
                <option value="occurredAt">
                  {text("Thời gian thực hiện", "Occurred at")}
                </option>
                <option value="kind">{text("Loại công đoạn", "Kind")}</option>
                <option value="owner">{text("Chủ sở hữu", "Owner")}</option>
                <option value="status">{text("Trạng thái", "Status")}</option>
              </select>

              {sortBy && (
                <select
                  aria-label={text("Chiều sắp xếp", "Direction")}
                  value={sortDirection}
                  onChange={(e) => {
                    setSortDirection(e.target.value as typeof sortDirection);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="desc">{text("Giảm dần", "Descending")}</option>
                  <option value="asc">{text("Tăng dần", "Ascending")}</option>
                </select>
              )}
            </div>

            <div className="relative">
              <MagnifyingGlass
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setServerSearch("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setServerSearch(searchQuery.trim());
                    setPage(1);
                  }
                }}
                aria-label={text(
                  "Tìm công đoạn chế biến",
                  "Search processing operations",
                )}
                placeholder={text(
                  "Tìm mã lô đầu ra, công đoạn, cơ sở...",
                  "Search output lot, kind, facility...",
                )}
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

            {drafts.isPending ? (
              <div className="flex justify-center py-10">
                <GrainLoader
                  label={text(
                    "Đang tải danh sách bản nháp...",
                    "Loading processing drafts...",
                  )}
                />
              </div>
            ) : filteredItems.length > 0 ? (
              <ul className="space-y-2.5">
                {filteredItems.map((row) => {
                  const isSelected = id === row.id;
                  const nonzero = hasNonZeroVariance(row.varianceKg);
                  const outputLabel = row.outputs
                    .map((output) => output.code ?? output.stage)
                    .join(", ");
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={removal.isPending}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setId(row.id);
                          setNotice("");
                          focusWorkspace();
                        }}
                        className={`w-full space-y-2 rounded-xl border p-3.5 text-start transition-all disabled:opacity-60 ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                            : "border-ink-tertiary/20 bg-surface-raised/40 hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay/25 dark:hover:bg-surface-overlay"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block font-mono text-xs font-bold text-ink-primary [overflow-wrap:anywhere]">
                              {row.kind} · {outputLabel || "—"}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-medium text-ink-secondary">
                              {formatCodeLabel(
                                OPERATION_LABELS,
                                row.kind,
                                text,
                              )}
                            </span>
                          </div>
                          <DraftStatusChip operation={row} text={text} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
                          <span className="truncate">
                            {lookupFacility(row.facilityId)} ·{" "}
                            {new Date(row.occurredAt).toLocaleString()}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                              nonzero
                                ? "border-functional-hold-border bg-functional-hold-bg text-ink-primary"
                                : "border-ink-tertiary/20 bg-surface-base text-ink-secondary dark:bg-surface-raised"
                            }`}
                          >
                            {row.varianceKg ?? "—"} kg
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="record-empty py-8">
                <span
                  aria-hidden="true"
                  className="text-ink-tertiary opacity-60"
                >
                  <Stack size={32} />
                </span>
                <p className="font-semibold text-ink-primary">
                  {items.length === 0
                    ? text(
                        "Chưa có bản nháp trong trang này.",
                        "No drafts on this page.",
                      )
                    : text(
                        "Không tìm thấy bản nháp phù hợp.",
                        "No matching drafts found.",
                      )}
                </p>
                {items.length === 0 ? (
                  <button
                    type="button"
                    onClick={startNewDraft}
                    className="record-button record-primary mt-2 rounded-full"
                  >
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    <span>{text("Tạo bản nháp", "New draft")}</span>
                  </button>
                ) : (
                  searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="record-button mt-2 rounded-full"
                    >
                      {text("Xóa bộ lọc tìm kiếm", "Clear search filter")}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 bg-surface-raised/60 px-4 py-3 dark:bg-surface-overlay/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || drafts.isFetching}
                onClick={() => setPage(page - 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <CaretLeft size={13} aria-hidden="true" />
                <span>{text("Trang trước", "Previous")}</span>
              </button>
              <button
                type="button"
                disabled={!drafts.data?.hasMore || drafts.isFetching}
                onClick={() => setPage(page + 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <span>{text("Trang sau", "Next")}</span>
                <CaretRight size={13} aria-hidden="true" />
              </button>
            </div>
            <span className="font-mono text-xs text-ink-secondary">
              {text(`Trang ${page}`, `Page ${page}`)}
            </span>
          </div>
        </section>

        {/* Right column: Detail & Editor */}
        <div ref={workspaceRef} className="space-y-6 lg:col-span-7">
          {id === null && (
            <section className="record-card">
              <div className="record-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="record-icon-tile" aria-hidden="true">
                    <Sliders size={20} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold text-ink-primary">
                      {text(
                        "Chi tiết & soạn công đoạn",
                        "Draft details & editor",
                      )}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {text(
                        "Chọn bản nháp có sẵn hoặc khởi tạo một công đoạn nhiều lô mới.",
                        "Pick an existing draft or create a new multi-lot processing operation.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="record-empty py-12">
                <span
                  aria-hidden="true"
                  className="text-ink-tertiary opacity-60"
                >
                  <Scales size={36} />
                </span>
                <p className="font-semibold text-ink-primary">
                  {text("Chưa chọn bản nháp", "No draft selected")}
                </p>
                <p className="max-w-md text-xs text-ink-secondary">
                  {text(
                    "Chọn một bản nháp ở danh sách bên cạnh để kiểm tra chênh lệch, chỉnh sửa phân bổ nhiều lô hoặc tạo bản nháp mới.",
                    "Select a draft from the list to inspect variance and edit multi-lot allocations, or start a new draft.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={startNewDraft}
                  className="record-button record-primary mt-2 rounded-full px-5"
                >
                  <Plus size={15} weight="bold" aria-hidden="true" />
                  <span>{text("Tạo bản nháp", "New draft")}</span>
                </button>
              </div>
            </section>
          )}

          {Boolean(id) && (
            <section className="record-card">
              <div className="record-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="record-icon-tile" aria-hidden="true">
                    <Sliders size={20} weight="bold" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-bold text-ink-primary">
                      {text("Chi tiết bản nháp", "Draft details")}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {selected
                        ? `${lookupFacility(selected.facilityId)} · ${lookupOwner(selected.ownerId)}`
                        : text(
                            "Đang đọc thông tin phiên bản bản nháp.",
                            "Loading draft metadata.",
                          )}
                    </p>
                  </div>
                </div>

                {selected && (
                  <div className="flex flex-wrap items-center gap-2">
                    <DraftStatusChip operation={selected} text={text} />
                    {selected.canDelete && (
                      <button
                        type="button"
                        disabled={removal.isPending}
                        onClick={() =>
                          void (async () => {
                            if (
                              await confirmAction({
                                title: text(
                                  "Bỏ bản nháp này?",
                                  "Remove this draft?",
                                ),
                                variant: "danger",
                              })
                            ) {
                              removal.mutate(selected);
                            }
                          })()
                        }
                        className="record-button min-h-9 rounded-full border-functional-rejected-border bg-functional-rejected-bg px-3 text-accent-danger hover:opacity-90"
                      >
                        <Trash size={14} aria-hidden="true" />
                        <span>{text("Bỏ bản nháp", "Remove draft")}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6">
                {detail.error && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                  >
                    <WarningCircle
                      size={18}
                      weight="fill"
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                      <Feedback error={detail.error} />
                    </div>
                  </div>
                )}

                {detail.isPending || (detail.isFetching && !selected) ? (
                  <div className="flex justify-center py-10">
                    <GrainLoader
                      label={text(
                        "Đang tải chi tiết bản nháp...",
                        "Loading draft details...",
                      )}
                    />
                  </div>
                ) : (
                  selected && (
                    <div className="space-y-4">
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                          <dt className="text-xs font-medium text-ink-secondary">
                            {text(
                              "Công đoạn & Phiên bản",
                              "Operation & Version",
                            )}
                          </dt>
                          <dd className="mt-1 font-display text-sm font-bold text-ink-primary">
                            {selected.kind} · {selected.version} ·{" "}
                            {selected.status}
                          </dd>
                          <p className="mt-0.5 text-[11px] text-ink-tertiary">
                            {formatCodeLabel(
                              OPERATION_LABELS,
                              selected.kind,
                              text,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                          <dt className="text-xs font-medium text-ink-secondary">
                            {text(
                              "Chênh lệch / dung sai",
                              "Variance / tolerance",
                            )}
                          </dt>
                          <dd className="mt-1 font-mono text-base font-bold text-ink-primary">
                            {selected.varianceKg ?? "—"} /{" "}
                            {selected.allowedVarianceKg ?? "—"} kg
                          </dd>
                          <p className="mt-0.5 text-[11px] text-ink-tertiary">
                            {hasNonZeroVariance(selected.varianceKg)
                              ? text(
                                  "Cần xác nhận chênh lệch trước khi chốt",
                                  "Requires variance confirmation",
                                )
                              : text(
                                  "Trong giới hạn cân bằng",
                                  "Balanced tolerance check",
                                )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3.5 dark:bg-surface-overlay/30">
                          <dt className="text-xs font-medium text-ink-secondary">
                            {text(
                              "Hao hụt & Thời điểm",
                              "Declared loss & Time",
                            )}
                          </dt>
                          <dd className="mt-1 font-mono text-sm font-bold text-ink-primary">
                            {selected.declaredLossKg} kg
                          </dd>
                          <p className="mt-0.5 text-[11px] text-ink-tertiary">
                            {new Date(selected.occurredAt).toLocaleString()}
                          </p>
                        </div>
                      </dl>

                      {!selected.canEdit && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-functional-stale-border bg-functional-stale-bg/60 p-3.5 text-xs text-ink-primary">
                          <LockSimple
                            size={16}
                            weight="bold"
                            className="mt-0.5 shrink-0 text-accent-warning"
                            aria-hidden="true"
                          />
                          <span>
                            {selected.status === "COMMITTED"
                              ? text(
                                  "Công đoạn đã chốt sổ cái (chế độ chỉ đọc).",
                                  "Committed ledger operation (read-only view).",
                                )
                              : selected.status === "CORRECTED"
                                ? text(
                                    "Công đoạn đã được hiệu chỉnh (chế độ chỉ đọc).",
                                    "Corrected ledger operation (read-only view).",
                                  )
                                : text(
                                    "Bản nháp thuộc một nhân viên khác.",
                                    "This draft belongs to another operator.",
                                  )}
                          </span>
                        </div>
                      )}

                      {selected.boundCorrectionId && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-info/40 bg-accent-info/10 p-3.5 text-xs text-ink-primary">
                          <span>
                            {text(
                              "Bản nháp này đã gắn với hồ sơ đối soát hiệu chỉnh và không thể sửa trực tiếp tại đây.",
                              "This draft is bound to a correction reconciliation record and cannot be edited here.",
                            )}
                          </span>
                          <Link
                            to={millPaths.reconciliation.replace(
                              ":id",
                              encodeURIComponent(selected.boundCorrectionId),
                            )}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-primary/30 bg-surface-base px-3.5 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised"
                          >
                            {text(
                              "Mở hồ sơ hiệu chỉnh",
                              "Open correction workbench",
                            )}
                          </Link>
                        </div>
                      )}

                      {!canOpenEditor && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-primary">
                                <ArrowDownLeft
                                  size={15}
                                  className="text-accent-primary"
                                  aria-hidden="true"
                                />
                                <span>
                                  {text(
                                    "Đầu vào đã phân bổ",
                                    "Allocated inputs",
                                  )}
                                </span>
                              </h3>
                              <span className="rounded-full bg-surface-base px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
                                {selected.inputs.length}
                              </span>
                            </div>
                            <ul className="space-y-1.5 text-xs">
                              {selected.inputs.map((row) => (
                                <li
                                  key={`${row.lotId}:${row.locationId}`}
                                  className="rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 break-all dark:bg-surface-raised"
                                >
                                  <span className="font-mono font-bold text-ink-primary">
                                    {row.quantityKg} kg
                                  </span>
                                  <span className="text-ink-secondary">
                                    {" "}
                                    · {lookupLocation(row.locationId)} ·{" "}
                                    <span className="font-mono">
                                      {row.lotId}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-4 dark:bg-surface-overlay/25">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-primary">
                                <ArrowUpRight
                                  size={15}
                                  className="text-accent-primary"
                                  aria-hidden="true"
                                />
                                <span>
                                  {text("Đầu ra dự kiến", "Planned outputs")}
                                </span>
                              </h3>
                              <span className="rounded-full bg-surface-base px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
                                {selected.outputs.length}
                              </span>
                            </div>
                            <ul className="space-y-1.5 text-xs">
                              {selected.outputs.map((row) => (
                                <li
                                  key={row.id}
                                  className="rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 break-all dark:bg-surface-raised"
                                >
                                  <span className="font-mono font-bold text-accent-primary">
                                    {row.code ?? row.stage}
                                  </span>
                                  <span className="text-ink-secondary">
                                    {" "}
                                    ·{" "}
                                    <span className="font-mono font-semibold text-ink-primary">
                                      {row.quantityKg} kg
                                    </span>{" "}
                                    · {lookupLocation(row.locationId)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {canOpenEditor && setup.isPending && !setup.data && (
            <section className="record-card p-6">
              <GrainLoader
                label={text(
                  "Đang tải danh mục cơ sở và thiết bị...",
                  "Loading facility and equipment catalogs...",
                )}
              />
            </section>
          )}

          {canOpenEditor && setup.data && (
            <DraftEditor
              key={selected ? `${selected.id}:${selected.version}` : "new"}
              setup={setup.data}
              draft={selected}
              saved={(record) => {
                client.setQueryData([...scope, "detail", record.id], record);
                setId(record.id);
                setNotice(
                  text(
                    "Đã lưu bản nháp. Mở hàng đợi để duyệt hoặc chốt.",
                    "Draft saved. Use the queue to review or commit.",
                  ),
                );
                void client.invalidateQueries({ queryKey: scope });
                void client.invalidateQueries({
                  queryKey: ["operation-variance"],
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DraftEditor({
  setup,
  draft,
  saved,
}: {
  setup: SetupApiResponse;
  draft?: CorrectionOperation;
  saved: (draft: CorrectionOperation) => void;
}) {
  const text = useWorkflowText();
  const [facilityId, setFacility] = useState(draft?.facilityId ?? "");
  const [ownerId, setOwner] = useState(draft?.ownerId ?? "");

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            {draft ? (
              <PencilSimple size={20} weight="bold" />
            ) : (
              <Plus size={20} weight="bold" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {draft
                ? text("Chỉnh sửa công đoạn", "Edit processing draft")
                : text("Công đoạn mới", "New processing draft")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Hỗ trợ gộp nhiều lô đầu vào, tách nhiều phân đoạn đầu ra và lưu nháp bảo toàn khối lượng.",
                "Supports multi-lot inputs, multiple output fractions, and mass-conservation draft persistence.",
              )}
            </p>
          </div>
        </div>
        <StatusBadge
          status="ACTIVE"
          size="sm"
          label={draft ? text("Chỉnh sửa", "Editing") : text("Tạo mới", "New")}
        />
      </div>

      <div className="record-form space-y-5 p-4 sm:p-6">
        <div className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
            <Buildings
              size={16}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <span>
              {text("Phạm vi cơ sở & chủ hàng", "Facility & stock owner scope")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span>{text("Cơ sở", "Facility")}</span>
              <select
                value={facilityId}
                disabled={Boolean(draft)}
                onChange={(e) => setFacility(e.target.value)}
              >
                <option value="">—</option>
                {setup.facilities?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text("Chủ hàng", "Stock owner")}</span>
              <select
                value={ownerId}
                disabled={Boolean(draft)}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">—</option>
                {ownerId &&
                  !setup.owners?.some((row) => row.id === ownerId) && (
                    <option value={ownerId}>{ownerId}</option>
                  )}
                {setup.owners?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {facilityId && ownerId ? (
          <OperationForm
            key={`${facilityId}:${ownerId}`}
            setup={setup}
            facilityId={facilityId}
            ownerId={ownerId}
            draft={draft}
            saved={saved}
          />
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/30 p-4 text-xs text-ink-secondary dark:bg-surface-overlay/20">
            <Buildings
              size={18}
              className="shrink-0 text-ink-tertiary"
              aria-hidden="true"
            />
            <span>
              {text(
                "Chọn cơ sở và chủ hàng ở trên để tải tồn kho khả dụng và nhập chi tiết công đoạn.",
                "Select a facility and stock owner above to load available stock and enter operation details.",
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function OperationForm({
  setup,
  facilityId,
  ownerId,
  draft,
  saved,
}: {
  setup: SetupApiResponse;
  facilityId: string;
  ownerId: string;
  draft?: CorrectionOperation;
  saved: (row: CorrectionOperation) => void;
}) {
  const text = useWorkflowText();
  const [kind, setKind] = useState(draft?.kind ?? "DRYING");
  const [inputs, setInputs] = useState(() =>
    (draft?.inputs ?? [{ lotId: "", locationId: "", quantityKg: "" }]).map(
      (row) => ({
        key: crypto.randomUUID(),
        position: positionKey(row.lotId, row.locationId),
        mass: row.quantityKg,
      }),
    ),
  );
  const [outputs, setOutputs] = useState(
    () =>
      draft?.outputs.map((row) => ({
        key: crypto.randomUUID(),
        row,
        mass: row.quantityKg,
      })) ?? [
        {
          key: crypto.randomUUID(),
          row: null as CorrectionOperation["outputs"][number] | null,
          mass: "",
        },
      ],
  );
  const [declaredLoss, setDeclaredLoss] = useState(
    draft?.declaredLossKg ?? "0",
  );
  const [occurredAtValue, setOccurredAtValue] = useState(() =>
    localTime(draft?.occurredAt ?? new Date().toISOString()),
  );
  const [message, setMessage] = useState("");
  const [renderedAt] = useState(() => Date.now());

  const lots = useQuery({
    queryKey: [...scope, "stock", facilityId, ownerId],
    queryFn: () =>
      collectPages<InputLot>(
        async (paging) =>
          (await ledgerEndpoints.getLots({
            ...paging,
            facilityId,
            ownerId,
            availableOnly: "true",
          })) as ApiPage<InputLot>,
      ),
  });

  const locations =
    setup.locations?.filter(
      (row) =>
        row.facilityId === facilityId &&
        row.kind !== "ISOLATION" &&
        (row.kind !== "COMPARTMENT" ||
          row.ownerId === ownerId ||
          (!row.ownerId && row.cleared)),
    ) ?? [];
  const positions = (lots.data ?? [])
    .filter((lot) =>
      kind === "DRYING"
        ? lot.stage === "RAW_PADDY"
        : kind === "MILLING"
          ? lot.stage === "DRIED_PADDY"
          : kind === "MERGE" || rice.includes(lot.stage),
    )
    .flatMap((lot) =>
      lot.positions
        .filter(
          (pos) =>
            pos.facilityId === facilityId && toDecimal(pos.availableKg).gt(0),
        )
        .map((pos) => ({
          ...pos,
          lot,
          key: positionKey(lot.id, pos.locationId),
        })),
    );

  const first = positions.find((row) => row.key === inputs[0]?.position);
  const stages =
    kind === "DRYING"
      ? ["DRIED_PADDY"]
      : kind === "MILLING"
        ? ["HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK"]
        : kind === "BLENDING"
          ? ["BLENDED_RICE"]
          : kind === "BAGGING"
            ? ["BAGGED_RICE"]
            : first
              ? [first.lot.stage]
              : [];

  const policyCutoffTime = useMemo(() => {
    const parsed = Date.parse(occurredAtValue);
    return Number.isFinite(parsed) ? parsed : renderedAt;
  }, [occurredAtValue, renderedAt]);

  const activePolicy = setup.policies
    ?.filter(
      (item) =>
        item.facilityId === facilityId &&
        item.kind === kind &&
        Date.parse(item.effectiveFrom) <= policyCutoffTime,
    )
    .sort(
      (a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom),
    )[0];
  const tolerancePercent = activePolicy
    ? Number(activePolicy.tolerancePercent)
    : undefined;

  const totalInputMass = inputs.reduce(
    (sum, item) => sum.plus(toDecimal(item.mass)),
    toDecimal(0),
  );
  const totalOutputMass = outputs.reduce(
    (sum, item) => sum.plus(toDecimal(item.mass)),
    toDecimal(0),
  );
  const balanceResult = checkMassBalance(
    totalInputMass,
    totalOutputMass,
    toDecimal(declaredLoss),
    tolerancePercent ?? 0,
  );
  const hasAnyMass =
    totalInputMass.gt(0) ||
    totalOutputMass.gt(0) ||
    toDecimal(declaredLoss).gt(0);
  const isZeroVariance = balanceResult.varianceKg.isZero();
  const exceedsPolicy = Boolean(activePolicy && !balanceResult.isBalanced);

  const command = useCommand(
    async (
      id,
      fields: Omit<CorrectionOperation, "id" | "version" | "status">,
    ) => {
      const result = draft
        ? await ledgerEndpoints.updateOperation(draft.id, {
            ...fields,
            version: draft.version,
          })
        : await ledgerEndpoints.recordOperation({ ...fields, id });
      saved(result as CorrectionOperation);
    },
    () => {},
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (command.isPending || !first || !lots.data) return;
    setMessage("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const allocations = [];
    for (const input of inputs) {
      const position = positions.find((pos) => pos.key === input.position);
      const mass = toDecimal(input.mass);
      if (
        !position ||
        mass.lte(0) ||
        mass.gt(position.availableKg) ||
        (kind !== "BLENDING" &&
          position.lot.commodityId !== first.lot.commodityId) ||
        ((kind === "MERGE" || kind === "BAGGING") &&
          position.lot.productIdentity !== first.lot.productIdentity) ||
        (kind === "MERGE" && position.lot.stage !== first.lot.stage)
      ) {
        setMessage(
          text(
            "Kiểm tra khối lượng khả dụng và sự tương thích của các lô đầu vào.",
            "Check available quantities and input lot compatibility.",
          ),
        );
        return;
      }
      allocations.push({
        lotId: position.lot.id,
        locationId: position.locationId,
        quantityKg: mass.toFixed(),
        ...(position.poolRevision != null
          ? { poolRevision: position.poolRevision }
          : {}),
      });
    }
    if (new Set(inputs.map((input) => input.position)).size !== inputs.length) {
      setMessage(
        text(
          "Mỗi vị trí của một lô chỉ được dùng một lần.",
          "Use each lot position once.",
        ),
      );
      return;
    }
    const commodityId =
      kind === "BLENDING" ? value("commodityId") : first.lot.commodityId;
    const products = outputs.map(({ key, row }) => {
      const stage = value(`stage-${key}`);
      const productIdentity =
        kind === "MERGE" || kind === "BAGGING"
          ? first.lot.productIdentity
          : stage;
      const sameIdentity =
        row &&
        row.stage === stage &&
        row.productIdentity === productIdentity &&
        row.commodityId === commodityId;
      return {
        id: sameIdentity ? row.id : key,
        commodityId,
        stage,
        productIdentity,
        originalLotId: sameIdentity ? row.originalLotId : undefined,
        locationId: value(`location-${key}`),
        quantityKg: value(`mass-${key}`),
      };
    });
    if (products.some((product) => toDecimal(product.quantityKg).lte(0))) {
      setMessage(
        text(
          "Nhập khối lượng dương cho mọi đầu ra.",
          "Enter a positive mass for every output.",
        ),
      );
      return;
    }
    command.submit({
      facilityId,
      ownerId,
      kind,
      equipmentId: value("equipmentId"),
      occurredAt: new Date(value("occurredAt")).toISOString(),
      inputs: allocations,
      outputs: products,
      declaredLossKg: value("loss"),
      declaredLossReason: value("reason"),
    });
  }

  return (
    <form method="post" className="space-y-5" onSubmit={submit}>
      <fieldset
        disabled={command.isPending || lots.isPending}
        className="space-y-5"
      >
        <legend className="sr-only">
          {text("Dữ liệu công đoạn", "Processing inputs")}
        </legend>

        <div className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
              <Sliders
                size={16}
                className="text-accent-primary"
                aria-hidden="true"
              />
              <span>
                {text(
                  "Thông số công đoạn & thiết bị",
                  "Operation parameters & equipment",
                )}
              </span>
            </span>
            <span className="rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent-primary">
              {text("Dung sai áp dụng:", "Applied tolerance:")}{" "}
              {activePolicy ? `${activePolicy.tolerancePercent}%` : "—"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span>{text("Công đoạn", "Operation")} *</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {kinds.map((value) => (
                  <option key={value} value={value}>
                    {formatCodeLabel(OPERATION_LABELS, value, text)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text("Thiết bị", "Equipment")} *</span>
              <select
                name="equipmentId"
                defaultValue={draft?.equipmentId ?? ""}
                required
              >
                <option value="" disabled>
                  —
                </option>
                {setup.equipment
                  ?.filter((row) => row.facilityId === facilityId)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>{text("Thực hiện lúc", "Occurred at")} *</span>
              <input
                type="datetime-local"
                name="occurredAt"
                required
                value={occurredAtValue}
                onChange={(e) => setOccurredAtValue(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Inputs Section */}
        <fieldset className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
              <ArrowDownLeft
                size={16}
                className="text-accent-primary"
                aria-hidden="true"
              />
              <span>{text("1. Phân bổ đầu vào", "1. Input allocations")}</span>
            </legend>
            {lots.isPending ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                <ArrowsClockwise
                  size={13}
                  className="animate-spin text-accent-primary"
                  aria-hidden="true"
                />
                <span>
                  {text("Đang tải lô khả dụng...", "Loading available lots...")}
                </span>
              </span>
            ) : (
              <span className="rounded-full bg-surface-base px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-raised">
                {text(
                  `${positions.length} vị trí khả dụng`,
                  `${positions.length} available positions`,
                )}
              </span>
            )}
          </div>

          {!lots.isPending && positions.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-base/70 p-3 text-xs text-ink-secondary dark:bg-surface-raised/60">
              {text(
                "Không có vị trí lô khả dụng phù hợp với công đoạn này tại cơ sở và chủ hàng đã chọn.",
                "No eligible stock positions for this operation kind under the selected facility and stock owner.",
              )}
            </div>
          )}

          {inputs.map((input, index) => {
            const selectedPos = positions.find(
              (row) => row.key === input.position,
            );
            return (
              <fieldset
                key={input.key}
                className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-3.5 dark:bg-surface-raised"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                    {text("Đầu vào", "Input")} {index + 1}
                  </legend>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedPos && (
                      <span className="font-mono text-[11px] font-semibold text-accent-primary">
                        {text("Khả dụng:", "Available:")}{" "}
                        {selectedPos.availableKg} kg
                      </span>
                    )}
                    {selectedPos && input.mass !== selectedPos.availableKg && (
                      <button
                        type="button"
                        onClick={() =>
                          setInputs((rows) =>
                            rows.map((row) =>
                              row.key === input.key
                                ? { ...row, mass: selectedPos.availableKg }
                                : row,
                            ),
                          )
                        }
                        className="rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20"
                      >
                        {text("Dùng hết", "Use all")}
                      </button>
                    )}
                    {inputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setInputs((rows) =>
                            rows.filter((row) => row.key !== input.key),
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-2.5 py-1 text-xs font-semibold text-accent-danger transition-colors hover:opacity-85"
                      >
                        <Trash size={13} aria-hidden="true" />
                        <span>{text("Bỏ", "Remove")}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <label>
                    <span>{text("Lô và vị trí", "Lot position")} *</span>
                    <select
                      required
                      value={
                        positions.some((row) => row.key === input.position)
                          ? input.position
                          : ""
                      }
                      onChange={(e) =>
                        setInputs((rows) =>
                          rows.map((row) =>
                            row.key === input.key
                              ? { ...row, position: e.target.value }
                              : row,
                          ),
                        )
                      }
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {positions.map((row) => (
                        <option
                          key={row.key}
                          value={row.key}
                          disabled={inputs.some(
                            (other) =>
                              other.key !== input.key &&
                              other.position === row.key,
                          )}
                        >
                          {row.lot.code} ·{" "}
                          {locations.find((l) => l.id === row.locationId)
                            ?.name ?? row.locationId}{" "}
                          · {row.availableKg} kg
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text("Khối lượng (kg)", "Mass (kg)")} *</span>
                    <input
                      required
                      pattern={massPattern}
                      inputMode="decimal"
                      value={input.mass}
                      onChange={(e) =>
                        setInputs((rows) =>
                          rows.map((row) =>
                            row.key === input.key
                              ? { ...row, mass: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className="font-mono font-semibold"
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setInputs((rows) => [
                  ...rows,
                  { key: crypto.randomUUID(), position: "", mass: "" },
                ])
              }
              className="record-button rounded-full"
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              <span>{text("Thêm đầu vào", "Add input")}</span>
            </button>
          </div>
        </fieldset>

        {/* Outputs Section */}
        <fieldset className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
            <ArrowUpRight
              size={16}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <span>
              {text(
                "2. Đầu ra theo sản phẩm và vị trí",
                "2. Outputs by product and position",
              )}
            </span>
          </legend>

          {kind === "BLENDING" && (
            <label>
              <span>{text("Mặt hàng đầu ra", "Output commodity")} *</span>
              <select
                name="commodityId"
                required
                defaultValue={draft?.outputs[0]?.commodityId ?? ""}
              >
                <option value="" disabled>
                  —
                </option>
                {setup.commodities?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {outputs.map(({ key, row, mass }, index) => (
            <fieldset
              key={key}
              className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-3.5 dark:bg-surface-raised"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  <span>
                    {text("Đầu ra", "Output")} {index + 1}
                  </span>
                  {row?.code && (
                    <span className="rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold normal-case text-accent-primary">
                      {row.code}
                    </span>
                  )}
                </legend>
                {outputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOutputs((rows) =>
                        rows.filter((item) => item.key !== key),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-2.5 py-1 text-xs font-semibold text-accent-danger transition-colors hover:opacity-85"
                  >
                    <Trash size={13} aria-hidden="true" />
                    <span>{text("Bỏ đầu ra", "Remove output")}</span>
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span>{text("Giai đoạn", "Stage")} *</span>
                  <select
                    key={stages.join(",")}
                    name={`stage-${key}`}
                    required
                    defaultValue={
                      row && stages.includes(row.stage)
                        ? row.stage
                        : (stages[0] ?? "")
                    }
                  >
                    {!stages.length && (
                      <option value="" disabled>
                        —
                      </option>
                    )}
                    {stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {formatCodeLabel(STAGE_LABELS, stage, text)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{text("Vị trí", "Location")} *</span>
                  <select
                    name={`location-${key}`}
                    required
                    defaultValue={row?.locationId ?? ""}
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{text("Khối lượng (kg)", "Mass (kg)")} *</span>
                  <input
                    name={`mass-${key}`}
                    required
                    pattern={massPattern}
                    inputMode="decimal"
                    value={mass}
                    onChange={(e) =>
                      setOutputs((rows) =>
                        rows.map((item) =>
                          item.key === key
                            ? { ...item, mass: e.target.value }
                            : item,
                        ),
                      )
                    }
                    className="font-mono font-semibold"
                  />
                </label>
              </div>
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setOutputs((rows) => [
                  ...rows,
                  { key: crypto.randomUUID(), row: null, mass: "" },
                ])
              }
              className="record-button rounded-full"
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              <span>{text("Thêm đầu ra", "Add output")}</span>
            </button>
          </div>
        </fieldset>

        {/* Loss & Live Conservation Section */}
        <div className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
            <Scales
              size={16}
              className="text-accent-primary"
              aria-hidden="true"
            />
            <span>
              {text(
                "3. Hao hụt & đối chiếu khối lượng",
                "3. Declared loss & mass balance",
              )}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span>
                {text("Hao hụt khai báo (kg)", "Declared loss (kg)")} *
              </span>
              <input
                name="loss"
                required
                pattern={massPattern}
                inputMode="decimal"
                value={declaredLoss}
                onChange={(e) => setDeclaredLoss(e.target.value)}
                className="font-mono font-semibold"
              />
            </label>
            <label className="sm:col-span-2">
              <span>{text("Lý do hao hụt", "Loss reason")}</span>
              <textarea
                name="reason"
                rows={2}
                defaultValue={draft?.declaredLossReason}
              />
            </label>
          </div>

          {/* Live Mass Conservation Widget */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
              !hasAnyMass
                ? "border-ink-tertiary/20 bg-surface-base text-ink-primary dark:bg-surface-raised"
                : isZeroVariance
                  ? "border-functional-balanced-border/40 bg-functional-balanced-bg text-accent-primary"
                  : exceedsPolicy
                    ? "border-functional-rejected-border bg-functional-rejected-bg text-accent-danger"
                    : "border-functional-stale-border bg-functional-stale-bg text-accent-warning"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-grid size-10 shrink-0 place-items-center rounded-xl ${
                  !hasAnyMass
                    ? "bg-accent-primary/10 text-accent-primary"
                    : isZeroVariance
                      ? "bg-accent-primary/10 text-accent-primary"
                      : exceedsPolicy
                        ? "bg-accent-danger/10 text-accent-danger"
                        : "bg-accent-warning/15 text-accent-warning"
                }`}
                aria-hidden="true"
              >
                <Scales size={20} weight="bold" />
              </span>
              <div>
                <p className="font-display text-sm font-bold">
                  {!hasAnyMass
                    ? text(
                        "Đối chiếu bảo toàn khối lượng",
                        "Live mass balance preview",
                      )
                    : isZeroVariance
                      ? text(
                          "Đạt điều kiện cân bằng khối lượng",
                          "Mass balance conserved (zero variance)",
                        )
                      : exceedsPolicy
                        ? text(
                            "Chênh lệch vượt dung sai chính sách",
                            "Variance exceeds facility policy tolerance",
                          )
                        : text(
                            "Có chênh lệch — Quản lý sẽ xác nhận trước khi chốt",
                            "Nonzero variance — manager review required before commit",
                          )}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs opacity-90">
                  <span>
                    {text("Vào:", "In:")}{" "}
                    <MassValue value={totalInputMass} decimals={3} />
                  </span>
                  <span>=</span>
                  <span>
                    {text("Ra + Hao:", "Out + Loss:")}{" "}
                    <MassValue
                      value={totalOutputMass.plus(toDecimal(declaredLoss))}
                      decimals={3}
                    />
                  </span>
                  <span>
                    ({text("Lệch:", "Variance:")}{" "}
                    <MassValue value={balanceResult.varianceKg} decimals={3} />)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="block text-ink-tertiary">
                {text("Dung sai cho phép:", "Allowed tolerance:")}
              </span>
              {activePolicy ? (
                <MassValue
                  value={balanceResult.allowedKg}
                  decimals={3}
                  className="font-mono text-sm font-bold text-ink-primary"
                />
              ) : (
                <span className="font-mono font-bold text-ink-primary">—</span>
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{message}</span>
        </div>
      )}

      {(lots.error ?? command.error) && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={lots.error ?? command.error} />
          </div>
        </div>
      )}

      {command.isPending && (
        <div className="flex justify-center py-2">
          <GrainLoader
            size="sm"
            label={text("Đang lưu bản nháp...", "Saving draft...")}
          />
        </div>
      )}

      <div className="record-form-footer items-center">
        <span className="mr-auto text-xs text-ink-secondary">
          {text(
            "Sau khi lưu nháp, mở Hàng đợi duyệt và chốt để xác nhận hoặc ghi sổ cái.",
            "After saving, open the Review & commit queue to confirm variance or post to the ledger.",
          )}
        </span>
        <button
          type="submit"
          disabled={command.isPending || lots.isPending}
          className="record-button record-primary rounded-full px-6"
        >
          <FloppyDisk size={16} weight="bold" aria-hidden="true" />
          <span>{text("Lưu bản nháp", "Save draft")}</span>
        </button>
      </div>
    </form>
  );
}
