import { useId, useState, type FormEvent } from "react";
import { ArrowLeft, ClockCounterClockwise, Handshake, MagnifyingGlass, Plus, TestTube } from "@phosphor-icons/react";
import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { sampleEndpoints, type CaptureSampleRequest, type RecordSampleHandoverRequest } from "@/api/compliance";
import { procurementEndpoints, type ProcurementListResponse } from "@/api/procurement";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { selectSessionOwner } from "@/app/store/sessionOwner";
import { RecordDialog, RecordEmpty, RecordFeedback, RecordPagination, RecordRefresh, RecordSuccess, RecordTable, RecordWorkspace } from "@/shared/ui/RecordWorkspace";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { captureWasRejected, loadPendingCapture, submitPendingCapture } from "../offline/pendingCapture";
import { fieldPaths, sourceLotPath } from "../paths";

const key = ["field-samples"];
const kinds = {
  HANDOVER: ["Bàn giao mẫu", "Sample handover"],
  LAB_DISPATCH: ["Gửi đến phòng xét nghiệm", "Laboratory dispatch"],
  LAB_ACKNOWLEDGEMENT: ["Phòng xét nghiệm xác nhận nhận mẫu", "Laboratory acknowledgement"],
} as const;

export function FieldSampleRegistrationPage() {
  const { i18n } = useTranslation();
  const text = useWorkflowText();
  const listTitleId = useId();
  const client = useQueryClient();
  const fetching = useIsFetching({ queryKey: key, type: "active" });
  const [params, setParams] = useSearchParams();
  const sourceLotId = params.get("sourceLotId") || "";
  const selected = params.get("sampleId") || "";
  const user = useAuthStore(s => s.user);
  const owner = useAuthStore(selectSessionOwner);
  const canWrite = user?.permissions.includes("purchases.write");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get("create") === "1");
  const listTitle = text("Danh sách mẫu", "Samples");
  const dateTime = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const list = useQuery({
    queryKey: [...key, "list", sourceLotId, page],
    queryFn: () => sampleEndpoints.getSamples(sourceLotId ? { sourceLotId, page, pageSize: 20 } : { page, pageSize: 20 }),
    enabled: !selected,
  });
  function select(id: string) {
    const next = new URLSearchParams(params);
    next.delete("create");
    if (id) next.set("sampleId", id);
    else next.delete("sampleId");
    setParams(next);
  }
  function closeEditor() {
    setCreating(false);
    if (params.has("create")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      setParams(next, { replace: true });
    }
  }

  return <RecordWorkspace section={text("Quản lý mẫu niêm phong", "Sealed samples")}
    title={text("Lấy mẫu và bàn giao", "Sample collection and custody")}
    description={text("Ghi nhận mẫu theo lô nguồn và theo dõi lịch sử bàn giao.", "Record samples by source lot and track their handover history.")}
    actions={<>
      {selected && <button type="button" className="record-button rounded-full" onClick={() => select("")}>
        <ArrowLeft size={16} aria-hidden="true" />{text("Về danh sách mẫu", "Back to samples")}
      </button>}
      <RecordRefresh pending={fetching > 0} onRefresh={() => { void client.refetchQueries({ queryKey: key, type: "active" }); }} />
      {canWrite && !selected && <button type="button" className="record-button record-primary rounded-full" onClick={() => setCreating(true)}>
        <Plus size={16} weight="bold" aria-hidden="true" />{text("Lấy mẫu", "Collect sample")}
      </button>}
    </>}>
    {sourceLotId && <Link className="record-link inline-flex items-center gap-1.5" to={sourceLotPath(sourceLotId)}>
      <ArrowLeft size={14} aria-hidden="true" />{text("Về lô nguồn", "Back to source lot")}
    </Link>}
    {selected ? <SampleDetail key={selected} sampleId={selected} storageKey={canWrite && owner ? `grainledger:handover:${owner}:${selected}` : undefined} />
      : <section className="record-card rounded-xl" aria-labelledby={listTitleId}>
        <header className="record-card-header">
          <h2 id={listTitleId} className="record-card-title"><TestTube size={20} aria-hidden="true" className="text-accent-primary" />{listTitle}</h2>
          {sourceLotId && <Link className="record-link" to={fieldPaths.samples} onClick={() => setPage(1)}>{text("Xem tất cả mẫu", "Show all samples")}</Link>}
        </header>
        <RecordFeedback error={list.error} pending={list.isPending} label={text("Đang tải danh sách mẫu…", "Loading samples…")} />
        {list.data && <>
          {list.data.items.length ? <RecordTable labelledBy={listTitleId}>
            <thead><tr>
              <th scope="col">{text("Mẫu", "Sample")}</th>
              <th scope="col">{text("Niêm phong", "Seal")}</th>
              <th scope="col">{text("Lấy lúc", "Collected at")}</th>
              <th scope="col" className="text-end">{text("Lần bàn giao", "Handovers")}</th>
            </tr></thead>
            <tbody>{list.data.items.map(row => <tr key={row.id}>
              <th scope="row" className="whitespace-nowrap">
                <button type="button" className="record-row-action font-mono text-accent-primary" onClick={() => select(row.id)}>{row.code}</button>
              </th>
              <td className="font-mono [overflow-wrap:anywhere]">{row.sealCode}</td>
              <td><time dateTime={row.collectedAt}>{dateTime.format(new Date(row.collectedAt))}</time></td>
              <td className="text-end tabular-nums">{row.handoverCount}</td>
            </tr>)}</tbody>
          </RecordTable> : <RecordEmpty icon={<TestTube size={40} />}>{text("Chưa có mẫu.", "No samples found.")}</RecordEmpty>}
          <RecordPagination label={listTitle} page={page} hasMore={list.data.hasMore} onPage={setPage} />
        </>}
      </section>}
    {creating && canWrite && owner && <SampleEditor sourceLotId={sourceLotId} storageKey={`grainledger:sample:${owner}`}
      onClose={closeEditor} onSaved={id => { setCreating(false); select(id); }} />}
  </RecordWorkspace>;
}

function SampleEditor({ sourceLotId, storageKey, onClose, onSaved }: {
  sourceLotId: string; storageKey: string; onClose: () => void; onSaved: (id: string) => void;
}) {
  const text = useWorkflowText();
  const titleId = useId();
  const client = useQueryClient();
  const [pending, setPending] = useState(() => loadPendingCapture<CaptureSampleRequest>(storageKey));
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState("");
  const [lot, setLot] = useState(pending?.payload?.sourceLotId ?? sourceLotId);
  const direct = pending?.payload?.sourceLotId ?? sourceLotId;
  const directLot = useQuery({
    queryKey: ["procurement-source-lot", direct],
    queryFn: () => procurementEndpoints.getSourceLot(direct),
    enabled: Boolean(direct),
  });
  const receipts = useQuery({
    queryKey: [...key, "receipts", search],
    queryFn: async () => (await procurementEndpoints.getProcurements({ pageSize: 50, ...(search ? { search } : {}) })) as ProcurementListResponse,
    enabled: !direct,
  });
  const details = useQuery({
    queryKey: ["procurement-detail", receipt],
    queryFn: () => procurementEndpoints.getProcurement(receipt),
    enabled: Boolean(receipt && !direct),
  });
  const save = useMutation({
    mutationFn: (request: CaptureSampleRequest) => submitPendingCapture(storageKey, request, sampleEndpoints.createSample),
    onSuccess: (record) => {
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["procurement-source-lot", record.sourceLotId] });
      onSaved(record.id);
    },
    onError: (error) => { if (captureWasRejected(error)) setPending(null); },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lot || save.isPending) return;
    const data = new FormData(event.currentTarget);
    const capturedAt = new Date().toISOString();
    const request = pending ?? {
      deviceId: "grainledger-web", clientOperationId: crypto.randomUUID(), capturedAt, payloadSchemaVersion: 2,
      payload: {
        entityId: crypto.randomUUID(), sourceLotId: lot, code: null,
        sealCode: String(data.get("sealCode") ?? "").trim(),
        materialDescription: String(data.get("materialDescription") ?? "").trim() || null,
        collectedAt: new Date(String(data.get("collectedAt"))).toISOString(),
      },
    };
    setPending(request);
    save.mutate(request);
  }
  const title = text("Ghi nhận lấy mẫu", "Record sample collection");
  return <RecordDialog title={title} titleId={titleId} icon={<TestTube size={22} />} onClose={onClose} busy={save.isPending} wide>
    {direct ? <dl className="record-details [overflow-wrap:anywhere]"><div>
      <dt>{text("Lô nguồn", "Source lot")}</dt><dd className="font-mono">{directLot.data?.lotCode ?? direct}</dd>
    </div></dl> : <search className="record-filter space-y-3" aria-label={text("Tìm phiếu thu mua", "Find a procurement receipt")}>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
        event.preventDefault();
        setSearch(String(new FormData(event.currentTarget).get("search") ?? "").trim());
        setReceipt("");
        setLot("");
      }}>
        <label className="flex-1 basis-44">{text("Tìm phiếu thu mua", "Find a procurement receipt")}
          <span className="relative">
            <MagnifyingGlass size={16} aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input name="search" type="search" enterKeyHint="search" />
          </span>
        </label>
        <button type="submit" className="record-button record-primary">{text("Tìm", "Search")}</button>
      </form>
      <label>{text("Phiếu thu mua", "Procurement receipt")}
        <select name="receiptId" value={receipt} onChange={e => { setReceipt(e.target.value); setLot(""); }}>
          <option value="">—</option>
          {receipts.data?.items.map(row => <option key={row.id} value={row.id}>{row.code} · {row.farmerName}</option>)}
        </select>
      </label>
      {receipts.data?.hasMore && <p className="text-xs text-ink-secondary">{text("Dùng mã phiếu hoặc tên nông hộ để thu hẹp kết quả.", "Search by receipt code or farmer name to narrow the results.")}</p>}
    </search>}
    <Feedback error={directLot.error ?? receipts.error ?? details.error} pending={direct ? directLot.isPending : receipts.isPending || Boolean(receipt && details.isPending)} />
    <form method="post" aria-labelledby={titleId} onSubmit={submit} className="space-y-4">
      <fieldset disabled={Boolean(pending) || save.isPending} className="min-w-0 space-y-4">
        <legend className="sr-only">{text("Thông tin mẫu", "Sample information")}</legend>
        {!direct && <label>{text("Lô nguồn", "Source lot")} *
          <select name="sourceLotId" required value={lot} onChange={e => setLot(e.target.value)}>
            <option value="" disabled>—</option>
            {details.data?.items.map(row => <option key={row.sourceLotId} value={row.sourceLotId}>{row.lotCode} · {row.riceVariety}</option>)}
          </select>
        </label>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>{text("Mã niêm phong", "Seal code")} *<input name="sealCode" required defaultValue={pending?.payload?.sealCode ?? ""} /></label>
          <label>{text("Lấy mẫu lúc", "Collected at")} *<input name="collectedAt" type="datetime-local" required defaultValue={localDateTime(pending?.payload?.collectedAt)} /></label>
        </div>
        <label>{text("Mô tả mẫu", "Material description")}<textarea name="materialDescription" rows={3} defaultValue={pending?.payload?.materialDescription ?? ""} /></label>
      </fieldset>
      {pending && !save.isPending && <p role="status">{text("Gửi lại yêu cầu chờ với cùng mã thao tác.", "Retry the pending request with the same operation ID.")}</p>}
      <Feedback error={save.error} pending={save.isPending} />
      <footer className="record-form-footer">
        <button type="button" className="record-button" disabled={save.isPending} onClick={onClose}>{text("Hủy", "Cancel")}</button>
        <button type="submit" className="record-button record-primary" disabled={save.isPending || Boolean(direct && !pending && !directLot.data)}>{pending ? text("Gửi lại", "Retry") : text("Lưu mẫu", "Save sample")}</button>
      </footer>
    </form>
  </RecordDialog>;
}

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function SampleDetail({ sampleId, storageKey }: { sampleId: string; storageKey?: string }) {
  const { i18n } = useTranslation();
  const text = useWorkflowText();
  const titleId = useId();
  const historyId = useId();
  const dateTime = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const query = useQuery({ queryKey: [...key, "detail", sampleId], queryFn: () => sampleEndpoints.getSample(sampleId) });
  const handovers = useQuery({
    queryKey: [...key, "handovers", sampleId],
    queryFn: () => collectPages(paging => sampleEndpoints.getSampleHandovers(sampleId, paging)),
  });
  const row = query.data;
  return <>
    <RecordFeedback error={query.error} pending={query.isPending} label={text("Đang tải chi tiết mẫu…", "Loading sample details…")} />
    {row && <>
      <section className="record-card rounded-xl" aria-labelledby={titleId}>
        <header className="record-card-header">
          <h2 id={titleId} className="record-card-title [overflow-wrap:anywhere]"><TestTube size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />{row.code}</h2>
          <Link className="record-link" to={sourceLotPath(row.sourceLotId)}>{text("Xem lô nguồn", "View source lot")}</Link>
        </header>
        <div className="p-4 sm:p-5">
          <dl className="record-details [overflow-wrap:anywhere] sm:grid-cols-2">
            <div><dt>{text("Mã niêm phong", "Seal code")}</dt><dd className="font-mono">{row.sealCode}</dd></div>
            <div><dt>{text("Lấy mẫu lúc", "Collected at")}</dt><dd><time dateTime={row.collectedAt}>{dateTime.format(new Date(row.collectedAt))}</time></dd></div>
            {row.materialDescription && <div className="sm:col-span-2">
              <dt>{text("Mô tả mẫu", "Material description")}</dt><dd className="whitespace-pre-wrap">{row.materialDescription}</dd>
            </div>}
          </dl>
        </div>
      </section>
      <section className="record-card rounded-xl" aria-labelledby={historyId}>
        <header className="record-card-header">
          <h2 id={historyId} className="record-card-title"><ClockCounterClockwise size={20} className="text-accent-primary" aria-hidden="true" />{text("Lịch sử bàn giao", "Custody history")}</h2>
        </header>
        <RecordFeedback error={handovers.error} pending={handovers.isPending} label={text("Đang tải lịch sử bàn giao…", "Loading custody history…")} />
        {handovers.data && (handovers.data.length ? <ol className="divide-y divide-ink-tertiary/15">
          {handovers.data.map(item => {
            const references = [item.laboratoryName, item.laboratoryReference, item.laboratorySampleReference, item.evidenceRef].filter(Boolean);
            return <li key={item.id} className="space-y-1 px-4 py-3 text-sm [overflow-wrap:anywhere] sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <strong>{item.handoverKind && item.handoverKind in kinds
                  ? text(kinds[item.handoverKind as keyof typeof kinds][0], kinds[item.handoverKind as keyof typeof kinds][1])
                  : item.handoverKind}</strong>
                <time dateTime={item.handedOverAt} className="text-xs text-ink-secondary">{dateTime.format(new Date(item.handedOverAt))}</time>
              </div>
              <p>{item.fromParty} → {item.toParty} · {item.sealCondition}</p>
              {references.length > 0 && <p className="text-xs text-ink-secondary">{references.join(" · ")}</p>}
            </li>;
          })}
        </ol> : <RecordEmpty icon={<Handshake size={40} />}>{text("Chưa có bàn giao.", "No handovers recorded.")}</RecordEmpty>)}
      </section>
    </>}
    {row && storageKey && <HandoverEditor sampleId={sampleId} storageKey={storageKey} />}
  </>;
}

function HandoverEditor({ sampleId, storageKey }: { sampleId: string; storageKey: string }) {
  const text = useWorkflowText();
  const titleId = useId();
  const client = useQueryClient();
  const [pending, setPending] = useState(() => loadPendingCapture<RecordSampleHandoverRequest>(storageKey));
  const [kind, setKind] = useState(pending?.payload?.handoverKind ?? "HANDOVER");
  const defaults = pending?.payload;
  const [revision, setRevision] = useState(0);
  const save = useMutation({
    mutationFn: (request: RecordSampleHandoverRequest) => submitPendingCapture(storageKey, request, body => sampleEndpoints.recordSampleHandover(sampleId, body)),
    onSuccess: () => {
      setPending(null);
      setKind("HANDOVER");
      setRevision(n => n + 1);
      void client.invalidateQueries({ queryKey: key });
    },
    onError: (error) => { if (captureWasRejected(error)) setPending(null); },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const request = pending ?? {
      deviceId: "grainledger-web", clientOperationId: crypto.randomUUID(), capturedAt: new Date().toISOString(), payloadSchemaVersion: 1,
      payload: {
        entityId: crypto.randomUUID(), handoverKind: kind,
        fromParty: value("fromParty"), toParty: value("toParty"),
        handedOverAt: new Date(value("handedOverAt")).toISOString(),
        sealCondition: value("sealCondition"), evidenceRef: value("evidenceRef") || null,
        laboratoryName: value("laboratoryName") || null, laboratoryReference: value("laboratoryReference") || null,
        laboratorySampleReference: value("laboratorySampleReference") || null,
      },
    };
    setPending(request);
    save.mutate(request);
  }
  return <section className="record-card record-form" aria-labelledby={titleId}>
    <header className="record-card-header">
      <h2 id={titleId} className="record-card-title"><Handshake size={20} className="text-accent-primary" aria-hidden="true" />{text("Ghi nhận bàn giao", "Record handover")}</h2>
    </header>
    <form method="post" onSubmit={submit} key={revision} aria-labelledby={titleId} className="space-y-4 p-4 sm:p-5">
      <fieldset disabled={Boolean(pending) || save.isPending} className="min-w-0">
        <legend className="sr-only">{text("Thông tin bàn giao", "Handover information")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>{text("Loại bàn giao", "Handover kind")}
            <select name="handoverKind" value={kind} onChange={e => setKind(e.target.value)}>
              {Object.entries(kinds).map(([code, label]) => <option key={code} value={code}>{text(label[0], label[1])}</option>)}
            </select>
          </label>
          <label>{text("Bàn giao lúc", "Handed over at")} *<input name="handedOverAt" type="datetime-local" required defaultValue={localDateTime(defaults?.handedOverAt)} /></label>
          <label>{text("Bên giao", "From")} *<input name="fromParty" required defaultValue={defaults?.fromParty ?? ""} /></label>
          <label>{text("Bên nhận", "To")} *<input name="toParty" required defaultValue={defaults?.toParty ?? ""} /></label>
          <label>{text("Tình trạng niêm phong", "Seal condition")} *<input name="sealCondition" required defaultValue={defaults?.sealCondition ?? ""} /></label>
          <label>{text("Tham chiếu chứng cứ", "Evidence reference")}<input name="evidenceRef" defaultValue={defaults?.evidenceRef ?? ""} /></label>
          {kind !== "HANDOVER" && <>
            <label>{text("Phòng xét nghiệm", "Laboratory")} *<input name="laboratoryName" maxLength={200} required defaultValue={defaults?.laboratoryName ?? ""} /></label>
            <label>{text("Mã tiếp nhận xét nghiệm", "Laboratory reference")}<input name="laboratoryReference" maxLength={200} defaultValue={defaults?.laboratoryReference ?? ""} /></label>
            <label>{text("Mã mẫu tại phòng xét nghiệm", "Laboratory sample reference")}<input name="laboratorySampleReference" maxLength={200} defaultValue={defaults?.laboratorySampleReference ?? ""} /></label>
          </>}
        </div>
      </fieldset>
      <Feedback error={save.error} pending={save.isPending} />
      <RecordSuccess message={save.isSuccess ? text("Đã lưu bàn giao.", "Handover recorded.") : ""} />
      <footer className="record-form-footer">
        <button type="submit" className="record-button record-primary" disabled={save.isPending}>{pending ? text("Gửi lại bàn giao", "Retry handover") : text("Lưu bàn giao", "Save handover")}</button>
      </footer>
    </form>
  </section>;
}
