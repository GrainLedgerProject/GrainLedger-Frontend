import { useId, useState } from "react";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  ArrowUpRight,
  ClockCounterClockwise,
  Crosshair,
  GitBranch,
  LockSimple,
  Package,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useInRouterContext } from "react-router-dom";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import type { ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { detailValue, eventLabel } from "@/features/audit/model/eventPresentation";
import { ResidueBounds } from "@/features/risk/components/ResidueBounds";
import { riskPaths } from "@/features/risk/paths";
import { MassValue } from "@/shared/ui/MassValue";
import {
  RecordDialog,
  RecordEmpty,
  RecordFeedback,
  RecordTable,
} from "@/shared/ui/RecordWorkspace";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { millPaths } from "../paths";

const Exact = Decimal.clone({ precision: 32 });

export interface StockPosition {
  locationId: string;
  facilityId: string;
  quantityKg: string;
  availableKg: string;
  poolRevision?: string;
}

export interface StockLot {
  id: string;
  code: string;
  stage: string;
  productIdentity: string;
  ownerId: string;
  ownerName?: string;
  commodityId: string;
  positions: StockPosition[];
  restrictions: string[];
  mixedBulk?: boolean;
  sourceComposition?: {
    sourceLotId: string;
    sourceLotCode: string;
    quantityKg: string;
  }[];
  history?: ApiPage<{
    id: string;
    postingId: string | null;
    kind: string;
    occurredAt: string;
    quantityKg: string | null;
  }>;
}

export function StockLotDetailModal({
  lotId,
  initialCode,
  references,
  showStockPageLink = false,
  onClose,
}: {
  lotId: string;
  initialCode?: string;
  references?: SetupApiResponse;
  showStockPageLink?: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const inRouter = useInRouterContext();
  const titleId = useId();
  const positionsHeadingId = useId();
  const [drillStack, setDrillStack] = useState<{ id: string; code?: string }[]>([]);

  const activeEntry = drillStack[drillStack.length - 1];
  const activeLotId = activeEntry?.id ?? lotId;
  const activeInitialCode = activeEntry?.code ?? initialCode;

  const canTrace = useAuthStore((s) =>
    Boolean(
      s.user?.permissions.some((permission) =>
        ["trace.read.tenant", "trace.read.all"].includes(permission),
      ),
    ),
  );
  const canSources = useAuthStore(
    (s) =>
      s.user?.role === "CUSTOMER_MANAGER" ||
      Boolean(s.user?.permissions.includes("trace.read.all")),
  );

  const lookups = useQuery({
    queryKey: ["stock-overview", "lookups"],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
    enabled: !references,
    retry: false,
  });
  const resolvedRefs = references ?? lookups.data;

  const query = useQuery({
    queryKey: ["stock-overview", "detail", activeLotId],
    queryFn: async () => (await ledgerEndpoints.getLot(activeLotId)) as StockLot,
  });

  const lot = query.data;
  const stageLabel = lot ? detailValue("stage", lot.stage, i18n.language) : "";
  const productLabel = lot
    ? detailValue("productIdentity", lot.productIdentity, i18n.language)
    : "";
  const commodityName = lot
    ? resolvedRefs?.commodities?.find((row) => row.id === lot.commodityId)?.name ??
      lot.commodityId
    : "";
  const ownerName = lot
    ? lot.ownerName ??
      resolvedRefs?.owners?.find((row) => row.id === lot.ownerId)?.name ??
      lot.ownerId
    : "";

  const totalOnHand = lot
    ? lot.positions.reduce((sum, p) => sum.plus(p.quantityKg), new Exact(0))
    : new Exact(0);
  const totalAvailable = lot
    ? lot.positions.reduce((sum, p) => sum.plus(p.availableKg), new Exact(0))
    : new Exact(0);

  const stockRoute = millPaths.lot.replace(":lotId", encodeURIComponent(activeLotId));
  const traceRoute = `${riskPaths.traceback}?lotId=${encodeURIComponent(activeLotId)}${
    canSources ? "&direction=backward" : "&direction=forward"
  }`;

  return (
    <RecordDialog
      title={lot?.code ?? activeInitialCode ?? text("Tồn kho sổ cái", "Ledger stock")}
      titleId={titleId}
      subtitle={
        lot
          ? [stageLabel, productLabel, commodityName].filter(Boolean).join(" · ")
          : text("Chi tiết lô tồn kho sổ cái", "Ledger stock lot details")
      }
      icon={<Package size={22} />}
      onClose={onClose}
      wide
      dismissOnBackdrop
    >
      {drillStack.length > 0 && (
        <div>
          <button
            type="button"
            className="record-button rounded-full"
            onClick={() => setDrillStack((prev) => prev.slice(0, -1))}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{text("Quay lại lô trước", "Back to previous lot")}</span>
          </button>
        </div>
      )}

      <RecordFeedback
        error={query.error}
        pending={query.isPending}
        label={text("Đang tải chi tiết lô tồn kho…", "Loading stock lot details…")}
      />

      {lot && (
        <div className="space-y-4">
          {lot.restrictions.length > 0 && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-functional-hold-border bg-functional-hold-bg/60 p-3 text-xs text-accent-danger dark:bg-functional-hold-bg/25"
            >
              <StatusBadge
                status="HOLD"
                label={text("Đang hạn chế", "Restricted")}
                size="sm"
              />
              <LockSimple size={15} className="shrink-0" aria-hidden="true" />
              <span className="font-semibold [overflow-wrap:anywhere]">
                {lot.restrictions.join(" · ")}
              </span>
            </div>
          )}

          <dl className="record-details [overflow-wrap:anywhere] sm:grid-cols-2">
            <div>
              <dt>{text("Mã lô", "Lot code")}</dt>
              <dd className="font-mono text-ink-primary">{lot.code}</dd>
            </div>
            <div>
              <dt>{text("Chủ hàng", "Owner")}</dt>
              <dd className="text-ink-primary">{ownerName || "—"}</dd>
            </div>
            <div>
              <dt>{text("Giai đoạn", "Stage")}</dt>
              <dd className="text-ink-primary">{stageLabel}</dd>
            </div>
            <div>
              <dt>{text("Mặt hàng", "Commodity")}</dt>
              <dd className="text-ink-primary">{commodityName || "—"}</dd>
            </div>
            <div>
              <dt>{text("Tổng tồn", "Total on hand")}</dt>
              <dd>
                <MassValue value={totalOnHand} />
              </dd>
            </div>
            <div>
              <dt>{text("Tổng khả dụng", "Total available")}</dt>
              <dd>
                <MassValue value={totalAvailable} />
              </dd>
            </div>
          </dl>

          <section
            className="record-card rounded-xl"
            aria-labelledby={positionsHeadingId}
          >
            <header className="record-card-header">
              <h3 id={positionsHeadingId} className="record-card-title text-sm">
                <Package
                  size={18}
                  className="shrink-0 text-accent-primary"
                  aria-hidden="true"
                />
                <span>{text("Vị trí tồn kho", "Stock positions")}</span>
              </h3>
              <span className="text-xs font-medium text-ink-secondary">
                {lot.positions.length} {text("vị trí", "positions")}
              </span>
            </header>

            {lot.positions.length === 0 ? (
              <RecordEmpty icon={<Package size={32} />}>
                {text("Chưa có vị trí tồn kho.", "No stock positions.")}
              </RecordEmpty>
            ) : (
              <RecordTable labelledBy={positionsHeadingId}>
                <thead>
                  <tr>
                    <th scope="col">{text("Cơ sở", "Facility")}</th>
                    <th scope="col">{text("Vị trí", "Location")}</th>
                    <th scope="col" className="text-end">
                      {text("Tồn (kg)", "On hand (kg)")}
                    </th>
                    <th scope="col" className="text-end">
                      {text("Khả dụng (kg)", "Available (kg)")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lot.positions.map((row) => (
                    <tr key={`${row.facilityId}:${row.locationId}`}>
                      <td className="[overflow-wrap:anywhere]">
                        {resolvedRefs?.facilities?.find(
                          (f) => f.id === row.facilityId,
                        )?.name ?? row.facilityId}
                      </td>
                      <td className="[overflow-wrap:anywhere]">
                        {resolvedRefs?.locations?.find(
                          (l) => l.id === row.locationId,
                        )?.name ?? row.locationId}
                      </td>
                      <td className="text-end whitespace-nowrap">
                        <MassValue value={row.quantityKg} />
                      </td>
                      <td className="text-end whitespace-nowrap">
                        <MassValue value={row.availableKg} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </RecordTable>
            )}
          </section>

          {lot.sourceComposition?.length ? (
            <details className="record-card rounded-xl p-3.5 sm:p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-ink-primary">
                <span className="inline-flex items-center gap-2">
                  <GitBranch
                    size={16}
                    className="text-accent-primary"
                    aria-hidden="true"
                  />
                  <span>{text("Thành phần lô nguồn", "Source-lot composition")}</span>
                </span>
                <span className="text-xs font-normal text-ink-secondary">
                  {lot.sourceComposition.length} {text("lô", "lots")}
                </span>
              </summary>
              <ul className="mt-3 divide-y divide-ink-tertiary/15 rounded-lg border border-ink-tertiary/15 bg-surface-raised/40 text-xs dark:bg-surface-overlay/20">
                {lot.sourceComposition.map((row) => (
                  <li
                    key={row.sourceLotId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <button
                      type="button"
                      className="record-link font-mono"
                      onClick={() =>
                        setDrillStack((prev) => [
                          ...prev,
                          { id: row.sourceLotId, code: row.sourceLotCode },
                        ])
                      }
                    >
                      {row.sourceLotCode}
                    </button>
                    <MassValue value={row.quantityKg} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {lot.history?.items.length ? (
            <details className="record-card rounded-xl p-3.5 sm:p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-ink-primary">
                <span className="inline-flex items-center gap-2">
                  <ClockCounterClockwise
                    size={16}
                    className="text-accent-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {text("Lịch sử bút toán gần đây", "Recent ledger postings")}
                  </span>
                </span>
                <span className="text-xs font-normal text-ink-secondary">
                  {lot.history.items.length} {text("mục", "entries")}
                </span>
              </summary>
              <ul className="mt-3 divide-y divide-ink-tertiary/15 rounded-lg border border-ink-tertiary/15 bg-surface-raised/40 text-xs dark:bg-surface-overlay/20">
                {lot.history.items.map((row) => (
                  <li
                    key={row.postingId || row.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="block font-semibold text-ink-primary">
                        {eventLabel(row.kind, i18n.language)}
                      </span>
                      <time
                        dateTime={row.occurredAt}
                        className="block text-[11px] text-ink-secondary"
                      >
                        {new Date(row.occurredAt).toLocaleString(i18n.language)}
                      </time>
                    </div>
                    {row.quantityKg && <MassValue value={row.quantityKg} />}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <ResidueBounds lotId={activeLotId} />
        </div>
      )}

      <footer className="record-form-footer justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {showStockPageLink &&
            (inRouter ? (
              <Link className="record-button rounded-full" to={stockRoute}>
                <span>{text("Mở Tồn kho sổ cái", "Open ledger stock")}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <a className="record-button rounded-full" href={stockRoute}>
                <span>{text("Mở Tồn kho sổ cái", "Open ledger stock")}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
          {canTrace &&
            lot &&
            (inRouter ? (
              <Link
                className="record-button record-primary rounded-full"
                to={traceRoute}
              >
                <Crosshair size={15} aria-hidden="true" />
                <span>{text("Truy vết lô", "Trace lot")}</span>
              </Link>
            ) : (
              <a
                className="record-button record-primary rounded-full"
                href={traceRoute}
              >
                <Crosshair size={15} aria-hidden="true" />
                <span>{text("Truy vết lô", "Trace lot")}</span>
              </a>
            ))}
        </div>
        <button type="button" className="record-button" onClick={onClose}>
          {t("field.seasons.close")}
        </button>
      </footer>
    </RecordDialog>
  );
}
