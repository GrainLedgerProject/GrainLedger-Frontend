import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ledgerEndpoints } from "@/api/ledger";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

interface TraceStart { id: string; code: string; stage: string }
interface TraceResult {
  traceId: string; complete: boolean; asOf: string;
  sourceContributionsVisible?: boolean;
  positivePathCoverage?: string;
  lots: { id: string; code: string; stage: string; producedKg: string; restrictions: string[]; positions: { quantityKg: string; locationName?: string; locationId: string }[]; contributions?: { sourceLotId: string; quantityKg: string; denominatorKg: string; percentage: string | null }[] | null }[];
  edges: { inputLotId: string; outputLotId: string; operationId: string | null; relationType?: string; inputConsumedKg: string; outputProducedKg: string }[];
  sources: { lotId: string; provenance: { procurementCode: string; plotId: string; farmerId: string; riceVariety: string; currentReferenceLabels?: { farmerName?: string; plotCode?: string; seasonName?: string } } | null }[];
}
export function TraceabilityPage() {
  const text = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [page, setPage] = useState(1);
  const lot = params.get("lotId") ?? "";
  const report = params.get("reportId");
  const labResult = params.get("resultId");
  const incompleteLab = Boolean(report) !== Boolean(labResult);
  const direction = report && labResult ? "forward" : params.get("direction") === "backward" ? "backward" : "forward";
  const view = params.get("view") === "history" ? "history" : "current";
  const list = useQuery({ queryKey: ["trace-starts", search, mode, page], queryFn: async () =>
    await ledgerEndpoints.getTraceStarts({ Mode: mode, Search: search, Page: page, PageSize: 25 }) as { items: TraceStart[]; totalCount: number } });
  const trace = useQuery({ queryKey: ["ledger-trace", lot, report, labResult, direction, view], enabled: !incompleteLab && Boolean(lot || (report && labResult)),
    queryFn: async () => (report && labResult ? await ledgerEndpoints.traceLotFromLab({ reportId: report, resultId: labResult, view })
      : await ledgerEndpoints.traceLot({ lotId: lot, direction, view })) as TraceResult });
  const r = trace.data;
  const names = new Map(r?.lots.map(l => [l.id, l.code]));
  return <Workflow title={text("Truy xuất nguồn gốc", "Lot traceability")}>
    {incompleteLab && <p role="alert">{text("Liên kết truy vết phòng lab cần cả mã báo cáo và mã kết quả đã xác nhận.", "A lab trace link requires both a confirmed report ID and result ID.")}</p>}
    <Panel title={text("Điểm bắt đầu", "Starting point")}><div className="grid gap-3 sm:grid-cols-2">
      <label>{text("Loại lô", "Lot scope")}<select value={mode} onChange={e => { setMode(e.target.value); setPage(1); }}>
        <option value="all">{text("Tất cả lô", "All lots")}</option><option value="pools">{text("Tồn kho hiện tại", "Current pools")}</option><option value="sources">{text("Lô thu mua", "Procurement sources")}</option></select></label>
      <label>{text("Tìm mã lô", "Search lot code")}<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label>
      <label>{text("Hướng truy vết", "Trace direction")}<select disabled={Boolean(report && labResult)} value={direction} onChange={e => { const next = new URLSearchParams(params); next.set("direction", e.target.value); setParams(next); }}>
        <option value="forward">{text("Xuôi dòng", "Forward")}</option><option value="backward">{text("Ngược dòng", "Backward")}</option></select></label>
      <label>{text("Phạm vi thời gian", "View")}<select value={view} onChange={e => { const next = new URLSearchParams(params); next.set("view", e.target.value); setParams(next); }}>
        <option value="current">{text("Hiện tại", "Current")}</option><option value="history">{text("Lịch sử", "History")}</option></select></label>
    </div><Feedback error={list.error} pending={list.isPending}/>
    {list.data && <><div className="flex flex-wrap gap-2">{list.data.items.map(l => <button key={l.id} aria-pressed={lot === l.id} onClick={() => setParams({ lotId: l.id, direction, view })}>{l.code} · {l.stage}</button>)}</div>
    {!list.data.items.length && <p>{text("Không tìm thấy lô.", "No matching lots.")}</p>}
    <div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{text("Trước", "Previous")}</button>{page}<button disabled={page * 25 >= list.data.totalCount} onClick={() => setPage(page + 1)}>{text("Sau", "Next")}</button></div></>}
    </Panel>
    {(lot || (report && labResult)) && <Panel title={text("Kết quả truy vết", "Trace result")}><Feedback pending={trace.isFetching} error={trace.error}/>
      {r && <><p>{new Date(r.asOf).toLocaleString()} · {r.complete ? text("Đầy đủ", "Complete") : text("Dữ liệu truy vết một phần", "Partial trace")}</p>
        {r.positivePathCoverage === "PARTIAL_LEGACY" && <p role="status">{text("Một số liên kết lịch sử chưa có phân bổ nguồn đầy đủ.", "Some historical relationships have incomplete source allocations.")}</p>}
        <div className="overflow-x-auto"><table><thead><tr><th>{text("Lô", "Lot")}</th><th>{text("Công đoạn", "Stage")}</th><th>kg</th><th>{text("Hạn chế", "Restrictions")}</th></tr></thead>
        <tbody>{r.lots.map(l => <tr key={l.id}><td>{l.code}</td><td>{l.stage}</td><td>{l.producedKg}</td><td>{l.restrictions?.join(", ") || "—"}</td></tr>)}</tbody></table></div>
        <h3>{text("Liên kết giữa các lô", "Lot relationships")}</h3><ol>{r.edges.map((e, i) => <li key={i}>{names.get(e.inputLotId) ?? e.inputLotId} → {names.get(e.outputLotId) ?? e.outputLotId} · {e.relationType ?? e.operationId} · {e.inputConsumedKg} / {e.outputProducedKg} kg</li>)}</ol>
        <h3>{text("Đóng góp nguồn theo từng lô", "Source contributions per lot")}</h3>
        {r.sourceContributionsVisible === false ? <p>{text("Thông tin nguồn bị giới hạn", "Source details restricted")}</p> : r.lots.map(l => l.contributions?.length ? <details key={l.id}><summary>{l.code}</summary><div className="overflow-x-auto"><table><caption className="sr-only">{text("Phân bổ nguồn", "Source allocations")} · {l.code}</caption><thead><tr><th scope="col">{text("Lô nguồn", "Source lot")}</th><th scope="col">kg</th><th scope="col">%</th></tr></thead><tbody>{l.contributions.map(c => <tr key={c.sourceLotId}><td>{names.get(c.sourceLotId) ?? c.sourceLotId}</td><td>{c.quantityKg} / {c.denominatorKg}</td><td>{c.percentage ?? "—"}</td></tr>)}</tbody></table></div></details> : null)}
        {r.sources?.map(s => <p key={s.lotId}>{names.get(s.lotId) ?? s.lotId} · {s.provenance ? [s.provenance.procurementCode, s.provenance.riceVariety, s.provenance.currentReferenceLabels?.farmerName, s.provenance.currentReferenceLabels?.plotCode ?? s.provenance.plotId, s.provenance.currentReferenceLabels?.seasonName].filter(Boolean).join(" · ") : text("Thông tin nguồn bị giới hạn", "Source details restricted")}</p>)}
      </>}
    </Panel>}
  </Workflow>;
}
