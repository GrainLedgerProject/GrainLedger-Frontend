import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Cube,
  FlowArrow,
  Package,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { LoadingEdge } from "@/api/containerExecution";
import { useAuthStore } from "@/app/store/authStore";
import { containerPath, exportPaths } from "@/features/export/paths";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { riskPaths } from "../paths";

export interface ActualContainerTargetSummary {
  containerId: string;
  code: string;
  linkedLoadedKg?: string;
  sourceLoadedKg?: string | null;
  status?: string;
  held?: boolean;
  restricted?: boolean;
}

export function ActualLoading({
  edges,
  names,
  containers = [],
  locations,
  tracedLotId,
}: {
  edges: LoadingEdge[];
  names: Map<string, string>;
  containers?: ActualContainerTargetSummary[];
  locations?: Map<string, string>;
  tracedLotId?: string;
}) {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const canOpenContainerTrace =
    (user?.role === "CUSTOMER_MANAGER" || user?.role === "MILL_ADMIN") &&
    Boolean(
      user.permissions.some(
        (p) => p === "trace.read.tenant" || p === "trace.read.all",
      ),
    );
  const containerMap = new Map(containers.map((c) => [c.containerId, c]));

  return (
    <section className="space-y-3 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2.5">
        <h3 className="font-display text-sm font-bold text-ink-primary">
          {text(
            "Container đích, phương án & chi tiết từng dòng thực xếp",
            "Target containers, proposals & actual loading lines",
          )}
        </h3>
        <span className="text-xs text-ink-secondary">
          {edges.length} {text("nhánh xếp container", "loading edges")}
        </span>
      </div>

      <div className="space-y-3">
        {edges.map((edge) => {
          const target = containerMap.get(edge.containerId);
          const proposals = Array.from(
            new Set(edge.lines.map((line) => line.proposalId).filter(Boolean)),
          );
          const tracedContributionKg = tracedLotId
            ? edge.lines
                .reduce((acc, line) => {
                  const matched =
                    line.sourceContributions?.find(
                      (s) => s.sourceLotId === tracedLotId,
                    )?.quantityKg ?? "0";
                  return acc.plus(matched);
                }, new Decimal(0))
                .toDecimalPlaces(6)
                .toFixed()
            : null;
          const totalLineLoadedKg = edge.lines
            .reduce((acc, line) => acc.plus(line.quantityKg || "0"), new Decimal(0))
            .toDecimalPlaces(6)
            .toFixed();

          return (
            <details
              open
              className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 text-xs"
              key={`${edge.containerId}:${edge.lotId}`}
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono font-bold text-accent-primary">
                      {names.get(edge.lotId) || edge.lotId}
                    </span>
                    <span className="text-ink-tertiary">→</span>
                    <Link
                      to={
                        canOpenContainerTrace
                          ? `${riskPaths.containerTrace}?container=${encodeURIComponent(edge.containerId)}`
                          : containerPath(
                              target?.status === "CLOSED"
                                ? exportPaths.dossier
                                : exportPaths.loading,
                              edge.containerId,
                            )
                      }
                      className="font-mono font-bold text-accent-primary underline underline-offset-2"
                    >
                      {target?.code || edge.containerId}
                    </Link>
                    {target?.status && (
                      <StatusBadge
                        status={
                          target.held
                            ? "HOLD"
                            : target.status === "CLOSED"
                              ? "COMPLIANT"
                              : "PENDING"
                        }
                        label={target.status}
                        size="sm"
                      />
                    )}
                    {target?.held && (
                      <StatusBadge
                        status="HOLD"
                        label={text("Container HOLD", "Container HOLD")}
                        size="sm"
                      />
                    )}
                    {target?.restricted && (
                      <StatusBadge
                        status="STALE"
                        label={text("Lô đã nạp hạn chế", "Loaded lot restricted")}
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                    <span>
                      {text("Thực xếp từ nhánh lô", "Edge loaded")}:{" "}
                      <strong>{edge.quantityKg} kg</strong>
                    </span>
                    {target?.linkedLoadedKg && (
                      <span className="text-ink-secondary">
                        {text("Liên kết từ lô gốc", "Linked from traced lot")}:{" "}
                        <strong className="text-ink-primary">
                          {target.linkedLoadedKg} kg
                        </strong>
                      </span>
                    )}
                    {target?.sourceLoadedKg != null && (
                      <span className="text-accent-primary font-semibold">
                        {text("Quy thuộc nguồn gốc (container)", "Source attributed (container)")}:{" "}
                        {target.sourceLoadedKg} kg
                      </span>
                    )}
                    {tracedContributionKg && new Decimal(tracedContributionKg).gt(0) && (
                      <span className="text-accent-primary font-semibold">
                        {text("Phân bổ theo dòng xếp", "Line source share")}:{" "}
                        {tracedContributionKg} kg
                      </span>
                    )}
                  </div>
                </div>
                {proposals.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-ink-secondary">
                    {text("Phương án / Đề xuất bị ảnh hưởng", "Affected proposal(s)")}:{" "}
                    <span className="font-mono text-ink-primary">
                      {proposals.join(", ")}
                    </span>{" "}
                    · {text("Tổng các dòng xếp", "Line sum")}:{" "}
                    <span className="font-mono">{totalLineLoadedKg} kg</span>
                  </p>
                )}
              </summary>

              <ol className="mt-3 space-y-2 border-t border-ink-tertiary/15 pt-3">
                {edge.lines.map((line) => {
                  const lotShare = tracedLotId
                    ? line.sourceContributions?.find(
                        (s) => s.sourceLotId === tracedLotId,
                      )?.quantityKg
                    : undefined;
                  return (
                    <li
                      key={line.lineId}
                      className="rounded-lg border border-ink-tertiary/15 bg-surface-base p-2.5 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-ink-primary">
                          {new Date(line.loadedAt).toLocaleString()} ·{" "}
                          <strong className="font-mono text-ink-primary">
                            {line.quantityKg} kg
                          </strong>{" "}
                          <span className="text-ink-secondary">
                            ({text("thực xếp trên dòng", "line loaded mass")})
                          </span>
                        </span>
                        {lotShare && (
                          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-primary">
                            {text("Từ lô đang truy vết", "From traced lot")}:{" "}
                            {lotShare} kg
                          </span>
                        )}
                      </div>
                      <p className="break-all text-[11px] text-ink-secondary font-mono">
                        {text("Vị trí", "Location")}:{" "}
                        {locations?.get(line.locationId) ?? line.locationId} ·{" "}
                        {text("Phương án", "Proposal")}: {line.proposalId} ·{" "}
                        {text("Lần xếp", "Load")}: {line.loadId}
                      </p>
                      {!!line.sourceContributions?.length && (
                        <div className="text-[11px] text-ink-secondary">
                          <span className="font-semibold">
                            {text("Nguồn đóng góp trên dòng:", "Line source shares:")}
                          </span>
                          <ul className="mt-1 list-disc ps-5 space-y-0.5">
                            {line.sourceContributions.map((source) => (
                              <li key={source.sourceLotId} className="font-mono">
                                {names.get(source.sourceLotId) ??
                                  source.sourceLotId}
                                : {source.quantityKg} kg
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>
    </section>
  );
}

export function ContainerLotFlow({
  names,
  edges,
  loading,
}: {
  names: Map<string, string>;
  edges: { inputLotId: string; outputLotId: string; inputConsumedKg: string }[];
  loading: LoadingEdge[];
}) {
  const text = useWorkflowText();
  const [picked, setPicked] = useState(loading[0]?.lotId ?? "");
  const active = picked || names.keys().next().value || "";
  const activeCode = names.get(active) ?? active;
  const inEdges = edges.filter((edge) => edge.outputLotId === active);
  const outEdges = edges.filter((edge) => edge.inputLotId === active);
  const containerLoads = loading.filter((edge) => edge.lotId === active);

  return (
    <section
      aria-label={text("Dòng lô hàng vào container", "Lot flow into container")}
      className="record-card"
    >
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <FlowArrow size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-ink-primary">
              {text("Dòng lô hàng vào container", "Lot flow into container")}
            </h3>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Điều hướng các lô đầu vào, lô trung tâm đang xem và nhánh đầu ra xếp container.",
                "Navigate upstream input lots, the active focus lot, and downstream container outputs.",
              )}
            </p>
          </div>
        </div>
        {activeCode && (
          <StatusBadge
            status="ACTIVE"
            size="sm"
            label={`${inEdges.length} → ${activeCode} → ${outEdges.length + containerLoads.length}`}
          />
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <label className="block space-y-1.5 text-xs sm:max-w-md">
          <span className="font-semibold text-ink-secondary">
            {text("Lô đang xem", "Selected lot")}
          </span>
          <select
            value={active}
            onChange={(e) => setPicked(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 font-mono text-xs text-ink-primary transition-colors focus:border-accent-primary focus:outline-none dark:bg-surface-overlay"
          >
            {[...names].map(([id, code]) => (
              <option key={id} value={id}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          {/* Upstream Inputs */}
          <div className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 dark:bg-surface-overlay/25">
            <div className="flex items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                {text("Đầu vào", "Inputs")}
              </p>
              <StatusBadge status="PENDING" size="sm" label={`${inEdges.length}`} />
            </div>

            {inEdges.length > 0 ? (
              <div className="space-y-2">
                {inEdges.map((edge, index) => (
                  <button
                    type="button"
                    key={`${edge.inputLotId}:${index}`}
                    onClick={() => setPicked(edge.inputLotId)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-ink-tertiary/20 bg-surface-base px-3 py-2.5 text-start text-xs transition-all hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay dark:hover:bg-surface-raised"
                  >
                    <span className="min-w-0 truncate font-mono font-semibold text-ink-primary">
                      {names.get(edge.inputLotId) ?? edge.inputLotId} → {edge.inputConsumedKg} kg
                    </span>
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-accent-primary"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-ink-tertiary/20 px-3 py-4 text-center text-xs text-ink-tertiary">
                {text("Lô nguồn khởi đầu", "Origin source lot")}
              </p>
            )}
          </div>

          {/* Center Focus Lot */}
          <div className="space-y-3 rounded-xl border-2 border-accent-primary/40 bg-accent-primary/5 p-4 dark:bg-accent-primary/10">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-primary">
                <Package size={15} weight="bold" aria-hidden="true" />
                <span>{text("Lô đang xem", "Focus lot")}</span>
              </span>
              <StatusBadge status="ACTIVE" size="sm" label={text("Trung tâm", "Focus")} />
            </div>

            <p className="break-all font-mono text-base font-bold text-ink-primary">
              {activeCode}
            </p>

            {active && (
              <Link
                to={`${riskPaths.traceback}?lotId=${encodeURIComponent(active)}&direction=backward`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-primary/30 bg-surface-base px-3.5 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
              >
                <span>{text("Mở truy vết ngược", "Open backward trace")}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>

          {/* Downstream Outputs & Container Loads */}
          <div className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 dark:bg-surface-overlay/25">
            <div className="flex items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                {text("Đầu ra", "Outputs")}
              </p>
              <StatusBadge
                status="ACTIVE"
                size="sm"
                label={`${outEdges.length + containerLoads.length}`}
              />
            </div>

            {outEdges.length > 0 || containerLoads.length > 0 ? (
              <div className="space-y-2">
                {outEdges.map((edge, index) => (
                  <button
                    type="button"
                    key={`${edge.outputLotId}:${index}`}
                    onClick={() => setPicked(edge.outputLotId)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-ink-tertiary/20 bg-surface-base px-3 py-2.5 text-start text-xs transition-all hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay dark:hover:bg-surface-raised"
                  >
                    <span className="min-w-0 truncate font-mono font-semibold text-ink-primary">
                      → {names.get(edge.outputLotId) ?? edge.outputLotId} · {edge.inputConsumedKg} kg
                    </span>
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-accent-primary"
                    />
                  </button>
                ))}
                {containerLoads.map((edge) => (
                  <div
                    key={edge.containerId}
                    className="flex items-center gap-2 rounded-xl border border-functional-compliant-border/50 bg-functional-compliant-bg/30 px-3 py-2.5 text-xs font-mono font-semibold text-ink-primary dark:bg-functional-compliant-bg/20"
                  >
                    <Cube
                      size={15}
                      weight="bold"
                      aria-hidden="true"
                      className="shrink-0 text-accent-primary"
                    />
                    <span>
                      → {text("Container", "Container")} · {edge.quantityKg} kg
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-ink-tertiary/20 px-3 py-4 text-center text-xs text-ink-tertiary">
                {text("Chưa có lô đầu ra", "No downstream outputs")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
