import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MagnifyingGlass, WarningCircle, Sliders } from "@phosphor-icons/react";
import {
  exportEndpoints,
  type CandidatePage,
  type StockCandidate,
} from "@/api/exports";
import type { BlendPreview } from "@/api/planning";
import { sourceLotPath } from "@/features/field/paths";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function BlendCandidateList({
  data,
  facilityId,
  containerId,
  candidate,
  onCandidate,
  page,
  onPage,
}: {
  data: CandidatePage;
  facilityId: string;
  containerId: string;
  candidate: StockCandidate | null;
  onCandidate: (row: StockCandidate | null) => void;
  page: number;
  onPage: (page: number) => void;
}) {
  const text = useWorkflowText();
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ELIGIBLE" | "EXCLUDED">("ALL");

  const trace = useQuery({
    queryKey: [
      "blend-candidate-lineage",
      containerId,
      facilityId,
      candidate?.lotId,
      candidate?.locationId,
      candidate?.candidateRevision,
    ],
    queryFn: () =>
      exportEndpoints.getCandidateLineage(containerId, candidate!.lotId, {
        facilityId,
        locationId: candidate!.locationId,
        candidateRevision: candidate!.candidateRevision,
      }),
    enabled: Boolean(candidate),
  });

  const filteredItems = useMemo(() => {
    const items = data.items ?? [];
    const q = filterText.trim().toLowerCase();
    return items.filter((row) => {
      const excluded = Boolean(row.restrictions?.length || row.reasons?.length);
      if (statusFilter === "ELIGIBLE" && excluded) return false;
      if (statusFilter === "EXCLUDED" && !excluded) return false;
      if (!q) return true;
      return `${row.lotCode} ${row.locationName ?? row.locationId} ${row.productIdentity ?? ""} ${row.productCompatibility ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [data.items, filterText, statusFilter]);

  const summary = data.summary;
  const shortfallPositive =
    summary?.inventoryShortfallKg &&
    new Decimal(summary.inventoryShortfallKg || "0").gt(0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-ink-primary">
          {text("Tồn kho ứng viên", "Candidate stock")}
        </h3>
        {summary && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-ink-tertiary/20 bg-surface-raised px-2.5 py-0.5 font-mono">
              {text("Đủ điều kiện", "Eligible")}:{" "}
              <strong>{summary.inventoryEligibleCount}</strong> ({summary.inventoryEligibleMassKg} kg)
            </span>
            {summary.directProductAvailableMassKg != null && (
              <span className="rounded-full border border-ink-tertiary/20 bg-surface-raised px-2.5 py-0.5 font-mono">
                {text("Đích danh trực tiếp", "Direct match")}:{" "}
                <strong>{summary.directProductAvailableMassKg} kg</strong>
              </span>
            )}
            <span className="rounded-full border border-ink-tertiary/20 bg-surface-raised px-2.5 py-0.5 font-mono">
              {text("Bị loại", "Excluded")}: {summary.excludedCount}
            </span>
          </div>
        )}
      </div>

      {shortfallPositive && summary && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-functional-stale-border bg-functional-stale-bg/50 p-3 text-xs text-ink-primary"
        >
          <WarningCircle size={16} className="mt-0.5 shrink-0 text-accent-warning" />
          <span>
            {text(
              `Thiếu hụt tồn kho khả dụng: cần thêm ${summary.inventoryShortfallKg} kg cho container này.`,
              `Inventory shortfall detected: ${summary.inventoryShortfallKg} kg short for this container.`,
            )}
          </span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="search"
            aria-label={text("Lọc ứng viên trên trang", "Filter candidates")}
            placeholder={text(
              "Lọc nhanh theo mã lô, silo, sản phẩm...",
              "Filter by lot code, location, or product...",
            )}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 dark:bg-surface-base"
          />
        </div>
        <select
          aria-label={text("Trạng thái ứng viên", "Candidate eligibility filter")}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "ALL" | "ELIGIBLE" | "EXCLUDED")
          }
          className="filter-control w-full border-ink-tertiary/20 bg-surface-raised font-semibold sm:w-auto dark:bg-surface-base"
        >
          <option value="ALL">{text("Tất cả ứng viên", "All candidates")}</option>
          <option value="ELIGIBLE">{text("Khả dụng hợp lệ", "Eligible only")}</option>
          <option value="EXCLUDED">{text("Có cảnh báo / bị loại", "With findings / excluded")}</option>
        </select>
      </div>

      {filteredItems.length ? (
        <div className="overflow-x-auto rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-xs dark:bg-surface-raised">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-ink-tertiary/15 bg-surface-raised font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {text("Lô", "Lot")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {text("Vị trí", "Location")}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {text("Khả dụng (kg)", "Available (kg)")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {text("Sản phẩm / lý do", "Product / findings")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-tertiary/10">
              {filteredItems.map((row) => {
                const isSelected =
                  candidate?.lotId === row.lotId &&
                  candidate?.locationId === row.locationId;
                const excluded = Boolean(
                  row.restrictions?.length || row.reasons?.length,
                );
                return (
                  <tr
                    key={`${row.lotId}:${row.locationId}`}
                    className={`transition-colors hover:bg-surface-raised/60 ${isSelected ? "bg-accent-primary/5" : ""}`}
                  >
                    <th scope="row" className="px-4 py-3">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onCandidate(row)}
                        className="rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono font-bold text-accent-primary hover:underline aria-pressed:ring-1 aria-pressed:ring-accent-primary"
                      >
                        {row.lotCode}
                      </button>
                    </th>
                    <td className="px-4 py-3 text-ink-primary">
                      {row.locationName || row.locationId}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      {row.availableKg}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {excluded && (
                          <StatusBadge
                            status="STALE"
                            label={text("Có lưu ý", "Finding")}
                            size="sm"
                          />
                        )}
                        <span className="text-ink-secondary">
                          {[
                            row.productIdentity,
                            row.productCompatibility,
                            ...(row.restrictions ?? []),
                            ...(row.reasons ?? []),
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-tertiary/20 py-6 text-center text-xs text-ink-secondary">
          {text(
            "Không có vị trí ứng viên trong bộ lọc này.",
            "No candidate positions match these filters.",
          )}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-ink-secondary">
        <span>
          {text("Trang", "Page")} {page} · {data.totalCount}{" "}
          {text("vị trí", "positions")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
            className="rounded-lg border border-ink-tertiary/20 px-3 py-1.5 font-medium disabled:opacity-40"
          >
            {text("Trang trước", "Previous")}
          </button>
          <button
            type="button"
            disabled={!data.hasMore}
            onClick={() => onPage(page + 1)}
            className="rounded-lg border border-ink-tertiary/20 px-3 py-1.5 font-medium disabled:opacity-40"
          >
            {text("Trang sau", "Next")}
          </button>
        </div>
      </div>

      {candidate && (
        <section className="space-y-3 rounded-2xl border border-accent-primary/30 bg-surface-raised/60 p-4 text-xs shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2">
            <h4 className="font-display text-sm font-bold text-ink-primary">
              {text("Dòng dõi của lô", "Candidate lineage")} ·{" "}
              <span className="font-mono text-accent-primary">
                {candidate.lotCode}
              </span>
            </h4>
            <button
              type="button"
              onClick={() => onCandidate(null)}
              className="rounded-lg border border-ink-tertiary/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-surface-base"
            >
              {text("Đóng", "Close")}
            </button>
          </div>
          <Feedback error={trace.error} pending={trace.isPending} />
          {trace.data && (
            <div className="space-y-2">
              <p className="font-medium text-ink-secondary">
                {text("Trạng thái quy nguồn theo vị trí", "Position attribution")}:{" "}
                <strong className="text-ink-primary">
                  {trace.data.positionAttributionStatus}
                </strong>
              </p>
              <ul className="list-disc space-y-1 ps-5">
                {trace.data.composition.map((row) => (
                  <li key={row.ledgerSourceLotId} className="font-mono">
                    {row.captureSourceLotId ? (
                      <Link
                        className="text-accent-primary underline"
                        to={sourceLotPath(row.captureSourceLotId)}
                      >
                        {row.ledgerSourceLotId}
                      </Link>
                    ) : (
                      row.ledgerSourceLotId
                    )}{" "}
                    · {row.lotAttributedKg} kg
                  </li>
                ))}
              </ul>
              {trace.data.lineage.reasons.length > 0 && (
                <p className="text-ink-secondary">
                  {trace.data.lineage.reasons.join(" · ")}
                </p>
              )}
              <ol className="list-decimal space-y-1 ps-5 font-mono">
                {trace.data.lineage.edges.map((edge, index) => {
                  const name = (id: string) => {
                    const item = trace.data?.lineage.nodes.find(
                      (node) => node.lotId === id,
                    );
                    return item?.lotCode ?? item?.code ?? id;
                  };
                  return (
                    <li key={index}>
                      {name(edge.inputLotId)} → {name(edge.outputLotId)} ·{" "}
                      {edge.inputConsumedKg ?? edge.quantityKg ?? "—"} kg
                    </li>
                  );
                })}
              </ol>
              {trace.data.lineage.operations?.length > 0 && (
                <ul className="list-disc space-y-1 ps-5 text-ink-secondary">
                  {trace.data.lineage.operations.map((op) => (
                    <li key={op.id}>
                      {op.kind} ·{" "}
                      {op.occurredAt
                        ? new Date(op.occurredAt).toLocaleString()
                        : op.id}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export function BlendRatioEditor({
  result,
  disabled,
  onDirty,
  onAssess,
}: {
  result: BlendPreview;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
  onAssess: (firstKg: string) => void;
}) {
  const text = useWorkflowText();
  const [edited, setEdited] = useState("");
  const { selection, ratioRange } = result;
  if (!ratioRange || !selection || selection.allocations.length !== 2) return null;
  const [first, second] = selection.allocations;
  const firstKg = edited || first.quantityKg;
  const remaining = (() => {
    try {
      return new Decimal(selection.selectedMassKg).minus(firstKg || "0").toFixed();
    } catch {
      return second.quantityKg;
    }
  })();

  const minVal = Number(ratioRange.minimumKg);
  const maxVal = Number(ratioRange.maximumKg);
  const sliderMin = Number.isFinite(minVal) ? Math.ceil(minVal) : 0;
  const sliderMax = Number.isFinite(maxVal) ? Math.floor(maxVal) : 0;
  const hasIntegerRange = sliderMax >= sliderMin;
  const currentNum = Number(firstKg);
  const isWholeKg = (() => {
    const trimmed = firstKg.trim();
    if (!trimmed) return false;
    try {
      const dec = new Decimal(trimmed);
      return (
        dec.isInteger() &&
        dec.gte(ratioRange.minimumKg) &&
        dec.lte(ratioRange.maximumKg)
      );
    } catch {
      return false;
    }
  })();

  function updateValue(next: string) {
    setEdited(next);
    try {
      onDirty(Boolean(next) && !new Decimal(next).eq(first.quantityKg));
    } catch {
      onDirty(true);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isWholeKg) return;
        onAssess(new Decimal(firstKg.trim()).toFixed(0));
      }}
      className="space-y-3 rounded-2xl border border-ink-tertiary/20 bg-surface-raised/50 p-4 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold text-ink-primary">
        <Sliders size={16} className="text-accent-primary" />
        <h3>{text("Điều chỉnh tỷ lệ phối trộn", "Adjust blend ratio")}</h3>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          aria-label={text("Thanh trượt tỷ lệ lô thứ nhất", "First lot mass slider")}
          min={hasIntegerRange ? sliderMin : minVal}
          max={hasIntegerRange ? sliderMax : maxVal}
          step={1}
          value={
            Number.isFinite(currentNum)
              ? Math.round(currentNum)
              : hasIntegerRange
                ? sliderMin
                : minVal
          }
          disabled={disabled || !hasIntegerRange}
          onChange={(e) => updateValue(String(Math.round(Number(e.target.value))))}
          className="w-full accent-accent-primary cursor-pointer"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-semibold text-ink-secondary">
              {first.lotCode} (kg) · [
              {hasIntegerRange ? `${sliderMin} – ${sliderMax}` : `${ratioRange.minimumKg} – ${ratioRange.maximumKg}`}]
            </span>
            <input
              name="firstQuantityKg"
              type="number"
              step={1}
              min={hasIntegerRange ? sliderMin : ratioRange.minimumKg}
              max={hasIntegerRange ? sliderMax : ratioRange.maximumKg}
              inputMode="numeric"
              required
              value={firstKg}
              disabled={disabled}
              onChange={(e) => updateValue(e.target.value)}
              className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-3 py-2 font-mono text-xs"
            />
          </label>
          <div className="rounded-xl border border-ink-tertiary/15 bg-surface-base px-3 py-2 flex flex-col justify-center">
            <span className="text-[11px] text-ink-secondary">
              {second.lotCode} ({text("phần còn lại", "remaining")})
            </span>
            <span className="font-mono text-sm font-bold text-ink-primary">
              {remaining} kg
            </span>
          </div>
        </div>
        {edited && !isWholeKg && (
          <p className="text-[11px] font-medium text-accent-danger">
            {text(
              "Khối lượng điều chỉnh phải là số nguyên kg trong phạm vi cho phép.",
              "Adjustment quantity must be a whole integer (kg) within the allowed range.",
            )}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          disabled ||
          !edited ||
          !isWholeKg ||
          (() => {
            try {
              return new Decimal(firstKg).eq(first.quantityKg);
            } catch {
              return true;
            }
          })()
        }
        className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 font-semibold text-white hover:bg-accent-primary/90 disabled:opacity-45"
      >
        {text("Đánh giá lại tỷ lệ", "Reassess ratio")}
      </button>
    </form>
  );
}

export function BlendDiagnostics({ result }: { result: BlendPreview }) {
  const text = useWorkflowText();
  const {
    optimization,
    calculationSteps,
    inputResidueExclusions,
    residueHeadroom,
  } = result;
  if (
    !optimization &&
    !calculationSteps &&
    !inputResidueExclusions?.length &&
    !residueHeadroom
  )
    return null;

  return (
    <details className="space-y-3 rounded-2xl border border-ink-tertiary/20 bg-surface-raised/30 p-4 text-xs">
      <summary className="cursor-pointer font-semibold text-ink-primary">
        {text(
          "Chẩn đoán tính toán và tối ưu",
          "Calculation and optimization diagnostics",
        )}
      </summary>
      {optimization && (
        <dl className="grid gap-3 pt-2 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Phương pháp", "Method")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {optimization.method} · {optimization.objective ?? "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Số vị trí / số lô", "Positions / lots")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {optimization.positionsUsed ?? "—"} / {optimization.lotsUsed ?? "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Sản lượng dự kiến", "Predicted output")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {result.predictedOutputKg ?? "—"} kg
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Số lần lặp", "Iterations")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {result.iterations ?? "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Gạo nguyên sử dụng", "Head rice used")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {optimization.headRiceUsedKg ?? "—"} kg
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Độ ẩm theo khối lượng", "Weighted moisture")}
            </dt>
            <dd className="font-mono font-semibold mt-0.5">
              {optimization.weightedMoisture ?? "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10">
            <dt className="text-[11px] text-ink-secondary">
              {text("Đạt tối ưu", "Proved optimal")}
            </dt>
            <dd className="font-semibold mt-0.5">
              {optimization.optimal
                ? text("Có", "Yes")
                : text("Chưa xác nhận", "Unconfirmed")}
            </dd>
          </div>
        </dl>
      )}
      {residueHeadroom && (
        <p className="rounded-lg bg-surface-base p-2.5 border border-ink-tertiary/10 font-mono">
          {text("Biên dư lượng", "Residue headroom")} ·{" "}
          {result.substanceNames?.[residueHeadroom.substanceId] ??
            residueHeadroom.substanceId}{" "}
          · {residueHeadroom.ratio}
        </p>
      )}
      {!!inputResidueExclusions?.length && (
        <div className="space-y-1">
          <h4 className="font-semibold">
            {text("Đầu vào bị loại theo dư lượng", "Residue-screened inputs")}
          </h4>
          <ul className="list-disc ps-5 space-y-0.5 font-mono">
            {inputResidueExclusions.map((row, index) => (
              <li key={index}>
                {row.lotCode} ·{" "}
                {result.substanceNames?.[row.substanceId] ?? row.substanceId} ·{" "}
                {row.code} · {row.upper ?? "—"} / {row.mrl ?? "—"} {row.unit}
              </li>
            ))}
          </ul>
        </div>
      )}
      {calculationSteps && (
        <div className="space-y-1">
          <h4 className="font-semibold">
            {text("Các lần chạy bộ giải", "Solver attempts")} ·{" "}
            {calculationSteps.method}
          </h4>
          <ol className="list-decimal ps-5 space-y-0.5 font-mono">
            {calculationSteps.attempts.map((attempt, index) => (
              <li key={index}>
                {attempt.mode} · {attempt.candidateCount}{" "}
                {text("ứng viên", "candidates")} · {attempt.inputKg} kg ·{" "}
                {attempt.status} · {attempt.elapsedMs} ms · {attempt.variables}{" "}
                {text("biến", "variables")} · {attempt.constraints}{" "}
                {text("ràng buộc", "constraints")}
                {attempt.objective !== null
                  ? ` · ${text("Mục tiêu", "Objective")} ${attempt.objective}`
                  : ""}
                {attempt.bestBound !== null
                  ? ` · ${text("Cận", "Bound")} ${attempt.bestBound}`
                  : ""}
                {attempt.assessmentStatus
                  ? ` · ${attempt.assessmentStatus}`
                  : ""}
              </li>
            ))}
          </ol>
        </div>
      )}
    </details>
  );
}
