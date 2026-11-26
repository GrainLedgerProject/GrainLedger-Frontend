import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowsClockwise,
  CaretLeft,
  CaretRight,
  Cube,
  Flask,
  FlowArrow,
  GitBranch,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  Package,
  Scales,
  ShieldWarning,
  Table as TableIcon,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  containerExecutionEndpoints,
  type ContainerTrace,
} from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { ExportTable } from "@/features/export/components/ExportWorkspaceUI";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Decimal } from "@/shared/utils/decimalMass";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";
import {
  buildTraceFlowGraph,
  traceLotOrder,
  traceRelationLabel,
} from "../model/traceFlow";
import { ActualLoading, ContainerLotFlow } from "../components/ActualLoading";
import {
  PlaceHoldModal,
  type HoldSelectableLot,
} from "../components/PlaceHoldModal";
import { ResidueBounds } from "../components/ResidueBounds";
import { TraceFlowchart } from "../components/TraceFlowchart";
import { TraceSourceEvidence } from "../components/TraceSourceEvidence";

const uuidPattern = "[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";
const containerIdPattern = new RegExp(`^${uuidPattern}$`);
const ancestryPageSize = 10;

export function ContainerTracePage() {
  const text = useWorkflowText();
  const locale: "vi" | "en" = text("vi", "en") === "en" ? "en" : "vi";
  const [params, setParams] = useSearchParams();
  const containerId = params.get("container") ?? "";
  const user = useAuthStore((state) => state.user);
  const allowed = user?.permissions.some(
    (p) => p === "trace.read.tenant" || p === "trace.read.all",
  );
  const canPlaceHold = Boolean(
    user?.role === "CUSTOMER_MANAGER" &&
      user.permissions.includes("holds.manage"),
  );

  const [input, setInput] = useState(containerId);
  const [viewMode, setViewMode] = useState<"table" | "flowchart">("table");
  const [ancestryLotsPage, setAncestryLotsPage] = useState(1);
  const [ancestryEdgesPage, setAncestryEdgesPage] = useState(1);
  const [selectedResidueLotId, setSelectedResidueLotId] = useState<string>("");
  const [expandedSourceLotId, setExpandedSourceLotId] = useState<string | null>(
    null,
  );
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const setup = useQuery({
    queryKey: ["trace-container-lookups"],
    queryFn: () => ledgerEndpoints.getLookups() as Promise<SetupApiResponse>,
    enabled: Boolean(allowed),
  });

  const trace = useQuery({
    queryKey: ["actual-container-trace", user?.id, containerId],
    queryFn: async () => {
      const next: ContainerTrace =
        await containerExecutionEndpoints.trace(containerId);
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
            `Truy vết container chưa hoàn tất (${next.findings?.join(", ") || "complete=false"}).`,
            `Container trace is incomplete (${next.findings?.join(", ") || "complete=false"}).`,
          ),
        );
      }
      return next;
    },
    enabled: Boolean(allowed && containerIdPattern.test(containerId)),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const record = trace.data;

  const facilityNames = useMemo(
    () => new Map((setup.data?.facilities ?? []).map((f) => [f.id, f.name])),
    [setup.data?.facilities],
  );
  const locationNames = useMemo(
    () => new Map((setup.data?.locations ?? []).map((l) => [l.id, l.name])),
    [setup.data?.locations],
  );

  const lots = useMemo(
    () => new Map(record?.graph?.lots.map((lot) => [lot.id, lot.code])),
    [record?.graph?.lots],
  );

  const orderedAncestryLots = useMemo(
    () =>
      record?.graph?.lots
        ? traceLotOrder(record.graph.lots, record.graph.edges ?? [])
        : [],
    [record],
  );

  const heldLotCount = useMemo(
    () =>
      orderedAncestryLots.filter(
        (lot) =>
          Boolean(lot.restrictions?.length) ||
          Boolean(lot.directHoldIds?.length) ||
          Boolean(lot.effectiveHoldIds?.length),
      ).length,
    [orderedAncestryLots],
  );

  const plotTotals = useMemo(() => {
    if (!record) return [];
    const totalLoaded = new Decimal(record.loadedKg || "0");
    const groups = new Map<
      string,
      {
        plotKey: string;
        plotLabel: string;
        procurementCodes: Set<string>;
        varieties: Set<string>;
        farmerNames: Set<string>;
        sourceLotIds: string[];
        mass: Decimal;
      }
    >();

    for (const src of record.sourceContributions) {
      const prov = src.provenance;
      const plotCode = prov?.currentReferenceLabels?.plotCode;
      const plotKey = prov?.plotId ?? plotCode ?? "__UNSPECIFIED__";
      const plotLabel =
        plotCode && prov?.plotId
          ? `${plotCode} (${prov.plotId.slice(0, 8)})`
          : (plotCode ??
            prov?.plotId ??
            text("Chưa gán thửa ruộng", "Unspecified plot"));
      const entry = groups.get(plotKey) ?? {
        plotKey,
        plotLabel,
        procurementCodes: new Set<string>(),
        varieties: new Set<string>(),
        farmerNames: new Set<string>(),
        sourceLotIds: [],
        mass: new Decimal(0),
      };
      if (prov?.procurementCode)
        entry.procurementCodes.add(prov.procurementCode);
      if (prov?.riceVariety) entry.varieties.add(prov.riceVariety);
      if (prov?.currentReferenceLabels?.farmerName) {
        entry.farmerNames.add(prov.currentReferenceLabels.farmerName);
      }
      entry.sourceLotIds.push(src.sourceLotId);
      entry.mass = entry.mass.plus(src.quantityKg || "0");
      groups.set(plotKey, entry);
    }

    return Array.from(groups.values())
      .map((item) => ({
        ...item,
        totalKg: item.mass.toDecimalPlaces(6).toFixed(),
        percentage: totalLoaded.gt(0)
          ? item.mass.div(totalLoaded).times(100).toDecimalPlaces(2).toFixed()
          : "0.00",
      }))
      .sort((a, b) => new Decimal(b.totalKg).cmp(a.totalKg));
  }, [record, text]);

  const flowLayout = useMemo(() => {
    if (!record?.graph) return null;
    return buildTraceFlowGraph({
      lots: record.graph.lots,
      edges: record.graph.edges ?? [],
      operations: record.graph.operations ?? [],
      custodyEvents: record.graph.custodyEvents ?? [],
      loadingEdges: record.graph.loadingEdges ?? [],
      focusContainerId: containerId,
      containerLabel: input || containerId,
      facilityNames,
      locationNames,
      locale,
    });
  }, [record, containerId, input, facilityNames, locationNames, locale]);

  const holdSelectableLots = useMemo<HoldSelectableLot[]>(() => {
    if (!record) return [];
    const seen = new Set<string>();
    const items: HoldSelectableLot[] = [];
    for (const lot of orderedAncestryLots) {
      if (!seen.has(lot.id)) {
        seen.add(lot.id);
        items.push({
          id: lot.id,
          code: lot.code,
          ownerId: lot.ownerId,
          stage: lot.stage,
        });
      }
    }
    for (const src of record.sourceContributions) {
      if (!seen.has(src.sourceLotId)) {
        seen.add(src.sourceLotId);
        items.push({
          id: src.sourceLotId,
          code: lots.get(src.sourceLotId) ?? src.sourceLotId,
        });
      }
    }
    return items;
  }, [record, orderedAncestryLots, lots]);

  const allResidueLotIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedResidueLotId) ids.add(selectedResidueLotId);
    for (const edge of record?.graph?.loadingEdges ?? []) ids.add(edge.lotId);
    for (const lot of orderedAncestryLots) ids.add(lot.id);
    for (const src of record?.sourceContributions ?? [])
      ids.add(src.sourceLotId);
    return Array.from(ids);
  }, [selectedResidueLotId, record, orderedAncestryLots]);

  const ancestryLotsTotalPages = Math.max(
    1,
    Math.ceil(orderedAncestryLots.length / ancestryPageSize),
  );
  const currentLotsPage = Math.min(ancestryLotsPage, ancestryLotsTotalPages);
  const visibleAncestryLots = orderedAncestryLots.slice(
    (currentLotsPage - 1) * ancestryPageSize,
    currentLotsPage * ancestryPageSize,
  );

  const ancestryEdges = record?.graph?.edges ?? [];
  const ancestryEdgesTotalPages = Math.max(
    1,
    Math.ceil(ancestryEdges.length / ancestryPageSize),
  );
  const currentEdgesPage = Math.min(ancestryEdgesPage, ancestryEdgesTotalPages);
  const visibleAncestryEdges = ancestryEdges.slice(
    (currentEdgesPage - 1) * ancestryPageSize,
    currentEdgesPage * ancestryPageSize,
  );

  const isValidParam = Boolean(containerId && containerIdPattern.test(containerId));
  const refreshing = trace.isFetching || setup.isFetching;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("TRUY VẾT PHẢ HỆ & ĐÓNG GÓP NGUỒN", "PROVENANCE & CONTRIBUTION TRACE")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text("Truy xuất nguồn container", "Container source trace")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {text(
              "Truy ngược khối lượng thực xếp của container về các lô nguồn, thửa ruộng thu mua, chứng từ lab và ngưỡng dư lượng.",
              "Trace a container's actual loaded mass back to source lots, procurement plots, lab evidence, and residue bounds.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={riskPaths.traceback}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <GitBranch size={15} aria-hidden="true" />
            <span>{text("Truy xuất lô hàng", "Trace lots")}</span>
          </Link>
          <Link
            to={riskPaths.holds}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ShieldWarning size={15} aria-hidden="true" />
            <span>{text("Quản lý HOLD", "HOLD management")}</span>
          </Link>
          {allowed && isValidParam && (
            <button
              type="button"
              onClick={() => {
                void setup.refetch();
                void trace.refetch();
              }}
              disabled={refreshing}
              aria-label={text("Tải lại truy vết container", "Reload container trace")}
              title={text("Tải lại truy vết container", "Reload container trace")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise
                size={16}
                aria-hidden="true"
                className={refreshing ? "motion-safe:animate-spin text-accent-primary" : undefined}
              />
            </button>
          )}
        </div>
      </header>

      {!allowed ? (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Giới hạn quyền truy xuất", "Trace access restricted")}
              </h2>
              <p role="status" className="text-sm text-ink-secondary">
                {text(
                  "Tài khoản cần quyền truy xuất theo phạm vi dữ liệu.",
                  "Trace access is required for this data scope.",
                )}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="record-card">
            <div className="record-card-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="record-icon-tile" aria-hidden="true">
                  <Cube size={20} weight="bold" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {text("Chọn container", "Select a container")}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {text(
                      "Nhập UUID container cần kiểm tra phả hệ nguồn gốc và chứng cứ thực xếp.",
                      "Enter a container UUID to inspect source lineage and actual loading evidence.",
                    )}
                  </p>
                </div>
              </div>
              <StatusBadge
                status={record ? "COMPLIANT" : trace.isFetching ? "IN_PROGRESS" : "STALE"}
                size="sm"
                label={
                  record
                    ? text("Đã truy vết", "Traced")
                    : trace.isFetching
                      ? text("Đang truy vết", "Tracing")
                      : text("Chờ tra cứu", "Ready to trace")
                }
              />
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <form
                className="record-form grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAncestryLotsPage(1);
                  setAncestryEdgesPage(1);
                  if (input.trim() === containerId) void trace.refetch();
                  else setParams({ container: input.trim() });
                }}
              >
                <label>
                  <span>{text("Định danh container (UUID)", "Container ID (UUID)")}</span>
                  <div className="relative">
                    <MagnifyingGlass
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                    />
                    <input
                      required
                      pattern={uuidPattern}
                      value={input}
                      placeholder="11111111-1111-4111-8111-111111111111"
                      onChange={(event) => setInput(event.target.value)}
                      className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-10 font-mono placeholder:text-ink-tertiary dark:bg-surface-overlay"
                    />
                    {input && (
                      <button
                        type="button"
                        aria-label={text("Xóa mã container", "Clear container ID")}
                        onClick={() => setInput("")}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={trace.isFetching}
                  className="record-button record-primary min-h-12 rounded-full px-6"
                >
                  <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
                  <span>{trace.isFetching ? text("Đang truy xuất...", "Tracing...") : text("Truy xuất", "Trace")}</span>
                </button>
              </form>

              {containerId && !containerIdPattern.test(containerId) && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg px-3.5 py-2.5 text-xs text-accent-danger"
                >
                  <WarningCircle size={16} weight="fill" className="shrink-0" aria-hidden="true" />
                  <span>{text("Định danh container không hợp lệ.", "The container ID is invalid.")}</span>
                </div>
              )}
            </div>
          </section>

          {trace.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
            >
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                <Feedback error={trace.error} />
              </div>
            </div>
          )}

          {trace.isFetching && !record && (
            <div className="flex justify-center py-14">
              <GrainLoader
                label={text(
                  "Đang truy vết phả hệ và đóng góp nguồn container...",
                  "Tracing container lineage and source contributions...",
                )}
              />
            </div>
          )}

          {record && (
            <div className="space-y-6">
              {/* Summary KPI cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Khối lượng thực xếp", "Actual loaded mass")}</span>
                    <Scales size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">
                    <span className="font-mono">{record.loadedKg}</span>{" "}
                    <span className="text-sm font-semibold text-ink-secondary">kg</span>
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text("Tổng khối lượng thực xếp ghi nhận", "Recorded actual loaded weight")}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Thửa ruộng nguồn", "Source plots")}</span>
                    <MapPin size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">{plotTotals.length}</div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text(`${record.sourceContributions.length} lô nguồn đóng góp`, `${record.sourceContributions.length} contributing source lots`)}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Lô trong phả hệ", "Ancestry lots")}</span>
                    <GitBranch size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">{orderedAncestryLots.length}</div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text(`${ancestryEdges.length} liên kết chuyển hóa`, `${ancestryEdges.length} material edges`)}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Lệnh HOLD liên quan", "Active HOLD scope")}</span>
                    <ShieldWarning
                      size={16}
                      className={heldLotCount > 0 ? "text-accent-danger" : "text-accent-primary"}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="font-display text-2xl font-bold text-ink-primary">{heldLotCount}</span>
                    <StatusBadge
                      status={heldLotCount > 0 ? "HOLD" : "COMPLIANT"}
                      size="sm"
                      label={heldLotCount > 0 ? text("Có lô HOLD", "Has HOLD") : text("An toàn", "Clear")}
                    />
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {heldLotCount > 0
                      ? text("Kiểm tra bảng lô tổ tiên bên dưới", "Review held lots in ancestry table")
                      : text("Không phát hiện lô bị HOLD", "No held lots in lineage")}
                  </p>
                </div>
              </div>

              {/* Main Trace Overview & Action Toolbar Card */}
              <section className="record-card">
                <div className="record-card-header">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="record-icon-tile" aria-hidden="true">
                      <Package size={20} weight="bold" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-bold text-ink-primary">
                        {text("Nguồn từ khối lượng thực xếp", "Sources from actual loading")}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                        {record.traceId && (
                          <span className="rounded-full border border-ink-tertiary/20 bg-surface-raised px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-primary dark:bg-surface-overlay">
                            Trace ID: {record.traceId}
                          </span>
                        )}
                        {record.asOf && (
                          <span>
                            {text("Tại thời điểm:", "As of:")} {new Date(record.asOf).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {flowLayout && (
                      <div
                        role="tablist"
                        aria-label={text("Chế độ hiển thị truy vết", "Trace display mode")}
                        className="inline-flex rounded-full border border-ink-tertiary/20 bg-surface-raised p-1 dark:bg-surface-overlay"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "table"}
                          onClick={() => setViewMode("table")}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            viewMode === "table"
                              ? "bg-accent-primary text-white shadow-xs"
                              : "text-ink-secondary hover:text-ink-primary"
                          }`}
                        >
                          <TableIcon size={14} aria-hidden="true" />
                          <span>{text("Dạng bảng", "Table")}</span>
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "flowchart"}
                          onClick={() => setViewMode("flowchart")}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            viewMode === "flowchart"
                              ? "bg-accent-primary text-white shadow-xs"
                              : "text-ink-secondary hover:text-ink-primary"
                          }`}
                        >
                          <FlowArrow size={14} aria-hidden="true" />
                          <span>{text("Sơ đồ dòng", "Flowchart")}</span>
                        </button>
                      </div>
                    )}

                    {canPlaceHold && (
                      <button
                        type="button"
                        onClick={() => setHoldModalOpen(true)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-danger px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-danger/90"
                      >
                        <ShieldWarning size={15} weight="fill" aria-hidden="true" />
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

                <div className="space-y-5 p-4 sm:p-5">
                  {viewMode === "flowchart" && flowLayout && (
                    <TraceFlowchart
                      layout={flowLayout}
                      selectedLotId={selectedResidueLotId || undefined}
                      onSelectLot={(lotId) => setSelectedResidueLotId(lotId)}
                      onSwitchToTable={() => setViewMode("table")}
                    />
                  )}

                  {/* Plot-level totals summary */}
                  {plotTotals.length > 0 && (
                    <div className="space-y-2">
                      <ExportTable
                        caption={text(
                          "Tổng hợp đóng góp theo thửa ruộng",
                          "Plot-level contributions",
                        )}
                        columns={[
                          text("Thửa ruộng", "Plot"),
                          text(
                            "Nông hộ / Phiếu thu mua / Giống",
                            "Farmer / Receipt / Variety",
                          ),
                          text("Số lô nguồn", "Source lots"),
                          text("Tổng khối lượng (kg)", "Total mass (kg)"),
                          text("Tỷ lệ (%)", "Share (%)"),
                        ]}
                      >
                        {plotTotals.map((plot) => (
                          <tr key={plot.plotKey}>
                            <th
                              scope="row"
                              className="font-mono text-xs font-semibold text-ink-primary"
                            >
                              {plot.plotLabel}
                            </th>
                            <td className="text-xs text-ink-secondary">
                              {[
                                ...plot.farmerNames,
                                ...plot.procurementCodes,
                                ...plot.varieties,
                              ].join(" · ") || "—"}
                            </td>
                            <td className="font-mono text-xs">{plot.sourceLotIds.length}</td>
                            <td className="font-mono text-xs font-semibold text-ink-primary">
                              {plot.totalKg}
                            </td>
                            <td className="font-mono text-xs font-semibold text-accent-primary">
                              {plot.percentage}%
                            </td>
                          </tr>
                        ))}
                      </ExportTable>
                    </div>
                  )}

                  {/* Per source lot contributions */}
                  <div className="space-y-3">
                    <ExportTable
                      caption={text(
                        "Đóng góp theo từng lô nguồn vào container",
                        "Container source lot contributions",
                      )}
                      columns={[
                        text("Lô nguồn", "Source lot"),
                        text("Thực xếp (kg)", "Loaded mass (kg)"),
                        text("Tỷ lệ (%)", "Share (%)"),
                        text("Phiếu thu mua / Thửa ruộng", "Receipt / Plot"),
                        text("Chứng cứ nguồn", "Source evidence"),
                      ]}
                    >
                      {record.sourceContributions.map((source) => {
                        const isOpen = expandedSourceLotId === source.sourceLotId;
                        return (
                          <tr key={source.sourceLotId}>
                            <td className="font-mono text-xs font-semibold text-ink-primary">
                              {lots.get(source.sourceLotId) || source.sourceLotId}
                            </td>
                            <td className="font-mono text-xs">{source.quantityKg}</td>
                            <td className="font-mono text-xs font-semibold text-accent-primary">
                              {source.percentage ? `${source.percentage}%` : "—"}
                            </td>
                            <td className="text-xs text-ink-secondary">
                              {[
                                source.provenance?.procurementCode,
                                source.provenance?.currentReferenceLabels
                                  ?.plotCode ?? source.provenance?.plotId,
                                source.provenance?.riceVariety,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                source.status ||
                                "—"}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSourceLotId(
                                    isOpen ? null : source.sourceLotId,
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                  isOpen
                                    ? "border-accent-primary bg-accent-primary text-white"
                                    : "border-ink-tertiary/20 bg-surface-raised text-accent-primary hover:border-accent-primary/40 hover:bg-surface-overlay"
                                }`}
                              >
                                <Flask size={13} aria-hidden="true" />
                                <span>
                                  {isOpen
                                    ? text("Ẩn chứng cứ", "Hide evidence")
                                    : text("Mẫu & kết quả lab", "Samples & lab")}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </ExportTable>

                    {expandedSourceLotId && (
                      <TraceSourceEvidence
                        sourceLotId={expandedSourceLotId}
                        sourceLotCode={lots.get(expandedSourceLotId)}
                      />
                    )}
                  </div>
                </div>
              </section>

              {!!record.graph?.lots.length && (
                <ContainerLotFlow
                  key={containerId}
                  names={lots}
                  edges={record.graph.edges}
                  loading={record.graph.loadingEdges ?? []}
                />
              )}

              {!!record.graph?.loadingEdges?.length && (
                <ActualLoading
                  edges={record.graph.loadingEdges}
                  names={lots}
                  locations={locationNames}
                  containers={[
                    {
                      containerId,
                      code: input || containerId,
                      linkedLoadedKg: record.loadedKg,
                    },
                  ]}
                />
              )}

              {allResidueLotIds.length > 0 && (
                <LoadedLotResidue
                  key={`${containerId}:${selectedResidueLotId}`}
                  lots={lots}
                  lotIds={allResidueLotIds}
                  selectedId={selectedResidueLotId}
                  onSelect={setSelectedResidueLotId}
                />
              )}

              {/* Paginated Historical Ancestry Lots */}
              {orderedAncestryLots.length > 0 && (
                <section className="record-card">
                  <div className="record-card-header">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="record-icon-tile" aria-hidden="true">
                        <GitBranch size={20} weight="bold" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-ink-primary">
                          {text(
                            "Danh sách lô tổ tiên lịch sử",
                            "Historical ancestry lots",
                          )}
                        </h3>
                        <StatusBadge
                          status="ACTIVE"
                          size="sm"
                          label={`${orderedAncestryLots.length}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <button
                        type="button"
                        aria-label={text("Trang trước lô tổ tiên", "Previous ancestry lots page")}
                        disabled={currentLotsPage <= 1}
                        onClick={() => setAncestryLotsPage(currentLotsPage - 1)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                      >
                        <CaretLeft size={13} aria-hidden="true" />
                        <span>{text("Trước", "Prev")}</span>
                      </button>
                      <span className="font-mono font-semibold text-ink-primary">
                        {currentLotsPage} / {ancestryLotsTotalPages}
                      </span>
                      <button
                        type="button"
                        aria-label={text("Trang sau lô tổ tiên", "Next ancestry lots page")}
                        disabled={currentLotsPage >= ancestryLotsTotalPages}
                        onClick={() => setAncestryLotsPage(currentLotsPage + 1)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                      >
                        <span>{text("Sau", "Next")}</span>
                        <CaretRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <ExportTable
                      caption={text(
                        "Các lô trong phả hệ container",
                        "Container ancestry lots",
                      )}
                      columns={[
                        text("Mã lô", "Lot code"),
                        text("Công đoạn", "Stage"),
                        text("Sản lượng (kg)", "Produced (kg)"),
                        text("Tồn / Khả dụng (kg)", "Physical / Available (kg)"),
                        text("Trạng thái HOLD", "HOLD status"),
                      ]}
                    >
                      {visibleAncestryLots.map((lot) => {
                        const held =
                          Boolean(lot.restrictions?.length) ||
                          Boolean(lot.directHoldIds?.length) ||
                          Boolean(lot.effectiveHoldIds?.length);
                        return (
                          <tr key={lot.id}>
                            <th
                              scope="row"
                              className="font-mono text-xs font-semibold"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedResidueLotId(lot.id)}
                                className="text-accent-primary hover:underline"
                              >
                                {lot.code}
                              </button>
                            </th>
                            <td className="text-xs">{lot.stage ?? "—"}</td>
                            <td className="font-mono text-xs">{lot.producedKg}</td>
                            <td className="font-mono text-xs">
                              {lot.quantityKg ?? "—"} / {lot.availableKg ?? "—"}
                            </td>
                            <td>
                              {held ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <StatusBadge
                                    status="HOLD"
                                    label={
                                      lot.restrictions?.join(", ") ||
                                      (lot.directHoldIds?.length
                                        ? text("HOLD trực tiếp", "Direct HOLD")
                                        : text("HOLD kế thừa", "Inherited HOLD"))
                                    }
                                    size="sm"
                                  />
                                  <Link
                                    to={`${riskPaths.traceback}?lotId=${encodeURIComponent(lot.id)}&direction=forward`}
                                    className="text-[11px] font-semibold text-accent-primary hover:underline"
                                  >
                                    {text("Mở lô →", "Open lot →")}
                                  </Link>
                                </div>
                              ) : (
                                <span className="text-xs text-ink-tertiary">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </ExportTable>
                  </div>
                </section>
              )}

              {/* Paginated Historical Material Relationships */}
              {ancestryEdges.length > 0 && (
                <section className="record-card">
                  <div className="record-card-header">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="record-icon-tile" aria-hidden="true">
                        <FlowArrow size={20} weight="bold" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-ink-primary">
                          {text(
                            "Liên kết vật tư lịch sử giữa các lô",
                            "Historical material relationships",
                          )}
                        </h3>
                        <StatusBadge
                          status="ACTIVE"
                          size="sm"
                          label={`${ancestryEdges.length}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-ink-secondary">
                      <button
                        type="button"
                        aria-label={text("Trang trước liên kết vật tư", "Previous material edges page")}
                        disabled={currentEdgesPage <= 1}
                        onClick={() => setAncestryEdgesPage(currentEdgesPage - 1)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                      >
                        <CaretLeft size={13} aria-hidden="true" />
                        <span>{text("Trước", "Prev")}</span>
                      </button>
                      <span className="font-mono font-semibold text-ink-primary">
                        {currentEdgesPage} / {ancestryEdgesTotalPages}
                      </span>
                      <button
                        type="button"
                        aria-label={text("Trang sau liên kết vật tư", "Next material edges page")}
                        disabled={currentEdgesPage >= ancestryEdgesTotalPages}
                        onClick={() => setAncestryEdgesPage(currentEdgesPage + 1)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-overlay"
                      >
                        <span>{text("Sau", "Next")}</span>
                        <CaretRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <ExportTable
                      caption={text(
                        "Quan hệ nguồn gốc",
                        "Ancestry relationships",
                      )}
                      columns={[
                        text("Lô đầu vào", "Input lot"),
                        text("Loại nghiệp vụ", "Relation"),
                        text("Lô đầu ra", "Output lot"),
                        text("Đầu vào (kg)", "Input (kg)"),
                        text("Đầu ra (kg)", "Output (kg)"),
                      ]}
                    >
                      {visibleAncestryEdges.map((edge, index) => (
                        <tr
                          key={`${edge.inputLotId}:${edge.outputLotId}:${index}`}
                        >
                          <td className="font-mono text-xs font-semibold text-ink-primary">
                            {lots.get(edge.inputLotId) || edge.inputLotId}
                          </td>
                          <td className="text-xs">
                            <span className="inline-flex items-center rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-ink-secondary dark:bg-surface-overlay">
                              {traceRelationLabel(edge.kind, locale)}
                            </span>
                          </td>
                          <td className="font-mono text-xs font-semibold text-accent-primary">
                            {lots.get(edge.outputLotId) || edge.outputLotId}
                          </td>
                          <td className="font-mono text-xs">{edge.inputConsumedKg}</td>
                          <td className="font-mono text-xs">
                            {edge.outputProducedKg || "—"}
                          </td>
                        </tr>
                      ))}
                    </ExportTable>
                  </div>
                </section>
              )}

              <PlaceHoldModal
                isOpen={holdModalOpen}
                onClose={() => setHoldModalOpen(false)}
                onSuccess={async () => {
                  await trace.refetch();
                }}
                traceId={record.traceId}
                selectableLots={holdSelectableLots}
                initialLot={
                  holdSelectableLots.find(
                    (l) => l.id === selectedResidueLotId,
                  ) ??
                  holdSelectableLots[0] ??
                  null
                }
                containerContext={{
                  containerId,
                  containerCode: input || containerId,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadedLotResidue({
  lots,
  lotIds,
  selectedId,
  onSelect,
}: {
  lots: Map<string, string>;
  lotIds: string[];
  selectedId: string;
  onSelect: (lotId: string) => void;
}) {
  const text = useWorkflowText();
  const allowed = useAuthStore((s) =>
    s.user?.permissions.includes("residue.evaluate"),
  );
  const effectiveId =
    selectedId && lotIds.includes(selectedId) ? selectedId : lotIds[0];
  if (!allowed || !effectiveId) return null;
  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <Flask size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-ink-primary">
              {text(
                "Đánh giá dư lượng của lô trong container",
                "Evaluate residue bounds for a container lot",
              )}
            </h3>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Chọn lô cụ thể trong phả hệ để xem tính toán cận dư lượng MRL.",
                "Select a lineage lot to inspect MRL residue bound calculations.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <label className="block space-y-1.5 text-xs sm:max-w-md">
          <span className="font-semibold text-ink-secondary">
            {text("Lô đang đánh giá", "Lot under evaluation")}
          </span>
          <select
            value={effectiveId}
            aria-label={text(
              "Đánh giá dư lượng của lô trong container",
              "Evaluate residue bounds for a container lot",
            )}
            onChange={(e) => onSelect(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 font-mono text-xs text-ink-primary transition-colors focus:border-accent-primary focus:outline-none dark:bg-surface-overlay"
          >
            {lotIds.map((lotId) => (
              <option key={lotId} value={lotId}>
                {lots.get(lotId) ?? lotId}
              </option>
            ))}
          </select>
        </label>
        <ResidueBounds key={effectiveId} lotId={effectiveId} />
      </div>
    </section>
  );
}
