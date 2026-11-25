import { useState } from "react";
import { Link } from "react-router-dom";
import type { LoadingEdge } from "@/api/containerExecution";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Decimal } from "@/shared/utils/decimalMass";
import { riskPaths } from "../paths";

export interface ActualContainerTargetSummary {
  containerId: string;
  code: string;
  linkedLoadedKg?: string;
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
                      to={`${riskPaths.containerTrace}?container=${encodeURIComponent(edge.containerId)}`}
                      className="font-mono font-bold text-accent-primary underline underline-offset-2"
                    >
                      {target?.code || edge.containerId}
                    </Link>
                    {target?.status && (
                      <StatusBadge
                        status={
                          target.held || target.restricted
                            ? "HOLD"
                            : target.status === "CLOSED"
                              ? "COMPLIANT"
                              : "PENDING"
                        }
                        label={`${target.status}${target.held || target.restricted ? " · HOLD" : ""}`}
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
                    {tracedContributionKg && new Decimal(tracedContributionKg).gt(0) && (
                      <span className="text-accent-primary font-semibold">
                        {text("Phân bổ lô truy vết", "Traced lot share")}:{" "}
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

export function ContainerLotFlow({ names, edges, loading }: {
  names: Map<string, string>;
  edges: { inputLotId: string; outputLotId: string; inputConsumedKg: string }[];
  loading: LoadingEdge[];
}) {
  const text = useWorkflowText();
  const [picked, setPicked] = useState(loading[0]?.lotId ?? "");
  const active = picked || names.keys().next().value || "";
  const inEdges = edges.filter(edge => edge.outputLotId === active);
  const outEdges = edges.filter(edge => edge.inputLotId === active);
  return <section className="space-y-3 rounded-lg border border-ink-tertiary/20 p-3">
    <h3 className="font-semibold">{text("Dòng lô hàng vào container", "Lot flow into container")}</h3>
    <label>{text("Lô đang xem", "Selected lot")}
      <select value={active} onChange={e => setPicked(e.target.value)}>
        {[...names].map(([id, code]) => <option key={id} value={id}>{code}</option>)}
      </select>
    </label>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-2"><p>{text("Đầu vào", "Inputs")}</p>
        {inEdges.map((edge, index) => <button type="button" key={index} onClick={() => setPicked(edge.inputLotId)} className="w-full text-start">
          {names.get(edge.inputLotId) ?? edge.inputLotId} → {edge.inputConsumedKg} kg
        </button>)}
      </div>
      <div className="self-start rounded-lg bg-accent-primary/10 p-3">
        <Link to={`${riskPaths.traceback}?lotId=${encodeURIComponent(active)}&direction=backward`}>{names.get(active) ?? active}</Link>
      </div>
      <div className="space-y-2"><p>{text("Đầu ra", "Outputs")}</p>
        {outEdges.map((edge, index) => <button type="button" key={index} onClick={() => setPicked(edge.outputLotId)} className="w-full text-start">
          → {names.get(edge.outputLotId) ?? edge.outputLotId} · {edge.inputConsumedKg} kg
        </button>)}
        {loading.filter(edge => edge.lotId === active).map(edge => <p key={edge.containerId} className="rounded-lg bg-surface-overlay p-2">
          → {text("Container", "Container")} · {edge.quantityKg} kg
        </p>)}
      </div>
    </div>
  </section>;
}
