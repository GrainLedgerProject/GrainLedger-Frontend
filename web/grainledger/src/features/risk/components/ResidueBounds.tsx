import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { catalogsEndpoints } from "@/api/catalogs";
import { ledgerEndpoints, type ResidueEvaluation } from "@/api/ledger";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";

export function ResidueBounds({ lotId }: { lotId: string }) {
  const text = useWorkflowText();
  const allowed = useAuthStore(state => state.user?.permissions.includes("residue.evaluate"));
  const [opened, setOpened] = useState(false);
  if (!allowed) return null;
  return <details className="gl-workflow rounded-xl border border-ink-tertiary/20 p-3"
    onToggle={event => { if (event.target === event.currentTarget && event.currentTarget.open) setOpened(true); }}>
    <summary className="cursor-pointer font-semibold">{text("Khoảng dư lượng và lịch sử đánh giá", "Residue bounds and evaluation history")}</summary>
    {opened && <ResidueEvaluationPanel key={lotId} lotId={lotId} />}
  </details>;
}

function ResidueEvaluationPanel({ lotId }: { lotId: string }) {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ResidueEvaluation | null>(null);
  const requestId = useRef<{ scope: string; id: string } | null>(null);
  const historyKey = ["lot-residue-history", lotId];
  const history = useQuery({ queryKey: historyKey, queryFn: () => ledgerEndpoints.getResidueEvaluations(lotId) });
  const substances = useQuery({ queryKey: ["field-spray-substances"], queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances) });
  const evaluation = useMutation({
    mutationFn: (command: () => Promise<ResidueEvaluation>) => command(),
    onSuccess: (record) => setResult(record),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || evaluation.isPending) return;
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "save") {
      const scope = [...selected].sort().join(",");
      if (requestId.current?.scope !== scope) requestId.current = { scope, id: crypto.randomUUID() };
      const id = requestId.current.id;
      evaluation.mutate(() => ledgerEndpoints.createResidueEvaluation(lotId, { id, substanceIds: selected }), {
        onSuccess: () => {
          requestId.current = null;
          void client.invalidateQueries({ queryKey: historyKey });
        },
      });
    } else {
      evaluation.mutate(() => ledgerEndpoints.getResiduePreview(lotId, { substanceIds: selected.join(",") }));
    }
  }

  return <div className="mt-3 space-y-4">
    <form method="post" onSubmit={submit} className="space-y-3">
      <fieldset className="space-y-2" disabled={evaluation.isPending}>
        <legend>{text("Hoạt chất cần đánh giá (tối đa 200)", "Active substances to evaluate (up to 200)")}</legend>
        <input aria-label={text("Tìm hoạt chất", "Find a substance")} name="search" type="search" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {substances.data?.filter(row => selected.includes(row.id) || `${row.code} ${row.name}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(row =>
            <label key={row.id} className="!flex-row items-center">
              <input name="substances" type="checkbox" checked={selected.includes(row.id)} disabled={selected.length === 200 && !selected.includes(row.id)}
                onChange={e => setSelected(ids => e.target.checked ? [...ids, row.id] : ids.filter(id => id !== row.id))} />
              {row.code} · {row.name}
            </label>)}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" value="preview" disabled={evaluation.isPending || !selected.length}>{text("Xem trước", "Preview")}</button>
        <button type="submit" value="save" disabled={evaluation.isPending || !selected.length}>{text("Lưu đánh giá", "Save evaluation")}</button>
      </div>
    </form>
    {(history.isPending || substances.isPending || evaluation.isPending) && (
      <div className="flex justify-center py-4">
        <GrainLoader
          size="sm"
          label={text(
            "Đang tải dữ liệu đánh giá dư lượng...",
            "Loading residue evaluation data...",
          )}
        />
      </div>
    )}
    <Feedback error={history.error ?? substances.error ?? evaluation.error} />
    {history.data?.items.length ? <div className="space-y-2">
      <h3 className="font-semibold">{text("Đánh giá đã lưu", "Saved evaluations")}</h3>
      <div className="flex flex-wrap gap-2">{history.data.items.map(row => <button key={row.id} type="button"
        aria-pressed={result?.id === row.id} disabled={evaluation.isPending}
        onClick={() => evaluation.mutate(() => ledgerEndpoints.getResidueEvaluation(lotId, row.id))}>
        {new Date(row.snapshotAt).toLocaleString()}
      </button>)}</div>
    </div> : null}
    {result && <section className="space-y-2">
      <h3 className="font-semibold">{result.id ? text("Kết quả đã lưu", "Saved result") : text("Kết quả xem trước", "Preview result")}
        {" · "}{new Date(result.snapshotAt).toLocaleString()} · {result.engineVersion}</h3>
      {result.results.map(row => <details key={row.substanceId} className="rounded-lg border border-ink-tertiary/20 p-3">
        <summary>{substances.data?.find(item => item.id === row.substanceId)?.name ?? row.substanceId}
          {" · "}{row.lower ?? "—"} – {row.upper ?? "—"} {row.unit} · {row.status}</summary>
        <ul className="list-disc ps-5">
          {row.reasons.map(reason => <li key={reason}>{reason}</li>)}
          {row.provenance.map((source, index) => <li key={index}>
            {source.kind} · {source.sourceLotId} {source.groupVersionId}
            {source.reportId && source.resultId && <> · <Link to={`${riskPaths.traceback}?${new URLSearchParams({ reportId: source.reportId, resultId: source.resultId })}`}>{text("Truy vết kết quả lab", "Trace lab result")}</Link></>}
          </li>)}
          {row.rules.map(rule => <li key={`${rule.id}:${rule.kind}`}>{rule.kind} · v{rule.version} · {rule.evidenceReference}</li>)}
        </ul>
      </details>)}
    </section>}
  </div>;
}
