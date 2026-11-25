import { useState } from "react";
import Decimal from "decimal.js";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { exportEndpoints, type CandidatePage, type StockCandidate } from "@/api/exports";
import type { BlendPreview } from "@/api/planning";
import { sourceLotPath } from "@/features/field/paths";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export function BlendCandidateList({ data, facilityId, containerId, candidate, onCandidate, page, onPage }: {
  data: CandidatePage;
  facilityId: string;
  containerId: string;
  candidate: StockCandidate | null;
  onCandidate: (row: StockCandidate | null) => void;
  page: number;
  onPage: (page: number) => void;
}) {
  const text = useWorkflowText();
  const trace = useQuery({
    queryKey: ["blend-candidate-lineage", containerId, facilityId, candidate?.lotId, candidate?.locationId, candidate?.candidateRevision],
    queryFn: () => exportEndpoints.getCandidateLineage(containerId, candidate!.lotId, {
      facilityId, locationId: candidate!.locationId, candidateRevision: candidate!.candidateRevision,
    }),
    enabled: Boolean(candidate),
  });
  return <section className="space-y-2">
    <h3 className="font-semibold">{text("Tồn kho ứng viên", "Candidate stock")}</h3>
    {data.items?.length ? <div className="overflow-x-auto"><table>
      <thead><tr><th scope="col">{text("Lô", "Lot")}</th><th scope="col">{text("Vị trí", "Location")}</th>
        <th scope="col">{text("Khả dụng (kg)", "Available (kg)")}</th><th scope="col">{text("Sản phẩm / lý do", "Product / findings")}</th></tr></thead>
      <tbody>{data.items.map(row => <tr key={`${row.lotId}:${row.locationId}`}>
        <th scope="row"><button type="button" aria-pressed={candidate?.lotId === row.lotId && candidate?.locationId === row.locationId}
          onClick={() => onCandidate(row)}>{row.lotCode}</button></th>
        <td>{row.locationName || row.locationId}</td><td>{row.availableKg}</td>
        <td>{[row.productIdentity, row.productCompatibility, ...(row.restrictions ?? []), ...(row.reasons ?? [])].filter(Boolean).join(" · ")}</td>
      </tr>)}</tbody>
    </table></div> : <p>{text("Không có vị trí ứng viên trong bộ lọc này.", "No candidate positions match these filters.")}</p>}
    <div className="flex items-center gap-2">
      <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>{text("Trang trước", "Previous")}</button>
      <span>{page} · {data.totalCount}</span>
      <button type="button" disabled={!data.hasMore} onClick={() => onPage(page + 1)}>{text("Trang sau", "Next")}</button>
    </div>
    {candidate && <section className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{text("Dòng dõi của lô", "Candidate lineage")} · {candidate.lotCode}</h4>
        <button type="button" onClick={() => onCandidate(null)}>{text("Đóng", "Close")}</button>
      </div>
      <Feedback error={trace.error} pending={trace.isPending} />
      {trace.data && <>
        <p>{text("Trạng thái quy nguồn theo vị trí", "Position attribution")} · {trace.data.positionAttributionStatus}</p>
        <ul className="list-disc ps-5">{trace.data.composition.map(row => <li key={row.ledgerSourceLotId}>
          {row.captureSourceLotId ? <Link to={sourceLotPath(row.captureSourceLotId)}>{row.ledgerSourceLotId}</Link> : row.ledgerSourceLotId} · {row.lotAttributedKg} kg
        </li>)}</ul>
        <p>{trace.data.lineage.reasons.join(" · ")}</p>
        <ol className="list-decimal ps-5">{trace.data.lineage.edges.map((edge, index) => {
          const name = (id: string) => {
            const item = trace.data?.lineage.nodes.find(node => node.lotId === id);
            return item?.lotCode ?? item?.code ?? id;
          };
          return <li key={index}>{name(edge.inputLotId)} → {name(edge.outputLotId)} · {edge.inputConsumedKg ?? edge.quantityKg ?? "—"} kg</li>;
        })}</ol>
        {trace.data.lineage.operations?.length > 0 && <ul className="list-disc ps-5">{trace.data.lineage.operations.map(op => <li key={op.id}>
          {op.kind} · {op.occurredAt ? new Date(op.occurredAt).toLocaleString() : op.id}
        </li>)}</ul>}
      </>}
    </section>}
  </section>;
}

export function BlendRatioEditor({ result, disabled, onDirty, onAssess }: {
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
  const remaining = new Decimal(selection.selectedMassKg).minus(firstKg);
  return <form onSubmit={e => { e.preventDefault(); onAssess(firstKg); }} className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
    <h3 className="font-semibold">{text("Điều chỉnh tỷ lệ", "Adjust blend ratio")}</h3>
    <label>{first.lotCode} (kg)
      <input name="firstQuantityKg" type="number" step="any" min={ratioRange.minimumKg} max={ratioRange.maximumKg} required
        value={firstKg} disabled={disabled} onChange={e => {
          const value = e.target.value;
          setEdited(value);
          onDirty(Boolean(value) && !new Decimal(value).eq(first.quantityKg));
        }} />
    </label>
    <p>{second.lotCode} · {remaining.toFixed()} kg</p>
    <button type="submit" disabled={disabled || !edited || new Decimal(firstKg).eq(first.quantityKg)}>{text("Đánh giá lại tỷ lệ", "Reassess ratio")}</button>
  </form>;
}

export function BlendDiagnostics({ result }: { result: BlendPreview }) {
  const text = useWorkflowText();
  const { optimization, calculationSteps, inputResidueExclusions, residueHeadroom } = result;
  if (!optimization && !calculationSteps && !inputResidueExclusions?.length) return null;
  return <details className="space-y-3 rounded-lg border border-ink-tertiary/20 p-3">
    <summary className="font-semibold">{text("Chẩn đoán tính toán và tối ưu", "Calculation and optimization diagnostics")}</summary>
    {optimization && <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt>{text("Phương pháp", "Method")}</dt><dd>{optimization.method} · {optimization.objective ?? "—"}</dd></div>
      <div><dt>{text("Số vị trí / số lô", "Positions / lots")}</dt><dd>{optimization.positionsUsed ?? "—"} / {optimization.lotsUsed ?? "—"}</dd></div>
      <div><dt>{text("Sản lượng dự kiến", "Predicted output")}</dt><dd>{result.predictedOutputKg ?? "—"} kg</dd></div>
      <div><dt>{text("Số lần lặp", "Iterations")}</dt><dd>{result.iterations ?? "—"}</dd></div>
      <div><dt>{text("Gạo nguyên sử dụng", "Head rice used")}</dt><dd>{optimization.headRiceUsedKg ?? "—"} kg</dd></div>
      <div><dt>{text("Độ ẩm theo khối lượng", "Weighted moisture")}</dt><dd>{optimization.weightedMoisture ?? "—"}</dd></div>
      <div><dt>{text("Đạt tối ưu", "Proved optimal")}</dt><dd>{optimization.optimal ? text("Có", "Yes") : text("Chưa xác nhận", "Unconfirmed")}</dd></div>
    </dl>}
    {residueHeadroom && <p>{text("Biên dư lượng", "Residue headroom")} · {result.substanceNames?.[residueHeadroom.substanceId] ?? residueHeadroom.substanceId} · {residueHeadroom.ratio}</p>}
    {!!inputResidueExclusions?.length && <div>
      <h4 className="font-semibold">{text("Đầu vào bị loại theo dư lượng", "Residue-screened inputs")}</h4>
      <ul className="list-disc ps-5">{inputResidueExclusions.map((row, index) => <li key={index}>
        {row.lotCode} · {result.substanceNames?.[row.substanceId] ?? row.substanceId} · {row.code} · {row.upper ?? "—"} / {row.mrl ?? "—"} {row.unit}
      </li>)}</ul>
    </div>}
    {calculationSteps && <div>
      <h4 className="font-semibold">{text("Các lần chạy bộ giải", "Solver attempts")} · {calculationSteps.method}</h4>
      <ol className="list-decimal ps-5">{calculationSteps.attempts.map((attempt, index) => <li key={index}>
        {attempt.mode} · {attempt.candidateCount} {text("ứng viên", "candidates")} · {attempt.inputKg} kg · {attempt.status} · {attempt.elapsedMs} ms
        {" · "}{attempt.variables} {text("biến", "variables")} · {attempt.constraints} {text("ràng buộc", "constraints")}
        {attempt.objective !== null ? ` · ${text("Mục tiêu", "Objective")} ${attempt.objective}` : ""}
        {attempt.bestBound !== null ? ` · ${text("Cận", "Bound")} ${attempt.bestBound}` : ""}
        {attempt.assessmentStatus ? ` · ${attempt.assessmentStatus}` : ""}
      </li>)}</ol>
    </div>}
  </details>;
}
