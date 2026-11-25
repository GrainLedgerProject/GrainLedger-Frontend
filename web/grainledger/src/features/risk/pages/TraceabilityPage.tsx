import { useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  Eye,
  Flask,
  FlowArrow,
  MagnifyingGlass,
  Play,
  ShieldWarning,
  Table as TableIcon,
  X,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { labReportEndpoints } from "@/api/compliance";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import type { LoadingEdge } from "@/api/containerExecution";
import { useAuthStore } from "@/app/store/authStore";
import { labResultPath } from "@/features/compliance/paths";
import { receiptPath, sourceLotPath } from "@/features/field/paths";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { ActualLoading } from "../components/ActualLoading";
import {
  PlaceHoldModal,
  type HoldSelectableLot,
} from "../components/PlaceHoldModal";
import { ResidueBounds } from "../components/ResidueBounds";
import { TraceFlowchart } from "../components/TraceFlowchart";
import { TraceLabStart } from "../components/TraceLabStart";
import { TraceSourceEvidence } from "../components/TraceSourceEvidence";
import {
  buildTraceFlowGraph,
  traceRelationLabel,
  type TraceFlowCustodyInput,
  type TraceFlowOperationInput,
} from "../model/traceFlow";
import { riskPaths } from "../paths";

const pageSize = 25;
const uuidRegex = /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/;
const filterField =
  "filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay";
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
  schemaVersion?: number;
  complete: boolean;
  asOf: string;
  sourceContributionsVisible?: boolean;
  positivePathCoverage?: string;
  root?: { id: string };
  labOrigin?: { reportId: string; resultId: string; lotId: string };
  loadingEdges?: LoadingEdge[];
  actualContainers?: {
    containerId: string;
    code: string;
    linkedLoadedKg: string;
    status: string;
    held: boolean;
    restricted?: boolean;
  }[];
  corrections?: {
    id: string;
    status: string;
    originalOperationId: string;
    replacementOperationId: string | null;
  }[];
  operations?: TraceFlowOperationInput[];
  custodyEvents?: TraceFlowCustodyInput[];
  lots: {
    id: string;
    code: string;
    stage: string;
    ownerId?: string;
    producedKg: string;
    quantityKg?: string;
    availableKg?: string;
    restrictions: string[];
    directHoldIds?: string[];
    effectiveHoldIds?: string[];
    positions: {
      quantityKg: string;
      availableKg?: string;
      locationName?: string;
      locationId: string;
      facilityId?: string;
      poolRevision?: string;
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
      sourceRecordId?: string;
      procurementId?: string;
      procurementItemId?: string;
      procurementCode: string;
      plotId: string;
      farmerId: string;
      seasonId?: string;
      plotSeasonId?: string;
      expectedKg?: string;
      originalValue?: string;
      originalUnit?: string;
      riceVariety: string;
      currentReferenceLabels?: {
        farmerName?: string;
        plotCode?: string;
        seasonName?: string;
      };
    } | null;
  }[];
}

function buildSelectedLabSummary(
  report: string | null,
  labResult: string | null,
  reportData:
    | {
        reportNumber: string;
        laboratoryName: string;
        resultSets?: {
          statedSampleCode?: string | null;
          laboratorySampleReference?: string | null;
          results?: {
            id: string;
            testLabel: string;
            numericValue?: string | null;
            unit?: string | null;
            originalResultText: string;
          }[];
        }[];
      }
    | undefined,
) {
  if (!report || !labResult || !reportData) return null;
  for (const rs of reportData.resultSets ?? []) {
    const matched = rs.results?.find((item) => item.id === labResult);
    if (matched) {
      return {
        reportNumber: reportData.reportNumber,
        laboratoryName: reportData.laboratoryName,
        sampleCode: rs.statedSampleCode ?? rs.laboratorySampleReference,
        testLabel: matched.testLabel,
        value: matched.numericValue
          ? `${matched.numericValue} ${matched.unit ?? ""}`.trim()
          : matched.originalResultText,
      };
    }
  }
  return {
    reportNumber: reportData.reportNumber,
    laboratoryName: reportData.laboratoryName,
    sampleCode: null,
    testLabel: null,
    value: null,
  };
}

export function TraceabilityPage() {
  const text = useWorkflowText();
  const locale: "vi" | "en" = text("vi", "en") === "en" ? "en" : "vi";
  const user = useAuthStore((s) => s.user);
  const canReadLab = user?.permissions.some(
    (p) => p === "lab.read" || p === "lab.write",
  );
  const canOpenReceipt = user?.role === "CUSTOMER_MANAGER";
  const canSources =
    user?.role === "CUSTOMER_MANAGER" ||
    Boolean(user?.permissions.includes("trace.read.all"));
  const canIssueHold =
    user?.role === "CUSTOMER_MANAGER" &&
    Boolean(user?.permissions.includes("holds.manage"));

  const [choosingLab, setChoosingLab] = useState(false);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [facilityId, setFacilityId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [manualLotId, setManualLotId] = useState("");
  const [page, setPage] = useState(1);
  const [runLabKey, setRunLabKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "flowchart">("table");
  const [selectedResidueLotId, setSelectedResidueLotId] = useState("");
  const [expandedSourceLotId, setExpandedSourceLotId] = useState<string | null>(
    null,
  );
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const resultRegion = useRef<HTMLDivElement>(null);
  const lot = params.get("lotId") ?? "";
  const report = params.get("reportId");
  const labResult = params.get("resultId");
  const incompleteLab = Boolean(report) !== Boolean(labResult);
  const labSelectionKey = report && labResult ? `${report}:${labResult}` : null;

  const direction =
    !canSources || (report && labResult)
      ? "forward"
      : params.get("direction") === "backward"
        ? "backward"
        : "forward";
  const view = params.get("view") === "history" ? "history" : "current";

  const setup = useQuery({
    queryKey: ["trace-lookups"],
    queryFn: () => ledgerEndpoints.getLookups() as Promise<SetupApiResponse>,
  });

  const labReportDetail = useQuery({
    queryKey: ["trace-selected-lab-report", report],
    queryFn: () => labReportEndpoints.getLabReport(report!),
    enabled: Boolean(report && labResult),
    retry: false,
  });

  const selectedLabSummary = buildSelectedLabSummary(
    report,
    labResult,
    labReportDetail.data,
  );

  const list = useQuery({
    queryKey: ["trace-starts", search, mode, facilityId, locationId, page],
    queryFn: async () =>
      (await ledgerEndpoints.getTraceStarts({
        Mode: mode,
        Search: search,
        FacilityId: facilityId || undefined,
        LocationId: locationId || undefined,
        Page: page,
        PageSize: pageSize,
      })) as { items: TraceStart[]; totalCount: number },
  });

  const labReadyToTrace = Boolean(
    labSelectionKey && runLabKey === labSelectionKey,
  );

  const trace = useQuery({
    queryKey: [
      "ledger-trace",
      lot,
      report,
      labResult,
      direction,
      view,
      runLabKey,
    ],
    enabled: !incompleteLab && Boolean(lot || labReadyToTrace),
    retry: false,
    queryFn: async () => {
      const next = (
        report && labResult
          ? await ledgerEndpoints.traceLotFromLab({
              reportId: report,
              resultId: labResult,
              view,
            })
          : await ledgerEndpoints.traceLot({
              lotId: lot,
              direction,
              view,
            })
      ) as TraceResult;
      if (next.schemaVersion != null && next.schemaVersion !== 2) {
        throw new Error(
          text(
            `Phiên bản lược đồ truy vết không được hỗ trợ (v${next.schemaVersion}).`,
            `Unsupported trace schema version (v${next.schemaVersion}).`,
          ),
        );
      }
      if (!next.complete) {
        throw new Error(
          text(
            "Dữ liệu truy vết chưa đầy đủ (complete=false). Vui lòng thử lại hoặc thu hẹp phạm vi.",
            "Trace response is incomplete (complete=false). Please review scope or retry.",
          ),
        );
      }
      return next;
    },
  });

  const r = trace.data;
  const names = useMemo(
    () => new Map(r?.lots.map((l) => [l.id, l.code])),
    [r?.lots],
  );
  const facilityNames = useMemo(
    () => new Map((setup.data?.facilities ?? []).map((f) => [f.id, f.name])),
    [setup.data?.facilities],
  );
  const locationNames = useMemo(
    () => new Map((setup.data?.locations ?? []).map((l) => [l.id, l.name])),
    [setup.data?.locations],
  );

  const availableLocations = useMemo(() => {
    const all = setup.data?.locations ?? [];
    return facilityId ? all.filter((l) => l.facilityId === facilityId) : all;
  }, [setup.data?.locations, facilityId]);

  const effectiveResidueLotId = useMemo(() => {
    if (
      selectedResidueLotId &&
      r?.lots.some((item) => item.id === selectedResidueLotId)
    ) {
      return selectedResidueLotId;
    }
    return r?.root?.id || lot || r?.lots[0]?.id || "";
  }, [selectedResidueLotId, r?.lots, r?.root?.id, lot]);

  const flowLayout = useMemo(() => {
    if (!r) return null;
    return buildTraceFlowGraph({
      lots: r.lots,
      edges: r.edges,
      operations: r.operations ?? [],
      custodyEvents: r.custodyEvents ?? [],
      loadingEdges: r.loadingEdges ?? [],
      actualContainers: r.actualContainers ?? [],
      rootLotId: r.root?.id || lot,
      facilityNames,
      locationNames,
      locale,
    });
  }, [r, lot, facilityNames, locationNames, locale]);

  const holdSelectableLots = useMemo<HoldSelectableLot[]>(() => {
    if (!r) return [];
    return r.lots.map((item) => ({
      id: item.id,
      code: item.code,
      ownerId: item.ownerId,
      facilityId: item.positions?.[0]?.facilityId ?? null,
      stage: item.stage,
    }));
  }, [r]);

  const refreshing = list.isFetching || trace.isFetching;
  const refreshLabel = text("Làm mới dữ liệu", "Refresh data");
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const selectLot = (id: string) => {
    setRunLabKey(null);
    setSelectedResidueLotId(id);
    setExpandedSourceLotId(null);
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

  const itemsCount = list.data?.items.length ?? 0;
  const totalCount = list.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = itemsCount ? (page - 1) * pageSize + 1 : 0;
  const to = (page - 1) * pageSize + itemsCount;

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
              "Tra cứu mối liên hệ giữa các lô, container thực xếp và nguồn thu mua.",
              "Explore lot relationships, actual container loadings, and procurement sources.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={riskPaths.containerTrace}
            className="rounded-xl border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary hover:bg-surface-raised"
          >
            {text("Truy xuất container", "Trace container")}
          </Link>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <MagnifyingGlass
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
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
                  className={`pe-9 ps-10 placeholder:text-ink-tertiary ${filterField}`}
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
                className={filterField}
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

              <select
                aria-label={text("Cơ sở", "Facility")}
                className={filterField}
                value={facilityId}
                onChange={(e) => {
                  const nextFac = e.target.value;
                  setFacilityId(nextFac);
                  setLocationId("");
                  setPage(1);
                }}
              >
                <option value="">
                  {text("Tất cả cơ sở", "All facilities")}
                </option>
                {(setup.data?.facilities ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                aria-label={text("Silo / Vị trí kho", "Silo / Location")}
                className={`${filterField} sm:col-span-2`}
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {text("Tất cả vị trí / silo", "All silos / locations")}
                </option>
                {availableLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <form
              className="flex flex-wrap gap-2 border-t border-ink-tertiary/10 pt-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                const cleaned = manualLotId.trim();
                if (uuidRegex.test(cleaned)) {
                  selectLot(cleaned);
                }
              }}
            >
              <input
                type="text"
                aria-label={text("Nhập UUID lô thủ công", "Manual lot UUID")}
                placeholder={text(
                  "Hoặc dán UUID lô trực tiếp...",
                  "Or paste a lot UUID directly...",
                )}
                value={manualLotId}
                onChange={(e) => setManualLotId(e.target.value)}
                className={`flex-1 pl-3 pr-3 font-mono ${filterField}`}
              />
              <button
                type="submit"
                disabled={!uuidRegex.test(manualLotId.trim())}
                className="rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-primary hover:bg-surface-overlay disabled:opacity-40"
              >
                {text("Truy vết UUID", "Trace UUID")}
              </button>
            </form>

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
                <Eye
                  size={28}
                  aria-hidden="true"
                  className="mx-auto mb-3 text-ink-tertiary"
                />
                <p className="text-sm font-semibold text-ink-primary">
                  {text("Không có lô phù hợp", "No matching lots")}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {text(
                    "Thử thay đổi từ khóa hoặc bộ lọc lô.",
                    "Try another search or lot scope.",
                  )}
                </p>
              </div>
            ))
          )}

          {totalCount > 0 && (
            <nav
              aria-label={text("Phân trang", "Pagination")}
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary"
            >
              <span>
                {text(
                  `Hiển thị ${from}–${to} trong số ${totalCount}`,
                  `Showing ${from}–${to} of ${totalCount}`,
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1 || list.isFetching}
                  onClick={() => setPage(page - 1)}
                  className={paginationButton}
                >
                  {text("Trước", "Previous")}
                </button>
                <span className="font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || list.isFetching}
                  onClick={() => setPage(page + 1)}
                  className={paginationButton}
                >
                  {text("Sau", "Next")}
                </button>
              </div>
            </nav>
          )}
        </section>

        <div
          ref={resultRegion}
          tabIndex={-1}
          aria-live="polite"
          className="min-w-0 focus:outline-none"
        >
          <Panel title={text("Kết quả truy vết", "Trace result")}>
            {canReadLab && (
              <div className="gl-workflow space-y-2 border-b border-ink-tertiary/15 pb-3">
                <button
                  type="button"
                  onClick={() => setChoosingLab((open) => !open)}
                >
                  {choosingLab
                    ? text("Ẩn chọn kết quả lab", "Hide lab selector")
                    : text("Chọn kết quả xét nghiệm", "Choose lab result")}
                </button>
                {choosingLab && (
                  <TraceLabStart
                    onSelect={(reportId, resultId) => {
                      setRunLabKey(null);
                      setParams(
                        { reportId, resultId, view },
                        { preventScrollReset: true },
                      );
                      setChoosingLab(false);
                    }}
                  />
                )}
              </div>
            )}

            {report && labResult && (
              <div className="rounded-xl border border-accent-primary/25 bg-accent-primary/5 p-3.5 text-xs space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-accent-primary flex items-center gap-1.5">
                      <Flask size={15} />
                      <span>
                        {text(
                          "Điểm bắt đầu từ kết quả kiểm nghiệm lab đã chọn",
                          "Selected laboratory result start point",
                        )}
                      </span>
                    </p>
                    {selectedLabSummary ? (
                      <p className="text-ink-primary">
                        <strong>{selectedLabSummary.reportNumber}</strong> ·{" "}
                        {selectedLabSummary.laboratoryName}
                        {selectedLabSummary.sampleCode
                          ? ` · ${selectedLabSummary.sampleCode}`
                          : ""}
                        {selectedLabSummary.testLabel
                          ? ` · ${selectedLabSummary.testLabel}: ${selectedLabSummary.value}`
                          : ""}
                      </p>
                    ) : (
                      <p className="font-mono text-[11px] text-ink-secondary break-all">
                        Report: {report} · Result: {labResult}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={trace.isFetching}
                      onClick={() => {
                        setRunLabKey(labSelectionKey);
                        if (labReadyToTrace) void trace.refetch();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-primary/90 disabled:opacity-50"
                    >
                      <Play size={14} weight="fill" />
                      <span>
                        {trace.isFetching
                          ? text("Đang truy vết...", "Running trace...")
                          : text("Chạy truy vết", "Run trace")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <select
                aria-label={text("Hướng truy vết", "Trace direction")}
                className={`${filterField} pl-3 w-auto`}
                disabled={Boolean(report && labResult)}
                value={direction}
                onChange={(e) => updateFilter("direction", e.target.value)}
              >
                <option value="forward">{text("Xuôi dòng", "Forward")}</option>
                {canSources && (
                  <option value="backward">
                    {text("Ngược dòng", "Backward")}
                  </option>
                )}
              </select>
              <select
                aria-label={text("Phạm vi thời gian", "View")}
                className={`${filterField} pl-3 w-auto`}
                value={view}
                onChange={(e) => updateFilter("view", e.target.value)}
              >
                <option value="current">{text("Hiện tại", "Current")}</option>
                <option value="history">{text("Lịch sử", "History")}</option>
              </select>
            </div>

            {trace.isEnabled ? (
              <>
                {trace.error && <Feedback error={trace.error} />}
                {trace.isFetching && (
                  <div
                    className={`flex justify-center ${r ? "py-4" : "py-12"}`}
                  >
                    <GrainLoader
                      size={r ? "sm" : "md"}
                      label={
                        r
                          ? text(
                              "Đang cập nhật kết quả truy vết...",
                              "Refreshing trace result...",
                            )
                          : text(
                              "Đang truy vết dòng di chuyển hai chiều...",
                              "Tracing bidirectional lineage...",
                            )
                      }
                    />
                  </div>
                )}
                {r && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 font-semibold ${r.complete ? "bg-functional-balanced-bg text-accent-primary" : "bg-functional-stale-bg text-accent-warning"}`}
                        >
                          {r.complete
                            ? text("Đầy đủ", "Complete")
                            : text(
                                "Dữ liệu truy vết một phần",
                                "Partial trace",
                              )}
                        </span>
                        <span className="rounded-full border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 font-mono text-[11px] text-ink-secondary">
                          Trace ID: {r.traceId}
                        </span>
                        <time dateTime={r.asOf} className="text-ink-secondary">
                          {new Date(r.asOf).toLocaleString()}
                        </time>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {flowLayout && (
                          <div className="inline-flex rounded-xl border border-ink-tertiary/20 bg-surface-base p-0.5">
                            <button
                              type="button"
                              onClick={() => setViewMode("table")}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                viewMode === "table"
                                  ? "bg-accent-primary text-white"
                                  : "text-ink-secondary"
                              }`}
                            >
                              <TableIcon size={13} />
                              <span>{text("Dạng bảng", "Table")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode("flowchart")}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                viewMode === "flowchart"
                                  ? "bg-accent-primary text-white"
                                  : "text-ink-secondary"
                              }`}
                            >
                              <FlowArrow size={13} />
                              <span>{text("Sơ đồ dòng", "Flowchart")}</span>
                            </button>
                          </div>
                        )}
                        {canIssueHold && r.lots.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setHoldModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-danger px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-danger/90"
                          >
                            <ShieldWarning size={14} weight="fill" />
                            <span>
                              {text(
                                "Đặt HOLD kèm chứng cứ",
                                "Place HOLD with evidence",
                              )}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {r.labOrigin && (
                      <p className="text-sm">
                        <Link
                          className="text-accent-primary underline"
                          to={labResultPath(r.labOrigin.reportId)}
                        >
                          {text("Kết quả lab khởi đầu", "Starting lab report")}
                        </Link>
                        {" · "}
                        {r.labOrigin.resultId}
                      </p>
                    )}

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

                    {viewMode === "flowchart" && flowLayout && (
                      <TraceFlowchart
                        layout={flowLayout}
                        selectedLotId={effectiveResidueLotId}
                        onSelectLot={(id) => setSelectedResidueLotId(id)}
                        onSwitchToTable={() => setViewMode("table")}
                      />
                    )}

                    {effectiveResidueLotId && (
                      <div className="space-y-2">
                        {r.lots.length > 1 && (
                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold text-ink-secondary">
                              {text(
                                "Chọn lô trong chuỗi để xem/lưu đánh giá dư lượng",
                                "Select lot in trace to view/save residue bounds",
                              )}
                            </span>
                            <select
                              value={effectiveResidueLotId}
                              onChange={(e) =>
                                setSelectedResidueLotId(e.target.value)
                              }
                              className={`${filterField} pl-3 font-mono`}
                            >
                              {r.lots.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.code} ({item.stage})
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <ResidueBounds
                          key={effectiveResidueLotId}
                          lotId={effectiveResidueLotId}
                        />
                      </div>
                    )}

                    {!!r.actualContainers?.length && (
                      <section className="space-y-2 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5">
                        <h3 className="text-xs font-semibold text-ink-primary">
                          {text(
                            "Container đã thực xếp bị ảnh hưởng",
                            "Affected actual containers",
                          )}
                        </h3>
                        <ul className="space-y-1.5 text-xs">
                          {r.actualContainers.map((container) => (
                            <li
                              key={container.containerId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  className="font-mono font-bold text-accent-primary underline"
                                  to={`${riskPaths.containerTrace}?container=${encodeURIComponent(container.containerId)}`}
                                >
                                  {container.code}
                                </Link>
                                <StatusBadge
                                  status={
                                    container.held || container.restricted
                                      ? "HOLD"
                                      : container.status === "CLOSED"
                                        ? "COMPLIANT"
                                        : "PENDING"
                                  }
                                  label={`${container.status}${container.held || container.restricted ? " · HOLD" : ""}`}
                                  size="sm"
                                />
                              </div>
                              <span className="font-mono text-ink-secondary">
                                {text("Liên kết từ lô nguồn", "Linked loaded")}:{" "}
                                <strong className="text-ink-primary">
                                  {container.linkedLoadedKg} kg
                                </strong>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {!!r.loadingEdges?.length && (
                      <ActualLoading
                        names={names}
                        edges={r.loadingEdges}
                        containers={r.actualContainers}
                        locations={locationNames}
                        tracedLotId={r.root?.id || lot}
                      />
                    )}

                    {!!r.corrections?.length && (
                      <details className="rounded-xl border border-ink-tertiary/20 p-3 text-xs">
                        <summary className="cursor-pointer font-semibold">
                          {text(
                            "Tham chiếu điều chỉnh sổ cái",
                            "Ledger correction references",
                          )}
                        </summary>
                        <ul className="mt-2 space-y-1">
                          {r.corrections.map((row) => (
                            <li key={row.id} className="break-all font-mono">
                              {row.status} · {row.originalOperationId} →{" "}
                              {row.replacementOperationId ?? "—"}
                            </li>
                          ))}
                        </ul>
                      </details>
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
                              {text("Mã lô", "Lot code")}
                            </th>
                            <th scope="col" className={tableCell}>
                              {text("Công đoạn", "Stage")}
                            </th>
                            <th
                              scope="col"
                              className={`${tableCell} text-right`}
                            >
                              {text(
                                "Sản lượng / Vật lý / Khả dụng (kg)",
                                "Produced / Physical / Available (kg)",
                              )}
                            </th>
                            <th scope="col" className={tableCell}>
                              {text(
                                "Hạn chế & Vị trí",
                                "Restrictions & Positions",
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-tertiary/10">
                          {r.lots.map((item) => {
                            const isInspected =
                              item.id === effectiveResidueLotId;
                            const physicalSum =
                              item.quantityKg ??
                              (item.positions?.length
                                ? item.positions
                                    .reduce(
                                      (acc, pos) =>
                                        acc.plus(pos.quantityKg || "0"),
                                      new Decimal(0),
                                    )
                                    .toFixed()
                                : undefined);
                            const availableSum =
                              item.availableKg ??
                              (item.positions?.some(
                                (p) => p.availableKg != null,
                              )
                                ? item.positions
                                    .reduce(
                                      (acc, pos) =>
                                        acc.plus(pos.availableKg || "0"),
                                      new Decimal(0),
                                    )
                                    .toFixed()
                                : undefined);
                            const directHold = Boolean(
                              item.directHoldIds?.length,
                            );
                            const inheritedHold = Boolean(
                              item.effectiveHoldIds?.length && !directHold,
                            );

                            return (
                              <tr
                                key={item.id}
                                className={`${tableRow} ${isInspected ? "bg-accent-primary/5" : ""}`}
                              >
                                <th
                                  scope="row"
                                  className={`${tableCell} font-mono font-semibold`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedResidueLotId(item.id)
                                    }
                                    className="text-left text-accent-primary hover:underline"
                                  >
                                    {item.code}
                                  </button>
                                </th>
                                <td className={tableCell}>{item.stage}</td>
                                <td
                                  className={`${tableCell} text-right font-mono tabular-nums`}
                                >
                                  <div>{item.producedKg} kg</div>
                                  {(physicalSum || availableSum) && (
                                    <div className="text-[11px] text-ink-secondary">
                                      {physicalSum ?? "—"} /{" "}
                                      {availableSum ?? "—"} kg
                                    </div>
                                  )}
                                </td>
                                <td className={tableCell}>
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                      {directHold && (
                                        <StatusBadge
                                          status="HOLD"
                                          label={text(
                                            "HOLD trực tiếp",
                                            "Direct HOLD",
                                          )}
                                          size="sm"
                                        />
                                      )}
                                      {inheritedHold && (
                                        <StatusBadge
                                          status="STALE"
                                          label={text(
                                            "HOLD kế thừa",
                                            "Inherited HOLD",
                                          )}
                                          size="sm"
                                        />
                                      )}
                                      {item.restrictions?.length ? (
                                        <span>
                                          {item.restrictions.join(", ")}
                                        </span>
                                      ) : !directHold && !inheritedHold ? (
                                        <span>—</span>
                                      ) : null}
                                    </div>
                                    {!!item.positions?.length && (
                                      <ul className="space-y-0.5 text-[11px] text-ink-secondary">
                                        {item.positions.map((pos, idx) => (
                                          <li key={`${pos.locationId}:${idx}`}>
                                            {pos.locationName ??
                                              locationNames.get(
                                                pos.locationId,
                                              ) ??
                                              pos.locationId}
                                            : {pos.quantityKg} kg
                                            {pos.availableKg != null
                                              ? ` (${text("khả dụng", "avail")}: ${pos.availableKg} kg)`
                                              : ""}
                                            {pos.poolRevision
                                              ? ` · rev ${pos.poolRevision}`
                                              : ""}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
                                {traceRelationLabel(edge.relationType, locale)}{" "}
                                · {edge.inputConsumedKg} /{" "}
                                {edge.outputProducedKg} kg
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
                                    {item.contributions.map((c) => (
                                      <tr
                                        key={c.sourceLotId}
                                        className={tableRow}
                                      >
                                        <th
                                          scope="row"
                                          className={`${tableCell} font-mono font-semibold`}
                                        >
                                          {names.get(c.sourceLotId) ??
                                            c.sourceLotId}
                                        </th>
                                        <td
                                          className={`${tableCell} text-right font-mono tabular-nums`}
                                        >
                                          {c.quantityKg}
                                        </td>
                                        <td
                                          className={`${tableCell} text-right font-mono tabular-nums`}
                                        >
                                          {c.percentage ?? "—"}
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
                          {r.sources.map(({ lotId, provenance }) => {
                            const evidenceOpen = expandedSourceLotId === lotId;
                            return (
                              <li
                                key={lotId}
                                className="space-y-1.5 px-3 py-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="break-all font-mono font-semibold">
                                    {names.get(lotId) ?? lotId}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSourceLotId(
                                        evidenceOpen ? null : lotId,
                                      )
                                    }
                                    className="text-xs font-semibold text-accent-primary hover:underline"
                                  >
                                    {evidenceOpen
                                      ? text(
                                          "Ẩn chứng cứ mẫu & lab",
                                          "Hide sample & lab evidence",
                                        )
                                      : text(
                                          "Xem chứng cứ nguồn (mẫu & lab)",
                                          "View source evidence",
                                        )}
                                  </button>
                                </div>
                                {provenance && (
                                  <details className="mt-1 text-xs">
                                    <summary className="cursor-pointer font-medium">
                                      {text(
                                        "Chi tiết nguồn gốc",
                                        "Provenance details",
                                      )}
                                    </summary>
                                    <div className="mt-1.5 space-y-1 text-ink-secondary">
                                      <p className="break-all">
                                        {text("Thu mua", "Procurement")} ·{" "}
                                        {canOpenReceipt &&
                                        provenance.procurementId ? (
                                          <Link
                                            className="text-accent-primary underline"
                                            to={receiptPath(
                                              provenance.procurementId,
                                            )}
                                          >
                                            {provenance.procurementCode}
                                          </Link>
                                        ) : (
                                          provenance.procurementCode
                                        )}{" "}
                                        · {provenance.procurementItemId}
                                      </p>
                                      <p className="break-all">
                                        {text(
                                          "Nông hộ / thửa / mùa vụ",
                                          "Farmer / plot / season",
                                        )}{" "}
                                        · {provenance.farmerId} ·{" "}
                                        {provenance.plotId} ·{" "}
                                        {provenance.seasonId}
                                      </p>
                                      <p>
                                        {provenance.riceVariety} ·{" "}
                                        {provenance.originalValue}{" "}
                                        {provenance.originalUnit} ·{" "}
                                        {provenance.expectedKg} kg
                                      </p>
                                      {canOpenReceipt &&
                                        provenance.sourceRecordId && (
                                          <Link
                                            className="text-accent-primary underline"
                                            to={sourceLotPath(
                                              provenance.sourceRecordId,
                                            )}
                                          >
                                            {text(
                                              "Mở lô nguồn và mẫu",
                                              "Open source lot and samples",
                                            )}
                                          </Link>
                                        )}
                                    </div>
                                  </details>
                                )}
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
                                {evidenceOpen && (
                                  <TraceSourceEvidence
                                    sourceLotId={lotId}
                                    sourceLotCode={names.get(lotId)}
                                    onTraceFromLab={(rId, resId) => {
                                      setRunLabKey(null);
                                      setParams(
                                        {
                                          reportId: rId,
                                          resultId: resId,
                                          view,
                                        },
                                        { preventScrollReset: true },
                                      );
                                    }}
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}

                    <PlaceHoldModal
                      isOpen={holdModalOpen}
                      onClose={() => setHoldModalOpen(false)}
                      onSuccess={async () => {
                        await trace.refetch();
                      }}
                      traceId={r.traceId}
                      selectableLots={holdSelectableLots}
                      initialLot={
                        holdSelectableLots.find(
                          (item) => item.id === effectiveResidueLotId,
                        ) ??
                        holdSelectableLots[0] ??
                        null
                      }
                    />
                  </div>
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
                  {report && labResult
                    ? text(
                        "Nhấn nút Chạy truy vết ở trên để xem dòng di chuyển từ kết quả kiểm nghiệm.",
                        "Click Run trace above to trace forward from the selected laboratory result.",
                      )
                    : text(
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
