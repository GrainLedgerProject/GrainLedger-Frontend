import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { catalogsEndpoints } from "@/api/catalogs";
import { collectPages } from "@/api/query";
import { residueEndpoints, type ResidueLaboratorySettings, type ResidueProcessStep, type ResidueProfileVersion } from "@/api/residue";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const rice = ["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE"];
const materials = ["RAW_PADDY", "DRIED_PADDY", "HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK", "BLENDED_RICE"];
const stationary = [...materials.map(stage => [stage, stage, stage]), ...rice.map(product => ["BAGGED_RICE", "BAGGED_RICE", product])];
const paths: Record<string, string[][]> = {
  DRYING: [["RAW_PADDY", "DRIED_PADDY", "DRIED_PADDY"]],
  MILLING: ["HEAD_RICE", "BROKEN_RICE", "BRAN", "HUSK"].map(output => ["DRIED_PADDY", output, output]),
  BLENDING: rice.map(input => [input, "BLENDED_RICE", "BLENDED_RICE"]),
  BAGGING: rice.map(input => [input, "BAGGED_RICE", input]),
  MERGE: stationary,
  CUSTODY_INGRESS: stationary,
  CUSTODY_WITHDRAW: stationary,
};
const decimal = "[0-9]{1,24}([.][0-9]{1,18})?";
const samePath = (a: ResidueProcessStep, b: ResidueProcessStep) =>
  a.process === b.process && a.inputStage === b.inputStage && a.outputStage === b.outputStage &&
  a.outputFraction === b.outputFraction && a.conditions === b.conditions;

export function ResidueProfileEditor({ source, companyId, clone = false, onClose, onSaved }: {
  source: ResidueProfileVersion | null;
  companyId: string | null;
  clone?: boolean;
  onClose: () => void;
  onSaved: (record: ResidueProfileVersion) => void;
}) {
  const text = useWorkflowText();
  const titleId = useId();
  const [id] = useState(() => crypto.randomUUID());
  const [labs, setLabs] = useState<{ key: string; row: ResidueLaboratorySettings | null; numericKind: string }[]>(() => (source?.laboratory ?? []).map(row => ({
    key: crypto.randomUUID(), row, numericKind: row.numericInterpretationKind ?? "",
  })));
  const [steps, setSteps] = useState<{ key: string; row: ResidueProcessStep | null; process: string; semantics: string }[]>(() => (source?.steps ?? []).map(row => ({
    key: crypto.randomUUID(), row, process: row.process, semantics: row.factorSemantics,
  })));
  const catalogs = useQuery({ queryKey: ["residue-profile-editor-catalogs"], queryFn: async () => {
    const [substances, commodities] = await Promise.all([
      collectPages(catalogsEndpoints.getActiveSubstances), collectPages(catalogsEndpoints.getCommodities),
    ]);
    return { substances, commodities: commodities.filter(row => !row.isArchived) };
  } });
  const publish = useMutation({
    mutationFn: async (record: ResidueProfileVersion) => {
      if (!record.laboratory.length && !record.steps.length) {
        throw new Error(text("Thêm ít nhất một phương pháp xét nghiệm hoặc bước xử lý.", "Add at least one laboratory method or processing step."));
      }
      return residueEndpoints.createRule(record);
    },
    onSuccess: onSaved,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publish.isPending || !catalogs.data) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const effectiveTo = value("effectiveTo");
    publish.mutate({
      id, code: source?.code ?? value("code"), versionNo: clone ? 1 : Number(source?.versionNo ?? 0) + 1,
      companyId, kind: "FLOW", schemaVersion: 2, substanceId: source?.substanceId ?? value("substanceId"),
      commodityId: source?.commodityId ?? value("commodityId"), residueDefinition: value("residueDefinition"),
      unit: "mg/kg", decimalPlaces: Number(value("decimalPlaces")), asReceivedConfirmed: form.has("confirmed"),
      effectiveFrom: new Date(value("effectiveFrom")).toISOString(), effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      supersedesId: clone ? null : source?.id ?? null, evidenceRef: value("evidenceRef"), applicabilityStatement: value("applicabilityStatement"),
      reviewedBy: value("reviewedBy"), reviewAuthority: value("reviewAuthority"), reviewedAt: new Date(value("reviewedAt")).toISOString(),
      laboratory: labs.map(({ key, numericKind }) => ({
        analyticalMethod: value(`method-${key}`), numericInterpretationKind: numericKind || null,
        relativeUncertaintyPercent: value(`uncertainty-${key}`) || null,
        relativeUncertaintyAtZero: form.has(`atZero-${key}`), belowLimit: form.has(`belowLimit-${key}`),
        ndThresholdKind: value(`nd-${key}`) || null,
      })),
      steps: steps.map(({ key, process, semantics }) => {
        const [inputStage, outputStage, outputFraction] = value(`path-${key}`).split(":");
        const revision = {
          id: key, process, inputStage, outputStage, outputFraction, conditions: value(`conditions-${key}`),
          factorLower: value(`lower-${key}`), factorUpper: value(`upper-${key}`), factorSemantics: semantics,
          anchorStage: value(`anchor-${key}`) || null, homogeneousMixing: form.has(`homogeneous-${key}`),
        };
        return { ...revision, id: (clone ? undefined : source?.steps.find(old => samePath(old, revision))?.id) ?? key };
      }),
    });
  }

  const title = source
    ? clone
      ? text("Nhân bản thành hồ sơ doanh nghiệp", "Clone as company profile")
      : text("Công bố phiên bản thay thế", "Publish a revised profile")
    : text("Công bố hồ sơ dư lượng mới", "Publish a residue profile");
  return <Modal isOpen ariaLabel={title} onClose={() => { if (!publish.isPending) onClose(); }} closeOnBackdrop={false}
    className="gl-workflow w-[48rem] space-y-4 !rounded-2xl !bg-surface-base !p-5 shadow-xl dark:!bg-surface-raised">
    <h2 id={titleId} className="font-display text-xl font-semibold">{title}</h2>
    <p>{source ? `${source.code} · v${clone ? 1 : Number(source.versionNo) + 1}${clone ? ` (${text("Phạm vi doanh nghiệp", "Company scope")})` : ""}` :
      companyId ? text("Phạm vi doanh nghiệp", "Company scope") : text("Phạm vi hệ thống", "System scope")}</p>
    <Feedback error={catalogs.error} pending={catalogs.isPending} />
    <form method="post" aria-labelledby={titleId} onSubmit={submit} className="space-y-4">
      <fieldset disabled={publish.isPending || !catalogs.data} className="space-y-4">
        <legend className="sr-only">{text("Hồ sơ đã rà soát", "Reviewed profile")}</legend>
        {!source && <div className="grid gap-3 sm:grid-cols-3">
          <label>{text("Mã hồ sơ", "Profile code")} *<input name="code" required maxLength={100} /></label>
          <label>{text("Hoạt chất", "Active substance")} *<select name="substanceId" required defaultValue=""><option value="" disabled>—</option>
            {catalogs.data?.substances.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label>{text("Mặt hàng", "Commodity")} *<select name="commodityId" required defaultValue=""><option value="" disabled>—</option>
            {catalogs.data?.commodities.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        </div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>{text("Định nghĩa dư lượng", "Residue definition")} *<input name="residueDefinition" required defaultValue={source?.residueDefinition} /></label>
          <label>{text("Số chữ số làm tròn khoảng mg/kg", "Outward precision for mg/kg")} *
            <input name="decimalPlaces" type="number" required min="0" max="18" step="1" defaultValue={source?.decimalPlaces} />
          </label>
          <label>{text("Hiệu lực từ", "Effective from")} *<input name="effectiveFrom" type="datetime-local" required /></label>
          <label>{text("Hiệu lực đến", "Effective until")}<input name="effectiveTo" type="datetime-local" /></label>
        </div>
        <fieldset className="space-y-3">
          <legend className="font-semibold">{text("Phương pháp xét nghiệm", "Laboratory methods")}</legend>
          {labs.map(({ key, row, numericKind }, index) => <fieldset className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3" key={key}>
            <legend>{text("Phương pháp", "Method")} {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>{text("Tên phương pháp chính xác", "Exact method name")} *<input name={`method-${key}`} required defaultValue={row?.analyticalMethod} /></label>
              <label>{text("Diễn giải kết quả định lượng", "Numeric interpretation")}<select name={`numeric-${key}`} value={numericKind}
                onChange={e => setLabs(items => items.map(item => item.key === key ? { ...item, numericKind: e.target.value } : item))}>
                <option value="">—</option><option value="NUMERIC_ABSOLUTE_UNCERTAINTY">{text("Độ không đảm bảo tuyệt đối", "Absolute uncertainty")}</option>
                <option value="NUMERIC_RELATIVE_UNCERTAINTY">{text("Độ không đảm bảo tương đối", "Relative uncertainty")}</option>
              </select></label>
              {numericKind === "NUMERIC_RELATIVE_UNCERTAINTY" && <>
                <label>{text("Độ không đảm bảo (%)", "Relative uncertainty (%)")} *<input name={`uncertainty-${key}`} required inputMode="decimal" pattern={decimal} defaultValue={row?.relativeUncertaintyPercent ?? ""} /></label>
                <label className="!flex-row items-center"><input name={`atZero-${key}`} type="checkbox" defaultChecked={row?.relativeUncertaintyAtZero} />{text("Đã rà soát tại giá trị 0", "Reviewed at numeric zero")}</label>
              </>}
              <label>{text("Ngưỡng kết quả không phát hiện", "Non-detect threshold")}<select name={`nd-${key}`} defaultValue={row?.ndThresholdKind ?? ""}>
                <option value="">—</option><option>LOD</option><option>LOQ</option><option>REPORTING_THRESHOLD</option>
              </select></label>
              <label className="!flex-row items-center"><input name={`belowLimit-${key}`} type="checkbox" defaultChecked={row?.belowLimit} />{text("Hỗ trợ kết quả dưới giới hạn", "Supports below-limit results")}</label>
            </div>
            <button type="button" onClick={() => setLabs(items => items.filter(item => item.key !== key))}>{text("Bỏ phương pháp", "Remove method")}</button>
          </fieldset>)}
          <button type="button" onClick={() => setLabs(items => [...items, { key: crypto.randomUUID(), row: null, numericKind: "" }])}>{text("Thêm phương pháp", "Add method")}</button>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-semibold">{text("Hệ số xử lý", "Processing factors")}</legend>
          {steps.map(({ key, row, process, semantics }, index) => <fieldset key={key} className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
            <legend>{text("Bước xử lý", "Processing step")} {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>{text("Công đoạn", "Operation")} *<select name={`process-${key}`} required value={process}
                onChange={e => setSteps(items => items.map(item => item.key === key ? { ...item, process: e.target.value } : item))}>
                <option value="" disabled>—</option>{Object.keys(paths).map(value => <option key={value}>{value}</option>)}
              </select></label>
              <label>{text("Đường xử lý", "Material path")} *<select key={process} name={`path-${key}`} required
                defaultValue={row && row.process === process ? [row.inputStage, row.outputStage, row.outputFraction].join(":") : ""}>
                <option value="" disabled>—</option>{paths[process]?.map(path => <option key={path.join(":")} value={path.join(":")}>{path[0]} → {path[1]} · {path[2]}</option>)}
              </select></label>
              <label>{text("Điều kiện đã rà soát", "Reviewed conditions")} *<input name={`conditions-${key}`} required defaultValue={row?.conditions} /></label>
              <label>{text("Loại hệ số", "Factor semantics")}<select name={`semantics-${key}`} value={semantics}
                onChange={e => setSteps(items => items.map(item => item.key === key ? { ...item, semantics: e.target.value } : item))}>
                <option>STEP_CONCENTRATION</option><option>CUMULATIVE_CONCENTRATION</option>
              </select></label>
              {semantics === "CUMULATIVE_CONCENTRATION" && <label>{text("Giai đoạn tham chiếu", "Anchor stage")} *
                <select name={`anchor-${key}`} required defaultValue={row?.anchorStage ?? ""}><option value="" disabled>—</option>
                  {[...materials, "BAGGED_RICE"].map(value => <option key={value}>{value}</option>)}</select>
              </label>}
              <label>{text("Hệ số thấp nhất", "Lower factor")} *<input name={`lower-${key}`} required pattern={decimal} inputMode="decimal" defaultValue={row?.factorLower} /></label>
              <label>{text("Hệ số cao nhất", "Upper factor")} *<input name={`upper-${key}`} required pattern={decimal} inputMode="decimal" defaultValue={row?.factorUpper} /></label>
              <label className="!flex-row items-center"><input name={`homogeneous-${key}`} type="checkbox" defaultChecked={row?.homogeneousMixing} />{text("Đã rà soát điều kiện trộn đồng nhất", "Homogeneous mixing reviewed")}</label>
            </div>
            <button type="button" onClick={() => setSteps(items => items.filter(item => item.key !== key))}>{text("Bỏ bước xử lý", "Remove step")}</button>
          </fieldset>)}
          <button type="button" onClick={() => setSteps(items => [...items, { key: crypto.randomUUID(), row: null, process: "", semantics: "STEP_CONCENTRATION" }])}>{text("Thêm bước xử lý", "Add processing step")}</button>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>{text("Tham chiếu chứng cứ", "Evidence reference")} *<input name="evidenceRef" required maxLength={4000} defaultValue={source?.evidenceRef} /></label>
          <label>{text("Phạm vi áp dụng", "Applicability statement")} *<textarea name="applicabilityStatement" required maxLength={4000} defaultValue={source?.applicabilityStatement} /></label>
          <label>{text("Người rà soát khoa học", "Scientific reviewer")} *<input name="reviewedBy" required /></label>
          <label>{text("Đơn vị duyệt", "Review authority")} *<input name="reviewAuthority" required /></label>
          <label>{text("Rà soát lúc", "Reviewed at")} *<input name="reviewedAt" type="datetime-local" required /></label>
        </div>
        <label className="!flex-row items-center"><input name="confirmed" type="checkbox" required />{text("Tôi xác nhận nồng độ theo mẫu nhận và hồ sơ đã được rà soát.", "I confirm the as-received basis and completed scientific review.")}</label>
      </fieldset>
      <Feedback error={publish.error} pending={publish.isPending} />
      <div className="flex justify-end gap-2">
        <button type="button" disabled={publish.isPending} onClick={onClose}>{text("Đóng", "Close")}</button>
        <button type="submit" disabled={publish.isPending || !catalogs.data}>{text("Công bố hồ sơ", "Publish profile")}</button>
      </div>
    </form>
  </Modal>;
}
