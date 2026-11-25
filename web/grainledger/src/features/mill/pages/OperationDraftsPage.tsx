import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ledgerEndpoints, type CorrectionOperation, type SetupApiResponse } from "@/api/ledger";
import { collectPages, type ApiPage } from "@/api/query";
import { confirmAction } from "@/app/store/feedbackStore";
import { useCommand } from "@/shared/hooks/useCommand";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { toDecimal } from "@/shared/utils/decimalMass";
import { millPaths } from "../paths";

const scope = ["operation-drafts"];
const kinds = ["DRYING", "MILLING", "MERGE", "BLENDING", "BAGGING"];
const rice = ["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE"];
const massPattern = "[0-9]{1,14}([.][0-9]{1,6})?";
const localTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const positionKey = (lotId: string, locationId: string) => `${lotId}:${locationId}`;

interface InputLot {
  id: string;
  code: string;
  stage: string;
  commodityId: string;
  productIdentity: string;
  positions: { locationId: string; facilityId: string; availableKg: string; poolRevision?: number }[];
}

export function OperationDraftsPage() {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [id, setId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const setup = useQuery({ queryKey: ["ledger-facility-setup"], queryFn: ledgerEndpoints.getSetup });
  const drafts = useQuery({
    queryKey: [...scope, "queue", page],
    queryFn: async () => await ledgerEndpoints.getOperations({ status: "DRAFT", page, pageSize: 20 }) as ApiPage<CorrectionOperation>,
  });
  const detail = useQuery({
    queryKey: [...scope, "detail", id],
    queryFn: async () => await ledgerEndpoints.getOperation(id!) as CorrectionOperation,
    enabled: Boolean(id),
  });
  const removal = useMutation({
    mutationFn: (row: CorrectionOperation) => ledgerEndpoints.deleteOperation(row.id, { version: row.version }),
    onSuccess: () => {
      setId(null);
      setNotice(text("Đã bỏ bản nháp.", "Draft removed."));
      void client.invalidateQueries({ queryKey: scope });
    },
  });
  const selected = detail.data;
  const canOpenEditor = id === "" || (id && selected?.canEdit && selected.status === "DRAFT" && !selected.boundCorrectionId);

  return <Workflow title={text("Công đoạn nhiều lô và bản nháp", "Multi-lot operations and drafts")} actions={<div className="flex flex-wrap gap-3">
    <Link to={millPaths.operation}>{text("Ghi công đoạn đơn", "Single-lot entry")}</Link>
    <Link to={millPaths.varianceReview}>{text("Hàng đợi duyệt và chốt", "Review and commit queue")}</Link>
  </div>}>
    {notice && <p role="status">{notice}</p>}
    <Panel title={text("Bản nháp chế biến", "Processing drafts")}>
      <button type="button" onClick={() => { setId(""); setNotice(""); }}>{text("Tạo bản nháp", "New draft")}</button>
      <Feedback error={drafts.error ?? removal.error} pending={drafts.isPending || removal.isPending} />
      {drafts.data?.items.length === 0 && <p>{text("Chưa có bản nháp trong trang này.", "No drafts on this page.")}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">{drafts.data?.items.map(row => <li key={row.id}>
        <button type="button" disabled={removal.isPending} aria-pressed={id === row.id} className="w-full text-start"
          onClick={() => { setId(row.id); setNotice(""); }}>
          {row.kind} · {row.outputs.map(output => output.code ?? output.stage).join(", ")}
          <span className="block text-xs text-ink-secondary">{row.varianceKg ?? "—"} kg · {new Date(row.occurredAt).toLocaleString()}</span>
        </button>
      </li>)}</ul>
      <div className="flex gap-2">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>{text("Trang trước", "Previous")}</button>
        <button type="button" disabled={!drafts.data?.hasMore} onClick={() => setPage(page + 1)}>{text("Trang sau", "Next")}</button>
      </div>
    </Panel>
    <Feedback error={setup.error ?? detail.error} pending={setup.isPending || detail.isFetching} />
    {selected && <Panel title={text("Chi tiết bản nháp", "Draft details")}>
      <p>{selected.kind} · {selected.version} · {selected.status}</p>
      <p>{text("Chênh lệch / dung sai", "Variance / tolerance")} · {selected.varianceKg ?? "—"} / {selected.allowedVarianceKg ?? "—"} kg</p>
      {!selected.canEdit && <p>{text("Bản nháp thuộc một nhân viên khác.", "This draft belongs to another operator.")}</p>}
      {selected.boundCorrectionId && <Link to={millPaths.reconciliation.replace(":id", encodeURIComponent(selected.boundCorrectionId))}>
        {text("Mở hồ sơ hiệu chỉnh", "Open correction workbench")}
      </Link>}
      {selected.canDelete && <button type="button" disabled={removal.isPending} onClick={() => void (async () => {
        if (await confirmAction({ title: text("Bỏ bản nháp này?", "Remove this draft?"), variant: "danger" })) removal.mutate(selected);
      })()}>{text("Bỏ bản nháp", "Remove draft")}</button>}
    </Panel>}
    {canOpenEditor && setup.data && <DraftEditor key={selected ? `${selected.id}:${selected.version}` : "new"} setup={setup.data} draft={selected}
      saved={record => {
        client.setQueryData([...scope, "detail", record.id], record);
        setId(record.id);
        setNotice(text("Đã lưu bản nháp. Mở hàng đợi để duyệt hoặc chốt.", "Draft saved. Use the queue to review or commit."));
        void client.invalidateQueries({ queryKey: scope });
        void client.invalidateQueries({ queryKey: ["operation-variance"] });
      }} />}
  </Workflow>;
}

function DraftEditor({ setup, draft, saved }: { setup: SetupApiResponse; draft?: CorrectionOperation; saved: (draft: CorrectionOperation) => void }) {
  const text = useWorkflowText();
  const [facilityId, setFacility] = useState(draft?.facilityId ?? "");
  const [ownerId, setOwner] = useState(draft?.ownerId ?? "");
  return <Panel title={draft ? text("Chỉnh sửa công đoạn", "Edit processing draft") : text("Công đoạn mới", "New processing draft")}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>{text("Cơ sở", "Facility")}
        <select value={facilityId} disabled={Boolean(draft)} onChange={e => setFacility(e.target.value)}>
          <option value="">—</option>{setup.facilities?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>
      <label>{text("Chủ hàng", "Stock owner")}
        <select value={ownerId} disabled={Boolean(draft)} onChange={e => setOwner(e.target.value)}>
          <option value="">—</option>{ownerId && !setup.owners?.some(row => row.id === ownerId) && <option value={ownerId}>{ownerId}</option>}
          {setup.owners?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>
    </div>
    {facilityId && ownerId && <OperationForm key={`${facilityId}:${ownerId}`}
      setup={setup} facilityId={facilityId} ownerId={ownerId} draft={draft} saved={saved} />}
  </Panel>;
}

function OperationForm({ setup, facilityId, ownerId, draft, saved }: {
  setup: SetupApiResponse; facilityId: string; ownerId: string; draft?: CorrectionOperation; saved: (row: CorrectionOperation) => void;
}) {
  const text = useWorkflowText();
  const [kind, setKind] = useState(draft?.kind ?? "DRYING");
  const [inputs, setInputs] = useState(() => (draft?.inputs ?? [{ lotId: "", locationId: "", quantityKg: "" }])
    .map(row => ({ key: crypto.randomUUID(), position: positionKey(row.lotId, row.locationId), mass: row.quantityKg })));
  const [outputs, setOutputs] = useState(() => draft?.outputs.map(row => ({ key: crypto.randomUUID(), row })) ??
    [{ key: crypto.randomUUID(), row: null as CorrectionOperation["outputs"][number] | null }]);
  const lots = useQuery({
    queryKey: [...scope, "stock", facilityId, ownerId],
    queryFn: () => collectPages<InputLot>(async paging => await ledgerEndpoints.getLots({ ...paging, facilityId, ownerId }) as ApiPage<InputLot>),
  });
  const locations = setup.locations?.filter(row => row.facilityId === facilityId && row.kind !== "ISOLATION") ?? [];
  const positions = (lots.data ?? []).filter(lot => kind === "DRYING" ? lot.stage === "RAW_PADDY"
    : kind === "MILLING" ? lot.stage === "DRIED_PADDY" : kind === "MERGE" || rice.includes(lot.stage))
    .flatMap(lot => lot.positions.filter(pos => pos.facilityId === facilityId)
      .map(pos => ({ ...pos, lot, key: positionKey(lot.id, pos.locationId) })));
  const first = positions.find(row => row.key === inputs[0]?.position);
  const stages = kind === "DRYING" ? ["DRIED_PADDY"] : kind === "MILLING" ? ["HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK"]
    : kind === "BLENDING" ? ["BLENDED_RICE"] : kind === "BAGGING" ? ["BAGGED_RICE"] : first ? [first.lot.stage] : [];
  const command = useCommand(async (id, fields: Omit<CorrectionOperation, "id" | "version" | "status">) => {
    const result = draft
      ? await ledgerEndpoints.updateOperation(draft.id, { ...fields, version: draft.version })
      : await ledgerEndpoints.recordOperation({ ...fields, id });
    saved(result as CorrectionOperation);
  }, () => {});
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (command.isPending || !first || !lots.data) return;
    setMessage("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const allocations = [];
    for (const input of inputs) {
      const position = positions.find(pos => pos.key === input.position);
      const mass = toDecimal(input.mass);
      if (!position || mass.lte(0) || mass.gt(position.availableKg) ||
        (kind !== "BLENDING" && position.lot.commodityId !== first.lot.commodityId) ||
        ((kind === "MERGE" || kind === "BAGGING") && position.lot.productIdentity !== first.lot.productIdentity) ||
        (kind === "MERGE" && position.lot.stage !== first.lot.stage)) {
        setMessage(text("Kiểm tra khối lượng khả dụng và sự tương thích của các lô đầu vào.", "Check available quantities and input lot compatibility."));
        return;
      }
      allocations.push({ lotId: position.lot.id, locationId: position.locationId, quantityKg: mass.toFixed(),
        ...(position.poolRevision != null ? { poolRevision: position.poolRevision } : {}) });
    }
    if (new Set(inputs.map(input => input.position)).size !== inputs.length) {
      setMessage(text("Mỗi vị trí của một lô chỉ được dùng một lần.", "Use each lot position once."));
      return;
    }
    const commodityId = kind === "BLENDING" ? value("commodityId") : first.lot.commodityId;
    const products = outputs.map(({ key, row }) => {
      const stage = value(`stage-${key}`);
      const productIdentity = kind === "MERGE" || kind === "BAGGING" ? first.lot.productIdentity : stage;
      const sameIdentity = row && row.stage === stage && row.productIdentity === productIdentity && row.commodityId === commodityId;
      return { id: sameIdentity ? row.id : key, commodityId, stage, productIdentity,
        originalLotId: sameIdentity ? row.originalLotId : undefined,
        locationId: value(`location-${key}`), quantityKg: value(`mass-${key}`) };
    });
    if (products.some(product => toDecimal(product.quantityKg).lte(0))) {
      setMessage(text("Nhập khối lượng dương cho mọi đầu ra.", "Enter a positive mass for every output."));
      return;
    }
    command.submit({
      facilityId, ownerId, kind, equipmentId: value("equipmentId"), occurredAt: new Date(value("occurredAt")).toISOString(),
      inputs: allocations, outputs: products, declaredLossKg: value("loss"), declaredLossReason: value("reason"),
    });
  }

  return <form method="post" className="space-y-4" onSubmit={submit}>
    <fieldset disabled={command.isPending || lots.isPending} className="space-y-4">
      <legend className="sr-only">{text("Dữ liệu công đoạn", "Processing inputs")}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>{text("Công đoạn", "Operation")} *
          <select value={kind} onChange={e => setKind(e.target.value)}>{kinds.map(value => <option key={value}>{value}</option>)}</select>
        </label>
        <label>{text("Thiết bị", "Equipment")} *
          <select name="equipmentId" defaultValue={draft?.equipmentId ?? ""} required>
            <option value="" disabled>—</option>{setup.equipment?.filter(row => row.facilityId === facilityId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label>{text("Thực hiện lúc", "Occurred at")} *<input type="datetime-local" name="occurredAt" required defaultValue={localTime(draft?.occurredAt ?? new Date().toISOString())} /></label>
      </div>
      <fieldset className="space-y-2">
        <legend className="font-semibold">{text("Phân bổ đầu vào", "Input allocations")}</legend>
        {inputs.map((input, index) => <fieldset key={input.key} className="grid gap-3 rounded-lg border border-ink-tertiary/20 p-3 sm:grid-cols-[2fr_1fr_auto]">
          <legend>{text("Đầu vào", "Input")} {index + 1}</legend>
          <label>{text("Lô và vị trí", "Lot position")} *
            <select required value={positions.some(row => row.key === input.position) ? input.position : ""} onChange={e =>
              setInputs(rows => rows.map(row => row.key === input.key ? { ...row, position: e.target.value } : row))}>
              <option value="" disabled>—</option>
              {positions.map(row => <option key={row.key} value={row.key} disabled={inputs.some(other => other.key !== input.key && other.position === row.key)}>
                {row.lot.code} · {locations.find(l => l.id === row.locationId)?.name ?? row.locationId} · {row.availableKg} kg
              </option>)}
            </select>
          </label>
          <label>{text("Khối lượng (kg)", "Mass (kg)")} *
            <input required pattern={massPattern} inputMode="decimal" value={input.mass} onChange={e =>
              setInputs(rows => rows.map(row => row.key === input.key ? { ...row, mass: e.target.value } : row))} />
          </label>
          {inputs.length > 1 && <button type="button" className="self-end" onClick={() => setInputs(rows => rows.filter(row => row.key !== input.key))}>{text("Bỏ", "Remove")}</button>}
        </fieldset>)}
        <button type="button" onClick={() => setInputs(rows => [...rows, { key: crypto.randomUUID(), position: "", mass: "" }])}>{text("Thêm đầu vào", "Add input")}</button>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-semibold">{text("Đầu ra theo sản phẩm và vị trí", "Outputs by product and position")}</legend>
        {kind === "BLENDING" && <label>{text("Mặt hàng đầu ra", "Output commodity")} *
          <select name="commodityId" required defaultValue={draft?.outputs[0]?.commodityId ?? ""}>
            <option value="" disabled>—</option>{setup.commodities?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>}
        {outputs.map(({ key, row }, index) => <fieldset key={key} className="grid gap-3 rounded-lg border border-ink-tertiary/20 p-3 sm:grid-cols-3">
          <legend>{text("Đầu ra", "Output")} {index + 1} {row?.code}</legend>
          <label>{text("Giai đoạn", "Stage")} *
            <select key={stages.join(",")} name={`stage-${key}`} required defaultValue={row && stages.includes(row.stage) ? row.stage : stages[0] ?? ""}>
              {!stages.length && <option value="" disabled>—</option>}{stages.map(stage => <option key={stage}>{stage}</option>)}
            </select>
          </label>
          <label>{text("Vị trí", "Location")} *
            <select name={`location-${key}`} required defaultValue={row?.locationId ?? ""}>
              <option value="" disabled>—</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label>{text("Khối lượng (kg)", "Mass (kg)")} *<input name={`mass-${key}`} required pattern={massPattern} inputMode="decimal" defaultValue={row?.quantityKg} /></label>
          {outputs.length > 1 && <button type="button" onClick={() => setOutputs(rows => rows.filter(item => item.key !== key))}>{text("Bỏ đầu ra", "Remove output")}</button>}
        </fieldset>)}
        <button type="button" onClick={() => setOutputs(rows => [...rows, { key: crypto.randomUUID(), row: null }])}>{text("Thêm đầu ra", "Add output")}</button>
      </fieldset>
      <label>{text("Hao hụt khai báo (kg)", "Declared loss (kg)")} *<input name="loss" required pattern={massPattern} inputMode="decimal" defaultValue={draft?.declaredLossKg ?? "0"} /></label>
      <label>{text("Lý do hao hụt", "Loss reason")}<textarea name="reason" defaultValue={draft?.declaredLossReason} /></label>
    </fieldset>
    {message && <p role="alert" className="text-accent-danger">{message}</p>}
    <Feedback error={lots.error ?? command.error} pending={lots.isPending || command.isPending} />
    <button type="submit" disabled={command.isPending || lots.isPending}>{text("Lưu bản nháp", "Save draft")}</button>
  </form>;
}
