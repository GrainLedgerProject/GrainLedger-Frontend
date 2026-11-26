import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Factory,
  MagnifyingGlass,
  Package,
  ShieldWarning,
  WarningCircle,
} from "@phosphor-icons/react";
import { ApiError } from "@/api/client";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { millPaths } from "../paths";

type TransferPosition = {
  locationId: string;
  facilityId?: string;
  quantityKg?: string;
  availableKg: string;
  poolRevision?: number | string;
};
type TransferLot = {
  id: string;
  code: string;
  ownerId: string;
  positions: TransferPosition[];
  isCurrentPool?: boolean;
  poolRevision?: number | string;
};
type HoldItem = {
  id: string;
  lotId: string;
  lotCode: string;
  reason: string;
  status: string;
};
type TransferInput = {
  lotId: string;
  fromLocationId: string;
  toLocationId: string;
  quantityKg: string;
  occurredAt: string;
  poolRevision?: number;
  holdId?: string;
};

export function StockTransferPage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const cache = useQueryClient();
  const [params] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const initialHoldId = params.get("holdId") ?? "";
  const initialLotId = params.get("lotId") ?? "";
  const canProcessHold =
    user?.role === "MILL_MANAGER" && user.permissions.includes("holds.process");

  const [holdIsolationMode, setHoldIsolationMode] = useState(
    Boolean(initialHoldId),
  );
  const [selectedHoldId, setSelectedHoldId] = useState(initialHoldId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lotId, setLot] = useState(initialLotId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const term = useDeferredValue(search.trim());
  const scope = ["stock-transfer", user?.id];

  const lookups = useQuery({
    queryKey: [...scope, "lookups"],
    queryFn: async () =>
      (await ledgerEndpoints.getLookups()) as SetupApiResponse,
  });

  const activeHolds = useQuery({
    queryKey: [...scope, "holds"],
    queryFn: async () => {
      const res = (await ledgerEndpoints.getHolds({
        page: 1,
        pageSize: 50,
      })) as { items?: HoldItem[] } | HoldItem[];
      return Array.isArray(res) ? res : (res?.items ?? []);
    },
    enabled: Boolean(canProcessHold && (holdIsolationMode || initialHoldId)),
  });

  const lots = useQuery({
    queryKey: [...scope, "lots", page, term, holdIsolationMode],
    queryFn: async () => {
      const result = await ledgerEndpoints.getLots(
        holdIsolationMode
          ? { search: term, page, pageSize: 30 }
          : { search: term, page, pageSize: 30, availableOnly: "true" },
      );
      return {
        items: pageItems<TransferLot>(result),
        hasMore:
          !Array.isArray(result) &&
          Boolean((result as ApiPage<TransferLot>).hasMore),
      };
    },
  });

  const details = useQuery({
    queryKey: [...scope, "lot", lotId],
    queryFn: async () => (await ledgerEndpoints.getLot(lotId)) as TransferLot,
    enabled: Boolean(lotId),
  });

  const locations = useMemo(
    () => lookups.data?.locations ?? [],
    [lookups.data?.locations],
  );
  const assigned = user?.assignedFacilities;
  const lot = details.data;

  const positions = useMemo(() => {
    const hasFacilityAccess = (facilityId: string) =>
      !assigned || assigned.includes(facilityId);
    return (lot?.positions ?? []).filter((pos) => {
      const matchedLocation = locations.find(
        (location) =>
          location.id === pos.locationId &&
          hasFacilityAccess(location.facilityId),
      );
      if (!matchedLocation) return false;
      if (holdIsolationMode) {
        if (matchedLocation.kind === "ISOLATION") return false;
        const physical = pos.quantityKg ?? pos.availableKg;
        return new Decimal(physical).gt(0);
      }
      return new Decimal(pos.availableKg).gt(0);
    });
  }, [lot?.positions, locations, assigned, holdIsolationMode]);

  const position = positions.find((current) => current.locationId === from);
  const source = locations.find((location) => location.id === from);

  const destinations = useMemo(() => {
    const hasFacilityAccess = (facilityId: string) =>
      !assigned || assigned.includes(facilityId);
    return locations.filter((location) => {
      if (location.id === from || !hasFacilityAccess(location.facilityId))
        return false;
      if (holdIsolationMode) {
        return location.kind === "ISOLATION";
      }
      return (
        location.kind !== "COMPARTMENT" ||
        location.ownerId === lot?.ownerId ||
        (!location.ownerId && location.cleared)
      );
    });
  }, [locations, from, assigned, holdIsolationMode, lot?.ownerId]);

  const command = useCommand<TransferInput>(
    (id, input) => ledgerEndpoints.postTransfer({ id, ...input }),
    async () => {
      setLot("");
      setFrom("");
      setTo("");
      setFormVersion((version) => version + 1);
      await cache.invalidateQueries({ queryKey: scope });
    },
    {
      persistKey: `stock-transfer:${holdIsolationMode ? "isolation" : "standard"}:${lotId || "pick"}:${selectedHoldId || "none"}`,
    },
  );

  const uncertain =
    command.uncertain ||
    (command.error instanceof ApiError &&
      (command.error.status === 0 ||
        command.error.status === 408 ||
        command.error.status >= 500));

  function selectLot(nextLotId: string) {
    setLot(nextLotId);
    setFrom("");
    setTo("");
    setError(null);
    command.reset();
  }

  function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !lot ||
      !position ||
      !destinations.some((location) => location.id === to) ||
      command.isPending ||
      uncertain
    )
      return;
    const fields = new FormData(event.currentTarget);
    const quantityKg = String(fields.get("quantityKg") ?? "");
    const date = new Date(String(fields.get("occurredAt") ?? ""));
    const rawRevision = position.poolRevision ?? lot.poolRevision;
    const revision =
      rawRevision === undefined ||
      rawRevision === null ||
      String(rawRevision).trim() === ""
        ? undefined
        : Number(rawRevision);
    const maxMass = holdIsolationMode
      ? (position.quantityKg ?? position.availableKg)
      : position.availableKg;

    if (
      !/^[0-9]{1,14}(\.[0-9]{1,6})?$/.test(quantityKg) ||
      new Decimal(quantityKg).lte(0) ||
      new Decimal(quantityKg).gt(maxMass)
    ) {
      setError(t("workflows.transfer.quantityInvalid"));
      return;
    }
    if (!Number.isFinite(date.getTime())) return;
    if (
      source?.mixedBulk &&
      (!lot.isCurrentPool ||
        revision === undefined ||
        !Number.isSafeInteger(revision))
    ) {
      setError(t("workflows.transfer.poolChanged"));
      return;
    }
    if (holdIsolationMode && !selectedHoldId) {
      setError(
        text(
          "Chọn lệnh HOLD gốc trước khi chuyển kho cách ly ISOLATION.",
          "Select the original HOLD order before transferring to ISOLATION.",
        ),
      );
      return;
    }
    setError(null);
    command.submit({
      lotId,
      fromLocationId: from,
      toLocationId: to,
      quantityKg,
      occurredAt: date.toISOString(),
      ...(source?.mixedBulk &&
        revision !== undefined &&
        Number.isSafeInteger(revision) && { poolRevision: revision }),
      ...(holdIsolationMode && selectedHoldId && { holdId: selectedHoldId }),
    });
  }

  const lotItems = lots.data?.items ?? [];
  const loadError = lots.error ?? lookups.error ?? details.error;
  const transferError = command.error ?? (error ? new Error(error) : null);

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("ĐIỀU CHUYỂN KHO ĐỊNH DANH & CÁCH LY", "NAMED LOT STOCK TRANSFER & ISOLATION")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("workflows.transfer.title")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {t("workflows.transfer.description")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.stock}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Package size={15} aria-hidden="true" />
            <span>{t("nav.stock.overview")}</span>
          </Link>
          <Link
            to={millPaths.operation}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Factory size={15} aria-hidden="true" />
            <span>{t("nav.mill.operations")}</span>
          </Link>
          <button
            type="button"
            onClick={() => void cache.invalidateQueries({ queryKey: scope })}
            disabled={lots.isFetching || lookups.isFetching}
            aria-label={t("workflows.reload")}
            title={t("workflows.reload")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={
                lots.isFetching || lookups.isFetching
                  ? "motion-safe:animate-spin text-accent-primary"
                  : undefined
              }
            />
          </button>
        </div>
      </header>

      {command.isSuccess && (
        <div role="status" className="record-success">
          <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
          <span>{t("workflows.transfer.saved")}</span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Lô khả dụng trong trang", "Lots on this page")}
            </span>
            <Package size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">{lotItems.length}</div>
          <p className="text-[11px] text-ink-tertiary">
            {holdIsolationMode
              ? text("Lô thuộc phạm vi kiểm tra cách ly", "Lots available for isolation transfer")
              : text("Lô có tồn khả dụng tại cơ sở phân công", "Lots with available stock at assigned facilities")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Vị trí xuất hợp lệ", "Eligible source positions")}
            </span>
            <ArrowsLeftRight size={16} className="text-accent-primary" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink-primary">
            {lot ? positions.length : "—"}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {lot
              ? `${lot.code} · ${text("Số vị trí có thể xuất", "Positions ready for transfer")}`
              : text("Chọn một lô để xem vị trí tồn kho", "Select a lot to inspect stock positions")}
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">
              {text("Chế độ điều chuyển", "Transfer mode")}
            </span>
            {holdIsolationMode ? (
              <ShieldWarning size={16} className="text-accent-danger" aria-hidden="true" />
            ) : (
              <CheckCircle size={16} className="text-accent-primary" aria-hidden="true" />
            )}
          </div>
          <div className="font-display text-lg font-bold text-ink-primary">
            {holdIsolationMode
              ? text("Cách ly HOLD (ISOLATION)", "HOLD isolation")
              : text("Điều chuyển kho chuẩn", "Standard transfer")}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {holdIsolationMode
              ? text("Chỉ đích đến ISOLATION với mã HOLD gốc", "ISOLATION destinations with original HOLD order")
              : text("Bảo toàn định danh lô và kiểm tra làm sạch", "Preserves lot identity & compartment clearance")}
          </p>
        </div>
      </div>

      {canProcessHold && (
        <section className="record-card">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <ShieldWarning size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ink-primary">
                  {text(
                    "Chế độ chuyển kho cách ly theo lệnh HOLD (ISOLATION)",
                    "HOLD physical isolation mode (ISOLATION)",
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text(
                    "Dùng cho Quản lý nhà máy chuyển tồn kho đang bị phong tỏa sang khu vực cách ly.",
                    "Allows Mill Managers to move quarantined HOLD inventory into ISOLATION locations.",
                  )}
                </p>
              </div>
            </div>
            <StatusBadge
              status={holdIsolationMode ? "HOLD" : "ACTIVE"}
              size="sm"
              label={holdIsolationMode ? text("Đang bật ISOLATION", "ISOLATION active") : text("Chuẩn", "Standard")}
            />
          </div>

          <div className="record-form space-y-3 p-4 sm:p-6">
            <label className="!flex-row cursor-pointer items-center gap-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 text-xs font-semibold text-ink-primary dark:bg-surface-overlay/25">
              <input
                type="checkbox"
                checked={holdIsolationMode}
                onChange={(e) => {
                  setHoldIsolationMode(e.target.checked);
                  setFrom("");
                  setTo("");
                  setError(null);
                }}
                className="size-4 shrink-0 accent-accent-danger"
              />
              <ShieldWarning size={16} className="shrink-0 text-accent-danger" aria-hidden="true" />
              <span>
                {text(
                  "Chuyển tồn kho đang bị HOLD sang vị trí ISOLATION bằng mã HOLD gốc",
                  "Transfer HOLD stock to ISOLATION storage using the original HOLD order",
                )}
              </span>
            </label>

            {holdIsolationMode && (
              <div className="space-y-3 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge
                    status="HOLD"
                    label={text("CÁCH LY VẬT LÝ", "ISOLATION MODE")}
                    size="sm"
                  />
                  <span className="text-ink-secondary">
                    {text(
                      "Hiển thị khối lượng vật lý của các lô đang bị HOLD và chỉ cho phép đích đến loại ISOLATION.",
                      "Uses physical lot quantities for HOLD stock and restricts destinations to ISOLATION locations.",
                    )}
                  </span>
                </div>
                <label className="block">
                  <span>{text("Lệnh HOLD gốc", "Original HOLD order")} *</span>
                  <select
                    value={selectedHoldId}
                    onChange={(e) => {
                      const nextHoldId = e.target.value;
                      setSelectedHoldId(nextHoldId);
                      const matched = activeHolds.data?.find(
                        (h) => h.id === nextHoldId,
                      );
                      if (matched) {
                        setLot(matched.lotId);
                        setFrom("");
                        setTo("");
                      }
                    }}
                  >
                    <option value="">
                      {text("Chọn lệnh HOLD...", "Select HOLD order...")}
                    </option>
                    {selectedHoldId &&
                      !activeHolds.data?.some(
                        (h) => h.id === selectedHoldId,
                      ) && (
                        <option value={selectedHoldId}>
                          HOLD {selectedHoldId}
                        </option>
                      )}
                    {(activeHolds.data ?? []).map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.lotCode} · {h.status} · {h.reason.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main 2-column grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left: Lot selection */}
        <section className="record-card lg:col-span-5">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <Package size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {t("workflows.transfer.selectLot")}
                  </h2>
                  <StatusBadge status="ACTIVE" size="sm" label={`${lotItems.length}`} />
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text("Tìm kiếm theo mã lô và chọn lô hàng cần điều chuyển.", "Search by lot code and select the lot to transfer.")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <fieldset
              disabled={uncertain || command.isPending}
              className="record-form space-y-4"
            >
              <legend className="sr-only">
                {t("workflows.transfer.selectLot")}
              </legend>

              <search>
                <label htmlFor="transfer-search">
                  <span>{t("workflows.transfer.search")}</span>
                  <div className="relative">
                    <MagnifyingGlass
                      size={15}
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-tertiary"
                    />
                    <input
                      id="transfer-search"
                      type="search"
                      maxLength={100}
                      value={search}
                      placeholder={text("Nhập mã lô...", "Enter lot code...")}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      className="!rounded-full !pl-9"
                    />
                  </div>
                </label>
              </search>

              <label htmlFor="transfer-lot">
                <span>{t("workflows.transfer.lot")}</span>
                <select
                  id="transfer-lot"
                  value={lotId}
                  onChange={(event) => selectLot(event.target.value)}
                >
                  <option value="">{t("workflows.choose")}</option>
                  {lotId && !lotItems.some((item) => item.id === lotId) && (
                    <option value={lotId}>{lot?.code ?? lotId}</option>
                  )}
                  {lotItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            {loadError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3 text-xs text-accent-danger"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                  <Feedback error={loadError} />
                </div>
              </div>
            )}

            {(lots.isFetching || (Boolean(lotId) && details.isFetching)) && (
              <div className="flex justify-center py-4">
                <GrainLoader
                  size="sm"
                  label={text("Đang tải dữ liệu lô hàng...", "Loading lot inventory...")}
                />
              </div>
            )}

            {!lots.isPending && lotItems.length > 0 && (
              <div className="space-y-2">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
                  {text("Chọn nhanh lô trong trang", "Quick lot selector")}
                </span>
                <ul className="space-y-1.5">
                  {lotItems.slice(0, 8).map((item) => {
                    const active = lotId === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={uncertain || command.isPending}
                          aria-pressed={active}
                          onClick={() => selectLot(item.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs transition-all ${
                            active
                              ? "border-accent-primary bg-accent-primary/5 font-bold text-accent-primary ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                              : "border-ink-tertiary/20 bg-surface-raised/40 text-ink-primary hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay/25"
                          }`}
                        >
                          <span className="font-mono">{item.code}</span>
                          <span className="font-mono text-[11px] text-ink-secondary">
                            {item.positions?.length ?? 0} {text("vị trí", "pos")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 bg-surface-raised/60 px-4 py-3 dark:bg-surface-overlay/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || lots.isFetching}
                onClick={() => setPage(page - 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <CaretLeft size={13} aria-hidden="true" />
                <span>{t("field.seasons.prev")}</span>
              </button>
              <button
                type="button"
                disabled={!lots.data?.hasMore || lots.isFetching}
                onClick={() => setPage(page + 1)}
                className="record-button min-h-9 rounded-full px-3"
              >
                <span>{t("field.seasons.next")}</span>
                <CaretRight size={13} aria-hidden="true" />
              </button>
            </div>
            <span className="font-mono text-xs text-ink-secondary">
              {text(`Trang ${page}`, `Page ${page}`)}
            </span>
          </div>
        </section>

        {/* Right: Positions & Transfer form */}
        <section className="record-card lg:col-span-7">
          <div className="record-card-header">
            <div className="flex min-w-0 items-center gap-3">
              <span className="record-icon-tile" aria-hidden="true">
                <ArrowsLeftRight size={20} weight="bold" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ink-primary">
                  {t("workflows.transfer.positions")}
                </h2>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {text(
                    "Chọn vị trí xuất, vị trí nhập hợp lệ và khối lượng điều chuyển chính xác.",
                    "Choose source location, eligible destination, and exact transfer mass.",
                  )}
                </p>
              </div>
            </div>
            {lot && <StatusBadge status="ACTIVE" size="sm" label={lot.code} />}
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            {lot && !positions.length && (
              <div className="rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/30 p-4 text-xs text-ink-secondary dark:bg-surface-overlay/20">
                {t("workflows.transfer.noStock")}
              </div>
            )}

            {lot && positions.length > 0 && (
              <div className="space-y-2 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-3.5 dark:bg-surface-overlay/25">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
                  {text("Số dư khả dụng theo vị trí", "Available balance by position")}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {positions.map((item) => {
                    const locName =
                      locations.find((location) => location.id === item.locationId)?.name ??
                      item.locationId;
                    const displayKg = holdIsolationMode
                      ? (item.quantityKg ?? item.availableKg)
                      : item.availableKg;
                    return (
                      <div
                        key={item.locationId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 text-xs dark:bg-surface-raised"
                      >
                        <span className="font-semibold text-ink-primary">{locName}</span>
                        <span className="font-mono font-bold text-accent-primary">
                          {displayKg} kg
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form
              method="post"
              onSubmit={transfer}
              key={`${formVersion}:${holdIsolationMode}`}
              className="record-form space-y-4"
            >
              <fieldset
                disabled={
                  !positions.length ||
                  command.isPending ||
                  uncertain ||
                  details.isFetching
                }
                className="grid gap-4 sm:grid-cols-2"
              >
                <legend className="sr-only">
                  {t("workflows.transfer.positions")}
                </legend>
                <label htmlFor="transfer-from">
                  <span>{t("workflows.transfer.from")}</span>
                  <select
                    id="transfer-from"
                    name="from"
                    value={from}
                    required
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setTo("");
                    }}
                  >
                    <option value="">{t("workflows.choose")}</option>
                    {positions.map((item) => {
                      const displayKg = holdIsolationMode
                        ? (item.quantityKg ?? item.availableKg)
                        : item.availableKg;
                      return (
                        <option key={item.locationId} value={item.locationId}>
                          {
                            locations.find(
                              (location) => location.id === item.locationId,
                            )?.name
                          }{" "}
                          · {displayKg} kg
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label htmlFor="transfer-to">
                  <span>{t("workflows.transfer.to")}</span>
                  <select
                    id="transfer-to"
                    name="to"
                    value={to}
                    required
                    onChange={(event) => setTo(event.target.value)}
                  >
                    <option value="">{t("workflows.choose")}</option>
                    {destinations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} ·{" "}
                        {
                          lookups.data?.facilities?.find(
                            (facility) => facility.id === location.facilityId,
                          )?.name
                        }
                        {location.kind === "ISOLATION" ? " (ISOLATION)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="transfer-quantity">
                  <span>{t("workflows.transfer.quantity")}</span>
                  <input
                    id="transfer-quantity"
                    name="quantityKg"
                    inputMode="decimal"
                    required
                    maxLength={21}
                    className="font-mono font-semibold"
                  />
                </label>

                <label htmlFor="transfer-time">
                  <span>{t("workflows.time")}</span>
                  <input
                    id="transfer-time"
                    name="occurredAt"
                    type="datetime-local"
                    required
                    defaultValue={localTime()}
                  />
                </label>
              </fieldset>

              <div className="record-form-footer items-center">
                {position && (
                  <span className="mr-auto font-mono text-xs text-ink-secondary">
                    {text("Tối đa:", "Max:")}{" "}
                    <strong className="text-ink-primary">
                      {holdIsolationMode
                        ? (position.quantityKg ?? position.availableKg)
                        : position.availableKg}{" "}
                      kg
                    </strong>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={
                    !from ||
                    !to ||
                    !positions.length ||
                    command.isPending ||
                    uncertain ||
                    details.isFetching
                  }
                  className="record-button record-primary rounded-full px-6"
                >
                  <ArrowsLeftRight size={15} weight="bold" aria-hidden="true" />
                  <span>{t("workflows.transfer.commit")}</span>
                </button>
              </div>
            </form>

            {command.isPending && (
              <div className="flex justify-center py-2">
                <GrainLoader
                  size="sm"
                  label={text("Đang ghi bút toán điều chuyển...", "Posting stock transfer...")}
                />
              </div>
            )}

            {transferError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
              >
                <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                  <Feedback error={transferError} />
                </div>
              </div>
            )}

            {uncertain && (
              <div className="space-y-3 rounded-xl border border-functional-stale-border bg-functional-stale-bg/40 p-4 text-xs">
                <div className="flex items-start gap-2 text-ink-primary">
                  <WarningCircle size={16} className="mt-0.5 shrink-0 text-accent-warning" aria-hidden="true" />
                  <span>
                    {command.restoredPending
                      ? `${text("Đã khôi phục yêu cầu đang chờ", "Recovered pending transfer")}: ${command.restoredPending.operationId}`
                      : text(
                          "Kết quả chuyển kho chưa chắc chắn.",
                          "Transfer response lost.",
                        )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {command.restoredPending && (
                    <button
                      type="button"
                      onClick={() => void command.discardPending()}
                      className="record-button min-h-9 rounded-full px-3.5"
                    >
                      {text("Bỏ yêu cầu chờ", "Discard pending")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={command.retry}
                    className="record-button min-h-9 rounded-full border-functional-stale-border bg-accent-warning text-ink-primary hover:opacity-90"
                  >
                    <ArrowsClockwise size={14} aria-hidden="true" />
                    <span>{t("field.seasons.retry")}</span>
                  </button>
                </div>
              </div>
            )}

            {command.isError && !uncertain && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    command.reset();
                    setError(null);
                    void cache.invalidateQueries({ queryKey: scope });
                  }}
                  className="record-button rounded-full"
                >
                  <ArrowsClockwise size={14} aria-hidden="true" />
                  <span>{t("workflows.reload")}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function localTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
