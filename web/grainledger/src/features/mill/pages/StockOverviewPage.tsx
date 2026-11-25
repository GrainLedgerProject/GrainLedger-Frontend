import { useState } from "react";
import Decimal from "decimal.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { collectPages, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { ResidueBounds } from "@/features/risk/components/ResidueBounds";
import { riskPaths } from "@/features/risk/paths";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { millPaths } from "../paths";

const scope = ["stock-overview"];
const pageSize = 30;
const Exact = Decimal.clone({ precision: 32 });
const stages = ["RAW_PADDY", "DRIED_PADDY", "HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK", "BLENDED_RICE", "BAGGED_RICE"];
interface Position { locationId: string; facilityId: string; quantityKg: string; availableKg: string; poolRevision?: string }
interface StockLot {
  id: string;
  code: string;
  stage: string;
  productIdentity: string;
  ownerId: string;
  ownerName?: string;
  commodityId: string;
  positions: Position[];
  restrictions: string[];
  mixedBulk?: boolean;
  sourceComposition?: { sourceLotId: string; sourceLotCode: string; quantityKg: string }[];
  history?: ApiPage<{ id: string; postingId: string | null; kind: string; occurredAt: string; quantityKg: string | null }>;
}

export function StockOverviewPage() {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { lotId } = useParams();
  const [page, setPage] = useState(1);
  const search = params.get("search") ?? "";
  const facilityId = params.get("facilityId") ?? "";
  const locationId = params.get("locationId") ?? "";
  const ownerId = params.get("ownerId") ?? "";
  const stage = params.get("stage") ?? "";
  const lookups = useQuery({ queryKey: [...scope, "lookups"], queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse });
  const lots = useQuery({
    queryKey: [...scope, "list", { search, facilityId, locationId, ownerId, stage }],
    enabled: !lotId,
    queryFn: () => collectPages<StockLot>(async paging => await ledgerEndpoints.getLots({ ...paging, search, facilityId, locationId, ownerId, stage }) as ApiPage<StockLot>),
  });
  const references = lookups.data;
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    setParams(next);
    setPage(1);
  }
  const format = (value: Decimal) => value.toFixed(Math.min(value.decimalPlaces(), 6));
  const rows = (lots.data ?? []).map(lot => {
    const positions = lot.positions.filter(p => (!facilityId || p.facilityId === facilityId) && (!locationId || p.locationId === locationId));
    return {
      lot, positions,
      quantity: positions.reduce((sum, p) => sum.plus(p.quantityKg), new Exact(0)),
      available: positions.reduce((sum, p) => sum.plus(p.availableKg), new Exact(0)),
    };
  });
  const total = rows.reduce((sum, row) => sum.plus(row.quantity), new Exact(0));
  const available = rows.reduce((sum, row) => sum.plus(row.available), new Exact(0));
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  const shownPage = Math.min(page, lastPage);

  return <Workflow title={text("Tồn kho sổ cái", "Ledger stock")} actions={
    <button type="button" onClick={() => void client.invalidateQueries({ queryKey: scope })}>{text("Tải lại", "Refresh")}</button>
  }>
    <Feedback error={lookups.error} pending={lookups.isPending} />
    {lotId ? <><Link to={millPaths.stock + (params.size ? `?${params}` : "")}>{text("Về tồn kho", "Back to stock")}</Link>
      <StockDetail lotId={lotId} references={references} /></> : <>
      <Panel title={text("Phạm vi tồn kho", "Stock scope")}>
        <search className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>{text("Chủ hàng", "Stock owner")}
            <select value={ownerId} onChange={e => change({ ownerId: e.target.value })}>
              <option value="">{text("Tất cả", "All")}</option>
              {references?.owners?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label>{text("Cơ sở", "Facility")}
            <select value={facilityId} onChange={e => change({ facilityId: e.target.value, locationId: "" })}>
              <option value="">{text("Tất cả", "All")}</option>
              {references?.facilities?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label>{text("Vị trí", "Location")}
            <select value={locationId} onChange={e => change({ locationId: e.target.value })}>
              <option value="">{text("Tất cả", "All")}</option>
              {references?.locations?.filter(row => !facilityId || row.facilityId === facilityId)
                .map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label>{text("Giai đoạn", "Stage")}
            <select value={stage} onChange={e => change({ stage: e.target.value })}>
              <option value="">{text("Tất cả", "All")}</option>{stages.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <form className="flex items-end gap-2 sm:col-span-2" onSubmit={e => {
            e.preventDefault();
            change({ search: String(new FormData(e.currentTarget).get("search") ?? "").trim() });
          }}>
            <label className="flex-1">{text("Tìm lô", "Search lots")}<input key={search} type="search" name="search" defaultValue={search} /></label>
            <button type="submit">{text("Tìm kiếm", "Search")}</button>
          </form>
        </search>
      </Panel>
      <Feedback error={lots.error} pending={lots.isPending} />
      {lots.data && <Panel title={text("Lô hàng", "Lots")}>
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-surface-overlay p-3 sm:grid-cols-4">
          <div><dt>{text("Số lô trong phạm vi", "Lots in scope")}</dt><dd className="font-mono font-bold">{rows.length}</dd></div>
          <div><dt>{text("Tồn (kg)", "On hand (kg)")}</dt><dd className="font-mono font-bold">{format(total)}</dd></div>
          <div><dt>{text("Khả dụng (kg)", "Available (kg)")}</dt><dd className="font-mono font-bold">{format(available)}</dd></div>
          <div><dt>{text("Bị hạn chế (kg)", "Restricted (kg)")}</dt><dd className="font-mono font-bold">{format(total.minus(available))}</dd></div>
        </dl>
        {rows.length ? <div className="overflow-x-auto"><table>
          <thead><tr><th scope="col">{text("Lô", "Lot")}</th><th scope="col">{text("Chủ hàng", "Owner")}</th>
            <th scope="col">{text("Giai đoạn", "Stage")}</th><th scope="col">{text("Tồn (kg)", "On hand (kg)")}</th>
            <th scope="col">{text("Khả dụng (kg)", "Available (kg)")}</th><th scope="col">{text("Hạn chế", "Restrictions")}</th></tr></thead>
          <tbody>{rows.slice((shownPage - 1) * pageSize, shownPage * pageSize).map(row => <tr key={row.lot.id}>
            <th scope="row"><Link to={millPaths.lot.replace(":lotId", encodeURIComponent(row.lot.id)) + (params.size ? `?${params}` : "")}>{row.lot.code}</Link></th>
            <td>{row.lot.ownerName ?? references?.owners?.find(o => o.id === row.lot.ownerId)?.name ?? row.lot.ownerId}</td>
            <td>{row.lot.stage}</td><td>{format(row.quantity)}</td><td>{format(row.available)}</td>
            <td>{row.lot.restrictions.join(" · ") || "—"}</td>
          </tr>)}</tbody>
        </table></div> : <p>{text("Không tìm thấy lô trong phạm vi này.", "No lots found in this scope.")}</p>}
        <div className="flex items-center gap-2">
          <button type="button" disabled={shownPage <= 1} onClick={() => setPage(shownPage - 1)}>{text("Trang trước", "Previous")}</button>
          <span>{shownPage} / {lastPage}</span>
          <button type="button" disabled={shownPage >= lastPage} onClick={() => setPage(shownPage + 1)}>{text("Trang sau", "Next")}</button>
        </div>
      </Panel>}
    </>}
  </Workflow>;
}

function StockDetail({ lotId, references }: { lotId: string; references?: SetupApiResponse }) {
  const text = useWorkflowText();
  const canTrace = useAuthStore(s => s.user?.permissions.some(permission => ["trace.read.tenant", "trace.read.all"].includes(permission)));
  const canSources = useAuthStore(s => s.user?.role === "CUSTOMER_MANAGER" || Boolean(s.user?.permissions.includes("trace.read.all")));
  const query = useQuery({ queryKey: [...scope, "detail", lotId], queryFn: async () => await ledgerEndpoints.getLot(lotId) as StockLot });
  const lot = query.data;
  return <>
    <Feedback error={query.error} pending={query.isPending} />
    {lot && <Panel title={lot.code}>
      <p>{lot.stage} · {lot.productIdentity} · {references?.commodities?.find(row => row.id === lot.commodityId)?.name ?? lot.commodityId}</p>
      {lot.restrictions.length > 0 && <p>{text("Hạn chế", "Restrictions")} · {lot.restrictions.join(", ")}</p>}
      {canTrace && <Link className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary hover:bg-accent-primary/20" to={`${riskPaths.traceback}?lotId=${encodeURIComponent(lotId)}${canSources ? "&direction=backward" : "&direction=forward"}`}>{text("Truy vết lô", "Trace lot")}</Link>}
      <h3 className="font-semibold">{text("Vị trí tồn kho", "Stock positions")}</h3>
      <div className="overflow-x-auto"><table>
        <thead><tr><th scope="col">{text("Cơ sở", "Facility")}</th><th scope="col">{text("Vị trí", "Location")}</th>
          <th scope="col">{text("Tồn (kg)", "On hand (kg)")}</th><th scope="col">{text("Khả dụng (kg)", "Available (kg)")}</th></tr></thead>
        <tbody>{lot.positions.map(row => <tr key={row.locationId}>
          <td>{references?.facilities?.find(f => f.id === row.facilityId)?.name ?? row.facilityId}</td>
          <td>{references?.locations?.find(l => l.id === row.locationId)?.name ?? row.locationId}</td><td>{row.quantityKg}</td><td>{row.availableKg}</td>
        </tr>)}</tbody>
      </table></div>
      {lot.sourceComposition?.length ? <details>
        <summary>{text("Thành phần lô nguồn", "Source-lot composition")}</summary>
        <ul className="list-disc ps-5">{lot.sourceComposition.map(row => <li key={row.sourceLotId}>
          <Link to={millPaths.lot.replace(":lotId", encodeURIComponent(row.sourceLotId))}>{row.sourceLotCode}</Link> · {row.quantityKg} kg
        </li>)}</ul>
      </details> : null}
      {lot.history?.items.length ? <details>
        <summary>{text("Lịch sử bút toán gần đây", "Recent ledger postings")}</summary>
        <ul className="list-disc ps-5">{lot.history.items.map(row => <li key={row.postingId || row.id}>
          {new Date(row.occurredAt).toLocaleString()} · {row.kind} {row.quantityKg && `· ${row.quantityKg} kg`}
        </li>)}</ul>
      </details> : null}
      <ResidueBounds lotId={lotId} />
    </Panel>}
  </>;
}
