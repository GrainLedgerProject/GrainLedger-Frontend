import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldWarning } from "@phosphor-icons/react";
import { ApiError } from "@/api/client";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { millPaths } from "../paths";

type TransferPosition = {
  locationId: string;
  facilityId?: string;
  quantityKg?: string;
  availableKg: string;
  poolRevision?: number;
};
type TransferLot = {
  id: string;
  code: string;
  ownerId: string;
  positions: TransferPosition[];
  isCurrentPool?: boolean;
  poolRevision?: number;
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
    const revision = position.poolRevision ?? lot.poolRevision;
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
      !holdIsolationMode &&
      source?.mixedBulk &&
      (!lot.isCurrentPool || !Number.isSafeInteger(revision))
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
        !holdIsolationMode && { poolRevision: revision }),
      ...(holdIsolationMode && selectedHoldId && { holdId: selectedHoldId }),
    });
  }

  return (
    <Workflow
      title={t("workflows.transfer.title")}
      description={t("workflows.transfer.description")}
      actions={<Link to={millPaths.stock}>{t("nav.stock.overview")}</Link>}
    >
      {canProcessHold && (
        <Panel
          title={text(
            "Chế độ chuyển kho cách ly theo lệnh HOLD (ISOLATION)",
            "HOLD physical isolation mode (ISOLATION)",
          )}
        >
          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={holdIsolationMode}
                onChange={(e) => {
                  setHoldIsolationMode(e.target.checked);
                  setFrom("");
                  setTo("");
                  setError(null);
                }}
              />
              <ShieldWarning size={16} className="text-accent-danger" />
              <span>
                {text(
                  "Chuyển tồn kho đang bị HOLD sang vị trí ISOLATION bằng mã HOLD gốc",
                  "Transfer HOLD stock to ISOLATION storage using the original HOLD order",
                )}
              </span>
            </label>

            {holdIsolationMode && (
              <div className="space-y-2 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
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
                <label className="block space-y-1">
                  <span className="font-semibold">
                    {text("Lệnh HOLD gốc", "Original HOLD order")} *
                  </span>
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
        </Panel>
      )}

      <Panel title={t("workflows.transfer.selectLot")}>
        <fieldset
          disabled={uncertain || command.isPending}
          className="space-y-3"
        >
          <legend className="sr-only">
            {t("workflows.transfer.selectLot")}
          </legend>
          <search>
            <label htmlFor="transfer-search">
              {t("workflows.transfer.search")}
              <input
                id="transfer-search"
                type="search"
                maxLength={100}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </search>
          <label htmlFor="transfer-lot">
            {t("workflows.transfer.lot")}
            <select
              id="transfer-lot"
              value={lotId}
              onChange={(event) => {
                setLot(event.target.value);
                setFrom("");
                setTo("");
                setError(null);
                command.reset();
              }}
            >
              <option value="">{t("workflows.choose")}</option>
              {lotId && !lots.data?.items.some((item) => item.id === lotId) && (
                <option value={lotId}>{lot?.code ?? lotId}</option>
              )}
              {lots.data?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={page === 1 || lots.isFetching}
              onClick={() => setPage(page - 1)}
            >
              {t("field.seasons.prev")}
            </button>
            <button
              type="button"
              disabled={!lots.data?.hasMore || lots.isFetching}
              onClick={() => setPage(page + 1)}
            >
              {t("field.seasons.next")}
            </button>
          </div>
        </fieldset>
        <Feedback
          error={lots.error ?? lookups.error ?? details.error}
          pending={lots.isFetching || (Boolean(lotId) && details.isFetching)}
        />
      </Panel>

      <Panel title={t("workflows.transfer.positions")}>
        {lot && !positions.length && <p>{t("workflows.transfer.noStock")}</p>}
        <form
          method="post"
          onSubmit={transfer}
          key={`${formVersion}:${holdIsolationMode}`}
          className="space-y-4"
        >
          <fieldset
            disabled={
              !positions.length ||
              command.isPending ||
              uncertain ||
              details.isFetching
            }
            className="grid gap-3 sm:grid-cols-2"
          >
            <legend className="sr-only">
              {t("workflows.transfer.positions")}
            </legend>
            <label htmlFor="transfer-from">
              {t("workflows.transfer.from")}
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
              {t("workflows.transfer.to")}
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
              {t("workflows.transfer.quantity")}
              <input
                id="transfer-quantity"
                name="quantityKg"
                inputMode="decimal"
                required
                maxLength={21}
              />
            </label>
            <label htmlFor="transfer-time">
              {t("workflows.time")}
              <input
                id="transfer-time"
                name="occurredAt"
                type="datetime-local"
                required
                defaultValue={localTime()}
              />
            </label>
            <button type="submit" disabled={!from || !to}>
              {t("workflows.transfer.commit")}
            </button>
          </fieldset>
        </form>
        <Feedback
          error={command.error ?? (error ? new Error(error) : null)}
          pending={command.isPending}
        />
        {uncertain && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-functional-stale-border bg-functional-stale-bg/40 p-3 text-xs">
            <span>
              {command.restoredPending
                ? `${text("Đã khôi phục yêu cầu đang chờ", "Recovered pending transfer")}: ${command.restoredPending.operationId}`
                : text(
                    "Kết quả chuyển kho chưa chắc chắn.",
                    "Transfer response lost.",
                  )}
            </span>
            <button type="button" onClick={command.retry}>
              {t("field.seasons.retry")}
            </button>
            {command.restoredPending && (
              <button
                type="button"
                onClick={() => void command.discardPending()}
              >
                {text("Bỏ yêu cầu chờ", "Discard pending")}
              </button>
            )}
          </div>
        )}
        {command.isError && !uncertain && (
          <button
            type="button"
            onClick={() => {
              command.reset();
              setError(null);
              void cache.invalidateQueries({ queryKey: scope });
            }}
          >
            {t("workflows.reload")}
          </button>
        )}
        {command.isSuccess && (
          <p role="status" className="text-accent-primary">
            {t("workflows.transfer.saved")}
          </p>
        )}
      </Panel>
    </Workflow>
  );
}

function localTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
