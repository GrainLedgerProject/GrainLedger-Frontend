import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  FileText,
  Flask,
  GitBranch,
  Globe,
  LockSimple,
  MagnifyingGlass,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ApiError } from "@/api/client";
import { catalogsEndpoints, type CatalogEntryDto, type QualityAttributeDto } from "@/api/catalogs";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { planningEndpoints, type PublishedQualityPropagationRule } from "@/api/planning";
import { collectPages, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { exportPaths } from "@/features/export/paths";
import { CorrectionEvidence, CorrectionEvidenceDownload } from "@/features/mill/components/CorrectionEvidence";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { compliancePaths } from "../paths";

const key = ["export-assessment"];
const finishedStages = new Set(["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE", "BAGGED_RICE"]);
const decimalPattern = "[0-9]+([.][0-9]{1,12})?";

const evidenceWrapperClass =
  "rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-4 dark:bg-surface-overlay/30 [&_button]:mt-1 [&_button]:inline-flex [&_button]:min-h-10 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-4 [&_button]:py-2 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:bg-surface-raised [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay dark:[&_button]:hover:bg-surface-raised [&_input[type=file]]:p-2 [&_input[type=file]]:text-sm [&_input[type=file]::file-selector-button]:mr-3 [&_input[type=file]::file-selector-button]:rounded-full [&_input[type=file]::file-selector-button]:border-0 [&_input[type=file]::file-selector-button]:bg-accent-primary/10 [&_input[type=file]::file-selector-button]:px-3 [&_input[type=file]::file-selector-button]:py-1.5 [&_input[type=file]::file-selector-button]:text-xs [&_input[type=file]::file-selector-button]:font-semibold [&_input[type=file]::file-selector-button]:text-accent-primary [&_legend]:font-display [&_legend]:text-sm [&_legend]:font-bold [&_legend]:text-ink-primary [&_p[role=status]]:mt-1 [&_p[role=status]]:inline-flex [&_p[role=status]]:items-center [&_p[role=status]]:gap-1.5 [&_p[role=status]]:rounded-lg [&_p[role=status]]:bg-functional-balanced-bg [&_p[role=status]]:px-3 [&_p[role=status]]:py-2 [&_p[role=status]]:text-xs [&_p[role=status]]:font-semibold [&_p[role=status]]:text-accent-primary";

export function SafetyMarginPolicyPage() {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const canPublish = Boolean(user?.permissions.includes("blend.assessment-policy.manage"));
  const canObserve = Boolean(user?.permissions.includes("blend.quality-evidence.manage"));
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

  const hasAccess = canPublish || canObserve;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("CHÍNH SÁCH TUÂN THỦ & CHẤT LƯỢNG XUẤT KHẨU", "EXPORT COMPLIANCE & QUALITY POLICY")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text("Thiết lập đánh giá xuất khẩu", "Export assessment setup")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {text(
              "Công bố chính sách biên an toàn theo thị trường/mặt hàng và xác nhận kết quả đo chất lượng lô thành phẩm dùng cho lập phương án phối trộn.",
              "Publish market/commodity safety margin policies and confirm finished-lot quality observations used by blend planning.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={exportPaths.plans}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <GitBranch size={15} aria-hidden="true" />
            <span>{text("Mở phương án phối trộn", "Open blend plans")}</span>
          </Link>
          <Link
            to={compliancePaths.profiles}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Flask size={15} aria-hidden="true" />
            <span>{text("Hồ sơ dư lượng", "Residue profiles")}</span>
          </Link>
          {hasAccess && (
            <button
              type="button"
              onClick={() => void catalogs.refetch()}
              disabled={catalogs.isFetching}
              aria-label={text("Tải lại danh mục đánh giá", "Reload assessment catalogs")}
              title={text("Tải lại danh mục đánh giá", "Reload assessment catalogs")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise
                size={16}
                aria-hidden="true"
                className={catalogs.isFetching ? "motion-safe:animate-spin text-accent-primary" : undefined}
              />
            </button>
          )}
        </div>
      </header>

      {!hasAccess ? (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Giới hạn quyền thiết lập", "Setup access restricted")}
              </h2>
              <p role="alert" className="text-sm text-ink-secondary">
                {text(
                  "Tài khoản cần quyền quản lý chính sách đánh giá hoặc chứng cứ chất lượng.",
                  "This account needs assessment-policy or quality-evidence permission.",
                )}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {catalogs.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
            >
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                <Feedback error={catalogs.error} />
              </div>
            </div>
          )}

          {catalogs.isPending && (
            <div className="flex justify-center py-16">
              <GrainLoader
                label={text(
                  "Đang tải danh mục thị trường, mặt hàng và hoạt chất...",
                  "Loading markets, commodities, and active substances...",
                )}
              />
            </div>
          )}

          {catalogs.data && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Thị trường xuất khẩu", "Export markets")}</span>
                    <Globe size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">
                    {catalogs.data.markets.length}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text("Thị trường áp dụng biên an toàn", "Markets for margin rules")}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Mặt hàng", "Commodities")}</span>
                    <Package size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">
                    {catalogs.data.commodities.length}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text("Nhóm gạo & nguyên liệu xuất khẩu", "Export grain commodities")}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Hoạt chất BVTV", "Active substances")}</span>
                    <Flask size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">
                    {catalogs.data.substances.length}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text("Hoạt chất khả dụng để đánh giá MRL", "Substances for MRL assessment")}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span className="text-xs font-medium">{text("Chỉ tiêu chất lượng", "Quality attributes")}</span>
                    <SlidersHorizontal size={16} className="text-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="font-display text-2xl font-bold text-ink-primary">
                    {catalogs.data.attributes.length}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {text("Chỉ tiêu đo lường thành phẩm", "Finished-lot measurements")}
                  </p>
                </div>
              </div>

              {canPublish && <MarketPolicyEditor {...catalogs.data} />}

              {canObserve && user?.organizationId && (
                <QualityObservationEditor
                  ownerId={user.organizationId}
                  attributes={catalogs.data.attributes}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function MarketPolicyEditor({
  markets,
  commodities,
  substances,
  attributes,
}: {
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
      try {
        return await planningEndpoints.getApplicableAssessmentPolicy({ marketId, commodityId });
      } catch (error) {
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
      id: crypto.randomUUID(),
      marketId,
      commodityId,
      versionNo: Number(value("versionNo")),
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      requiredSubstanceIds: selectedSubstances,
      mrlMarginFraction: value("margin"),
      residueBasis: value("residueBasis"),
      qualityRules,
      evidenceReference: value("evidenceReference"),
      reviewedBy: value("reviewedBy"),
      reviewAuthority: value("reviewAuthority"),
      reviewedAt: new Date(value("reviewedAt")).toISOString(),
    });
  }

  const filteredSubstances = substances.filter(
    (row) =>
      selectedSubstances.includes(row.id) ||
      `${row.code} ${row.name}`.toLocaleLowerCase().includes(substanceSearch.toLocaleLowerCase()),
  );

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <ShieldCheck size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {text("Chính sách theo thị trường", "Market assessment policy")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Thiết lập phiên bản biên an toàn MRL, hoạt chất bắt buộc và chỉ tiêu lan truyền theo thị trường/mặt hàng.",
                "Publish MRL safety margin versions, required substances, and quality rules by market and commodity.",
              )}
            </p>
          </div>
        </div>
        <StatusBadge
          status={policy.data ? "COMPLIANT" : marketId && commodityId ? "STALE" : "PENDING"}
          size="sm"
          label={
            policy.data
              ? `v${policy.data.versionNo}`
              : marketId && commodityId
                ? text("Chưa có phiên bản", "No active policy")
                : text("Chưa chọn phạm vi", "Select scope")
          }
        />
      </div>

      <div className="p-4 sm:p-6">
        <form method="post" onSubmit={submit} className="record-form space-y-5">
          <fieldset disabled={publish.isPending} className="space-y-5">
            <legend className="sr-only">{text("Quy tắc đánh giá", "Assessment rules")}</legend>

            <div className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <Globe size={16} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Phạm vi áp dụng", "Policy scope")}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span>{text("Thị trường", "Market")} *</span>
                  <select
                    required
                    name="marketId"
                    value={marketId}
                    onChange={(e) => {
                      setMarket(e.target.value);
                      setPublished("");
                    }}
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {markets.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} · {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{text("Mặt hàng", "Commodity")} *</span>
                  <select
                    required
                    name="commodityId"
                    value={commodityId}
                    onChange={(e) => {
                      setCommodity(e.target.value);
                      setPublished("");
                    }}
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {commodities.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} · {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {marketId && commodityId && (
                <div className="space-y-2">
                  {policy.isPending && (
                    <div className="flex justify-center py-3">
                      <GrainLoader
                        size="sm"
                        label={text("Đang kiểm tra phiên bản đang áp dụng...", "Checking applicable policy version...")}
                      />
                    </div>
                  )}
                  {policy.error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3 text-xs text-accent-danger"
                    >
                      <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                        <Feedback error={policy.error} />
                      </div>
                    </div>
                  )}
                  {policy.data === null && (
                    <p className="rounded-lg border border-dashed border-ink-tertiary/25 bg-surface-base px-3.5 py-2.5 text-xs text-ink-secondary dark:bg-surface-raised">
                      {text("Chưa có phiên bản đang áp dụng cho phạm vi đã chọn.", "No policy currently applies to this scope.")}
                    </p>
                  )}
                  {policy.data && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-functional-balanced-border/40 bg-functional-balanced-bg px-3.5 py-2.5 text-xs text-ink-primary">
                      <span className="font-semibold text-accent-primary">
                        v{policy.data.versionNo} · {new Date(policy.data.effectiveFrom).toLocaleString()} ·{" "}
                        {text("Biên an toàn", "Safety margin")} {policy.data.mrlMarginFraction}
                      </span>
                      <span className="font-mono text-[11px] text-ink-secondary">
                        {policy.data.requiredSubstanceIds.length} {text("hoạt chất", "substances")} ·{" "}
                        {policy.data.qualityRules.length} {text("chỉ tiêu", "rules")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <SlidersHorizontal size={16} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Thông số biên an toàn & hiệu lực", "Margin & validity parameters")}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span>{text("Phiên bản mới", "New version")} *</span>
                  <input
                    key={`${marketId}:${commodityId}:${policy.data?.versionNo}`}
                    name="versionNo"
                    type="number"
                    required
                    min="1"
                    step="1"
                    defaultValue={(policy.data?.versionNo ?? 0) + 1}
                  />
                </label>
                <label>
                  <span>{text("Tỷ lệ biên an toàn (0,1 tương ứng 10%)", "Safety margin fraction (0.1 means 10%)")} *</span>
                  <input
                    name="margin"
                    type="number"
                    min="0"
                    max="0.999999999999"
                    step="any"
                    required
                    placeholder="0.1"
                  />
                </label>
                <label>
                  <span>{text("Hiệu lực từ", "Effective from")} *</span>
                  <input name="effectiveFrom" type="datetime-local" required />
                </label>
                <label>
                  <span>{text("Hiệu lực đến", "Effective until")}</span>
                  <input name="effectiveTo" type="datetime-local" />
                </label>
                <label className="sm:col-span-2">
                  <span>{text("Cơ sở biểu thị dư lượng", "Residue reporting basis")} *</span>
                  <select name="residueBasis" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    <option value="AS_RECEIVED">{text("Theo mẫu nhận", "As received")}</option>
                  </select>
                </label>
              </div>
            </div>

            <fieldset className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-raised">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                  <Flask size={16} className="text-accent-primary" aria-hidden="true" />
                  <span>{text("Hoạt chất cần đánh giá", "Required active substances")}</span>
                </legend>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={selectedSubstances.length > 0 ? "ACTIVE" : "STALE"}
                    size="sm"
                    label={`${selectedSubstances.length} ${text("hoạt chất đã chọn", "selected substances")}`}
                  />
                  {selectedSubstances.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSubstances([])}
                      className="rounded-full border border-ink-tertiary/20 px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
                    >
                      {text("Bỏ chọn tất cả", "Clear all")}
                    </button>
                  )}
                </div>
              </div>

              <label>
                <span>{text("Tìm hoạt chất", "Find a substance")}</span>
                <div className="relative">
                  <MagnifyingGlass
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  />
                  <input
                    name="substanceSearch"
                    type="search"
                    value={substanceSearch}
                    onChange={(e) => setSubstanceSearch(e.target.value)}
                    placeholder={text("Tìm theo mã hoặc tên hoạt chất...", "Search substance code or name...")}
                    className="filter-control border-ink-tertiary/20 pe-9 ps-10"
                  />
                  {substanceSearch && (
                    <button
                      type="button"
                      aria-label={text("Xóa tìm hoạt chất", "Clear substance filter")}
                      onClick={() => setSubstanceSearch("")}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </label>

              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-2 dark:bg-surface-overlay/30">
                {filteredSubstances.length > 0 ? (
                  filteredSubstances.map((row) => (
                    <label
                      key={row.id}
                      className="!flex-row cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-base dark:hover:bg-surface-raised"
                    >
                      <input
                        name="substances"
                        type="checkbox"
                        checked={selectedSubstances.includes(row.id)}
                        onChange={(e) =>
                          setSubstances((ids) =>
                            e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id),
                          )
                        }
                        className="size-4 shrink-0 accent-accent-primary"
                      />
                      <span className="font-mono font-semibold text-accent-primary">{row.code}</span>
                      <span>·</span>
                      <span className="min-w-0 truncate">{row.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-ink-tertiary">
                    {text("Không tìm thấy hoạt chất phù hợp.", "No matching substances.")}
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-raised">
              <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <SlidersHorizontal size={16} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Tính chất lượng theo khối lượng", "Mass-weighted quality rules")}</span>
              </legend>

              <label>
                <span>{text("Thêm chỉ tiêu chất lượng", "Add a quality attribute")}</span>
                <select
                  name="addAttribute"
                  value=""
                  onChange={(e) => {
                    const attribute = attributes.find((row) => row.id === e.target.value);
                    if (attribute) {
                      setRules((rows) => [
                        ...rows,
                        { attributeId: attribute.id, unit: attribute.unit, calculation: "MASS_WEIGHTED_MEAN" },
                      ]);
                    }
                  }}
                >
                  <option value="">—</option>
                  {attributes
                    .filter((row) => row.unit && !qualityRules.some((rule) => rule.attributeId === row.id))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.unit}
                      </option>
                    ))}
                </select>
              </label>

              {qualityRules.length > 0 && (
                <div className="space-y-2">
                  {qualityRules.map((row) => (
                    <div
                      key={row.attributeId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 px-3.5 py-2.5 text-xs dark:bg-surface-overlay/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-primary">
                          {attributes.find((attribute) => attribute.id === row.attributeId)?.name}
                        </span>
                        <span className="rounded-md border border-ink-tertiary/20 bg-surface-base px-2 py-0.5 font-mono text-[11px] text-ink-secondary dark:bg-surface-raised">
                          {row.unit}
                        </span>
                        <span className="rounded-md bg-accent-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-primary">
                          {row.calculation}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRules((rows) => rows.filter((rule) => rule.attributeId !== row.attributeId))}
                        className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-3 py-1 text-xs font-semibold text-accent-danger transition-colors hover:opacity-85"
                      >
                        <Trash size={13} aria-hidden="true" />
                        <span>{text("Bỏ", "Remove")}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <FileText size={16} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Thẩm định & chứng cứ công bố", "Review & publication evidence")}</span>
              </div>

              <label>
                <span>{text("Nguồn hoặc chứng cứ đã duyệt", "Approved source or evidence reference")} *</span>
                <textarea name="evidenceReference" required maxLength={1000} rows={3} />
              </label>

              <ReviewerFields />

              <label className="!flex-row cursor-pointer items-start gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-base p-3 text-xs font-medium text-ink-primary dark:bg-surface-raised">
                <input
                  name="confirmed"
                  type="checkbox"
                  required
                  className="mt-0.5 size-4 shrink-0 accent-accent-primary"
                />
                <span>
                  {text(
                    "Tôi đã kiểm tra nguồn, phạm vi hoạt chất và quy tắc đánh giá.",
                    "I verified the source, substance scope and assessment rules.",
                  )}
                </span>
              </label>
            </div>
          </fieldset>

          {published && (
            <div role="status" className="record-success">
              <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
              <span>{published}</span>
            </div>
          )}

          {publish.isPending && (
            <div className="flex justify-center py-2">
              <GrainLoader size="sm" label={text("Đang công bố chính sách...", "Publishing policy...")} />
            </div>
          )}

          {publish.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
            >
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                <Feedback error={publish.error} />
              </div>
            </div>
          )}

          <div className="record-form-footer items-center">
            {!selectedSubstances.length && (
              <span className="mr-auto text-xs text-ink-tertiary">
                {text("Chọn ít nhất 1 hoạt chất trước khi công bố", "Select at least 1 substance before publishing")}
              </span>
            )}
            <button
              type="submit"
              disabled={publish.isPending || !selectedSubstances.length || Boolean(policy.error) || policy.isFetching}
              className="record-button record-primary rounded-full px-6"
            >
              <CheckCircle size={16} weight="bold" aria-hidden="true" />
              <span>{text("Công bố chính sách", "Publish policy")}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

interface FinishedLot {
  id: string;
  code: string;
  stage: string;
}

function QualityObservationEditor({
  ownerId,
  attributes,
}: {
  ownerId: string;
  attributes: QualityAttributeDto[];
}) {
  const text = useWorkflowText();
  const [facilityId, setFacility] = useState("");
  const [lotId, setLot] = useState("");
  const locations = useQuery({
    queryKey: [...key, "lookups"],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
  });
  const lots = useQuery({
    queryKey: [...key, "finished-lots", ownerId, facilityId],
    enabled: Boolean(facilityId),
    queryFn: async () =>
      (
        await collectPages<FinishedLot>(
          async (page) => (await ledgerEndpoints.getLots({ ...page, ownerId, facilityId })) as ApiPage<FinishedLot>,
        )
      ).filter((row) => finishedStages.has(row.stage)),
  });

  const selectedLot = lots.data?.find((row) => row.id === lotId);

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <Buildings size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {text("Đo chất lượng lô thành phẩm", "Finished-lot quality observations")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Chọn cơ sở và lô thành phẩm để xem lịch sử đo và xác nhận kết quả mới kèm chứng cứ.",
                "Select a facility and finished lot to inspect recorded observations and confirm new measurements with evidence.",
              )}
            </p>
          </div>
        </div>
        <StatusBadge
          status={selectedLot ? "ACTIVE" : "STALE"}
          size="sm"
          label={selectedLot ? selectedLot.code : text("Chờ chọn lô", "Select lot")}
        />
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="record-form grid gap-4 sm:grid-cols-2">
          <label>
            <span>{text("Cơ sở", "Facility")}</span>
            <select
              value={facilityId}
              onChange={(e) => {
                setFacility(e.target.value);
                setLot("");
              }}
            >
              <option value="">—</option>
              {locations.data?.facilities?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{text("Lô thành phẩm", "Finished lot")}</span>
            <select value={lotId} onChange={(e) => setLot(e.target.value)} disabled={!facilityId}>
              <option value="">—</option>
              {lots.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} · {row.stage}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(locations.isPending || Boolean(facilityId && lots.isPending)) && (
          <div className="flex justify-center py-4">
            <GrainLoader
              size="sm"
              label={text("Đang tải cơ sở và danh sách lô thành phẩm...", "Loading facilities and finished lots...")}
            />
          </div>
        )}

        {(locations.error ?? lots.error) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
              <Feedback error={locations.error ?? lots.error} />
            </div>
          </div>
        )}

        {facilityId && !lots.isPending && lots.data?.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 px-4 py-3 text-xs text-ink-secondary">
            {text(
              "Chưa có lô thành phẩm (HEAD_RICE, BROKEN_RICE, BLENDED_RICE, BAGGED_RICE) tại cơ sở này.",
              "No finished lots found at this facility.",
            )}
          </p>
        )}

        {lotId && <ObservationForm key={`${facilityId}:${lotId}`} scope={{ ownerId, facilityId, lotId }} attributes={attributes} />}
      </div>
    </section>
  );
}

function ObservationForm({
  scope,
  attributes,
}: {
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
    queryFn: () =>
      planningEndpoints.getQualityObservations({
        ownerId: scope.ownerId,
        facilityId: scope.facilityId,
        lotIds: [scope.lotId],
      }),
  });
  const attribute = attributes.find((row) => row.id === attributeId);
  const versionNo =
    Math.max(
      0,
      ...(observations.data ?? []).filter((row) => row.attributeId === attributeId).map((row) => row.versionNo),
    ) + 1;

  const save = useMutation({
    mutationFn: planningEndpoints.createQualityObservation,
    onSuccess: () => {
      setEvidence("");
      setRevision((n) => n + 1);
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
      ...scope,
      id: crypto.randomUUID(),
      attributeId,
      versionNo,
      measuredValue: value("measuredValue"),
      unit: attribute.unit,
      measuredAt: new Date(value("measuredAt")).toISOString(),
      evidenceId,
      reportReference: value("reportReference"),
      reviewedBy: value("reviewedBy"),
      reviewAuthority: value("reviewAuthority"),
      reviewedAt: new Date(value("reviewedAt")).toISOString(),
      subjectConfirmed: true,
    });
  }

  return (
    <div className="space-y-5 border-t border-ink-tertiary/15 pt-5">
      {observations.isPending && (
        <div className="flex justify-center py-4">
          <GrainLoader size="sm" label={text("Đang tải kết quả đo đã ghi nhận...", "Loading recorded observations...")} />
        </div>
      )}

      {observations.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={observations.error} />
          </div>
        </div>
      )}

      {observations.data?.length ? (
        <div className="space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink-secondary">
            {text("Kết quả đo đã xác nhận", "Confirmed observations")} ({observations.data.length})
          </h3>
          <ul className="space-y-2">
            {observations.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 px-3.5 py-2.5 text-xs dark:bg-surface-overlay/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-primary">
                    {attributes.find((a) => a.id === row.attributeId)?.name ?? row.attributeId}
                  </span>
                  <span className="rounded-md border border-ink-tertiary/20 bg-surface-base px-2 py-0.5 font-mono font-bold text-ink-primary dark:bg-surface-raised">
                    {row.measuredValue} {row.unit}
                  </span>
                  <StatusBadge status="COMPLIANT" size="sm" label={`v${row.versionNo}`} />
                </div>
                <div className="[&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:border-accent-primary/40 [&_button]:hover:bg-surface-raised [&_button]:hover:text-accent-primary [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay">
                  <CorrectionEvidenceDownload id={row.evidenceId} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form method="post" onSubmit={submit} key={revision} className="record-form space-y-4">
        <fieldset disabled={save.isPending} className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <legend className="font-display text-sm font-bold text-ink-primary">
            {text("Ghi nhận & xác nhận kết quả đo mới", "Record new measurement")}
          </legend>

          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span>{text("Chỉ tiêu", "Quality attribute")} *</span>
              <select
                name="attributeId"
                required
                value={attributeId}
                onChange={(e) => {
                  setAttribute(e.target.value);
                  setEvidence("");
                }}
              >
                <option value="" disabled>
                  —
                </option>
                {attributes
                  .filter((row) => row.unit)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} · {row.unit}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>
                {text("Giá trị đo", "Measured value")} {attribute?.unit ? `(${attribute.unit})` : ""} *
              </span>
              <input name="measuredValue" inputMode="decimal" pattern={decimalPattern} required />
            </label>
            <label>
              <span>{text("Đo lúc", "Measured at")} *</span>
              <input name="measuredAt" type="datetime-local" required />
            </label>
          </div>

          <label>
            <span>{text("Tham chiếu báo cáo", "Report reference")} *</span>
            <input name="reportReference" required />
          </label>

          <ReviewerFields />

          <div className={evidenceWrapperClass}>
            <CorrectionEvidence key={attributeId} original={scope} value={evidenceId} onChange={setEvidence} />
          </div>

          <label className="!flex-row cursor-pointer items-start gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-base p-3 text-xs font-medium text-ink-primary dark:bg-surface-raised">
            <input
              name="subjectConfirmed"
              type="checkbox"
              required
              className="mt-0.5 size-4 shrink-0 accent-accent-primary"
            />
            <span>
              {text(
                "Tôi đã xác minh báo cáo thuộc đúng lô và chỉ tiêu này.",
                "I verified the report measures this lot and attribute.",
              )}
            </span>
          </label>
        </fieldset>

        {message && (
          <div role="status" className="record-success">
            <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        {save.isPending && (
          <div className="flex justify-center py-2">
            <GrainLoader size="sm" label={text("Đang xác nhận kết quả đo...", "Confirming measurement...")} />
          </div>
        )}

        {save.error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
              <Feedback error={save.error} />
            </div>
          </div>
        )}

        <div className="record-form-footer items-center">
          <div className="mr-auto">
            {evidenceId ? (
              <StatusBadge status="COMPLIANT" size="sm" label={text("Đã đính kèm chứng cứ", "Evidence attached")} />
            ) : (
              <span className="text-xs text-ink-tertiary">
                {text("Tải lên tệp chứng cứ trước khi xác nhận", "Upload evidence before confirming")}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={save.isPending || !evidenceId || observations.isFetching || !observations.data}
            className="record-button record-primary rounded-full px-6"
          >
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            <span>{text("Xác nhận kết quả đo", "Confirm measurement")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ReviewerFields() {
  const text = useWorkflowText();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label>
        <span>{text("Người rà soát", "Reviewed by")} *</span>
        <input name="reviewedBy" required />
      </label>
      <label>
        <span>{text("Đơn vị duyệt", "Review authority")} *</span>
        <input name="reviewAuthority" required />
      </label>
      <label>
        <span>{text("Rà soát lúc", "Reviewed at")} *</span>
        <input name="reviewedAt" type="datetime-local" required />
      </label>
    </div>
  );
}
