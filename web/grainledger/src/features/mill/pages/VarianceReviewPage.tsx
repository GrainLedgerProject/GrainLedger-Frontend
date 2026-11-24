import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ledgerEndpoints, type CorrectionOperation, type SetupApiResponse } from "@/api/ledger";
import { pageItems, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { CorrectionEvidence } from "../components/CorrectionEvidence";
import { millPaths } from "../paths";

export function VarianceReviewPage() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const confirm = user?.role === "MILL_MANAGER" && user.permissions.includes("conversions.confirm");
  const commit = user?.role === "MILL_OPERATOR" && user.permissions.includes("conversions.write");
  return <Workflow title={t("workflows.variance.title")} description={t(confirm ? "workflows.variance.managerIntro" : "workflows.variance.operatorIntro")} actions={<Link to={millPaths.operation}>{t("nav.mill.operations")}</Link>}>
    {user && (confirm || commit) ? <VarianceQueue key={user.id} userId={user.id} confirm={confirm} /> : <p role="alert">{t("field.seasons.forbidden")}</p>}
  </Workflow>;
}

function VarianceQueue({ userId, confirm }: { userId: string; confirm: boolean }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const key = ["operation-variance", userId];
  const queue = useQuery({ queryKey: [...key, "queue", page, confirm], queryFn: async () => {
    const data = await ledgerEndpoints.getOperations({ page, pageSize: 20, status: "DRAFT", queueOnly: confirm || undefined });
    return { items: pageItems<CorrectionOperation>(data).filter(row => !row.boundCorrectionId), hasMore: !Array.isArray(data) && Boolean((data as ApiPage<CorrectionOperation>).hasMore) };
  } });
  const detail = useQuery({ queryKey: [...key, "detail", id], queryFn: async () => await ledgerEndpoints.getOperation(id) as CorrectionOperation, enabled: Boolean(id) });
  const lookup = useQuery({ queryKey: [...key, "lookup"], queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse });
  const facility = (facilityId: string) => lookup.data?.facilities?.find(row => row.id === facilityId)?.name ?? facilityId;
  return <>
    {message && <p role="status" className="rounded-xl bg-accent-primary/10 p-3">{message}</p>}
    <Panel title={t(confirm ? "workflows.variance.queue" : "workflows.variance.drafts")}>
      <Feedback error={queue.error ?? lookup.error} pending={queue.isPending} />
      {queue.data?.items.length === 0 && <p>{t("workflows.empty")}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">{queue.data?.items.map(row => <li key={row.id}>
        <button className="w-full text-start aria-pressed:!border-accent-primary aria-pressed:!bg-accent-primary/10" type="button" aria-pressed={id === row.id} onClick={() => { setId(row.id); setMessage(""); }}>
          <span className="block font-semibold">{row.outputs.map(line => line.code || line.stage).join(", ") || row.kind}</span>
          <span className="block break-all text-xs text-ink-secondary">{facility(row.facilityId)} · {row.varianceKg ?? "0"} kg · {row.confirmedVersion === row.version ? t("workflows.variance.confirmed") : t("workflows.variance.draft")}</span>
        </button>
      </li>)}</ul>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={page === 1 || queue.isFetching} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button><button type="button" disabled={!queue.data?.hasMore || queue.isFetching} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button><button type="button" onClick={() => void cache.invalidateQueries({ queryKey: key })}>{t("workflows.reload")}</button></div>
    </Panel>
    {id && <Panel title={t("workflows.variance.detail")}>
      <Feedback error={detail.error} pending={detail.isPending} />
      {detail.data && <VarianceDetail key={`${id}:${detail.data.version}`} operation={detail.data} confirm={confirm} loading={detail.isFetching} lookup={lookup.data} onRefresh={() => cache.invalidateQueries({ queryKey: key })} onSaved={async () => {
        setMessage(t(confirm ? "workflows.variance.confirmedSaved" : "workflows.variance.committed"));
        setId("");
        await cache.invalidateQueries({ queryKey: key });
      }} />}
    </Panel>}
  </>;
}

function VarianceDetail({ operation, confirm, loading, lookup, onRefresh, onSaved }: {
  operation: CorrectionOperation; confirm: boolean; loading: boolean; lookup?: SetupApiResponse; onRefresh: () => Promise<void>; onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [evidenceId, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const current = operation.confirmedVersion === operation.version;
  const nonzero = operation.varianceKg != null && !/^[+-]?0+(?:\.0+)?$/.test(operation.varianceKg);
  const valid = operation.status === "DRAFT" && !operation.boundCorrectionId && (confirm ? nonzero && !current : !nonzero || current);
  const mutation = useMutation({ mutationFn: () => confirm
    ? ledgerEndpoints.confirmOperation(operation.id, { version: operation.version, evidenceId, reason: reason.trim() })
    : ledgerEndpoints.commitOperation(operation.id, {}), onSuccess: onSaved, onError: async () => { setReviewed(false); await onRefresh(); } });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid && reviewed && !loading && !mutation.isPending && (!confirm || Boolean(reason.trim() && evidenceId))) mutation.mutate();
  }
  const location = (id: string) => lookup?.locations?.find(row => row.id === id)?.name ?? id;
  return <>
    <dl className="grid gap-3 sm:grid-cols-3">
      <div><dt>{t("workflows.variance.mass")}</dt><dd className="text-xl font-bold">{operation.varianceKg ?? "—"} kg</dd></div>
      <div><dt>{t("workflows.variance.loss")}</dt><dd>{operation.declaredLossKg} kg</dd></div>
      <div><dt>{t("receivingThreshold.revision")}</dt><dd className="break-all font-mono text-xs">{operation.version}</dd></div>
    </dl>
    <div className="grid gap-4 sm:grid-cols-2">
      <section><h3 className="font-semibold">{t("workflows.variance.inputs")}</h3><ul>{operation.inputs.map(row => <li className="break-all" key={`${row.lotId}:${row.locationId}`}>{row.quantityKg} kg · {location(row.locationId)} · {row.lotId}</li>)}</ul></section>
      <section><h3 className="font-semibold">{t("workflows.variance.outputs")}</h3><ul>{operation.outputs.map(row => <li className="break-all" key={row.id}>{row.code ?? row.stage} · {row.quantityKg} kg · {location(row.locationId)}</li>)}</ul></section>
    </div>
    {!valid ? <p>{t(current ? "workflows.variance.confirmed" : "workflows.variance.wait")}</p> : <form method="post" onSubmit={submit} className="space-y-3">
      {confirm && <>
        <CorrectionEvidence original={operation} value={evidenceId} onChange={value => { setEvidence(value); setReviewed(false); }} />
        <label htmlFor="variance-reason">{t("receivingThreshold.reason")}<textarea id="variance-reason" name="reason" required value={reason} onChange={event => setReason(event.target.value)} /></label>
      </>}
      <label htmlFor="variance-review-check" className="!flex-row items-center"><input id="variance-review-check" name="reviewed" type="checkbox" required checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{t(confirm ? "workflows.variance.reviewed" : "workflows.variance.commitCheck")}</label>
      <button type="submit" disabled={loading || mutation.isPending || (confirm && !evidenceId)}>{t(confirm ? "workflows.variance.confirm" : "workflows.variance.commit")}</button>
    </form>}
    <Feedback error={mutation.error} pending={mutation.isPending} />
  </>;
}
