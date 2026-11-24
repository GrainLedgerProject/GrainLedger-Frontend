import { useDeferredValue, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/client";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { Decimal } from "@/shared/utils/decimalMass";
import { millPaths } from "../paths";

type TransferPosition = { locationId: string; facilityId?: string; availableKg: string; poolRevision?: number };
type TransferLot = { id: string; code: string; ownerId: string; positions: TransferPosition[]; isCurrentPool?: boolean; poolRevision?: number };
type TransferInput = { lotId: string; fromLocationId: string; toLocationId: string; quantityKg: string; occurredAt: string; poolRevision?: number };

export function StockTransferPage() {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const user = useAuthStore(state => state.user);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lotId, setLot] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const term = useDeferredValue(search.trim());
  const scope = ["stock-transfer", user?.id];
  const lookups = useQuery({ queryKey: [...scope, "lookups"], queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse });
  const lots = useQuery({ queryKey: [...scope, "lots", page, term], queryFn: async () => {
    const result = await ledgerEndpoints.getLots({ search: term, page, pageSize: 30, availableOnly: "true" });
    return { items: pageItems<TransferLot>(result), hasMore: !Array.isArray(result) && Boolean((result as ApiPage<TransferLot>).hasMore) };
  } });
  const details = useQuery({ queryKey: [...scope, "lot", lotId], queryFn: async () => await ledgerEndpoints.getLot(lotId) as TransferLot, enabled: Boolean(lotId) });
  const locations = lookups.data?.locations ?? [];
  const assigned = user?.assignedFacilities;
  const isAssigned = (facilityId: string) => !assigned || assigned.includes(facilityId);
  const lot = details.data;
  const positions = (lot?.positions ?? []).filter(position => locations.some(location => location.id === position.locationId && isAssigned(location.facilityId)) && new Decimal(position.availableKg).gt(0));
  const position = positions.find(current => current.locationId === from);
  const source = locations.find(location => location.id === from);
  const destinations = locations.filter(location => location.id !== from && isAssigned(location.facilityId) &&
    (location.kind !== "COMPARTMENT" || location.ownerId === lot?.ownerId || (!location.ownerId && location.cleared)));
  const command = useCommand<TransferInput>((id, input) => ledgerEndpoints.postTransfer({ id, ...input }), async () => {
    setLot(""); setFrom(""); setTo(""); setFormVersion(version => version + 1);
    await cache.invalidateQueries({ queryKey: scope });
  });
  const uncertain = command.error instanceof ApiError && (command.error.status === 0 || command.error.status === 408 || command.error.status >= 500);

  function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lot || !position || !destinations.some(location => location.id === to) || command.isPending || uncertain) return;
    const fields = new FormData(event.currentTarget);
    const quantityKg = String(fields.get("quantityKg") ?? "");
    const date = new Date(String(fields.get("occurredAt") ?? ""));
    const revision = position.poolRevision ?? lot.poolRevision;
    if (!/^[0-9]{1,14}(\.[0-9]{1,6})?$/.test(quantityKg) || new Decimal(quantityKg).lte(0) || new Decimal(quantityKg).gt(position.availableKg)) { setError(t("workflows.transfer.quantityInvalid")); return; }
    if (!Number.isFinite(date.getTime())) return;
    if (source?.mixedBulk && (!lot.isCurrentPool || !Number.isSafeInteger(revision))) { setError(t("workflows.transfer.poolChanged")); return; }
    setError(null);
    command.submit({ lotId, fromLocationId: from, toLocationId: to, quantityKg, occurredAt: date.toISOString(), ...(source?.mixedBulk && { poolRevision: revision }) });
  }

  return <Workflow title={t("workflows.transfer.title")} description={t("workflows.transfer.description")} actions={<Link to={millPaths.stock}>{t("nav.stock.overview")}</Link>}>
    <Panel title={t("workflows.transfer.selectLot")}>
      <fieldset disabled={uncertain || command.isPending} className="space-y-3"><legend className="sr-only">{t("workflows.transfer.selectLot")}</legend>
        <search><label htmlFor="transfer-search">{t("workflows.transfer.search")}<input id="transfer-search" type="search" maxLength={100} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label></search>
        <label htmlFor="transfer-lot">{t("workflows.transfer.lot")}<select id="transfer-lot" value={lotId} onChange={event => { setLot(event.target.value); setFrom(""); setTo(""); setError(null); command.reset(); }}>
          <option value="">{t("workflows.choose")}</option>
          {lotId && !lots.data?.items.some(item => item.id === lotId) && <option value={lotId}>{lot?.code ?? lotId}</option>}
          {lots.data?.items.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select></label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={page === 1 || lots.isFetching} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button><button type="button" disabled={!lots.data?.hasMore || lots.isFetching} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button></div>
      </fieldset>
      <Feedback error={lots.error ?? lookups.error ?? details.error} pending={lots.isFetching || (Boolean(lotId) && details.isFetching)} />
    </Panel>
    <Panel title={t("workflows.transfer.positions")}>
      {lot && !positions.length && <p>{t("workflows.transfer.noStock")}</p>}
      <form method="post" onSubmit={transfer} key={formVersion} className="space-y-4">
        <fieldset disabled={!positions.length || command.isPending || uncertain || details.isFetching} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">{t("workflows.transfer.positions")}</legend>
          <label htmlFor="transfer-from">{t("workflows.transfer.from")}<select id="transfer-from" name="from" value={from} required onChange={event => { setFrom(event.target.value); setTo(""); }}><option value="">{t("workflows.choose")}</option>{positions.map(item => <option key={item.locationId} value={item.locationId}>{locations.find(location => location.id === item.locationId)?.name} · {item.availableKg} kg</option>)}</select></label>
          <label htmlFor="transfer-to">{t("workflows.transfer.to")}<select id="transfer-to" name="to" value={to} required onChange={event => setTo(event.target.value)}><option value="">{t("workflows.choose")}</option>{destinations.map(location => <option key={location.id} value={location.id}>{location.name} · {lookups.data?.facilities?.find(facility => facility.id === location.facilityId)?.name}</option>)}</select></label>
          <label htmlFor="transfer-quantity">{t("workflows.transfer.quantity")}<input id="transfer-quantity" name="quantityKg" inputMode="decimal" required maxLength={21} /></label>
          <label htmlFor="transfer-time">{t("workflows.time")}<input id="transfer-time" name="occurredAt" type="datetime-local" required defaultValue={localTime()} /></label>
          <button type="submit" disabled={!from || !to}>{t("workflows.transfer.commit")}</button>
        </fieldset>
      </form>
      <Feedback error={command.error ?? (error ? new Error(error) : null)} pending={command.isPending} />
      {uncertain && command.variables && <button type="button" onClick={() => { if (command.variables) command.submit(command.variables); }}>{t("field.seasons.retry")}</button>}
      {command.isError && !uncertain && <button type="button" onClick={() => { command.reset(); setError(null); void cache.invalidateQueries({ queryKey: scope }); }}>{t("workflows.reload")}</button>}
      {command.isSuccess && <p role="status" className="text-accent-primary">{t("workflows.transfer.saved")}</p>}
    </Panel>
  </Workflow>;
}

function localTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
