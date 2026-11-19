import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useCommand } from "@/shared/hooks/useCommand";

export function CorrectionReplacementForm({ original, saved }: { original: CorrectionOperation; saved: (id: string) => void }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const [createdId, setCreatedId] = useState("");
  const [outputs, setOutputs] = useState(() => original.outputs.map(o => ({ ...o, id: crypto.randomUUID(), code: undefined, originalLotId: o.id })));
  const [loss, setLoss] = useState(original.declaredLossKg);
  const create = useCommand(async (id, input: { outputs: typeof outputs; loss: string }) => {
    await ledgerEndpoints.recordOperation({ id, ownerId: original.ownerId, facilityId: original.facilityId, kind: original.kind,
      equipmentId: original.equipmentId, occurredAt: original.occurredAt, inputs: original.inputs,
      outputs: input.outputs, declaredLossKg: input.loss });
    setCreatedId(id); saved(id);
  }, async () => { await cache.invalidateQueries({ queryKey: ["correction-drafts"] }); });
  return <details><summary>{text("Chuẩn bị công đoạn thay thế từ bản gốc", "Prepare replacement from original")}</summary>
    {createdId ? <p role="status">{text("Đã lưu bản nháp thay thế", "Replacement draft saved")}: {createdId}</p> : <form className="space-y-3 pt-3" onSubmit={e => { e.preventDefault(); create.submit({ outputs, loss }); }}>
      <p>{text("Giữ nguyên chủ sở hữu, cơ sở, loại công đoạn và đầu vào đã tiêu thụ. Nhập khối lượng và vị trí thực tế của đầu ra để quản lý đối soát.", "Owner, facility, operation kind and consumed inputs are retained. Enter actual output masses and locations for manager review.")}</p>
      <fieldset disabled={create.isPending} className="space-y-3">
        {outputs.map((o, i) => <fieldset key={o.id} className="grid gap-3 sm:grid-cols-2"><legend>{original.outputs[i].code ?? o.stage}</legend>
          <label>{text("Khối lượng thay thế (kg)", "Replacement mass (kg)")}<input required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" value={o.quantityKg} onChange={e => setOutputs(rows => rows.map((r, n) => n === i ? { ...r, quantityKg: e.target.value } : r))}/></label>
          <label>{text("Mã vị trí thực tế", "Actual location ID")}<input required value={o.locationId} onChange={e => setOutputs(rows => rows.map((r, n) => n === i ? { ...r, locationId: e.target.value } : r))}/></label>
        </fieldset>)}
        <label>{text("Hao hụt khai báo (kg)", "Declared loss (kg)")}<input required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,6})?" value={loss} onChange={e => setLoss(e.target.value)}/></label>
        <button type="submit">{text("Lưu bản nháp thay thế", "Save replacement draft")}</button>
      </fieldset><Feedback pending={create.isPending} error={create.error}/>
    </form>}
  </details>;
}
