import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ledgerEndpoints } from "@/api/ledger";
import { Feedback, Panel, Workflow, useWorkflowText } from "@/shared/ui/Workflow";

interface TraceStart { id: string; code: string; stage: string }
interface TraceResult {
  traceId: string; complete: boolean; asOf: string;
  lots: { id: string; code: string; stage: string; producedKg: string; restrictions: string[]; positions: { quantityKg: string; locationName?: string; locationId: string }[] }[];
  edges: { inputLotId: string; outputLotId: string; operationId: string | null; relationType?: string; inputConsumedKg: string; outputProducedKg: string }[];
  sources: { lotId: string; provenance: { procurementCode: string; plotId: string; farmerId: string; riceVariety: string } | null }[];
}
export function TraceabilityPage() {
  const t = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [page, setPage] = useState(1);
  const lot = params.get("lotId") ?? "";
  const report = params.get("reportId");
  const labResult = params.get("resultId");
  const direction = params.get("direction") === "backward" ? "backward" : "forward";
  const view = params.get("view") === "history" ? "history" : "current";
  const list = useQuery({ queryKey: ["trace-starts", search, mode, page], queryFn: async () =>
    await ledgerEndpoints.getTraceStarts({ Mode: mode, Search: search, Page: page, PageSize: 25 }) as { items: TraceStart[]; totalCount: number } });
  const trace = useQuery({ queryKey: ["ledger-trace", lot, report, labResult, direction, view], enabled: Boolean(lot || (report && labResult)),
    queryFn: async () => (report && labResult ? await ledgerEndpoints.traceLotFromLab({ reportId: report, resultId: labResult, view })
      : await ledgerEndpoints.traceLot({ lotId: lot, direction, view })) as TraceResult });
  const r = trace.data;
  const names = new Map(r?.lots.map(l => [l.id, l.code]));
  return <Workflow title={t("Truy xuất nguồn gốc", "Lot traceability")}>
    <Panel title={t("Điểm bắt đầu", "Starting point")}><div className="grid gap-3 sm:grid-cols-2">
      <label>{t("Loại lô", "Lot scope")}<select value={mode} onChange={e => { setMode(e.target.value); setPage(1); }}>
        <option value="all">{t("Tất cả lô", "All lots")}</option><option value="pools">{t("Tồn kho hiện tại", "Current pools")}</option><option value="sources">{t("Lô thu mua", "Procurement sources")}</option></select></label>
      <label>{t("Tìm mã lô", "Search lot code")}<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label>
      <label>{t("Hướng truy vết", "Trace direction")}<select disabled={Boolean(report && labResult)} value={direction} onChange={e => { const next = new URLSearchParams(params); next.set("direction", e.target.value); setParams(next); }}>
        <option value="forward">{t("Xuôi dòng", "Forward")}</option><option value="backward">{t("Ngược dòng", "Backward")}</option></select></label>
      <label>{t("Phạm vi thời gian", "View")}<select value={view} onChange={e => { const next = new URLSearchParams(params); next.set("view", e.target.value); setParams(next); }}>
        <option value="current">{t("Hiện tại", "Current")}</option><option value="history">{t("Lịch sử", "History")}</option></select></label>
    </div><Feedback error={list.error} pending={list.isPending}/>
    {list.data && <><div className="flex flex-wrap gap-2">{list.data.items.map(l => <button key={l.id} aria-pressed={lot === l.id} onClick={() => setParams({ lotId: l.id, direction, view })}>{l.code} · {l.stage}</button>)}</div>
    {!list.data.items.length && <p>{t("Không tìm thấy lô.", "No matching lots.")}</p>}
    <div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage(page - 1)}>{t("Trước", "Previous")}</button>{page}<button disabled={page * 25 >= list.data.totalCount} onClick={() => setPage(page + 1)}>{t("Sau", "Next")}</button></div></>}
    </Panel>
    {(lot || (report && labResult)) && <Panel title={t("Kết quả truy vết", "Trace result")}><Feedback pending={trace.isFetching} error={trace.error}/>
      {r && <><p>{new Date(r.asOf).toLocaleString()} · {r.complete ? t("Đầy đủ", "Complete") : t("Dữ liệu truy vết một phần", "Partial trace")}</p>
        <div className="overflow-x-auto"><table><thead><tr><th>{t("Lô", "Lot")}</th><th>{t("Công đoạn", "Stage")}</th><th>kg</th><th>{t("Hạn chế", "Restrictions")}</th></tr></thead>
        <tbody>{r.lots.map(l => <tr key={l.id}><td>{l.code}</td><td>{l.stage}</td><td>{l.producedKg}</td><td>{l.restrictions?.join(", ") || "—"}</td></tr>)}</tbody></table></div>
        <h3>{t("Liên kết giữa các lô", "Lot relationships")}</h3><ol>{r.edges.map((e, i) => <li key={i}>{names.get(e.inputLotId) ?? e.inputLotId} → {names.get(e.outputLotId) ?? e.outputLotId} · {e.relationType ?? e.operationId} · {e.inputConsumedKg} / {e.outputProducedKg} kg</li>)}</ol>
        {r.sources?.map(s => <p key={s.lotId}>{names.get(s.lotId) ?? s.lotId} · {s.provenance ? [s.provenance.procurementCode, s.provenance.plotId, s.provenance.riceVariety].join(" · ") : t("Thông tin nguồn bị giới hạn", "Source details restricted")}</p>)}
      </>}
    </Panel>}
  </Workflow>;
}
