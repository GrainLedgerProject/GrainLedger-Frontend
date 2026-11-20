import { useRef, useState } from "react";
import {
  ArrowsClockwise,
  Eye,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ledgerEndpoints } from "@/api/ledger";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const pageSize = 25;
const filterField =
  "w-full min-w-0 rounded-lg border border-ink-tertiary/20 bg-surface-raised py-2 text-xs text-ink-primary transition-colors focus:border-accent-primary focus:outline-none dark:bg-surface-overlay";
const tableClass =
  "overflow-x-auto rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-xs dark:bg-surface-raised";
const tableHeader =
  "border-b border-ink-tertiary/15 bg-surface-raised font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay";
const tableCell = "px-4 py-3.5";
const tableRow =
  "transition-colors hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40";
const paginationButton =
  "rounded-lg border border-ink-tertiary/20 px-3 py-2 disabled:opacity-40";

interface TraceStart {
  id: string;
  code: string;
  stage: string;
}
interface TraceResult {
  traceId: string;
  complete: boolean;
  asOf: string;
  sourceContributionsVisible?: boolean;
  positivePathCoverage?: string;
  lots: {
    id: string;
    code: string;
    stage: string;
    producedKg: string;
    restrictions: string[];
    positions: {
      quantityKg: string;
      locationName?: string;
      locationId: string;
    }[];
    contributions?:
      | {
          sourceLotId: string;
          quantityKg: string;
          denominatorKg: string;
          percentage: string | null;
        }[]
      | null;
  }[];
  edges: {
    inputLotId: string;
    outputLotId: string;
    operationId: string | null;
    relationType?: string;
    inputConsumedKg: string;
    outputProducedKg: string;
  }[];
  sources: {
    lotId: string;
    provenance: {
      procurementCode: string;
      plotId: string;
      farmerId: string;
      riceVariety: string;
      currentReferenceLabels?: {
        farmerName?: string;
        plotCode?: string;
        seasonName?: string;
      };
    } | null;
  }[];
}
export function TraceabilityPage() {
  const text = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [page, setPage] = useState(1);
  const resultRegion = useRef<HTMLDivElement>(null);
  const lot = params.get("lotId") ?? "";
  const report = params.get("reportId");
  const labResult = params.get("resultId");
  const incompleteLab = Boolean(report) !== Boolean(labResult);
  const direction =
    report && labResult
      ? "forward"
      : params.get("direction") === "backward"
        ? "backward"
        : "forward";
  const view = params.get("view") === "history" ? "history" : "current";
  const list = useQuery({
    queryKey: ["trace-starts", search, mode, page],
    queryFn: async () =>
      (await ledgerEndpoints.getTraceStarts({
        Mode: mode,
        Search: search,
        Page: page,
        PageSize: pageSize,
      })) as { items: TraceStart[]; totalCount: number },
  });
  const trace = useQuery({
    queryKey: ["ledger-trace", lot, report, labResult, direction, view],
    enabled: !incompleteLab && Boolean(lot || (report && labResult)),
    queryFn: async () =>
      (report && labResult
        ? await ledgerEndpoints.traceLotFromLab({
            reportId: report,
            resultId: labResult,
            view,
          })
        : await ledgerEndpoints.traceLot({
            lotId: lot,
            direction,
            view,
          })) as TraceResult,
  });
  const r = trace.data;
  const names = new Map(r?.lots.map((l) => [l.id, l.code]));
  const refreshing = list.isFetching || trace.isFetching;
  const refreshLabel = text("Làm mới dữ liệu", "Refresh data");
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const selectLot = (id: string) => {
    setParams({ lotId: id, direction, view }, { preventScrollReset: true });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      resultRegion.current?.focus({ preventScroll: true });
      resultRegion.current?.scrollIntoView({ block: "start" });
    }
  };

  const updateFilter = (key: "direction" | "view", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { preventScrollReset: true });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("Dòng di chuyển của lô", "Lot movement")}
          </span>
          <h1 className="font-display text-2xl font-bold text-ink-primary">
            {text("Truy xuất nguồn gốc", "Lot traceability")}
          </h1>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 text-xs text-ink-secondary"
          >
            {text(
              "Tra cứu mối liên hệ giữa các lô và nguồn thu mua.",
              "Explore lot relationships and procurement sources.",
            )}
          </p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              void list.refetch();
              if (trace.isEnabled) void trace.refetch();
            }}
            disabled={refreshing}
            title={refreshLabel}
            aria-label={refreshLabel}
            className="rounded-full border border-ink-tertiary/20 bg-surface-base p-2.5 text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={refreshing ? "motion-safe:animate-spin" : undefined}
            />
          </button>
        </div>
      </header>

      {incompleteLab && (
        <Feedback
          error={
            new Error(
              text(
                "Liên kết truy vết phòng lab cần cả mã báo cáo và mã kết quả đã xác nhận.",
                "A lab trace link requires both a confirmed report ID and result ID.",
              ),
            )
          }
        />
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="trace-lots-heading"
          className="min-w-0 space-y-4"
        >
          <Feedback error={list.error} />

          <section
            aria-label={text("Bộ lọc lô", "Lot filters")}
            className="space-y-3 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised"
          >
            <h2
              id="trace-lots-heading"
              className="font-display text-lg font-semibold"
            >
              {text("Danh sách lô", "Lot list")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative sm:col-span-2">
                <MagnifyingGlass
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                />
                <input
                  type="text"
                  aria-label={text("Tìm mã lô", "Search lot code")}
                  placeholder={text(
                    "Tìm theo mã lô...",
                    "Search by lot code...",
                  )}
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  className={`pl-9 pr-8 placeholder:text-ink-tertiary ${filterField}`}
                />
                {search && (
                  <button
                    type="button"
                    aria-label={text("Xóa tìm kiếm", "Clear search")}
                    onClick={() => updateSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-tertiary hover:text-ink-primary"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <select
                aria-label={text("Loại lô", "Lot scope")}
                className={`${filterField} pl-3`}
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">{text("Tất cả lô", "All lots")}</option>
                <option value="pools">
                  {text("Tồn kho hiện tại", "Current pools")}
                </option>
                <option value="sources">
                  {text("Lô thu mua", "Procurement sources")}
                </option>
              </select>
            </div>
            {list.data && (
              <p className="border-t border-ink-tertiary/10 pt-2.5 text-xs text-ink-secondary">
                {text(
                  `Trang hiện tại: ${list.data.items.length} lô · Tổng cộng ${list.data.totalCount} lô`,
                  `This page: ${list.data.items.length} lots · ${list.data.totalCount} total`,
                )}
              </p>
            )}
          </section>

          {list.isPending ? (
            <div className="flex justify-center py-16">
              <GrainLoader
                label={text("Đang tải danh sách lô...", "Loading lots...")}
              />
            </div>
          ) : (
            list.data &&
            (list.data.items.length ? (
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="trace-lots-heading"
                className={`${tableClass} max-h-[24rem] overflow-y-auto lg:max-h-[60vh]`}
              >
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="sr-only">
                    {text(
                      "Danh sách lô để truy vết",
                      "Lots available for tracing",
                    )}
                  </caption>
                  <thead className={`${tableHeader} sticky top-0 z-10`}>
                    <tr>
                      <th scope="col" className={tableCell}>
                        {text("Mã lô", "Lot code")}
                      </th>
                      <th scope="col" className={tableCell}>
                        {text("Công đoạn", "Stage")}
                      </th>
                      <th scope="col" className={`${tableCell} text-right`}>
                        {text("Thao tác", "Action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-tertiary/10">
                    {list.data.items.map((item) => {
                      const selected =
                        lot === item.id && !(report && labResult);
                      return (
                        <tr
                          key={item.id}
                          className={`${tableRow} ${selected ? "bg-accent-primary/5" : ""}`}
                        >
                          <th scope="row" className={tableCell}>
                            <span className="inline-block break-all rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono font-bold text-accent-primary">
                              {item.code}
                            </span>
                          </th>
                          <td className={tableCell}>
                            <span className="inline-block rounded-full border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 font-semibold dark:bg-surface-overlay">
                              {item.stage}
                            </span>
                          </td>
                          <td className={`${tableCell} text-right`}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              aria-label={text(
                                `Truy vết ${item.code}`,
                                `Trace ${item.code}`,
                              )}
                              onClick={() => selectLot(item.id)}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 font-semibold shadow-xs transition-colors hover:bg-surface-raised aria-pressed:border-accent-primary/40 aria-pressed:text-accent-primary"
                            >
                              <Eye size={14} aria-hidden="true" />
                              {text("Truy vết", "Trace")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-ink-tertiary/15 bg-surface-base py-16 text-center dark:bg-surface-raised">
                <MagnifyingGlass
                  size={40}
                  aria-hidden="true"
                  className="mx-auto mb-3 text-ink-tertiary opacity-60"
                />
                <p className="text-sm font-semibold text-ink-primary">
                  {text(
                    "Không tìm thấy lô phù hợp với bộ lọc.",
                    "No lots match the filters.",
                  )}
                </p>
              </div>
            ))
          )}

          {list.data && (
            <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
              <span>
                {text("Trang", "Page")} {page}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={list.isFetching || page === 1}
                  onClick={() => setPage(page - 1)}
                  className={paginationButton}
                >
                  {text("Trang trước", "Previous")}
                </button>
                <button
                  type="button"
                  disabled={
                    list.isFetching || page * pageSize >= list.data.totalCount
                  }
                  onClick={() => setPage(page + 1)}
                  className={paginationButton}
                >
                  {text("Trang sau", "Next")}
                </button>
              </div>
            </div>
          )}
        </section>

        <div
          ref={resultRegion}
          tabIndex={-1}
          role="region"
          aria-label={text("Kết quả truy vết", "Trace result")}
          className="min-w-0 scroll-mt-20 rounded-2xl"
        >
          <Panel title={text("Kết quả truy vết", "Trace result")}>
            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label={text("Hướng truy vết", "Trace direction")}
                className={`${filterField} pl-3`}
                disabled={Boolean(report && labResult)}
                value={direction}
                onChange={(e) => updateFilter("direction", e.target.value)}
              >
                <option value="forward">{text("Xuôi dòng", "Forward")}</option>
                <option value="backward">
                  {text("Ngược dòng", "Backward")}
                </option>
              </select>
              <select
                aria-label={text("Phạm vi thời gian", "View")}
                className={`${filterField} pl-3`}
                value={view}
                onChange={(e) => updateFilter("view", e.target.value)}
              >
                <option value="current">{text("Hiện tại", "Current")}</option>
                <option value="history">{text("Lịch sử", "History")}</option>
              </select>
            </div>
            {trace.isEnabled ? (
              <>
                <Feedback pending={trace.isFetching} error={trace.error} />
                {r && (
                  <>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold ${r.complete ? "bg-functional-balanced-bg text-accent-primary" : "bg-functional-stale-bg text-accent-warning"}`}
                      >
                        {r.complete
                          ? text("Đầy đủ", "Complete")
                          : text("Dữ liệu truy vết một phần", "Partial trace")}
                      </span>
                      <time dateTime={r.asOf} className="text-ink-secondary">
                        {new Date(r.asOf).toLocaleString()}
                      </time>
                    </div>
                    {r.positivePathCoverage === "PARTIAL_LEGACY" && (
                      <p
                        role="status"
                        className="rounded-xl border border-functional-stale-border/40 bg-functional-stale-bg p-3 text-xs text-ink-primary"
                      >
                        {text(
                          "Một số liên kết lịch sử chưa có phân bổ nguồn đầy đủ.",
                          "Some historical relationships have incomplete source allocations.",
                        )}
                      </p>
                    )}

                    <div className={tableClass}>
                      <table className="w-full border-collapse text-left text-xs">
                        <caption className="sr-only">
                          {text(
                            "Các lô trong kết quả truy vết",
                            "Lots in the trace result",
                          )}
                        </caption>
                        <thead className={tableHeader}>
                          <tr>
                            <th scope="col" className={tableCell}>
                              {text("Lô", "Lot")}
                            </th>
                            <th scope="col" className={tableCell}>
                              {text("Công đoạn", "Stage")}
                            </th>
                            <th
                              scope="col"
                              className={`${tableCell} text-right`}
                            >
                              {text("Khối lượng (kg)", "Quantity (kg)")}
                            </th>
                            <th scope="col" className={tableCell}>
                              {text("Hạn chế", "Restrictions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-tertiary/10">
                          {r.lots.map((item) => (
                            <tr key={item.id} className={tableRow}>
                              <th
                                scope="row"
                                className={`${tableCell} font-mono font-semibold`}
                              >
                                {item.code}
                              </th>
                              <td className={tableCell}>{item.stage}</td>
                              <td
                                className={`${tableCell} text-right font-mono tabular-nums`}
                              >
                                {item.producedKg}
                              </td>
                              <td className={tableCell}>
                                {item.restrictions?.join(", ") || "—"}
                              </td>
                            </tr>
                          ))}
                          {r.lots.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className={`${tableCell} text-center text-ink-secondary`}
                              >
                                {text(
                                  "Không có lô trong kết quả.",
                                  "No lots in this result.",
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {r.edges.length > 0 && (
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          {text("Liên kết giữa các lô", "Lot relationships")}
                        </h3>
                        <ul className="divide-y divide-ink-tertiary/15 rounded-xl border border-ink-tertiary/20 text-sm">
                          {r.edges.map((edge, index) => (
                            <li
                              key={index}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2"
                            >
                              <span className="break-all font-mono font-semibold">
                                {names.get(edge.inputLotId) ?? edge.inputLotId}{" "}
                                →{" "}
                                {names.get(edge.outputLotId) ??
                                  edge.outputLotId}
                              </span>
                              <span className="text-xs text-ink-secondary">
                                {edge.relationType ?? edge.operationId} ·{" "}
                                {edge.inputConsumedKg} / {edge.outputProducedKg}{" "}
                                kg
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">
                        {text(
                          "Đóng góp nguồn theo từng lô",
                          "Source contributions per lot",
                        )}
                      </h3>
                      {r.sourceContributionsVisible === false ? (
                        <p className="text-sm text-ink-secondary">
                          {text(
                            "Thông tin nguồn bị giới hạn",
                            "Source details restricted",
                          )}
                        </p>
                      ) : (
                        r.lots.map((item) =>
                          item.contributions?.length ? (
                            <details
                              key={item.id}
                              className="rounded-xl border border-ink-tertiary/20 bg-surface-raised p-3 dark:bg-surface-overlay"
                            >
                              <summary className="cursor-pointer font-mono text-sm font-semibold">
                                {item.code}
                              </summary>
                              <div className={`mt-3 ${tableClass}`}>
                                <table className="w-full border-collapse text-left text-xs">
                                  <caption className="sr-only">
                                    {text(
                                      "Phân bổ nguồn",
                                      "Source allocations",
                                    )}{" "}
                                    · {item.code}
                                  </caption>
                                  <thead className={tableHeader}>
                                    <tr>
                                      <th scope="col" className={tableCell}>
                                        {text("Lô nguồn", "Source lot")}
                                      </th>
                                      <th
                                        scope="col"
                                        className={`${tableCell} text-right`}
                                      >
                                        kg
                                      </th>
                                      <th
                                        scope="col"
                                        className={`${tableCell} text-right`}
                                      >
                                        %
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-ink-tertiary/10">
                                    {item.contributions.map((contribution) => (
                                      <tr key={contribution.sourceLotId}>
                                        <td
                                          className={`${tableCell} font-mono`}
                                        >
                                          {names.get(
                                            contribution.sourceLotId,
                                          ) ?? contribution.sourceLotId}
                                        </td>
                                        <td
                                          className={`${tableCell} text-right font-mono tabular-nums`}
                                        >
                                          {contribution.quantityKg} /{" "}
                                          {contribution.denominatorKg}
                                        </td>
                                        <td
                                          className={`${tableCell} text-right font-mono tabular-nums`}
                                        >
                                          {contribution.percentage ?? "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          ) : null,
                        )
                      )}
                      {r.sourceContributionsVisible !== false &&
                        !r.lots.some((item) => item.contributions?.length) && (
                          <p className="text-sm text-ink-secondary">
                            {text(
                              "Chưa có dữ liệu phân bổ nguồn.",
                              "No source allocations available.",
                            )}
                          </p>
                        )}
                    </section>

                    {Boolean(r.sources?.length) && (
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          {text("Thông tin lô nguồn", "Source lot details")}
                        </h3>
                        <ul className="divide-y divide-ink-tertiary/15 rounded-xl border border-ink-tertiary/20 text-sm">
                          {r.sources.map(({ lotId, provenance }) => (
                            <li key={lotId} className="space-y-1 px-3 py-2">
                              <p className="break-all font-mono font-semibold">
                                {names.get(lotId) ?? lotId}
                              </p>
                              <p className="break-words text-xs text-ink-secondary">
                                {provenance
                                  ? [
                                      provenance.procurementCode,
                                      provenance.riceVariety,
                                      provenance.currentReferenceLabels
                                        ?.farmerName,
                                      provenance.currentReferenceLabels
                                        ?.plotCode ?? provenance.plotId,
                                      provenance.currentReferenceLabels
                                        ?.seasonName,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")
                                  : text(
                                      "Thông tin nguồn bị giới hạn",
                                      "Source details restricted",
                                    )}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-tertiary/20 bg-surface-raised px-4 py-10 text-center dark:bg-surface-overlay">
                <Eye
                  size={28}
                  aria-hidden="true"
                  className="mx-auto mb-3 text-ink-tertiary"
                />
                <p className="text-sm font-semibold">
                  {text("Chưa có kết quả truy vết", "No trace result yet")}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {text(
                    "Chọn Truy vết ở một lô trong danh sách để xem kết quả.",
                    "Select Trace on a lot in the list to see its result.",
                  )}
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
