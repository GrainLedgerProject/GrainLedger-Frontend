import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { catalogsEndpoints, type CatalogEntryDto, type QualityAttributeDto } from "@/api/catalogs";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { planningEndpoints, type PublishedQualityPropagationRule } from "@/api/planning";
import { collectPages, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { CorrectionEvidence, CorrectionEvidenceDownload } from "@/features/mill/components/CorrectionEvidence";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const key = ["export-assessment"];
const finishedStages = new Set(["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE", "BAGGED_RICE"]);
const decimalPattern = "[0-9]+([.][0-9]{1,12})?";

export function SafetyMarginPolicyPage() {
  const text = useWorkflowText();
  const user = useAuthStore(s => s.user);
  const canPublish = user?.permissions.includes("blend.assessment-policy.manage");
  const canObserve = user?.permissions.includes("blend.quality-evidence.manage");
  const catalogs = useQuery({
    queryKey: [...key, "catalogs"],
    enabled: Boolean(canPublish || canObserve),
    queryFn: async () => {
      const [markets, commodities, substances, attributes] = await Promise.all([
        collectPages(catalogsEndpoints.getMarkets),
        collectPages(catalogsEndpoints.getCommodities),
        collectPages(catalogsEndpoints.getActiveSubstances),
        collectPages(catalogsEndpoints.getQualityAttributes),
      ]);
      return { markets, commodities, substances, attributes };
    },
  });
  return <Workflow title={text("Thiết lập đánh giá xuất khẩu", "Export assessment setup")}>
    {!(canPublish || canObserve) ? <p role="alert">{text("Tài khoản cần quyền quản lý chính sách đánh giá hoặc chứng cứ chất lượng.", "This account needs assessment-policy or quality-evidence permission.")}</p> : <>
      <Feedback error={catalogs.error} pending={catalogs.isPending} />
      {catalogs.data && canPublish && <MarketPolicyEditor {...catalogs.data} />}
      {catalogs.data && canObserve && user?.organizationId && <QualityObservationEditor ownerId={user.organizationId} attributes={catalogs.data.attributes} />}
    </>}
  </Workflow>;
}

function MarketPolicyEditor({ markets, commodities, substances, attributes }: {
  markets: CatalogEntryDto[];
  commodities: CatalogEntryDto[];
  substances: CatalogEntryDto[];
  attributes: QualityAttributeDto[];
}) {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [marketId, setMarket] = useState("");
  const [commodityId, setCommodity] = useState("");
  const [substanceSearch, setSubstanceSearch] = useState("");
  const [selectedSubstances, setSubstances] = useState<string[]>([]);
  const [qualityRules, setRules] = useState<PublishedQualityPropagationRule[]>([]);
  const [published, setPublished] = useState("");
  const policyKey = [...key, "applicable", marketId, commodityId];
  const policy = useQuery({
    queryKey: policyKey,
    enabled: Boolean(marketId && commodityId),
    queryFn: async () => {
      try { return await planningEndpoints.getApplicableAssessmentPolicy({ marketId, commodityId }); }
      catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const publish = useMutation({
    mutationFn: planningEndpoints.publishAssessmentPolicy,
    onSuccess: (_, data) => {
      setPublished(text(`Đã công bố chính sách v${data.versionNo}.`, `Policy v${data.versionNo} published.`));
      void client.invalidateQueries({ queryKey: policyKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!marketId || !commodityId || publish.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const effectiveFrom = value("effectiveFrom");
    const effectiveTo = value("effectiveTo");
    publish.mutate({
      id: crypto.randomUUID(), marketId, commodityId, versionNo: Number(value("versionNo")),
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      requiredSubstanceIds: selectedSubstances, mrlMarginFraction: value("margin"),
      residueBasis: value("residueBasis"), qualityRules, evidenceReference: value("evidenceReference"),
      reviewedBy: value("reviewedBy"), reviewAuthority: value("reviewAuthority"),
      reviewedAt: new Date(value("reviewedAt")).toISOString(),
    });
  }

  return <Panel title={text("Chính sách theo thị trường", "Market assessment policy")}>
    <form method="post" onSubmit={submit} className="space-y-4">
      <fieldset disabled={publish.isPending} className="space-y-4">
        <legend className="sr-only">{text("Quy tắc đánh giá", "Assessment rules")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>{text("Thị trường", "Market")} *
            <select required name="marketId" value={marketId} onChange={e => { setMarket(e.target.value); setPublished(""); }}>
              <option value="" disabled>—</option>{markets.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
            </select>
          </label>
          <label>{text("Mặt hàng", "Commodity")} *
            <select required name="commodityId" value={commodityId} onChange={e => { setCommodity(e.target.value); setPublished(""); }}>
              <option value="" disabled>—</option>{commodities.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
            </select>
          </label>
        </div>
        {marketId && commodityId && <>
          <Feedback error={policy.error} pending={policy.isPending} />
          {policy.data === null && <p>{text("Chưa có phiên bản đang áp dụng cho phạm vi đã chọn.", "No policy currently applies to this scope.")}</p>}
          {policy.data && <p>v{policy.data.versionNo} · {new Date(policy.data.effectiveFrom).toLocaleString()} · {text("Biên an toàn", "Safety margin")} {policy.data.mrlMarginFraction}</p>}
        </>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>{text("Phiên bản mới", "New version")} *
            <input key={`${marketId}:${commodityId}:${policy.data?.versionNo}`} name="versionNo" type="number" required min="1" step="1" defaultValue={(policy.data?.versionNo ?? 0) + 1} />
          </label>
          <label>{text("Tỷ lệ biên an toàn (0,1 tương ứng 10%)", "Safety margin fraction (0.1 means 10%)")} *
            <input name="margin" type="number" min="0" max="0.999999999999" step="any" required />
          </label>
          <label>{text("Hiệu lực từ", "Effective from")} *
            <input name="effectiveFrom" type="datetime-local" required />
          </label>
          <label>{text("Hiệu lực đến", "Effective until")}
            <input name="effectiveTo" type="datetime-local" />
          </label>
          <label>{text("Cơ sở biểu thị dư lượng", "Residue reporting basis")} *
            <select name="residueBasis" required defaultValue=""><option value="" disabled>—</option><option value="AS_RECEIVED">{text("Theo mẫu nhận", "As received")}</option></select>
          </label>
        </div>
        <fieldset className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
          <legend>{text("Hoạt chất cần đánh giá", "Required active substances")}</legend>
          <label>{text("Tìm hoạt chất", "Find a substance")}
            <input name="substanceSearch" type="search" value={substanceSearch} onChange={e => setSubstanceSearch(e.target.value)} />
          </label>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {substances.filter(row => selectedSubstances.includes(row.id) ||
              `${row.code} ${row.name}`.toLocaleLowerCase().includes(substanceSearch.toLocaleLowerCase())).map(row =>
              <label key={row.id} className="!flex-row items-center">
                <input name="substances" type="checkbox" checked={selectedSubstances.includes(row.id)} onChange={e =>
                  setSubstances(ids => e.target.checked ? [...ids, row.id] : ids.filter(id => id !== row.id))} />
                {row.code} · {row.name}
              </label>)}
          </div>
          <p>{selectedSubstances.length} {text("hoạt chất đã chọn", "selected substances")}</p>
        </fieldset>
        <fieldset className="space-y-2 rounded-lg border border-ink-tertiary/20 p-3">
          <legend>{text("Tính chất lượng theo khối lượng", "Mass-weighted quality rules")}</legend>
          <label>{text("Thêm chỉ tiêu chất lượng", "Add a quality attribute")}
            <select name="addAttribute" value="" onChange={e => {
              const attribute = attributes.find(row => row.id === e.target.value);
              if (attribute) setRules(rows => [...rows, { attributeId: attribute.id, unit: attribute.unit, calculation: "MASS_WEIGHTED_MEAN" }]);
            }}>
              <option value="">—</option>
              {attributes.filter(row => row.unit && !qualityRules.some(rule => rule.attributeId === row.id)).map(row =>
                <option key={row.id} value={row.id}>{row.name} · {row.unit}</option>)}
            </select>
          </label>
          {qualityRules.map(row => <div key={row.attributeId} className="flex items-center justify-between gap-2">
            <span>{attributes.find(attribute => attribute.id === row.attributeId)?.name} · {row.unit}</span>
            <button type="button" onClick={() => setRules(rows => rows.filter(rule => rule.attributeId !== row.attributeId))}>{text("Bỏ", "Remove")}</button>
          </div>)}
        </fieldset>
        <label>{text("Nguồn hoặc chứng cứ đã duyệt", "Approved source or evidence reference")} *
          <textarea name="evidenceReference" required maxLength={1000} />
        </label>
        <ReviewerFields />
        <label className="!flex-row items-center"><input name="confirmed" type="checkbox" required />
          {text("Tôi đã kiểm tra nguồn, phạm vi hoạt chất và quy tắc đánh giá.", "I verified the source, substance scope and assessment rules.")}
        </label>
      </fieldset>
      {published && <p role="status">{published}</p>}
      <Feedback error={publish.error} pending={publish.isPending} />
      <button type="submit" disabled={publish.isPending || !selectedSubstances.length || Boolean(policy.error) || policy.isFetching}>{text("Công bố chính sách", "Publish policy")}</button>
    </form>
  </Panel>;
}

interface FinishedLot { id: string; code: string; stage: string }
function QualityObservationEditor({ ownerId, attributes }: { ownerId: string; attributes: QualityAttributeDto[] }) {
  const text = useWorkflowText();
  const [facilityId, setFacility] = useState("");
  const [lotId, setLot] = useState("");
  const locations = useQuery({ queryKey: [...key, "lookups"], queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse });
  const lots = useQuery({
    queryKey: [...key, "finished-lots", ownerId, facilityId],
    enabled: Boolean(facilityId),
    queryFn: async () => (await collectPages<FinishedLot>(async page => await ledgerEndpoints.getLots({
      ...page, ownerId, facilityId,
    }) as ApiPage<FinishedLot>)).filter(row => finishedStages.has(row.stage)),
  });
  return <Panel title={text("Đo chất lượng lô thành phẩm", "Finished-lot quality observations")}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>{text("Cơ sở", "Facility")}
        <select value={facilityId} onChange={e => { setFacility(e.target.value); setLot(""); }}>
          <option value="">—</option>{locations.data?.facilities?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>
      <label>{text("Lô thành phẩm", "Finished lot")}
        <select value={lotId} onChange={e => setLot(e.target.value)} disabled={!facilityId}>
          <option value="">—</option>{lots.data?.map(row => <option key={row.id} value={row.id}>{row.code} · {row.stage}</option>)}
        </select>
      </label>
    </div>
    <Feedback error={locations.error ?? lots.error} pending={locations.isPending || Boolean(facilityId && lots.isPending)} />
    {lotId && <ObservationForm key={`${facilityId}:${lotId}`} scope={{ ownerId, facilityId, lotId }} attributes={attributes} />}
  </Panel>;
}

function ObservationForm({ scope, attributes }: {
  scope: { ownerId: string; facilityId: string; lotId: string };
  attributes: QualityAttributeDto[];
}) {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [attributeId, setAttribute] = useState("");
  const [evidenceId, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const queryKey = [...key, "observations", scope];
  const observations = useQuery({
    queryKey,
    queryFn: () => planningEndpoints.getQualityObservations({ ownerId: scope.ownerId, facilityId: scope.facilityId, lotIds: [scope.lotId] }),
  });
  const attribute = attributes.find(row => row.id === attributeId);
  const versionNo = Math.max(0, ...(observations.data ?? []).filter(row => row.attributeId === attributeId).map(row => row.versionNo)) + 1;
  const save = useMutation({
    mutationFn: planningEndpoints.createQualityObservation,
    onSuccess: () => {
      setEvidence("");
      setRevision(n => n + 1);
      setMessage(text("Đã xác nhận kết quả đo.", "Quality observation confirmed."));
      void client.invalidateQueries({ queryKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attribute || !evidenceId || !observations.data || save.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    save.mutate({
      ...scope, id: crypto.randomUUID(), attributeId, versionNo, measuredValue: value("measuredValue"), unit: attribute.unit,
      measuredAt: new Date(value("measuredAt")).toISOString(), evidenceId, reportReference: value("reportReference"),
      reviewedBy: value("reviewedBy"), reviewAuthority: value("reviewAuthority"), reviewedAt: new Date(value("reviewedAt")).toISOString(),
      subjectConfirmed: true,
    });
  }

  return <>
    <Feedback error={observations.error} pending={observations.isPending} />
    {observations.data?.length ? <ul className="space-y-2">{observations.data.map(row => <li key={row.id}>
      {attributes.find(a => a.id === row.attributeId)?.name ?? row.attributeId} · {row.measuredValue} {row.unit} · v{row.versionNo}
      <CorrectionEvidenceDownload id={row.evidenceId} />
    </li>)}</ul> : null}
    <form method="post" onSubmit={submit} key={revision} className="space-y-3">
      <fieldset disabled={save.isPending} className="space-y-3">
        <legend className="sr-only">{text("Kết quả đo", "Measurement")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>{text("Chỉ tiêu", "Quality attribute")} *
            <select name="attributeId" required value={attributeId} onChange={e => { setAttribute(e.target.value); setEvidence(""); }}>
              <option value="" disabled>—</option>{attributes.filter(row => row.unit).map(row => <option key={row.id} value={row.id}>{row.name} · {row.unit}</option>)}
            </select>
          </label>
          <label>{text("Giá trị đo", "Measured value")} {attribute?.unit} *
            <input name="measuredValue" inputMode="decimal" pattern={decimalPattern} required />
          </label>
          <label>{text("Đo lúc", "Measured at")} *
            <input name="measuredAt" type="datetime-local" required />
          </label>
        </div>
        <label>{text("Tham chiếu báo cáo", "Report reference")} *
          <input name="reportReference" required />
        </label>
        <ReviewerFields />
        <CorrectionEvidence key={attributeId} original={scope} value={evidenceId} onChange={setEvidence} />
        <label className="!flex-row items-center"><input name="subjectConfirmed" type="checkbox" required />
          {text("Tôi đã xác minh báo cáo thuộc đúng lô và chỉ tiêu này.", "I verified the report measures this lot and attribute.")}
        </label>
      </fieldset>
      {message && <p role="status">{message}</p>}
      <Feedback error={save.error} pending={save.isPending} />
      <button type="submit" disabled={save.isPending || !evidenceId || observations.isFetching || !observations.data}>{text("Xác nhận kết quả đo", "Confirm measurement")}</button>
    </form>
  </>;
}

function ReviewerFields() {
  const text = useWorkflowText();
  return <div className="grid gap-3 sm:grid-cols-3">
    <label>{text("Người rà soát", "Reviewed by")} *<input name="reviewedBy" required /></label>
    <label>{text("Đơn vị duyệt", "Review authority")} *<input name="reviewAuthority" required /></label>
    <label>{text("Rà soát lúc", "Reviewed at")} *<input name="reviewedAt" type="datetime-local" required /></label>
  </div>;
}
