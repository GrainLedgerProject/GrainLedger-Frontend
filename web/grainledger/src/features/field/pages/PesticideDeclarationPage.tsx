import { useId, useState, type FormEvent } from "react";
import { ClipboardText, Eye, Plus, SprayBottle, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { catalogsEndpoints } from "@/api/catalogs";
import { procurementEndpoints, type RecordSprayDeclarationRequest, type SprayDeclarationSummary } from "@/api/procurement";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { selectSessionOwner } from "@/app/store/sessionOwner";
import { RecordDialog, RecordEmpty, RecordFeedback, RecordPagination, RecordRefresh, RecordSuccess, RecordTable, RecordWorkspace } from "@/shared/ui/RecordWorkspace";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { fieldPaths } from "../paths";
import { captureWasRejected, loadPendingCapture, submitPendingCapture } from "../offline/pendingCapture";

const scope = ["field-spray-declarations"];

function vietnamToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(new Date());
}

const substancesQuery = {
  queryKey: ["field-spray-substances"],
  queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances),
};

export function PesticideDeclarationPage() {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const historyId = useId();
  const [params] = useSearchParams();
  const plotSeasonId = params.get("plotSeasonId") || undefined;
  const owner = useAuthStore(selectSessionOwner);
  const canWrite = useAuthStore(s => s.user?.permissions.includes("farms.write"));
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<SprayDeclarationSummary | null>(null);
  const [status, setStatus] = useState("");
  const list = useQuery({
    queryKey: [...scope, plotSeasonId, page],
    queryFn: () => procurementEndpoints.getSprayDeclarations({ plotSeasonId, page, pageSize: 20 }),
  });
  const detail = useQuery({
    queryKey: ["field-spray-detail", selected?.id],
    queryFn: () => procurementEndpoints.getSprayDeclaration(selected!.id),
    enabled: Boolean(selected),
  });
  const substances = useQuery({ ...substancesQuery, enabled: Boolean(selected) });
  const historyTitle = text("Lịch sử khai báo", "Declaration history");
  const appliedOnLabel = text("Ngày phun", "Application date");
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeZone: "UTC" });
  const date = (value: string) => <time dateTime={value} className="whitespace-nowrap">{dateFormat.format(new Date(value))}</time>;

  return <RecordWorkspace section={text("Nhật ký đồng ruộng", "Field records")} title={t("nav.field.declarations")}
    description={text("Ghi nhận và tra cứu các lần phun thuốc theo thửa ruộng và vụ mùa.", "Record and review pesticide applications by plot and season.")}
    actions={<>
      <RecordRefresh pending={list.isFetching} onRefresh={() => { void list.refetch(); }} />
      {canWrite && <button type="button" className="record-button record-primary rounded-full" onClick={() => setCreating(true)}>
        <Plus aria-hidden="true" size={16} weight="bold" />
        {text("Ghi nhận lần phun", "Record application")}
      </button>}
    </>}>
    <RecordSuccess message={status} />
    <section className="record-card rounded-xl" aria-labelledby={historyId}>
      <div className="record-card-header">
        <h2 id={historyId} className="record-card-title"><ClipboardText aria-hidden="true" size={20} className="text-accent-primary" />{historyTitle}</h2>
        {plotSeasonId && <Link className="record-link" to={fieldPaths.declarations} onClick={() => setPage(1)}>{text("Xem tất cả khai báo", "Show all declarations")}</Link>}
      </div>
      <RecordFeedback error={list.error} pending={list.isPending} label={text("Đang tải lịch sử khai báo…", "Loading declaration history…")} />
      {list.data && <>
        {list.data.items.length === 0 ? <RecordEmpty icon={<ClipboardText size={40} />}>
          {text("Chưa có khai báo.", "No declarations found.")}
        </RecordEmpty> : <RecordTable labelledBy={historyId}>
          <thead><tr>
            <th scope="col" className="whitespace-nowrap">{appliedOnLabel}</th>
            <th scope="col">{text("Thửa ruộng và mùa vụ", "Plot and season")}</th>
            <th scope="col" className="whitespace-nowrap text-end">{text("Số mục", "Items")}</th>
            <th scope="col" className="text-end"><span className="sr-only sm:not-sr-only">{text("Thao tác", "Action")}</span></th>
          </tr></thead>
          <tbody>{list.data.items.map(row => <tr key={row.id}>
            <td>{date(row.appliedOn)}</td>
            <th scope="row" className="min-w-24 [overflow-wrap:anywhere] sm:min-w-36">
              <span className="font-mono font-bold text-accent-primary">{row.plotCode || row.plotSeasonId}</span>
              {row.seasonName && <span className="mt-0.5 block text-xs font-normal text-ink-secondary">{row.seasonName}</span>}
            </th>
            <td className="text-end tabular-nums">{row.itemCount}</td>
            <td className="text-end"><button type="button" title={t("common.details")} className="record-row-action whitespace-nowrap" onClick={() => setSelected(row)}>
              <Eye aria-hidden="true" size={16} /><span className="sr-only sm:not-sr-only">{t("common.details")}</span>
            </button></td>
          </tr>)}</tbody>
        </RecordTable>}
        <RecordPagination label={historyTitle} page={page} hasMore={list.data.hasMore} onPage={setPage} />
      </>}
    </section>
    {creating && owner && <SprayEditor plotSeasonId={plotSeasonId} storageKey={`grainledger:spray-pending:${owner}`}
      onClose={() => setCreating(false)} onSuccess={() => {
        setCreating(false);
        setPage(1);
        setStatus(text("Đã lưu khai báo phun thuốc.", "Pesticide declaration saved."));
      }} />}
    {selected && <RecordDialog title={text("Chi tiết khai báo", "Declaration details")}
      subtitle={[selected.plotCode || selected.plotSeasonId, selected.seasonName].filter(Boolean).join(" · ")}
      icon={<ClipboardText size={22} />} onClose={() => setSelected(null)} dismissOnBackdrop>
      <RecordFeedback error={detail.error} pending={detail.isPending} label={text("Đang tải chi tiết khai báo…", "Loading declaration details…")} />
      {detail.data && <div className="space-y-5">
        <dl className="record-details [overflow-wrap:anywhere] sm:grid-cols-2">
          <div><dt>{appliedOnLabel}</dt><dd>{date(detail.data.appliedOn)}</dd></div>
          <div><dt>{text("Nguồn thông tin", "Information source")}</dt><dd>{detail.data.informationSource}</dd></div>
          <div><dt>{text("Tham chiếu chứng cứ", "Evidence reference")}</dt><dd>{detail.data.evidenceRef || "—"}</dd></div>
          <div><dt>{text("Ghi nhận lúc", "Recorded at")}</dt><dd><time dateTime={detail.data.recordedAt}>{new Date(detail.data.recordedAt).toLocaleString(i18n.language)}</time></dd></div>
        </dl>
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold">{text("Sản phẩm và hoạt chất", "Products and substances")}</h3>
          <ul className="divide-y divide-ink-tertiary/15 rounded-xl border border-ink-tertiary/15 text-sm [overflow-wrap:anywhere]">{detail.data.items.map(item => {
            const substance = substances.data?.find(row => row.id === item.substanceId)?.name ?? item.substanceId;
            return <li key={item.id} className="px-4 py-3">{[item.productName, substance].filter(Boolean).join(" · ")}</li>;
          })}</ul>
        </div>
      </div>}
    </RecordDialog>}
  </RecordWorkspace>;
}

function SprayEditor({ plotSeasonId, storageKey, onClose, onSuccess }: {
  plotSeasonId?: string;
  storageKey: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const titleId = useId();
  const client = useQueryClient();
  const [pending, setPending] = useState(() => loadPendingCapture<RecordSprayDeclarationRequest>(storageKey));
  const [season, setSeason] = useState(pending?.payload?.plotSeasonId ?? plotSeasonId ?? "");
  const [appliedOn, setAppliedOn] = useState(pending?.payload?.appliedOn ?? vietnamToday());
  const [source, setSource] = useState(pending?.payload?.informationSource ?? "");
  const [evidence, setEvidence] = useState(pending?.payload?.evidenceRef ?? "");
  const [validation, setValidation] = useState("");
  const [items, setItems] = useState(() => (pending?.payload?.items ?? [{ productName: "", substanceId: "" }])
    .map(item => ({ ...item, key: crypto.randomUUID() })));
  const seasons = useQuery({
    queryKey: ["field-spray-plot-seasons"],
    queryFn: () => collectPages(procurementEndpoints.getPlotSeasons),
  });
  const substances = useQuery(substancesQuery);
  const submit = useMutation({
    mutationFn: (request: RecordSprayDeclarationRequest) => submitPendingCapture(storageKey, request, procurementEndpoints.recordSprayDeclaration),
    onSuccess: () => {
      setPending(null);
      void client.invalidateQueries({ queryKey: scope });
      onSuccess();
    },
    onError: (error) => {
      if (captureWasRejected(error)) setPending(null);
    },
  });

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.isPending) return;
    if (!pending && !seasons.data?.some(row => row.id === season)) {
      setValidation(text("Chọn thửa ruộng và mùa vụ đang có trong danh sách.", "Select a plot season from the available list."));
      return;
    }
    setValidation("");
    const request = pending ?? {
      deviceId: "grainledger-web",
      clientOperationId: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      payloadSchemaVersion: 2,
      payload: {
        entityId: crypto.randomUUID(),
        plotSeasonId: season,
        appliedOn,
        informationSource: source.trim(),
        evidenceRef: evidence.trim() || null,
        items: items.map(item => ({
          productName: item.productName?.trim() || null,
          substanceId: item.substanceId || null,
        })),
      },
    };
    setPending(request);
    submit.mutate(request);
  }

  const title = text("Ghi nhận lần phun", "Record an application");
  return <RecordDialog title={title} titleId={titleId} icon={<SprayBottle size={22} />} onClose={onClose} busy={submit.isPending} wide>
    <form method="post" aria-labelledby={titleId} onSubmit={save} className="space-y-4">
      <fieldset disabled={Boolean(pending) || submit.isPending} className="min-w-0 space-y-4">
        <legend className="sr-only">{text("Thông tin lần phun", "Application information")}</legend>
        <label>{text("Thửa ruộng và mùa vụ", "Plot and season")} *
          <select name="plotSeasonId" required value={season} onChange={e => { setSeason(e.target.value); setValidation(""); }}>
            <option value="" disabled>{text("Chọn thửa ruộng và mùa vụ", "Select a plot and season")}</option>
            {season && !seasons.data?.some(row => row.id === season) && <option value={season} disabled>{season}</option>}
            {seasons.data?.map(row => <option key={row.id} value={row.id}>{row.plotCode} · {row.seasonName} · {row.riceVariety}</option>)}
          </select>
        </label>
        <Feedback error={seasons.error} pending={seasons.isPending} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0">{text("Ngày phun", "Application date")} *
            <input name="appliedOn" type="date" required max={vietnamToday()} value={appliedOn} onChange={e => setAppliedOn(e.target.value)} />
          </label>
          <label className="min-w-0">{text("Nguồn thông tin", "Information source")} *
            <input name="informationSource" required pattern=".*\S.*" value={source} onChange={e => setSource(e.target.value)} />
          </label>
        </div>
        <label>{text("Tham chiếu chứng cứ", "Evidence reference")}
          <input name="evidenceRef" value={evidence} onChange={e => setEvidence(e.target.value)} />
        </label>
        {substances.error && <p role="status">{text("Danh mục hoạt chất chưa tải được. Bạn vẫn có thể nhập tên sản phẩm.", "The substance catalog is unavailable. You can enter product names.")}</p>}
        {items.map((item, index) => <fieldset key={item.key} className="min-w-0 space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
          <legend className="px-1 text-sm font-semibold">{text("Sản phẩm hoặc hoạt chất", "Product or active substance")} {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2 [&_label]:min-w-0">
            <label>{text("Tên sản phẩm", "Product name")}
              <input name={`product-${index}`} required={!item.substanceId} pattern=".*\S.*" value={item.productName ?? ""}
                onChange={e => setItems(rows => rows.map(row => row.key === item.key ? { ...row, productName: e.target.value } : row))} />
            </label>
            <label>{text("Hoạt chất", "Active substance")}
              <select name={`substance-${index}`} value={item.substanceId ?? ""}
                onChange={e => setItems(rows => rows.map(row => row.key === item.key ? { ...row, substanceId: e.target.value } : row))}>
                <option value="">—</option>
                {substances.data?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </label>
          </div>
          {items.length > 1 && <button type="button" className="record-button text-accent-danger" onClick={() => setItems(rows => rows.filter(row => row.key !== item.key))}>
            <Trash aria-hidden="true" size={16} />{text("Xóa mục", "Remove item")}
          </button>}
        </fieldset>)}
        <button type="button" className="record-button text-accent-primary" onClick={() => setItems(rows => [...rows, { key: crypto.randomUUID(), productName: "", substanceId: "" }])}>
          <Plus aria-hidden="true" size={16} />{text("Thêm sản phẩm hoặc hoạt chất", "Add product or substance")}
        </button>
      </fieldset>
      {pending && !submit.isPending && <p role="status">{text("Hãy gửi lại yêu cầu đang chờ để tránh tạo bản ghi trùng.", "Retry the pending request to avoid a duplicate declaration.")}</p>}
      {validation && <p role="alert" className="text-accent-danger">{validation}</p>}
      <Feedback error={submit.error} pending={submit.isPending} />
      <footer className="record-form-footer">
        <button type="button" className="record-button" disabled={submit.isPending} onClick={onClose}>{t("field.seasons.cancel")}</button>
        <button type="submit" className="record-button record-primary" disabled={submit.isPending || (!pending && !seasons.data)}>
          {pending ? text("Gửi lại", "Retry") : text("Lưu khai báo", "Save declaration")}
        </button>
      </footer>
    </form>
  </RecordDialog>;
}
