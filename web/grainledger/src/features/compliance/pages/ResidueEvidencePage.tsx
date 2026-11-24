import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { catalogsEndpoints } from "@/api/catalogs";
import { labReportEndpoints, type LabReportResponse } from "@/api/compliance";
import { collectPages } from "@/api/query";
import { residueEndpoints, type ResidueReportSelection, type ResidueSourceGroupVersion } from "@/api/residue";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { compliancePaths, labResultPath } from "../paths";

type Publication = ResidueReportSelection | ResidueSourceGroupVersion;
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function ResidueEvidencePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"group" | "selection">(params.has("report") ? "selection" : "group");
  const user = useAuthStore(state => state.user);
  const company = user?.organizationId;
  const scope = ["residue-evidence", user?.id, company];
  const groups = useQuery({ queryKey: [...scope, "groups"], queryFn: residueEndpoints.getSourceGroups, enabled: Boolean(company) && tab === "group" });
  const selections = useQuery({ queryKey: [...scope, "selections"], queryFn: residueEndpoints.getReportSelections, enabled: Boolean(company) && tab === "selection" });
  const visible = (tab === "group" ? groups.data?.items : selections.data?.items)?.filter(item => item.companyId === company);
  return <Workflow title={t("workflows.residue.title")} description={t("workflows.residue.description")} actions={<Link to={compliancePaths.results}>{t("nav.compliance.labResults")}</Link>}>
    {!company ? <p role="alert">{t("workflows.residue.companyMissing")}</p> : <>
      <nav className="flex flex-wrap gap-2" aria-label={t("workflows.residue.title")}>
        {(["group", "selection"] as const).map(mode => <button type="button" key={mode} aria-pressed={mode === tab} className="aria-pressed:!border-accent-primary aria-pressed:!bg-accent-primary/10" onClick={() => setTab(mode)}>{t(`workflows.residue.${mode}`)}</button>)}
      </nav>
      <Panel title={t("workflows.residue.published")}>
        <Feedback error={tab === "group" ? groups.error : selections.error} pending={tab === "group" ? groups.isPending : selections.isPending} />
        {visible?.length === 0 && <p>{t("workflows.empty")}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">{visible?.map(record => <li key={record.id} className="space-y-1 rounded-xl border border-ink-tertiary/20 p-3 [overflow-wrap:anywhere]">
          <p className="font-semibold">{"code" in record ? `${record.code} · v${record.versionNo}` : record.profileCode}</p>
          <p>{"code" in record ? `${record.lower} – ${record.upper} ${record.unit} · ${record.sourceIds.length}` : `${record.residueDefinition} · ${record.selectedResultId}`}</p>
          <p className="text-xs text-ink-secondary">{record.reviewedBy} · {record.reviewAuthority}</p>
          <details><summary className="cursor-pointer text-sm">{t("workflows.residue.evidenceDetails")}</summary><p>{record.evidenceRef}</p><p>{record.applicabilityStatement}</p><p className="font-mono text-xs">{record.id}</p></details>
        </li>)}</ul>
      </Panel>
      <Panel title={t(tab === "group" ? "workflows.residue.publishGroup" : "workflows.residue.publishSelection")}>
        <PublicationEditor key={`${company}:${tab}`} mode={tab} companyId={company} userId={user?.id} initialReport={params.get("report") ?? ""} existing={visible ?? []} />
      </Panel>
    </>}
  </Workflow>;
}

function PublicationEditor({ mode, companyId, userId, initialReport, existing }: {
  mode: "group" | "selection"; companyId: string; userId?: string; initialReport: string; existing: Publication[];
}) {
  const { t } = useTranslation();
  const uid = useId();
  const cache = useQueryClient();
  const [id, setId] = useState(() => crypto.randomUUID());
  const [page, setPage] = useState(1);
  const [reportId, setReport] = useState(initialReport);
  const [resultId, setResult] = useState("");
  const [validation, setValidation] = useState("");
  const [saved, setSaved] = useState(false);
  const scope = ["residue-evidence", userId, companyId];
  const reports = useQuery({ queryKey: [...scope, "reports", page], queryFn: () => labReportEndpoints.getLabReports({ page, pageSize: 20 }), enabled: mode === "selection" });
  const report = useQuery({ queryKey: [...scope, "report", reportId], queryFn: () => labReportEndpoints.getLabReport(reportId), enabled: mode === "selection" && uuid.test(reportId) });
  const substances = useQuery({ queryKey: ["residue-evidence-substances"], queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances), enabled: mode === "group" });
  const rows = confirmedRows(report.data);
  const selected = rows.find(row => row.id === resultId);
  const candidates = useQuery({ queryKey: [...scope, "candidates", selected?.sourceId], enabled: mode === "selection" && Boolean(selected?.sourceId), queryFn: () => collectPages(async query => {
    const response = await labReportEndpoints.getLabReports({ ...query, sourceLotId: selected!.sourceId });
    return response;
  }) });
  const preview = useMutation({ mutationFn: residueEndpoints.previewReportSelection });
  const publication = useMutation({ mutationFn: async ({ body, retry }: { body: Publication; retry?: boolean }) => {
    if (retry) {
      try { return await ("code" in body ? residueEndpoints.getSourceGroup(body.id) : residueEndpoints.getReportSelection(body.id)); }
      catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
    }
    return "code" in body ? residueEndpoints.createSourceGroup(body) : residueEndpoints.createReportSelection(body);
  }, onSuccess: async () => {
    setSaved(true); setId(crypto.randomUUID()); setResult(""); preview.reset();
    await cache.invalidateQueries({ queryKey: scope });
  } });
  const uncertain = publicationUncertain(publication.error);
  const editable = !publication.isPending && !preview.isPending && !uncertain;
  const options = (reports.data?.items ?? []).filter(item => item.status === "CONFIRMED" && item.companyId === companyId);
  const prior = mode === "group" ? existing : existing.filter(item => "sourceId" in item && item.sourceId === selected?.sourceId && item.substanceId === selected?.substanceId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return;
    setValidation(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const ids = (key: string) => value(key).split(/[\s,]+/).filter(Boolean);
    const common = {
      id, companyId, schemaVersion: 2,
      asReceivedConfirmed: form.has("asReceived"), profileCode: value("profileCode"), residueDefinition: value("residueDefinition"),
      effectiveFrom: new Date(value("effectiveFrom")).toISOString(), effectiveTo: value("effectiveTo") ? new Date(value("effectiveTo")).toISOString() : null,
      supersedesId: value("supersedesId") || null, evidenceRef: value("evidenceRef"), applicabilityStatement: value("applicabilityStatement"),
      reviewedBy: value("reviewedBy"), reviewAuthority: value("reviewAuthority"), reviewedAt: new Date(value("reviewedAt")).toISOString(),
    };
    const sourceIds = ids("sourceIds");
    const supportingResultIds = ids("supportingResultIds");
    if (common.effectiveTo && common.effectiveTo <= common.effectiveFrom || [...sourceIds, ...supportingResultIds].some(value => !uuid.test(value))) {
      setValidation(t("workflows.residue.invalid")); return;
    }
    if (mode === "group") publication.mutate({ body: { ...common, code: value("code"), versionNo: Number(value("versionNo")), substanceId: value("substanceId"), sourceIds, supportingResultIds,
      productStage: "RAW_PADDY", productIdentity: "RAW_PADDY", lower: value("lower"), upper: value("upper"), unit: "mg/kg", decimalPlaces: Number(value("decimalPlaces")), precedence: value("precedence"),
    } });
    if (mode === "selection" && selected) {
      const body: ResidueReportSelection = { ...common, sourceId: selected.sourceId, substanceId: selected.substanceId, selectedResultId: selected.id,
        supersededResultIds: form.getAll("supersededResultIds").map(String), absoluteUncertainty: value("absoluteUncertainty") || null, reportingThreshold: value("reportingThreshold") || null,
      };
      if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "preview") preview.mutate(body);
      else publication.mutate({ body });
    }
  }

  const catalogError = mode === "group" ? substances.error : reports.error ?? report.error ?? candidates.error;
  return <>
    {mode === "selection" && <div className="space-y-2">
      <label htmlFor={`${uid}-report`}>{t("workflows.residue.report")}<select id={`${uid}-report`} value={reportId} disabled={!editable || reports.isPending} onChange={event => { setReport(event.target.value); setResult(""); preview.reset(); }}>
        <option value="">{t("workflows.choose")}</option>{reportId && !options.some(item => item.id === reportId) && <option value={reportId}>{report.data?.reportNumber ?? reportId}</option>}
        {options.map(item => <option key={item.id} value={item.id}>{item.reportNumber} · {item.laboratoryName}</option>)}
      </select></label>
      {report.data && <Link to={labResultPath(report.data.id)}>{t("workflows.residue.viewReport")}</Link>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={page === 1 || reports.isFetching} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button><button type="button" disabled={!reports.data?.hasMore || reports.isFetching} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button></div>
    </div>}
    <Feedback error={catalogError} pending={mode === "group" ? substances.isPending : reports.isFetching || report.isFetching || candidates.isFetching} />
    <form method="post" onSubmit={submit} onChange={() => { if (preview.data || preview.error) preview.reset(); setSaved(false); }} className="space-y-3">
      <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">{t(`workflows.residue.${mode}`)}</legend>
        {mode === "group" ? <>
          <EvidenceInput uid={uid} name="code" maxLength={100} required />
          <EvidenceInput uid={uid} name="versionNo" type="number" min={1} step={1} required />
          <label htmlFor={`${uid}-substance`}>{t("workflows.residue.substanceId")}<select name="substanceId" id={`${uid}-substance`} required><option value="">{t("workflows.choose")}</option>{substances.data?.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
          <label htmlFor={`${uid}-precedence`}>{t("workflows.residue.precedence")}<select name="precedence" id={`${uid}-precedence`} required><option value="">{t("workflows.choose")}</option>{["DIRECT_FIRST", "GROUP_FIRST", "UNTESTED_ONLY"].map(value => <option key={value} value={value}>{t(`workflows.residue.priority.${value}`)}</option>)}</select></label>
          <label htmlFor={`${uid}-sources`} className="sm:col-span-2">{t("workflows.residue.sourceIds")}<textarea name="sourceIds" id={`${uid}-sources`} rows={2} required /></label>
          <label htmlFor={`${uid}-support`} className="sm:col-span-2">{t("workflows.residue.supportingResultIds")}<textarea name="supportingResultIds" id={`${uid}-support`} rows={2} /></label>
          <EvidenceInput uid={uid} name="lower" inputMode="decimal" required />
          <EvidenceInput uid={uid} name="upper" inputMode="decimal" required />
          <EvidenceInput uid={uid} name="decimalPlaces" type="number" min={0} max={18} step={1} required />
        </> : <>
          <label htmlFor={`${uid}-result`} className="sm:col-span-2">{t("workflows.residue.result")}<select id={`${uid}-result`} value={resultId} required onChange={event => setResult(event.target.value)}><option value="">{t("workflows.choose")}</option>{rows.map(row => <option key={row.id} value={row.id}>{row.testLabel} · {row.originalResultText} · {row.sourceId}</option>)}</select></label>
          {selected && <p className="break-all text-sm text-ink-secondary sm:col-span-2">{t("workflows.residue.original", { source: selected.sourceId, unit: selected.unit ?? "—", uncertainty: selected.uncertainty ?? "—" })}</p>}
          {selected?.resultKind === "NUMERIC" && selected.uncertainty && <EvidenceInput uid={uid} name="absoluteUncertainty" inputMode="decimal" />}
          {selected?.resultKind === "NOT_DETECTED" && <EvidenceInput uid={uid} name="reportingThreshold" inputMode="decimal" />}
          {selected && <label htmlFor={`${uid}-superseded`} className="sm:col-span-2">{t("workflows.residue.supersededResultIds")}<select key={resultId} name="supersededResultIds" id={`${uid}-superseded`} multiple size={4}>{candidates.data?.flatMap(item => confirmedRows(item).filter(row => row.id !== selected.id && row.sourceId === selected.sourceId && row.substanceId === selected.substanceId).map(row => <option key={row.id} value={row.id}>{item.reportNumber} · {row.testLabel} · {row.originalResultText}</option>))}</select></label>}
        </>}
        <EvidenceInput uid={uid} name="profileCode" required />
        <EvidenceInput uid={uid} name="residueDefinition" required />
        <EvidenceInput uid={uid} name="effectiveFrom" type="datetime-local" required />
        <EvidenceInput uid={uid} name="effectiveTo" type="datetime-local" />
        <label htmlFor={`${uid}-prior`}>{t("workflows.residue.supersedesId")}<select name="supersedesId" id={`${uid}-prior`} key={mode === "selection" ? resultId : mode}><option value="">{t("workflows.none")}</option>{prior.map(item => <option key={item.id} value={item.id}>{"code" in item ? `${item.code} · v${item.versionNo}` : `${item.profileCode} · ${item.selectedResultId}`}</option>)}</select></label>
        <EvidenceInput uid={uid} name="evidenceRef" required />
        <EvidenceInput uid={uid} name="reviewedBy" required />
        <EvidenceInput uid={uid} name="reviewAuthority" required />
        <EvidenceInput uid={uid} name="reviewedAt" type="datetime-local" required />
        <label htmlFor={`${uid}-statement`} className="sm:col-span-2">{t("workflows.residue.applicabilityStatement")}<textarea id={`${uid}-statement`} name="applicabilityStatement" required rows={3} /></label>
        <label htmlFor={`${uid}-received`} className="!flex-row items-center sm:col-span-2"><input id={`${uid}-received`} name="asReceived" type="checkbox" required />{t("workflows.residue.asReceived")}</label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {mode === "selection" && <button type="submit" value="preview">{t("workflows.residue.preview")}</button>}
          <button type="submit" value="publish">{t("workflows.residue.publish")}</button>
        </div>
      </fieldset>
      <Feedback error={publication.error ?? preview.error ?? (validation ? new Error(validation) : null)} pending={publication.isPending || preview.isPending} />
      {uncertain && <button type="button" onClick={() => { if (publication.variables) publication.mutate({ body: publication.variables.body, retry: true }); }}>{t("field.seasons.retry")}</button>}
      {saved && <p role="status" className="text-accent-primary">{t("workflows.residue.saved")}</p>}
      {preview.data && <div className="space-y-1 rounded-xl border border-ink-tertiary/20 p-3" role="status"><strong>{t("workflows.residue.preview")}</strong><p>{preview.data.lower ?? "—"} – {preview.data.upper ?? "—"} {preview.data.unit}</p>{preview.data.reasons?.map((reason, index) => <p key={index}>{reason}</p>)}</div>}
    </form>
  </>;
}

function EvidenceInput({ uid, name, ...props }: { uid: string; name: string } & React.ComponentPropsWithoutRef<"input">) {
  const { t } = useTranslation();
  return <label htmlFor={`${uid}-${name}`}>{t(`workflows.residue.${name}`)}<input id={`${uid}-${name}`} name={name} {...props} /></label>;
}

function confirmedRows(report?: LabReportResponse) {
  return report?.status === "CONFIRMED" ? report.resultSets.flatMap(section => section.sourceLotId ? section.results.flatMap(row => row.substanceId ? [{ ...row, sourceId: section.sourceLotId!, substanceId: row.substanceId }] : []) : []) : [];
}

function publicationUncertain(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 408 || error.status >= 500);
}
