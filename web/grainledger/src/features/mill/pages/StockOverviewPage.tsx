import { useId, useState } from "react";
import Decimal from "decimal.js";
import {
  CaretLeft,
  CaretRight,
  Eye,
  LockSimple,
  MagnifyingGlass,
  Package,
  Scales,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { collectPages, type ApiPage } from "@/api/query";
import { detailValue } from "@/features/audit/model/eventPresentation";
import { MassValue } from "@/shared/ui/MassValue";
import {
  RecordEmpty,
  RecordFeedback,
  RecordRefresh,
  RecordTable,
  RecordWorkspace,
} from "@/shared/ui/RecordWorkspace";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  StockLotDetailModal,
  type StockLot,
} from "../components/StockLotDetailModal";
import { millPaths } from "../paths";

const scope = ["stock-overview"];
const pageSize = 30;
const Exact = Decimal.clone({ precision: 32 });
const stages = [
  "RAW_PADDY",
  "DRIED_PADDY",
  "HEAD_RICE",
  "BROKEN_RICE",
  "BRAN",
  "HUSK",
  "BLENDED_RICE",
  "BAGGED_RICE",
];

export function StockOverviewPage() {
  const { i18n } = useTranslation();
  const text = useWorkflowText();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lotId: routeLotId } = useParams();
  const [modalLot, setModalLot] = useState<{ id: string; code?: string } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const scopeHeadingId = useId();
  const lotsHeadingId = useId();

  const search = params.get("search") ?? "";
  const facilityId = params.get("facilityId") ?? "";
  const locationId = params.get("locationId") ?? "";
  const ownerId = params.get("ownerId") ?? "";
  const stage = params.get("stage") ?? "";
  const sortBy = params.get("sortBy") ?? "";
  const sortDirection = params.get("sortDirection") === "asc" ? "asc" : "desc";

  const lookups = useQuery({
    queryKey: [...scope, "lookups"],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
  });
  const lots = useQuery({
    queryKey: [
      ...scope,
      "list",
      { search, facilityId, locationId, ownerId, stage, sortBy, sortDirection: sortBy ? sortDirection : "" },
    ],
    queryFn: () =>
      collectPages<StockLot>(
        async (paging) =>
          (await ledgerEndpoints.getLots({
            ...paging,
            search,
            facilityId,
            locationId,
            ownerId,
            stage,
            ...(sortBy ? { sortBy, sortDirection } : {}),
          })) as ApiPage<StockLot>,
      ),
  });
  const references = lookups.data;

  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    setParams(next);
    setPage(1);
  }

  function closeModal() {
    setModalLot(null);
    if (routeLotId) {
      navigate(millPaths.stock + (params.size ? `?${params}` : ""));
    }
  }

  const rows = (lots.data ?? []).map((lot) => {
    const positions = lot.positions.filter(
      (p) =>
        (!facilityId || p.facilityId === facilityId) &&
        (!locationId || p.locationId === locationId),
    );
    return {
      lot,
      positions,
      quantity: positions.reduce((sum, p) => sum.plus(p.quantityKg), new Exact(0)),
      available: positions.reduce(
        (sum, p) => sum.plus(p.availableKg),
        new Exact(0),
      ),
    };
  });

  const total = rows.reduce((sum, row) => sum.plus(row.quantity), new Exact(0));
  const available = rows.reduce(
    (sum, row) => sum.plus(row.available),
    new Exact(0),
  );
  const restricted = total.minus(available);
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  const shownPage = Math.min(page, lastPage);
  const visibleRows = rows.slice(
    (shownPage - 1) * pageSize,
    shownPage * pageSize,
  );

  const activeLotId = modalLot?.id ?? routeLotId;

  return (
    <RecordWorkspace
      section={text("SỔ CÁI TỒN KHO & ĐỊNH DANH", "LEDGER STOCK & TRACEABILITY")}
      title={text("Tồn kho sổ cái", "Ledger stock")}
      description={text(
        "Tra cứu tồn kho khả dụng, vị trí lưu trữ và hồ sơ chi tiết từng lô theo chủ hàng, cơ sở và giai đoạn.",
        "Inspect on-hand and available stock balances, storage positions, and lot profiles by owner, facility, and stage.",
      )}
      actions={
        <RecordRefresh
          pending={lookups.isFetching || lots.isFetching}
          onRefresh={() => void client.invalidateQueries({ queryKey: scope })}
        />
      }
    >
      <RecordFeedback
        error={lookups.error}
        pending={lookups.isPending}
        label={text("Đang tải danh mục kho…", "Loading stock lookups…")}
      />

      <section className="record-card rounded-2xl" aria-labelledby={scopeHeadingId}>
        <header className="record-card-header">
          <h2 id={scopeHeadingId} className="record-card-title">
            <SlidersHorizontal
              size={20}
              className="shrink-0 text-accent-primary"
              aria-hidden="true"
            />
            <span>{text("Phạm vi tồn kho", "Stock scope")}</span>
          </h2>
        </header>
        <div className="p-4 sm:p-5">
          <search className="record-filter grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
              <span>{text("Chủ hàng", "Stock owner")}</span>
              <select
                value={ownerId}
                onChange={(e) => change({ ownerId: e.target.value })}
              >
                <option value="">{text("Tất cả", "All")}</option>
                {references?.owners?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
              <span>{text("Cơ sở", "Facility")}</span>
              <select
                value={facilityId}
                onChange={(e) =>
                  change({ facilityId: e.target.value, locationId: "" })
                }
              >
                <option value="">{text("Tất cả", "All")}</option>
                {references?.facilities?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
              <span>{text("Vị trí", "Location")}</span>
              <select
                value={locationId}
                onChange={(e) => change({ locationId: e.target.value })}
              >
                <option value="">{text("Tất cả", "All")}</option>
                {references?.locations
                  ?.filter((row) => !facilityId || row.facilityId === facilityId)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
              <span>{text("Giai đoạn", "Stage")}</span>
              <select
                value={stage}
                onChange={(e) => change({ stage: e.target.value })}
              >
                <option value="">{text("Tất cả", "All")}</option>
                {stages.map((value) => (
                  <option key={value} value={value}>
                    {detailValue("stage", value, i18n.language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
              <span>{text("Sắp xếp theo", "Sort by")}</span>
              <select
                aria-label={text("Sắp xếp theo", "Sort by")}
                value={sortBy}
                onChange={(e) =>
                  change({
                    sortBy: e.target.value,
                    sortDirection: e.target.value ? sortDirection : "",
                  })
                }
              >
                <option value="">{text("Mặc định", "Default")}</option>
                <option value="code">{text("Mã lô", "Lot code")}</option>
                <option value="stage">{text("Công đoạn", "Stage")}</option>
                <option value="owner">{text("Chủ sở hữu", "Owner")}</option>
                <option value="quantity">{text("Khối lượng", "Quantity")}</option>
              </select>
            </label>
            {sortBy && (
              <label className="space-y-1.5 text-xs font-semibold text-ink-secondary">
                <span>{text("Thứ tự", "Direction")}</span>
                <select
                  aria-label={text("Thứ tự sắp xếp", "Sort direction")}
                  value={sortDirection}
                  onChange={(e) => change({ sortDirection: e.target.value })}
                >
                  <option value="asc">{text("Tăng dần", "Ascending")}</option>
                  <option value="desc">{text("Giảm dần", "Descending")}</option>
                </select>
              </label>
            )}
            <form
              className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4"
              onSubmit={(e) => {
                e.preventDefault();
                change({
                  search: String(
                    new FormData(e.currentTarget).get("search") ?? "",
                  ).trim(),
                });
              }}
            >
              <div className="min-w-0 flex-1 sm:max-w-sm">
                <label
                  htmlFor="stock-lot-search"
                  className="mb-1.5 block text-xs font-semibold text-ink-secondary"
                >
                  {text("Tìm lô", "Search lots")}
                </label>
                <div className="relative">
                  <MagnifyingGlass
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  />
                  <input
                    id="stock-lot-search"
                    key={search}
                    type="search"
                    name="search"
                    defaultValue={search}
                    placeholder={text("Nhập mã lô cần tìm…", "Search by lot code…")}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="record-button record-primary shrink-0 rounded-full"
              >
                {text("Tìm kiếm", "Search")}
              </button>
            </form>
          </search>
        </div>
      </section>

      <RecordFeedback
        error={lots.error}
        pending={lots.isPending}
        label={text("Đang tải danh sách lô tồn kho…", "Loading stock lots…")}
      />

      {lots.data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Số lô trong phạm vi", "Lots in scope")}
                </span>
                <Package size={18} className="text-accent-primary" aria-hidden="true" />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                {rows.length}
              </div>
            </div>
            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Tồn (kg)", "On hand (kg)")}
                </span>
                <Scales size={18} className="text-accent-primary" aria-hidden="true" />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                <MassValue value={total} />
              </div>
            </div>
            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Khả dụng (kg)", "Available (kg)")}
                </span>
                <Package size={18} className="text-accent-primary" aria-hidden="true" />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                <MassValue value={available} />
              </div>
            </div>
            <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="text-xs font-medium">
                  {text("Bị hạn chế (kg)", "Restricted (kg)")}
                </span>
                <LockSimple
                  size={18}
                  className={
                    restricted.greaterThan(0)
                      ? "text-accent-danger"
                      : "text-ink-tertiary"
                  }
                  aria-hidden="true"
                />
              </div>
              <div className="font-display text-2xl font-bold text-ink-primary">
                <MassValue value={restricted} />
              </div>
            </div>
          </div>

          <section className="record-card rounded-2xl" aria-labelledby={lotsHeadingId}>
            <header className="record-card-header">
              <h2 id={lotsHeadingId} className="record-card-title">
                <Package
                  size={20}
                  className="shrink-0 text-accent-primary"
                  aria-hidden="true"
                />
                <span>{text("Lô hàng", "Lots")}</span>
              </h2>
              <span className="text-xs font-medium text-ink-secondary">
                {rows.length} {text("lô", "lots")}
              </span>
            </header>

            {rows.length === 0 ? (
              <RecordEmpty icon={<Package size={36} />}>
                {text(
                  "Không tìm thấy lô trong phạm vi này.",
                  "No lots found in this scope.",
                )}
              </RecordEmpty>
            ) : (
              <>
                <RecordTable labelledBy={lotsHeadingId}>
                  <thead>
                    <tr>
                      <th scope="col">{text("Lô", "Lot")}</th>
                      <th scope="col">{text("Chủ hàng", "Owner")}</th>
                      <th scope="col">{text("Giai đoạn", "Stage")}</th>
                      <th scope="col" className="text-end">
                        {text("Tồn (kg)", "On hand (kg)")}
                      </th>
                      <th scope="col" className="text-end">
                        {text("Khả dụng (kg)", "Available (kg)")}
                      </th>
                      <th scope="col">{text("Hạn chế", "Restrictions")}</th>
                      <th scope="col" className="text-end">
                        <span className="sr-only sm:not-sr-only">
                          {text("Thao tác", "Action")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.lot.id}>
                        <th scope="row" className="whitespace-nowrap">
                          <button
                            type="button"
                            className="record-row-action font-mono text-accent-primary"
                            onClick={() =>
                              setModalLot({ id: row.lot.id, code: row.lot.code })
                            }
                          >
                            {row.lot.code}
                          </button>
                        </th>
                        <td className="[overflow-wrap:anywhere]">
                          {row.lot.ownerName ??
                            references?.owners?.find((o) => o.id === row.lot.ownerId)
                              ?.name ??
                            row.lot.ownerId}
                        </td>
                        <td>{detailValue("stage", row.lot.stage, i18n.language)}</td>
                        <td className="text-end whitespace-nowrap">
                          <MassValue value={row.quantity} />
                        </td>
                        <td className="text-end whitespace-nowrap">
                          <MassValue value={row.available} />
                        </td>
                        <td>
                          {row.lot.restrictions.length > 0 ? (
                            <StatusBadge
                              status="HOLD"
                              label={row.lot.restrictions.join(" · ")}
                              size="sm"
                            />
                          ) : (
                            <span className="text-ink-tertiary">—</span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="record-row-action whitespace-nowrap"
                            onClick={() =>
                              setModalLot({ id: row.lot.id, code: row.lot.code })
                            }
                          >
                            <Eye size={16} aria-hidden="true" />
                            <span>{text("Xem chi tiết", "View details")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </RecordTable>

                {lastPage > 1 && (
                  <nav
                    aria-label={text("Phân trang lô tồn kho", "Stock lot pagination")}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 bg-surface-raised/60 px-4 py-2 dark:bg-surface-overlay/30"
                  >
                    <span className="text-xs text-ink-secondary">
                      {shownPage} / {lastPage}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={text("Trang trước", "Previous")}
                        disabled={shownPage <= 1}
                        onClick={() => setPage(shownPage - 1)}
                        className="record-icon-button rounded-lg"
                      >
                        <CaretLeft size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={text("Trang sau", "Next")}
                        disabled={shownPage >= lastPage}
                        onClick={() => setPage(shownPage + 1)}
                        className="record-icon-button rounded-lg"
                      >
                        <CaretRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </section>
        </>
      )}

      {activeLotId && (
        <StockLotDetailModal
          key={activeLotId}
          lotId={activeLotId}
          initialCode={modalLot?.code}
          references={references}
          onClose={closeModal}
        />
      )}
    </RecordWorkspace>
  );
}
