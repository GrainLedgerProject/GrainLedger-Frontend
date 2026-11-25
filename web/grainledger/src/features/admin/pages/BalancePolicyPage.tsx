import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { CorrectionEvidence, CorrectionEvidenceDownload } from "@/features/mill/components/CorrectionEvidence";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const setupKey = ["ledger-facility-setup"];
const operationKinds = ["DRYING", "MILLING", "MERGE", "BLENDING", "BAGGING"];
const blendProducts = ["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE"];
const stages = ["RAW_PADDY", "DRIED_PADDY", "HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK", "BLENDED_RICE", "BAGGED_RICE"];

export function BalancePolicyPage() {
  const text = useWorkflowText();
  const canConfigure = useAuthStore(s => s.user?.permissions.includes("platform.configure"));
  const setup = useQuery({ queryKey: setupKey, queryFn: ledgerEndpoints.getSetup });
  const organizations = useQuery({
    queryKey: ["admin-policy-organizations"],
    queryFn: adminEndpoints.getOrganizations,
    enabled: Boolean(canConfigure),
  });
  const [mode, setMode] = useState<"balance" | "blend" | "mixed">("balance");
  const title = {
    balance: text("Dung sai công đoạn", "Operation tolerance"),
    blend: text("Tương thích phối trộn", "Blend compatibility"),
    mixed: text("Tương thích lưu kho trộn", "Mixed-bulk storage compatibility"),
  };

  return <Workflow title={text("Chính sách cân bằng và lưu kho", "Balance and storage policies")}>
    <Feedback error={setup.error ?? organizations.error} pending={setup.isPending || Boolean(canConfigure && organizations.isPending)} />
    {setup.data && <>
      <label className="max-w-sm">{text("Loại chính sách", "Policy type")}
        <select name="policyType" value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
          {Object.entries(title).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <PolicyHistory mode={mode} setup={setup.data} title={title[mode]} />
      {canConfigure && organizations.data && <PolicyEditor key={mode} mode={mode}
        setup={setup.data} owners={organizations.data.filter(org => org.kind === "Customer")} />}
    </>}
  </Workflow>;
}

function PolicyHistory({ mode, setup, title }: { mode: "balance" | "blend" | "mixed"; setup: SetupApiResponse; title: string }) {
  const text = useWorkflowText();
  const name = (rows: { id: string; name: string }[] | undefined, id: string) => rows?.find(row => row.id === id)?.name ?? id;
  const rows = mode === "balance" ? setup.policies?.map(row => ({
    ...row, scope: name(setup.facilities, row.facilityId), description: `${row.kind} · ${row.tolerancePercent}%`,
  })) : mode === "blend" ? setup.compatibilities?.map(row => ({
    ...row, scope: name(setup.facilities, row.facilityId),
    description: `${(row.inputProducts ?? []).map(input => {
      const [id, product] = input.split(":");
      return `${name(setup.commodities, id)} · ${product}`;
    }).join(", ")} → ${name(setup.commodities, row.outputCommodityId)}`,
  })) : setup.mixedBulkPolicies?.map(row => ({
    ...row, scope: `${name(setup.locations, row.locationId)} · ${name(setup.owners, row.ownerId)}`,
    description: `${name(setup.commodities, row.commodityId)} · ${row.stage} · ${row.productIdentity}`,
  }));

  return <Panel title={title}>
    {rows?.length ? <div className="overflow-x-auto"><table>
      <thead><tr>
        <th scope="col">{text("Phạm vi", "Scope")}</th>
        <th scope="col">{text("Quy tắc", "Rule")}</th>
        <th scope="col">{text("Hiệu lực từ", "Effective from")}</th>
        <th scope="col">{text("Chứng cứ", "Evidence")}</th>
      </tr></thead>
      <tbody>{[...rows].sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom)).map(row => <tr key={row.id}>
        <th scope="row">{row.scope}</th><td>{row.description}</td>
        <td>{new Date(row.effectiveFrom).toLocaleString()}</td>
        <td>{row.evidenceId && <CorrectionEvidenceDownload id={row.evidenceId} />}</td>
      </tr>)}</tbody>
    </table></div> : <p>{text("Chưa có phiên bản chính sách trong phạm vi này.", "No policies have been recorded in this scope.")}</p>}
  </Panel>;
}

function PolicyEditor({ mode, setup, owners }: {
  mode: "balance" | "blend" | "mixed";
  setup: SetupApiResponse;
  owners: { id: string; name: string }[];
}) {
  const text = useWorkflowText();
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState("");
  const [locationId, setLocation] = useState("");
  const [ownerId, setOwner] = useState("");
  const [evidenceId, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [formRevision, setFormRevision] = useState(0);
  const [inputs, setInputs] = useState(() => [crypto.randomUUID()]);
  const facilityId = mode === "mixed" ? setup.locations?.find(row => row.id === locationId)?.facilityId ?? "" : facility;
  const save = useMutation({
    mutationFn: (command: () => Promise<unknown>) => command(),
    onSuccess: () => {
      setMessage(text("Đã ghi nhận phiên bản chính sách.", "Policy version recorded."));
      setEvidence("");
      setInputs([crypto.randomUUID()]);
      setFormRevision(n => n + 1);
      void queryClient.invalidateQueries({ queryKey: setupKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!facilityId || !ownerId || !evidenceId || save.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const base = { id: crypto.randomUUID(), evidenceId, effectiveFrom: new Date(value("effectiveFrom")).toISOString() };
    setMessage("");
    save.mutate(async () => {
      switch (mode) {
        case "balance":
          return ledgerEndpoints.createPolicy({ ...base, facilityId, kind: value("kind"), tolerancePercent: value("tolerancePercent") });
        case "blend": {
          const inputProducts = inputs.map(id => `${value(`commodity-${id}`)}:${value(`product-${id}`)}`);
          if (new Set(inputProducts).size !== inputProducts.length) {
            throw new Error(text("Mỗi cặp mặt hàng và sản phẩm đầu vào chỉ được chọn một lần.", "Select each input commodity and product pair only once."));
          }
          return ledgerEndpoints.createCompatibility({ ...base, facilityId, inputProducts, outputCommodityId: value("outputCommodityId") });
        }
        case "mixed":
          return ledgerEndpoints.createMixedBulkPolicy({ ...base, locationId, ownerId,
            commodityId: value("commodityId"), stage: value("stage"), productIdentity: value("productIdentity"),
            identityScopeConfirmed: true });
      }
    });
  }

  const commodities = setup.commodities ?? [];
  const commodityOptions = commodities.map(row => <option key={row.id} value={row.id}>{row.name}</option>);

  return <Panel title={text("Ghi phiên bản chính sách", "Record a policy version")}>
    <p className="text-sm text-ink-secondary">{text("Mỗi phiên bản có thời điểm hiệu lực và chứng cứ riêng. Khi có thay đổi, hãy ghi phiên bản mới.", "Each version has its own effective date and evidence. Record a new version when a rule changes.")}</p>
    <form method="post" onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-3" disabled={save.isPending}>
        <legend className="font-semibold">{text("Phạm vi chính sách", "Policy scope")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {mode === "mixed" ? <label>{text("Vị trí đã bật lưu kho trộn", "Mixed-bulk enabled location")} *
            <select name="locationId" required value={locationId} onChange={e => { setLocation(e.target.value); setEvidence(""); }}>
              <option value="" disabled>—</option>
              {setup.locations?.filter(row => row.mixedBulk).map(row => <option key={row.id} value={row.id}>
                {row.name} · {setup.facilities?.find(f => f.id === row.facilityId)?.name} · {row.kind}
              </option>)}
            </select>
          </label> : <label>{text("Cơ sở", "Facility")} *
            <select name="facilityId" required value={facility} onChange={e => { setFacility(e.target.value); setEvidence(""); }}>
              <option value="" disabled>—</option>
              {setup.facilities?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>}
          <label>{text("Doanh nghiệp sở hữu chứng cứ", "Evidence owner")} *
            <select name="ownerId" required value={ownerId} onChange={e => { setOwner(e.target.value); setEvidence(""); }}>
              <option value="" disabled>—</option>
              {owners.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
        </div>
        <fieldset key={formRevision} className="space-y-3">
          <legend className="font-semibold">{text("Điều kiện áp dụng", "Rule conditions")}</legend>
          {mode === "balance" && <div className="grid gap-3 sm:grid-cols-2">
            <label>{text("Công đoạn", "Operation")} *
              <select name="kind" required>{operationKinds.map(kind => <option key={kind}>{kind}</option>)}</select>
            </label>
            <label>{text("Dung sai (%)", "Tolerance (%)")} *
              <input name="tolerancePercent" required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" />
            </label>
          </div>}
          {mode === "blend" && <>
            {inputs.map((id, index) => <fieldset key={id} className="rounded-lg border border-ink-tertiary/20 p-3">
              <legend>{text("Đầu vào", "Input")} {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>{text("Mặt hàng đầu vào", "Input commodity")} *
                  <select name={`commodity-${id}`} required defaultValue=""><option value="" disabled>—</option>{commodityOptions}</select>
                </label>
                <label>{text("Sản phẩm", "Product")} *
                  <select name={`product-${id}`} required>{blendProducts.map(kind => <option key={kind}>{kind}</option>)}</select>
                </label>
              </div>
              {inputs.length > 1 && <button type="button" className="mt-2" onClick={() => setInputs(rows => rows.filter(row => row !== id))}>{text("Bỏ đầu vào", "Remove input")}</button>}
            </fieldset>)}
            <button type="button" onClick={() => setInputs(rows => [...rows, crypto.randomUUID()])}>{text("Thêm đầu vào", "Add input")}</button>
            <label>{text("Mặt hàng đầu ra", "Output commodity")} *
              <select name="outputCommodityId" required defaultValue=""><option value="" disabled>—</option>{commodityOptions}</select>
            </label>
          </>}
          {mode === "mixed" && <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label>{text("Mặt hàng", "Commodity")} *
                <select name="commodityId" required defaultValue=""><option value="" disabled>—</option>{commodityOptions}</select>
              </label>
              <label>{text("Giai đoạn", "Stage")} *
                <select name="stage" required>{stages.map(stage => <option key={stage}>{stage}</option>)}</select>
              </label>
              <label>{text("Sản phẩm", "Product identity")} *
                <select name="productIdentity" required>{stages.map(stage => <option key={stage}>{stage}</option>)}</select>
              </label>
            </div>
            <label className="!flex-row items-center">
              <input name="identityScopeConfirmed" type="checkbox" required />
              {text("Chứng cứ xác nhận đúng vị trí, chủ hàng, mặt hàng, giai đoạn và sản phẩm đã chọn.", "The evidence confirms the exact location, owner, commodity, stage and product selected.")}
            </label>
          </>}
          <label>{text("Hiệu lực từ", "Effective from")} *
            <input type="datetime-local" name="effectiveFrom" required />
          </label>
        </fieldset>
        {facilityId && ownerId && <CorrectionEvidence key={`${facilityId}:${ownerId}:${formRevision}`}
          original={{ facilityId, ownerId }} value={evidenceId} onChange={setEvidence} />}
      </fieldset>
      {message && <p role="status">{message}</p>}
      <Feedback error={save.error} pending={save.isPending} />
      <button type="submit" disabled={save.isPending || !evidenceId}>{text("Ghi phiên bản", "Record version")}</button>
    </form>
  </Panel>;
}
