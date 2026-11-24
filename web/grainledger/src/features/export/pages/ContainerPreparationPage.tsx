import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  containerPreparationEndpoints as preparation,
  type ContainerPreparation,
  type PreparationLine,
} from "@/api/containerPreparation";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { pageItems } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { ContainerCommandFeedback } from "../components/ContainerCommandFeedback";
import { useContainerCommand } from "../hooks/useContainerCommand";

const pageSize = 25;
const massPattern = String.raw`[0-9]{1,14}(\.[0-9]{1,6})?`;
const blankLine = (): PreparationLine => ({ lotId: "", locationId: "", quantityKg: "" });

export function ContainerPreparationPage() {
  const text = useWorkflowText();
  const user = useAuthStore(state => state.user);
  const cache = useQueryClient();
  const canWrite = user?.role === "CUSTOMER_EXPORT_OFFICER" && user.permissions.includes("containers.write");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const list = useQuery({
    queryKey: ["container-preparation", user?.id, page, search],
    queryFn: () => preparation.list({ page, pageSize, search: search.trim() }),
  });
  const lookups = useQuery({
    queryKey: ["container-preparation-lookups", user?.id],
    queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse,
    enabled: Boolean(canWrite),
  });
  return (
    <Workflow title={text("Chuẩn bị container", "Container preparation")} description={text(
      "Lập và kiểm tra bản nháp chuẩn bị. Thực xếp và đóng niêm được ghi tại quy trình Xuất khẩu đã có phê duyệt.",
      "Prepare and check loading drafts. Record actual loading and closure through approved Export execution.",
    )}>
      <Panel title={text("Danh sách chuẩn bị", "Preparation list")}>
        <label>{text("Tìm mã container", "Find container code")}
          <input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        </label>
        <Feedback error={list.error} pending={list.isPending} />
        {list.data?.items.length === 0 && <p>{text("Không có container trong phạm vi truy cập.", "No containers in this scope.")}</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.data?.items.map(item => (
            <li key={item.id}><button type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} className="w-full text-start aria-pressed:border-accent-primary">
              {item.code} · {item.status} · {item.targetKg} kg
            </button></li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={page === 1 || list.isFetching} onClick={() => setPage(page - 1)}>{text("Trang trước", "Previous page")}</button>
          <button type="button" disabled={!list.data?.hasMore || list.isFetching} onClick={() => setPage(page + 1)}>{text("Trang sau", "Next page")}</button>
          {canWrite && <button type="button" aria-expanded={createOpen} onClick={() => setCreateOpen(!createOpen)}>
            {text("Tạo bản chuẩn bị", "Create preparation")}
          </button>}
        </div>
      </Panel>
      {canWrite && createOpen && (
        <CreatePreparation lookups={lookups.data} error={lookups.error} onSaved={async id => {
          setSelected(id);
          setCreateOpen(false);
          await cache.invalidateQueries({ queryKey: ["container-preparation"] });
        }} />
      )}
      {selected && <PreparationDetail key={selected} id={selected} canWrite={Boolean(canWrite)} />}
    </Workflow>
  );
}

function CreatePreparation({ lookups, error, onSaved }: { lookups?: SetupApiResponse; error: Error | null; onSaved: (id: string) => Promise<void> }) {
  const text = useWorkflowText();
  const [id] = useState(() => crypto.randomUUID());
  const [code, setCode] = useState("");
  const [facility, setFacility] = useState("");
  const [target, setTarget] = useState("");
  const command = useContainerCommand((requestId, input: { code: string; facilityId: string; targetKg: string }) =>
    preparation.create({ id, requestId, ...input }), () => onSaved(id));
  return (
    <Panel title={text("Tạo bản chuẩn bị container", "Create container preparation")}>
      <Feedback error={error} pending={!lookups && !error} />
      <form onSubmit={event => {
        event.preventDefault();
        if (code.trim() && /[1-9]/.test(target)) command.submit({ code: code.trim(), facilityId: facility, targetKg: target });
      }}>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={!lookups || command.isPending || command.uncertain}>
          <label>{text("Mã nội bộ", "Internal code")}<input required maxLength={80} value={code} onChange={event => setCode(event.target.value)} /></label>
          <label>{text("Cơ sở xếp hàng", "Loading facility")}
            <select required value={facility} onChange={event => setFacility(event.target.value)}>
              <option value="">{text("Chọn cơ sở", "Select facility")}</option>
              {lookups?.facilities?.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>{text("Khối lượng mục tiêu (kg)", "Target mass (kg)")}<input inputMode="decimal" pattern={massPattern} required value={target} onChange={event => setTarget(event.target.value)} /></label>
          <button type="submit" className="self-end" disabled={!code.trim() || !/[1-9]/.test(target)}>{text("Tạo", "Create")}</button>
        </fieldset>
      </form>
      <ContainerCommandFeedback error={command.error} uncertain={command.uncertain} retry={command.retry} success={command.isSuccess} />
    </Panel>
  );
}

type PreparationCommand =
  | { action: "metadata"; body: Omit<Parameters<typeof preparation.updateMetadata>[1], "requestId"> }
  | { action: "draft"; body: Omit<Parameters<typeof preparation.saveDraft>[1], "requestId"> };

function PreparationDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const [historyPage, setHistoryPage] = useState(1);
  const [checkKey, setCheckKey] = useState<{ draftId?: string; index: number } | null>(null);
  const current = useQuery({ queryKey: ["preparation-detail", id], queryFn: () => preparation.detail(id) });
  const history = useQuery({
    queryKey: ["preparation-history", id, historyPage],
    queryFn: () => preparation.history(id, { page: historyPage, pageSize }),
  });
  const check = useQuery({
    queryKey: ["preparation-check", id, current.data?.version, checkKey],
    queryFn: () => checkKey?.draftId ? preparation.checkLoading(id, checkKey.draftId) : preparation.checkClosure(id),
    enabled: Boolean(checkKey),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const command = useContainerCommand<PreparationCommand>((requestId, input) =>
    input.action === "metadata" ? preparation.updateMetadata(id, { ...input.body, requestId }) : preparation.saveDraft(id, { ...input.body, requestId }), async () => {
      setCheckKey(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["container-preparation"] }),
        cache.invalidateQueries({ queryKey: ["preparation-detail", id] }),
        cache.invalidateQueries({ queryKey: ["preparation-history", id] }),
      ]);
    });
  const data = current.data;
  const runCheck = (draftId?: string) => setCheckKey(previous => ({ draftId, index: (previous?.index ?? 0) + 1 }));
  const blocked = current.isFetching || command.isPending || command.uncertain;
  return (
    <Panel title={data?.code ?? text("Chi tiết chuẩn bị", "Preparation detail")}>
      <Feedback error={current.error} pending={current.isPending} />
      {data && <>
        <p>{data.status} · {data.targetKg} kg</p>
        {canWrite && <PreparationForms key={data.version} data={data} disabled={blocked} submit={command.submit} />}
        <ContainerCommandFeedback error={command.error} uncertain={command.uncertain} retry={command.retry} success={command.isSuccess} />
        <ul className="space-y-2">
          {data.drafts.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3">
            <span>{new Date(item.loadedAt).toLocaleString()} · {item.totalKg} kg</span>
            <button type="button" disabled={check.isFetching || blocked} onClick={() => runCheck(item.id)}>{text("Kiểm tra bản nháp", "Check loading draft")}</button>
          </li>)}
        </ul>
        <button type="button" disabled={check.isFetching || blocked} onClick={() => runCheck()}>{text("Kiểm tra trước đóng niêm", "Check before closure")}</button>
        <Feedback error={check.error} pending={check.isFetching} />
        {check.data && <ul className="list-disc space-y-1 ps-5">{check.data.findings.map(finding => <li key={finding.code}>{finding.message}</li>)}</ul>}
      </>}
      <details>
        <summary>{text("Lịch sử chuẩn bị", "Preparation history")}</summary>
        <Feedback error={history.error} pending={history.isPending} />
        <ul>{history.data?.items.map(event => <li key={event.id}>{event.kind} · {new Date(event.recorded_at).toLocaleString()}</li>)}</ul>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={historyPage === 1 || history.isFetching} onClick={() => setHistoryPage(historyPage - 1)}>{text("Trang trước", "Previous page")}</button>
          <button type="button" disabled={!history.data?.hasMore || history.isFetching} onClick={() => setHistoryPage(historyPage + 1)}>{text("Trang sau", "Next page")}</button>
        </div>
      </details>
    </Panel>
  );
}

function PreparationForms({ data, disabled, submit }: { data: ContainerPreparation; disabled: boolean; submit: (input: PreparationCommand) => void }) {
  const text = useWorkflowText();
  const [number, setNumber] = useState(data.containerNumber ?? "");
  const [seal, setSeal] = useState(data.sealNumber ?? "");
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [loadedAt, setLoadedAt] = useState("");
  const [lines, setLines] = useState<PreparationLine[]>([blankLine()]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [search, setSearch] = useState("");
  const lots = useQuery({
    queryKey: ["preparation-load-positions", data.facilityId, search],
    queryFn: async () => pageItems<{ id: string; code: string; positions: (PreparationLine & { facilityId: string; availableKg: string })[] }>(
      await ledgerEndpoints.getLots({ facilityId: data.facilityId, search: search.trim(), pageSize: 50, availableOnly: "true" }),
    ),
    enabled: draftOpen,
  });
  const positions = (lots.data ?? []).flatMap(lot => lot.positions.filter(position => position.facilityId === data.facilityId && /[1-9]/.test(position.availableKg))
    .map(position => ({ ...position, lotId: lot.id, code: lot.code })));
  const positionKey = (line: PreparationLine) => line.lotId && line.locationId ? `${line.lotId}:${line.locationId}` : "";
  const changeLine = (index: number, values: Partial<PreparationLine>) => setLines(prev => prev.map((line, i) => index === i ? { ...line, ...values } : line));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (new Set(lines.map(positionKey)).size !== lines.length) return;
    submit({ action: "draft", body: {
      version: data.version,
      draftId,
      loadedAt: new Date(loadedAt).toISOString(),
      lines: lines.map(({ lotId, locationId, quantityKg, poolRevision }) => ({
        lotId, locationId, quantityKg, ...(poolRevision != null && { poolRevision }),
      })),
    } });
  }
  return (
    <>
      <form onSubmit={event => {
        event.preventDefault();
        submit({ action: "metadata", body: { version: data.version, orderId: data.orderId, containerNumber: number.trim() || null, sealNumber: seal.trim() || null } });
      }}>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled}>
          <label>{text("Số container", "Container number")}<input value={number} onChange={event => setNumber(event.target.value)} /></label>
          <label>{text("Số chì niêm phong", "Seal number")}<input value={seal} onChange={event => setSeal(event.target.value)} /></label>
          <button type="submit">{text("Lưu thông tin", "Save metadata")}</button>
        </fieldset>
      </form>
      {data.preparationVersion === 2 && <>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => { setDraftId(crypto.randomUUID()); setLoadedAt(""); setLines([blankLine()]); setDraftOpen(true); }}>{text("Thêm bản nháp", "New draft")}</button>
          {data.drafts.map((draft, index) => <button type="button" key={draft.id} disabled={disabled} onClick={() => {
            const date = new Date(draft.loadedAt);
            setDraftId(draft.id);
            setLoadedAt(new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19));
            setLines(draft.lines);
            setDraftOpen(true);
          }}>{text("Sửa nháp", "Edit draft")} {index + 1}</button>)}
        </div>
        {draftOpen && <form onSubmit={save} className="space-y-3">
          <fieldset disabled={disabled} className="space-y-3">
            <legend>{text("Bản nháp xếp hàng", "Loading draft")}</legend>
            <label>{text("Thời điểm dự kiến", "Loading time")}<input type="datetime-local" step="1" required value={loadedAt} onChange={event => setLoadedAt(event.target.value)} /></label>
            <label>{text("Tìm lô khả dụng", "Find available lots")}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <Feedback error={lots.error} pending={lots.isFetching} />
            {lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <label>{text("Lô và vị trí", "Lot and location")}
                <select value={positionKey(line)} required onChange={event => {
                  const position = positions.find(item => positionKey(item) === event.target.value);
                  if (position) changeLine(index, { lotId: position.lotId, locationId: position.locationId, poolRevision: position.poolRevision ?? undefined });
                  else changeLine(index, blankLine());
                }}>
                  <option value="">{text("Chọn vị trí tồn kho", "Select a stock position")}</option>
                  {line.lotId && !positions.some(item => positionKey(item) === positionKey(line)) && <option value={positionKey(line)}>{line.lotId} · {line.locationId}</option>}
                  {positions.map(item => <option key={positionKey(item)} value={positionKey(item)}>{item.code} · {item.locationId} · {item.availableKg} kg</option>)}
                </select>
              </label>
              <label>{text("Khối lượng (kg)", "Mass (kg)")}<input required inputMode="decimal" pattern={massPattern} value={line.quantityKg} onChange={event => changeLine(index, { quantityKg: event.target.value })} /></label>
              <button type="button" className="self-end" disabled={lines.length === 1} onClick={() => setLines(prev => prev.filter((_, i) => i !== index))}>{text("Bỏ dòng", "Remove line")}</button>
            </div>)}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={lines.length >= 100} onClick={() => setLines(prev => [...prev, blankLine()])}>{text("Thêm dòng", "Add line")}</button>
              <button type="submit" disabled={new Set(lines.map(positionKey)).size !== lines.length || lines.some(line => !/[1-9]/.test(line.quantityKg))}>{text("Lưu bản nháp", "Save draft")}</button>
            </div>
          </fieldset>
        </form>}
      </>}
    </>
  );
}
