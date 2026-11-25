import { useState } from "react";
import { Link } from "react-router-dom";
import type { LoadingEdge } from "@/api/containerExecution";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";

export function ActualLoading({ edges, names }: { edges: LoadingEdge[]; names: Map<string, string> }) {
  const text = useWorkflowText();
  return <section className="space-y-2">
    <h3 className="font-semibold">{text("Chi tiết từng lần thực xếp", "Actual loading lines")}</h3>
    {edges.map(edge => <details className="rounded-lg border border-ink-tertiary/20 p-3" key={`${edge.containerId}:${edge.lotId}`}>
      <summary>{names.get(edge.lotId) || edge.lotId} → {edge.containerId} · {edge.quantityKg} kg</summary>
      <ol className="mt-2 space-y-2">{edge.lines.map(line => <li key={line.lineId}>
        <p>{new Date(line.loadedAt).toLocaleString()} · {line.quantityKg} kg</p>
        <p className="break-all text-xs text-ink-secondary">{text("Vị trí", "Location")} {line.locationId} · {text("Lần xếp", "Load")} {line.loadId}</p>
        {!!line.sourceContributions?.length && <ul className="list-disc ps-5">{line.sourceContributions.map(source => <li key={source.sourceLotId}>
          {names.get(source.sourceLotId) ?? source.sourceLotId} · {source.quantityKg} kg
        </li>)}</ul>}
      </li>)}</ol>
    </details>)}
  </section>;
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
