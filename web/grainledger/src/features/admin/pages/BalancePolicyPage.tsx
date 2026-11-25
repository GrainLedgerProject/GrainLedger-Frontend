import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  FileText,
  GitBranch,
  MagnifyingGlass,
  Plus,
  Scales,
  ShieldCheck,
  Sliders,
  Trash,
  Warehouse,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { planningEndpoints } from "@/api/planning";
import { useAuthStore } from "@/app/store/authStore";
import {
  CorrectionEvidence,
  CorrectionEvidenceDownload,
} from "@/features/mill/components/CorrectionEvidence";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { adminPaths } from "../paths";

type PolicyMode = "balance" | "blend" | "mixed" | "yield";
type WorkflowTextFn = (vi: string, en: string) => string;

interface PublishedYieldRule {
  id: string;
  facilityId: string;
  compatibilityPolicyId: string;
  versionNo: number;
  outputFraction: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  evidenceId: string;
  reviewedBy: string;
  reviewAuthority: string;
  reviewedAt: string;
}

const setupKey = ["ledger-facility-setup"];
const operationKinds = [
  "DRYING",
  "MILLING",
  "MERGE",
  "BLENDING",
  "BAGGING",
] as const;
const blendProducts = ["HEAD_RICE", "BROKEN_RICE", "BLENDED_RICE"] as const;
const stages = [
  "RAW_PADDY",
  "DRIED_PADDY",
  "HEAD_RICE",
  "BROKEN_RICE",
  "BRAN",
  "HUSK",
  "BLENDED_RICE",
  "BAGGED_RICE",
] as const;

const OPERATION_LABELS: Record<string, { vi: string; en: string }> = {
  DRYING: { vi: "Sấy lúa", en: "Drying" },
  MILLING: { vi: "Xay xát", en: "Milling" },
  MERGE: { vi: "Gộp lô", en: "Merge" },
  BLENDING: { vi: "Phối trộn", en: "Blending" },
  BAGGING: { vi: "Đóng bao", en: "Bagging" },
};

const STAGE_LABELS: Record<string, { vi: string; en: string }> = {
  RAW_PADDY: { vi: "Lúa tươi", en: "Raw paddy" },
  DRIED_PADDY: { vi: "Lúa khô", en: "Dried paddy" },
  HEAD_RICE: { vi: "Gạo nguyên", en: "Head rice" },
  BROKEN_RICE: { vi: "Tấm", en: "Broken rice" },
  BRAN: { vi: "Cám", en: "Bran" },
  HUSK: { vi: "Trấu", en: "Husk" },
  BLENDED_RICE: { vi: "Gạo phối trộn", en: "Blended rice" },
  BAGGED_RICE: { vi: "Gạo đóng bao", en: "Bagged rice" },
};

function formatCodeLabel(
  labels: Record<string, { vi: string; en: string }>,
  code: string,
  text: WorkflowTextFn,
): string {
  const entry = labels[code];
  return entry ? `${text(entry.vi, entry.en)} (${code})` : code;
}

function lookupName(
  rows: { id: string; name: string }[] | undefined,
  id: string,
): string {
  return rows?.find((row) => row.id === id)?.name ?? id;
}

interface PolicyRowView {
  id: string;
  primaryScope: string;
  secondaryScope?: string;
  searchText: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  evidenceId?: string;
  balanceKind?: string;
  tolerancePercent?: string;
  blendInputs?: { commodity: string; product: string }[];
  blendOutput?: string;
  mixedCommodity?: string;
  mixedStage?: string;
  mixedProductIdentity?: string;
  yieldVersionNo?: number;
  yieldOutputFraction?: string;
  yieldReviewSummary?: string;
}

function buildHistoryRows(
  mode: PolicyMode,
  setup: SetupApiResponse,
  text: WorkflowTextFn,
  yieldRules: PublishedYieldRule[],
): PolicyRowView[] {
  if (mode === "balance") {
    return (setup.policies ?? []).map((row) => {
      const facilityName = lookupName(setup.facilities, row.facilityId);
      const opLabel = formatCodeLabel(OPERATION_LABELS, row.kind, text);
      return {
        id: row.id,
        primaryScope: facilityName,
        effectiveFrom: row.effectiveFrom,
        evidenceId: row.evidenceId,
        balanceKind: row.kind,
        tolerancePercent: row.tolerancePercent,
        searchText:
          `${facilityName} ${row.kind} ${opLabel} ${row.tolerancePercent}%`.toLowerCase(),
      };
    });
  }

  if (mode === "blend") {
    return (setup.compatibilities ?? []).map((row) => {
      const facilityName = lookupName(setup.facilities, row.facilityId);
      const inputs = (row.inputProducts ?? []).map((input) => {
        const [commodityId, product] = input.split(":");
        return {
          commodity: lookupName(setup.commodities, commodityId),
          product: product ?? "",
        };
      });
      const outputCommodity = lookupName(
        setup.commodities,
        row.outputCommodityId,
      );
      const inputSummary = inputs
        .map(
          (item) =>
            `${item.commodity} ${item.product} ${formatCodeLabel(STAGE_LABELS, item.product, text)}`,
        )
        .join(" ");
      return {
        id: row.id,
        primaryScope: facilityName,
        effectiveFrom: row.effectiveFrom,
        evidenceId: row.evidenceId,
        blendInputs: inputs,
        blendOutput: outputCommodity,
        searchText:
          `${facilityName} ${inputSummary} ${outputCommodity}`.toLowerCase(),
      };
    });
  }

  if (mode === "yield") {
    return yieldRules.map((row) => {
      const facilityName = lookupName(setup.facilities, row.facilityId);
      const compatibility = (setup.compatibilities ?? []).find(
        (item) => item.id === row.compatibilityPolicyId,
      );
      const blendInputs = (compatibility?.inputProducts ?? []).map((input) => {
        const [commodityId, product] = input.split(":");
        return {
          commodity: lookupName(setup.commodities, commodityId),
          product: product ?? "",
        };
      });
      const blendOutput = compatibility
        ? lookupName(setup.commodities, compatibility.outputCommodityId)
        : row.compatibilityPolicyId;
      return {
        id: row.id,
        primaryScope: facilityName,
        secondaryScope: blendOutput,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        evidenceId: row.evidenceId,
        blendInputs,
        blendOutput,
        yieldVersionNo: row.versionNo,
        yieldOutputFraction: row.outputFraction,
        yieldReviewSummary: `${row.reviewedBy} · ${row.reviewAuthority}`,
        searchText:
          `${facilityName} ${blendOutput} v${row.versionNo} ${row.outputFraction} ${row.reviewedBy} ${row.reviewAuthority}`.toLowerCase(),
      };
    });
  }

  return (setup.mixedBulkPolicies ?? []).map((row) => {
    const location = setup.locations?.find((loc) => loc.id === row.locationId);
    const locationName = location?.name ?? row.locationId;
    const facilityName = location
      ? lookupName(setup.facilities, location.facilityId)
      : undefined;
    const ownerName = lookupName(setup.owners, row.ownerId);
    const commodityName = lookupName(setup.commodities, row.commodityId);
    const stageLabel = formatCodeLabel(STAGE_LABELS, row.stage, text);
    const productLabel = formatCodeLabel(
      STAGE_LABELS,
      row.productIdentity,
      text,
    );
    return {
      id: row.id,
      primaryScope: locationName,
      secondaryScope: facilityName
        ? `${facilityName} · ${ownerName}`
        : ownerName,
      effectiveFrom: row.effectiveFrom,
      evidenceId: row.evidenceId,
      mixedCommodity: commodityName,
      mixedStage: row.stage,
      mixedProductIdentity: row.productIdentity,
      searchText:
        `${locationName} ${facilityName ?? ""} ${ownerName} ${commodityName} ${row.stage} ${stageLabel} ${row.productIdentity} ${productLabel}`.toLowerCase(),
    };
  });
}

export function BalancePolicyPage() {
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const canConfigure = Boolean(user?.permissions.includes("platform.configure"));
  const canPublishYield = Boolean(
    user?.permissions.includes("blend.yield-policy.manage"),
  );
  const setup = useQuery({
    queryKey: setupKey,
    queryFn: ledgerEndpoints.getSetup,
  });
  const organizations = useQuery({
    queryKey: ["admin-policy-organizations"],
    queryFn: adminEndpoints.getOrganizations,
    enabled: canConfigure,
  });
  const [mode, setMode] = useState<PolicyMode>("balance");
  const [searchQuery, setSearchQuery] = useState("");
  const [publishedYieldRules, setPublishedYieldRules] = useState<
    PublishedYieldRule[]
  >([]);

  const titles: Record<PolicyMode, string> = {
    balance: text("Dung sai công đoạn", "Operation tolerance"),
    blend: text("Tương thích phối trộn", "Blend compatibility"),
    mixed: text("Tương thích lưu kho trộn", "Mixed-bulk storage compatibility"),
    yield: text("Tỷ lệ thu hồi dự kiến", "Prospective planning yield"),
  };

  const categoryCards: {
    id: PolicyMode;
    title: string;
    description: string;
    count: number;
    icon: typeof Scales;
  }[] = [
    {
      id: "balance",
      title: titles.balance,
      description: text(
        "Ngưỡng hao hụt khối lượng theo cơ sở & công đoạn",
        "Mass tolerance thresholds by facility & operation",
      ),
      count: setup.data?.policies?.length ?? 0,
      icon: Scales,
    },
    {
      id: "blend",
      title: titles.blend,
      description: text(
        "Quy tắc phối trộn mặt hàng đầu vào → đầu ra",
        "Input-to-output commodity blend formulas",
      ),
      count: setup.data?.compatibilities?.length ?? 0,
      icon: GitBranch,
    },
    {
      id: "mixed",
      title: titles.mixed,
      description: text(
        "Phạm vi lưu kho trộn theo vị trí, chủ hàng & phẩm cấp",
        "Mixed-bulk scope by location, owner & product",
      ),
      count: setup.data?.mixedBulkPolicies?.length ?? 0,
      icon: Warehouse,
    },
    {
      id: "yield",
      title: titles.yield,
      description: text(
        "Hiệu suất thu hồi dự kiến theo quy tắc phối trộn cho lập kế hoạch",
        "Prospective planning yield fraction per blend rule",
      ),
      count: publishedYieldRules.length,
      icon: Sliders,
    },
  ];

  const isLoading =
    setup.isPending || Boolean(canConfigure && organizations.isPending);
  const isFetching =
    setup.isFetching || Boolean(canConfigure && organizations.isFetching);
  const loadError = setup.error ?? organizations.error;

  function handleReload() {
    void setup.refetch();
    if (canConfigure) {
      void organizations.refetch();
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("QUY TẮC SỔ CÁI & LƯU KHO", "LEDGER & STORAGE RULES")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {text(
              "Chính sách cân bằng và lưu kho",
              "Balance and storage policies",
            )}
          </h1>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 text-xs text-ink-secondary"
          >
            {text(
              "Quản lý phiên bản dung sai công đoạn, quy tắc tương thích phối trộn và phạm vi lưu kho trộn gắn chứng cứ bất biến.",
              "Manage versioned operation tolerances, blend compatibility rules, and mixed-bulk storage scopes with immutable evidence.",
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canConfigure && (
            <>
              <Link
                to={adminPaths.facilities}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
              >
                <Buildings size={15} aria-hidden="true" />
                <span>{text("Cơ sở & Silo", "Facilities & Silos")}</span>
              </Link>
              <Link
                to={adminPaths.receivingThresholds}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
              >
                <Sliders size={15} aria-hidden="true" />
                <span>{text("Ngưỡng tiếp nhận", "Receiving thresholds")}</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={handleReload}
            disabled={isFetching}
            aria-label={text(
              "Tải lại dữ liệu từ máy chủ",
              "Reload data from server",
            )}
            title={text(
              "Tải lại dữ liệu từ máy chủ",
              "Reload data from server",
            )}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={
                isFetching
                  ? "motion-safe:animate-spin text-accent-primary"
                  : undefined
              }
            />
          </button>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={loadError} />
          </div>
        </div>
      )}

      {isLoading && !setup.data && (
        <div className="flex justify-center py-16">
          <GrainLoader
            label={text(
              "Đang tải chính sách cân bằng và lưu kho...",
              "Loading balance and storage policies...",
            )}
          />
        </div>
      )}

      {setup.data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((card) => {
              const Icon = card.icon;
              const active = mode === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setMode(card.id)}
                  aria-pressed={active}
                  className={`group flex flex-col justify-between gap-2 rounded-2xl border p-4 text-start shadow-xs transition-all ${
                    active
                      ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                      : "border-ink-tertiary/20 bg-surface-base hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        active
                          ? "text-accent-primary"
                          : "text-ink-secondary group-hover:text-ink-primary"
                      }`}
                    >
                      {card.title}
                    </span>
                    <span
                      className={`inline-grid size-8 shrink-0 place-items-center rounded-xl transition-colors ${
                        active
                          ? "bg-accent-primary text-white"
                          : "bg-accent-primary/10 text-accent-primary"
                      }`}
                    >
                      <Icon size={16} weight="bold" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-2xl font-bold text-ink-primary">
                      {card.count}
                    </span>
                    {active && (
                      <span className="rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent-primary">
                        {text("Đang xem", "Viewing")}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>

          <PolicyHistory
            mode={mode}
            onModeChange={setMode}
            setup={setup.data}
            yieldRules={publishedYieldRules}
            title={titles[mode]}
            titles={titles}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {(mode === "yield" ? canPublishYield : Boolean(canConfigure && organizations.data)) ? (
            <PolicyEditor
              key={mode}
              mode={mode}
              modeTitle={titles[mode]}
              setup={setup.data}
              yieldRules={publishedYieldRules}
              onYieldRulePublished={(rule) =>
                setPublishedYieldRules((prev) => [rule, ...prev])
              }
              defaultReviewer={user?.displayName ?? ""}
              defaultOwnerId={
                mode === "yield" && !canConfigure ? (user?.organizationId ?? "") : ""
              }
              owners={
                canConfigure && organizations.data
                  ? organizations.data.filter((org) => org.kind === "Customer")
                  : [
                      ...(user?.organizationId
                        ? [
                            {
                              id: user.organizationId,
                              name:
                                user.organizationName ||
                                text(
                                  "Đơn vị nhà máy hiện tại",
                                  "Current mill organization",
                                ),
                            },
                          ]
                        : []),
                      ...(setup.data.owners ?? []),
                    ].filter(
                      (owner, index, arr) =>
                        Boolean(owner.id) &&
                        arr.findIndex((item) => item.id === owner.id) === index,
                    )
              }
            />
          ) : (
            <div className="flex items-center gap-2.5 rounded-2xl border border-ink-tertiary/20 bg-surface-base px-4 py-3 text-xs text-ink-secondary dark:bg-surface-raised">
              <ShieldCheck
                size={18}
                className="shrink-0 text-accent-primary"
                aria-hidden="true"
              />
              <span>
                {mode === "yield"
                  ? text(
                      "Chỉ Quản lý nhà máy có quyền blend.yield-policy.manage mới công bố được quy tắc tỷ lệ thu hồi dự kiến.",
                      "Only Mill Managers with blend.yield-policy.manage permission can publish prospective yield rules.",
                    )
                  : canPublishYield
                    ? text(
                        "Bạn đang xem ở chế độ chỉ đọc cho dung sai và tương thích. Chọn thẻ Tỷ lệ thu hồi dự kiến để công bố quy tắc hiệu suất.",
                        "Read-only for tolerances and compatibilities. Select Prospective planning yield to publish yield rules.",
                      )
                    : text(
                        "Bạn đang xem ở chế độ chỉ đọc. Cần quyền cấu hình nền tảng để ghi phiên bản chính sách mới.",
                        "Read-only view. Platform configuration permission is required to record new policy versions.",
                      )}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PolicyHistory({
  mode,
  onModeChange,
  setup,
  yieldRules,
  title,
  titles,
  searchQuery,
  onSearchChange,
}: {
  mode: PolicyMode;
  onModeChange: (nextMode: PolicyMode) => void;
  setup: SetupApiResponse;
  yieldRules: PublishedYieldRule[];
  title: string;
  titles: Record<PolicyMode, string>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const text = useWorkflowText();
  const [renderedAt] = useState(() => Date.now());
  const allRows = buildHistoryRows(mode, setup, text, yieldRules);
  const query = searchQuery.trim().toLowerCase();
  const filteredRows = query
    ? allRows.filter((row) => row.searchText.includes(query))
    : allRows;
  const sortedRows = [...filteredRows].sort(
    (a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom),
  );

  const HeaderIcon =
    mode === "balance"
      ? Scales
      : mode === "blend"
        ? GitBranch
        : mode === "mixed"
          ? Warehouse
          : Sliders;

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <HeaderIcon size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {title}
              </h2>
              <StatusBadge
                status="ACTIVE"
                size="sm"
                label={text(
                  `${sortedRows.length} phiên bản`,
                  `${sortedRows.length} versions`,
                )}
              />
            </div>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Sắp xếp từ phiên bản hiệu lực mới nhất đến cũ hơn, kèm chứng cứ bất biến.",
                "Ordered from newest effective version to oldest, linked to immutable evidence.",
              )}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            <span className="shrink-0">
              {text("Loại chính sách", "Policy type")}
            </span>
            <select
              name="policyType"
              value={mode}
              onChange={(e) => onModeChange(e.target.value as PolicyMode)}
              className="filter-control w-auto border-ink-tertiary/20 bg-surface-raised font-semibold dark:bg-surface-overlay"
            >
              {Object.entries(titles).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="relative min-w-0 sm:w-64">
            <MagnifyingGlass
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={text("Tìm kiếm chính sách", "Search policies")}
              placeholder={text(
                "Tìm cơ sở, mặt hàng, công đoạn...",
                "Search facility, commodity, rule...",
              )}
              className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-10 placeholder:text-ink-tertiary dark:bg-surface-overlay"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label={text("Xóa tìm kiếm", "Clear search")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {sortedRows.length > 0 ? (
        <div className="record-table-region">
          <table>
            <thead>
              <tr>
                <th scope="col">{text("Phạm vi", "Scope")}</th>
                <th scope="col">{text("Quy tắc", "Rule")}</th>
                <th scope="col">{text("Hiệu lực từ", "Effective from")}</th>
                <th scope="col">{text("Chứng cứ", "Evidence")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const effectiveMs = Date.parse(row.effectiveFrom);
                const isScheduled =
                  Number.isFinite(effectiveMs) && effectiveMs > renderedAt;
                return (
                  <tr key={row.id}>
                    <th scope="row" className="font-semibold text-ink-primary">
                      <div>{row.primaryScope}</div>
                      {row.secondaryScope && (
                        <div className="mt-0.5 text-[11px] font-normal text-ink-secondary">
                          {row.secondaryScope}
                        </div>
                      )}
                    </th>
                    <td>
                      {mode === "balance" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status="BALANCED"
                            size="sm"
                            label={formatCodeLabel(
                              OPERATION_LABELS,
                              row.balanceKind ?? "",
                              text,
                            )}
                          />
                          <span className="inline-flex items-center rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 font-mono text-xs font-bold text-ink-primary dark:bg-surface-overlay">
                            ±{row.tolerancePercent}%
                          </span>
                        </div>
                      )}
                      {mode === "blend" && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(row.blendInputs ?? []).map((input, idx) => (
                            <span
                              key={`${row.id}-in-${idx}`}
                              className="inline-flex items-center rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink-primary dark:bg-surface-overlay"
                            >
                              {input.commodity} ·{" "}
                              {formatCodeLabel(
                                STAGE_LABELS,
                                input.product,
                                text,
                              )}
                            </span>
                          ))}
                          <ArrowRight
                            size={14}
                            className="shrink-0 text-accent-primary"
                            aria-hidden="true"
                          />
                          <span className="inline-flex items-center rounded-md border border-accent-primary/30 bg-accent-primary/10 px-2 py-0.5 text-[11px] font-semibold text-accent-primary">
                            {row.blendOutput}
                          </span>
                        </div>
                      )}
                      {mode === "mixed" && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 text-[11px] font-semibold text-ink-primary dark:bg-surface-overlay">
                            {row.mixedCommodity}
                          </span>
                          <StatusBadge
                            status="IN_PROGRESS"
                            size="sm"
                            label={formatCodeLabel(
                              STAGE_LABELS,
                              row.mixedStage ?? "",
                              text,
                            )}
                          />
                          <span className="inline-flex items-center rounded-md border border-accent-primary/25 bg-accent-primary/10 px-2 py-0.5 text-[11px] font-semibold text-accent-primary">
                            {formatCodeLabel(
                              STAGE_LABELS,
                              row.mixedProductIdentity ?? "",
                              text,
                            )}
                          </span>
                        </div>
                      )}
                      {mode === "yield" && (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              status="BALANCED"
                              size="sm"
                              label={`v${row.yieldVersionNo ?? 1}`}
                            />
                            <span className="inline-flex items-center rounded-md border border-accent-primary/30 bg-accent-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-accent-primary">
                              {row.yieldOutputFraction}
                            </span>
                            <span className="text-xs text-ink-secondary">
                              {row.blendOutput}
                            </span>
                          </div>
                          {row.yieldReviewSummary && (
                            <p className="text-[11px] text-ink-tertiary">
                              {text("Thẩm định bởi", "Reviewed by")}:{" "}
                              {row.yieldReviewSummary}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono text-xs text-ink-primary">
                          {new Date(row.effectiveFrom).toLocaleString()}
                        </span>
                        {row.effectiveTo && (
                          <span className="font-mono text-[11px] text-ink-tertiary">
                            → {new Date(row.effectiveTo).toLocaleString()}
                          </span>
                        )}
                        <StatusBadge
                          status={isScheduled ? "PENDING" : "COMPLIANT"}
                          size="sm"
                          label={
                            isScheduled
                              ? text("Sắp hiệu lực", "Scheduled")
                              : text("Đang áp dụng", "Effective")
                          }
                        />
                      </div>
                    </td>
                    <td>
                      {row.evidenceId ? (
                        <div className="[&_button]:inline-flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:border-accent-primary/40 [&_button]:hover:bg-surface-raised [&_button]:hover:text-accent-primary [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay">
                          <CorrectionEvidenceDownload id={row.evidenceId} />
                        </div>
                      ) : (
                        <span className="text-xs text-ink-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="record-empty">
          <span aria-hidden="true" className="text-ink-tertiary opacity-60">
            <FileText size={32} />
          </span>
          <p className="font-semibold text-ink-primary">
            {allRows.length === 0
              ? mode === "yield"
                ? text(
                    "Chưa có phiên bản tỷ lệ thu hồi dự kiến nào được công bố trong phiên làm việc này.",
                    "No prospective planning yield rules have been published in this session yet.",
                  )
                : text(
                    "Chưa có phiên bản chính sách trong phạm vi này.",
                    "No policies have been recorded in this scope.",
                  )
              : text(
                  "Không tìm thấy quy tắc phù hợp với bộ lọc.",
                  "No policies match the current search filter.",
                )}
          </p>
          {allRows.length > 0 && searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="record-button mt-2 rounded-full"
            >
              {text("Xóa bộ lọc tìm kiếm", "Clear search filter")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function PolicyEditor({
  mode,
  modeTitle,
  setup,
  yieldRules,
  onYieldRulePublished,
  defaultReviewer,
  defaultOwnerId,
  owners,
}: {
  mode: PolicyMode;
  modeTitle: string;
  setup: SetupApiResponse;
  yieldRules: PublishedYieldRule[];
  onYieldRulePublished: (rule: PublishedYieldRule) => void;
  defaultReviewer: string;
  defaultOwnerId: string;
  owners: { id: string; name: string }[];
}) {
  const text = useWorkflowText();
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState("");
  const [locationId, setLocation] = useState("");
  const [compatibilityId, setCompatibilityId] = useState("");
  const [ownerId, setOwner] = useState(() =>
    defaultOwnerId && owners.some((owner) => owner.id === defaultOwnerId)
      ? defaultOwnerId
      : mode === "yield" && owners.length === 1
        ? owners[0].id
        : "",
  );
  const [evidenceId, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [formRevision, setFormRevision] = useState(0);
  const [inputs, setInputs] = useState(() => [crypto.randomUUID()]);

  const facilityId =
    mode === "mixed"
      ? (setup.locations?.find((row) => row.id === locationId)?.facilityId ??
        "")
      : facility;

  const mixedLocations = setup.locations?.filter((row) => row.mixedBulk) ?? [];
  const facilityCompatibilities = (setup.compatibilities ?? []).filter(
    (row) => !facilityId || row.facilityId === facilityId,
  );
  const suggestedYieldVersion =
    Math.max(
      0,
      ...yieldRules
        .filter(
          (row) =>
            row.facilityId === facilityId &&
            row.compatibilityPolicyId === compatibilityId,
        )
        .map((row) => row.versionNo),
    ) + 1;

  const save = useMutation({
    mutationFn: (command: () => Promise<unknown>) => command(),
    onSuccess: () => {
      setMessage(
        text("Đã ghi nhận phiên bản chính sách.", "Policy version recorded."),
      );
      setEvidence("");
      setInputs([crypto.randomUUID()]);
      setFormRevision((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: setupKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!facilityId || !ownerId || !evidenceId || save.isPending) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const base = {
      id: crypto.randomUUID(),
      evidenceId,
      effectiveFrom: new Date(value("effectiveFrom")).toISOString(),
    };
    setMessage("");
    save.mutate(async () => {
      switch (mode) {
        case "balance":
          return ledgerEndpoints.createPolicy({
            ...base,
            facilityId,
            kind: value("kind"),
            tolerancePercent: value("tolerancePercent"),
          });
        case "blend": {
          const inputProducts = inputs.map(
            (id) => `${value(`commodity-${id}`)}:${value(`product-${id}`)}`,
          );
          if (new Set(inputProducts).size !== inputProducts.length) {
            throw new Error(
              text(
                "Mỗi cặp mặt hàng và sản phẩm đầu vào chỉ được chọn một lần.",
                "Select each input commodity and product pair only once.",
              ),
            );
          }
          return ledgerEndpoints.createCompatibility({
            ...base,
            facilityId,
            inputProducts,
            outputCommodityId: value("outputCommodityId"),
          });
        }
        case "mixed":
          return ledgerEndpoints.createMixedBulkPolicy({
            ...base,
            locationId,
            ownerId,
            commodityId: value("commodityId"),
            stage: value("stage"),
            productIdentity: value("productIdentity"),
            identityScopeConfirmed: true,
          });
        case "yield": {
          const compatPolicyId = value("compatibilityPolicyId");
          const versionNo = Number(value("versionNo"));
          const outputFraction = value("outputFraction");
          const effectiveFromIso = base.effectiveFrom;
          const effectiveToRaw = value("effectiveTo");
          const effectiveToIso = effectiveToRaw
            ? new Date(effectiveToRaw).toISOString()
            : null;
          const reviewedBy = value("reviewedBy");
          const reviewAuthority = value("reviewAuthority");
          const reviewedAtRaw = value("reviewedAt");
          const reviewedAtIso = new Date(reviewedAtRaw).toISOString();
          if (!compatPolicyId) {
            throw new Error(
              text(
                "Chọn quy tắc tương thích phối trộn trước khi công bố.",
                "Select a blend compatibility policy before publishing.",
              ),
            );
          }
          if (!Number.isInteger(versionNo) || versionNo < 1) {
            throw new Error(
              text(
                "Số phiên bản phải là số nguyên dương liên tiếp.",
                "Version number must be a positive integer.",
              ),
            );
          }
          const fractionNum = Number(outputFraction);
          if (
            !/^(0(\.[0-9]{1,12})?|1(\.0{1,12})?)$/.test(outputFraction) ||
            !Number.isFinite(fractionNum) ||
            fractionNum <= 0 ||
            fractionNum > 1
          ) {
            throw new Error(
              text(
                "Tỷ lệ thu hồi (outputFraction) phải nằm trong khoảng (0, 1] với tối đa 12 chữ số thập phân.",
                "Output fraction must be within (0, 1] with up to 12 decimal places.",
              ),
            );
          }
          if (
            effectiveToIso &&
            Date.parse(effectiveToIso) <= Date.parse(effectiveFromIso)
          ) {
            throw new Error(
              text(
                "Thời điểm kết thúc hiệu lực phải sau thời điểm bắt đầu.",
                "Effective end time must be after effective start time.",
              ),
            );
          }
          if (Date.parse(reviewedAtIso) > Date.now()) {
            throw new Error(
              text(
                "Thời điểm thẩm định không được ở tương lai.",
                "Review timestamp cannot be in the future.",
              ),
            );
          }
          const payload: PublishedYieldRule = {
            id: base.id,
            facilityId,
            compatibilityPolicyId: compatPolicyId,
            versionNo,
            outputFraction,
            effectiveFrom: effectiveFromIso,
            effectiveTo: effectiveToIso,
            evidenceId,
            reviewedBy,
            reviewAuthority,
            reviewedAt: reviewedAtIso,
          };
          const created = await planningEndpoints.createYieldRule(payload);
          onYieldRulePublished(payload);
          setCompatibilityId("");
          return created;
        }
      }
    });
  }

  const commodities = setup.commodities ?? [];
  const commodityOptions = commodities.map((row) => (
    <option key={row.id} value={row.id}>
      {row.name}
    </option>
  ));

  return (
    <section className="record-card">
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile" aria-hidden="true">
            <Plus size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-ink-primary">
              {text("Ghi phiên bản chính sách", "Record a policy version")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Mỗi phiên bản có thời điểm hiệu lực và chứng cứ riêng. Khi có thay đổi, hãy ghi phiên bản mới.",
                "Each version has its own effective date and evidence. Record a new version when a rule changes.",
              )}
            </p>
          </div>
        </div>
        <StatusBadge status="ACTIVE" size="sm" label={modeTitle} />
      </div>

      <div className="p-4 sm:p-6">
        <form method="post" onSubmit={submit} className="record-form space-y-5">
          <fieldset className="space-y-5" disabled={save.isPending}>
            <div className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
              <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <Buildings
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
                <span>{text("Phạm vi chính sách", "Policy scope")}</span>
              </legend>

              {mode === "mixed" && mixedLocations.length === 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-functional-hold-border bg-functional-hold-bg px-3 py-2 text-xs text-ink-primary">
                  <span>
                    {text(
                      "Chưa có vị trí/silo nào được bật chế độ lưu kho trộn. Hãy bật tại trang Cơ sở & Silo trước.",
                      "No locations have mixed-bulk enabled yet. Enable it under Facilities & Silos first.",
                    )}
                  </span>
                  <Link
                    to={adminPaths.facilities}
                    className="shrink-0 font-semibold text-accent-primary hover:underline"
                  >
                    {text("Mở cấu hình", "Open setup")}
                  </Link>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {mode === "mixed" ? (
                  <label>
                    <span>
                      {text(
                        "Vị trí đã bật lưu kho trộn",
                        "Mixed-bulk enabled location",
                      )}{" "}
                      *
                    </span>
                    <select
                      name="locationId"
                      required
                      value={locationId}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setEvidence("");
                      }}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {mixedLocations.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} ·{" "}
                          {lookupName(setup.facilities, row.facilityId)} ·{" "}
                          {row.kind}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>{text("Cơ sở", "Facility")} *</span>
                    <select
                      name="facilityId"
                      required
                      value={facility}
                      onChange={(e) => {
                        setFacility(e.target.value);
                        setCompatibilityId("");
                        setEvidence("");
                      }}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {setup.facilities?.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  <span>
                    {text("Doanh nghiệp sở hữu chứng cứ", "Evidence owner")} *
                  </span>
                  <select
                    name="ownerId"
                    required
                    value={ownerId}
                    onChange={(e) => {
                      setOwner(e.target.value);
                      setEvidence("");
                    }}
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {owners.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <fieldset
              key={formRevision}
              className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25"
            >
              <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                <Sliders
                  size={16}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
                <span>{text("Điều kiện áp dụng", "Rule conditions")}</span>
              </legend>

              {mode === "balance" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span>{text("Công đoạn", "Operation")} *</span>
                    <select name="kind" required>
                      {operationKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {formatCodeLabel(OPERATION_LABELS, kind, text)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text("Dung sai (%)", "Tolerance (%)")} *</span>
                    <input
                      name="tolerancePercent"
                      required
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,6})?"
                      placeholder="e.g. 1.5"
                    />
                  </label>
                </div>
              )}

              {mode === "blend" && (
                <div className="space-y-3">
                  {inputs.map((id, index) => (
                    <fieldset
                      key={id}
                      className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-base p-3.5 dark:bg-surface-raised"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <legend className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                          {text("Đầu vào", "Input")} {index + 1}
                        </legend>
                        {inputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setInputs((rows) =>
                                rows.filter((row) => row !== id),
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-2.5 py-1 text-xs font-semibold text-accent-danger transition-colors hover:opacity-85"
                          >
                            <Trash size={13} aria-hidden="true" />
                            <span>{text("Bỏ đầu vào", "Remove input")}</span>
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span>
                            {text("Mặt hàng đầu vào", "Input commodity")} *
                          </span>
                          <select
                            name={`commodity-${id}`}
                            required
                            defaultValue=""
                          >
                            <option value="" disabled>
                              —
                            </option>
                            {commodityOptions}
                          </select>
                        </label>
                        <label>
                          <span>{text("Sản phẩm", "Product")} *</span>
                          <select name={`product-${id}`} required>
                            {blendProducts.map((kind) => (
                              <option key={kind} value={kind}>
                                {formatCodeLabel(STAGE_LABELS, kind, text)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </fieldset>
                  ))}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setInputs((rows) => [...rows, crypto.randomUUID()])
                      }
                      className="record-button rounded-full"
                    >
                      <Plus size={14} weight="bold" aria-hidden="true" />
                      <span>{text("Thêm đầu vào", "Add input")}</span>
                    </button>
                  </div>

                  <label>
                    <span>{text("Mặt hàng đầu ra", "Output commodity")} *</span>
                    <select name="outputCommodityId" required defaultValue="">
                      <option value="" disabled>
                        —
                      </option>
                      {commodityOptions}
                    </select>
                  </label>
                </div>
              )}

              {mode === "mixed" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label>
                      <span>{text("Mặt hàng", "Commodity")} *</span>
                      <select name="commodityId" required defaultValue="">
                        <option value="" disabled>
                          —
                        </option>
                        {commodityOptions}
                      </select>
                    </label>
                    <label>
                      <span>{text("Giai đoạn", "Stage")} *</span>
                      <select name="stage" required>
                        {stages.map((stage) => (
                          <option key={stage} value={stage}>
                            {formatCodeLabel(STAGE_LABELS, stage, text)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{text("Sản phẩm", "Product identity")} *</span>
                      <select name="productIdentity" required>
                        {stages.map((stage) => (
                          <option key={stage} value={stage}>
                            {formatCodeLabel(STAGE_LABELS, stage, text)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="!flex-row cursor-pointer items-start gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-base p-3 text-xs font-medium text-ink-primary dark:bg-surface-raised">
                    <input
                      name="identityScopeConfirmed"
                      type="checkbox"
                      required
                      className="mt-0.5 size-4 shrink-0 accent-accent-primary"
                    />
                    <span>
                      {text(
                        "Chứng cứ xác nhận đúng vị trí, chủ hàng, mặt hàng, giai đoạn và sản phẩm đã chọn.",
                        "The evidence confirms the exact location, owner, commodity, stage and product selected.",
                      )}
                    </span>
                  </label>
                </div>
              )}

              {mode === "yield" && (
                <div className="space-y-4">
                  <label>
                    <span>
                      {text(
                        "Quy tắc tương thích phối trộn",
                        "Blend compatibility policy",
                      )}{" "}
                      *
                    </span>
                    <select
                      name="compatibilityPolicyId"
                      required
                      value={compatibilityId}
                      onChange={(e) => setCompatibilityId(e.target.value)}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {facilityCompatibilities.map((row) => {
                        const outName = lookupName(
                          commodities,
                          row.outputCommodityId,
                        );
                        const inSummary = (row.inputProducts ?? [])
                          .map((item) => {
                            const [comId, product] = item.split(":");
                            return `${lookupName(commodities, comId)} (${product})`;
                          })
                          .join(" + ");
                        return (
                          <option key={row.id} value={row.id}>
                            {inSummary} → {outName}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {facilityId && facilityCompatibilities.length === 0 && (
                    <p
                      role="status"
                      className="rounded-lg border border-functional-hold-border bg-functional-hold-bg px-3 py-2 text-xs text-ink-primary"
                    >
                      {text(
                        "Cơ sở này chưa có quy tắc tương thích phối trộn. Quản trị viên cần tạo quy tắc tương thích trước.",
                        "This facility has no blend compatibility rules yet. An administrator must create one first.",
                      )}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span>{text("Phiên bản", "Version number")} *</span>
                      <input
                        key={`${compatibilityId}:${suggestedYieldVersion}`}
                        type="number"
                        name="versionNo"
                        min={1}
                        step={1}
                        required
                        defaultValue={suggestedYieldVersion}
                      />
                    </label>
                    <label>
                      <span>
                        {text(
                          "Tỷ lệ thu hồi (0 < x ≤ 1)",
                          "Output fraction (0 < x ≤ 1)",
                        )}{" "}
                        *
                      </span>
                      <input
                        name="outputFraction"
                        required
                        inputMode="decimal"
                        pattern="(0(\.[0-9]{1,12})?|1(\.0{1,12})?)"
                        placeholder="0.65"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label>
                      <span>
                        {text("Người thẩm định", "Reviewed by")} *
                      </span>
                      <input
                        name="reviewedBy"
                        required
                        defaultValue={defaultReviewer}
                      />
                    </label>
                    <label>
                      <span>
                        {text("Cơ quan / Bộ phận thẩm định", "Review authority")}{" "}
                        *
                      </span>
                      <input
                        name="reviewAuthority"
                        required
                        placeholder={text(
                          "VD: Hội đồng kỹ thuật nhà máy",
                          "e.g. Mill Technical Board",
                        )}
                      />
                    </label>
                    <label>
                      <span>
                        {text("Thời điểm thẩm định", "Reviewed at")} *
                      </span>
                      <input
                        type="datetime-local"
                        name="reviewedAt"
                        required
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span>{text("Hiệu lực từ", "Effective from")} *</span>
                  <input type="datetime-local" name="effectiveFrom" required />
                </label>
                {mode === "yield" && (
                  <label>
                    <span>
                      {text("Hiệu lực đến (tùy chọn)", "Effective to (optional)")}
                    </span>
                    <input type="datetime-local" name="effectiveTo" />
                  </label>
                )}
              </div>
            </fieldset>

            {facilityId && ownerId ? (
              <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-4 dark:bg-surface-overlay/30 [&_button]:mt-1 [&_button]:inline-flex [&_button]:min-h-10 [&_button]:items-center [&_button]:justify-center [&_button]:gap-2 [&_button]:rounded-full [&_button]:border [&_button]:border-ink-tertiary/20 [&_button]:bg-surface-base [&_button]:px-4 [&_button]:py-2 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink-primary [&_button]:transition-colors [&_button]:hover:bg-surface-raised [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 dark:[&_button]:bg-surface-overlay dark:[&_button]:hover:bg-surface-raised [&_input[type=file]]:p-2 [&_input[type=file]]:text-sm [&_input[type=file]::file-selector-button]:mr-3 [&_input[type=file]::file-selector-button]:rounded-full [&_input[type=file]::file-selector-button]:border-0 [&_input[type=file]::file-selector-button]:bg-accent-primary/10 [&_input[type=file]::file-selector-button]:px-3 [&_input[type=file]::file-selector-button]:py-1.5 [&_input[type=file]::file-selector-button]:text-xs [&_input[type=file]::file-selector-button]:font-semibold [&_input[type=file]::file-selector-button]:text-accent-primary [&_legend]:font-display [&_legend]:text-sm [&_legend]:font-bold [&_legend]:text-ink-primary [&_p[role=status]]:mt-1 [&_p[role=status]]:inline-flex [&_p[role=status]]:items-center [&_p[role=status]]:gap-1.5 [&_p[role=status]]:rounded-lg [&_p[role=status]]:bg-functional-balanced-bg [&_p[role=status]]:px-3 [&_p[role=status]]:py-2 [&_p[role=status]]:text-xs [&_p[role=status]]:font-semibold [&_p[role=status]]:text-accent-primary">
                <CorrectionEvidence
                  key={`${facilityId}:${ownerId}:${formRevision}`}
                  original={{ facilityId, ownerId }}
                  value={evidenceId}
                  onChange={setEvidence}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/30 p-4 text-xs text-ink-secondary dark:bg-surface-overlay/20">
                <ShieldCheck
                  size={18}
                  className="shrink-0 text-ink-tertiary"
                  aria-hidden="true"
                />
                <span>
                  {text(
                    "Chọn cơ sở/vị trí và doanh nghiệp sở hữu chứng cứ ở trên để tải tệp chứng cứ bất biến.",
                    "Select the facility/location and evidence owner above to upload immutable evidence.",
                  )}
                </span>
              </div>
            )}
          </fieldset>

          {message && (
            <div role="status" className="record-success">
              <CheckCircle
                size={18}
                weight="fill"
                className="shrink-0"
                aria-hidden="true"
              />
              <span>{message}</span>
            </div>
          )}

          {save.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
            >
              <WarningCircle
                size={18}
                weight="fill"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                <Feedback error={save.error} />
              </div>
            </div>
          )}

          <div className="record-form-footer items-center">
            <div className="mr-auto">
              {evidenceId ? (
                <StatusBadge
                  status="COMPLIANT"
                  size="sm"
                  label={text("Đã đính kèm chứng cứ", "Evidence attached")}
                />
              ) : (
                <span className="text-xs text-ink-tertiary">
                  {text(
                    "Tải lên tệp chứng cứ trước khi ghi phiên bản",
                    "Upload evidence before recording",
                  )}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={save.isPending || !evidenceId}
              className="record-button record-primary rounded-full px-5"
            >
              <CheckCircle size={16} weight="bold" aria-hidden="true" />
              <span>
                {save.isPending
                  ? text("Đang ghi phiên bản...", "Recording version...")
                  : text("Ghi phiên bản", "Record version")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
