import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { residueEndpoints, type ResidueProfileVersion } from "@/api/residue";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import {
  ArrowRight,
  ArrowsClockwise,
  Archive,
  Buildings,
  CalendarBlank,
  CheckCircle,
  FileText,
  Flask,
  Globe,
  MagnifyingGlass,
  ShieldCheck,
  SlidersHorizontal,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

const panel =
  "rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs";
const button =
  "p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors";
const field =
  "w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg";
const alert =
  "flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger";

export function ResidueProfilesPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retiring, setRetiring] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const scope = [
    user?.id,
    user?.organizationId,
    user?.role,
    [...(user?.permissions ?? [])].sort().join("|"),
  ];
  const listKey = ["residue-profiles", ...scope];
  const detailKey = ["residue-profile", ...scope, selectedId];
  const profiles = useQuery({
    queryKey: listKey,
    queryFn: residueEndpoints.getRules,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => residueEndpoints.getRule(selectedId!),
    enabled: Boolean(selectedId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const selected = detail.data;
  const mayRetire =
    selected &&
    !selected.retirement &&
    (selected.companyId == null
      ? user?.permissions.includes("residue.policy.manage")
      : user?.organizationId === selected.companyId &&
        user.permissions.includes("residue.company-policy.manage"));
  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !reason.trim())
        throw new Error(
          t(
            "residueProfiles.reasonRequired",
            "Vui lòng nhập lý do ngừng sử dụng.",
          ),
        );
      return residueEndpoints.retireRule(selectedId, { reason: reason.trim() });
    },
    onSuccess: (retirement) => {
      // Retirement affects the whole profile series within its owning scope.
      cache.setQueryData<{ items: ResidueProfileVersion[] }>(
        listKey,
        (current) =>
          current && {
            items: current.items.map((profile) =>
              profile.code === retirement.code &&
              (profile.companyId ?? null) === retirement.companyId
                ? { ...profile, retirement }
                : profile,
            ),
          },
      );
      cache.setQueryData<ResidueProfileVersion>(
        detailKey,
        (current) => current && { ...current, retirement },
      );
      setNotice(retirement.code);
      setRetiring(false);
      setReason("");
      void cache.invalidateQueries({ queryKey: listKey });
      void cache.invalidateQueries({ queryKey: ["residue-profile", ...scope] });
    },
  });
  function close() {
    if (mutation.isPending) return;
    setSelectedId(null);
    setRetiring(false);
    setReason("");
    mutation.reset();
  }
  const date = (value: string | null | undefined, withTime = false) => {
    if (!value || Number.isNaN(Date.parse(value))) return "—";
    return new Intl.DateTimeFormat(
      i18n.language.startsWith("en") ? "en-GB" : "vi-VN",
      {
        dateStyle: "short",
        ...(withTime ? { timeStyle: "short" as const } : {}),
      },
    ).format(new Date(value));
  };
  const allProfiles = profiles.data?.items ?? [];
  const retiredCount = allProfiles.filter(
    (profile) => profile.retirement,
  ).length;
  const query = search.trim().toLowerCase();
  const visible = allProfiles.filter(
    (profile) =>
      `${profile.code} ${profile.residueDefinition}`
        .toLowerCase()
        .includes(query) &&
      (status === "all" ||
        Boolean(profile.retirement) === (status === "retired")) &&
      (scopeFilter === "all" ||
        Boolean(profile.companyId) === (scopeFilter === "company")),
  );
  const filtered = Boolean(query || status !== "all" || scopeFilter !== "all");
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setScopeFilter("all");
  };
  const publishedLabel = t("residueProfiles.published", "Đã công bố");
  const retiredLabel = t("residueProfiles.retired", "Đã ngừng sử dụng");
  const StatusFilterIcon =
    status === "published"
      ? CheckCircle
      : status === "retired"
        ? Archive
        : ShieldCheck;
  const ScopeFilterIcon = scopeFilter === "company" ? Buildings : Globe;
  const scopeLabel = (profile: ResidueProfileVersion) =>
    profile.companyId
      ? t("residueProfiles.companyScope", "Phạm vi công ty")
      : t("residueProfiles.systemScope", "Phạm vi hệ thống");

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("residueProfiles.eyebrow", "Chính sách dư lượng")}
          </span>
          <h2 className="font-display text-2xl font-bold text-ink-primary">
            {t("residueProfiles.title", "Hồ sơ dư lượng")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 max-w-2xl text-xs text-ink-secondary"
          >
            {t(
              "residueProfiles.subtitle",
              "Tra cứu phiên bản đã công bố, phương pháp xét nghiệm và hệ số xử lý theo phạm vi được phép xem.",
            )}
          </p>
        </div>
        <button
          type="button"
          className={`${button} shrink-0 self-start bg-surface-base sm:self-auto rounded-full`}
          disabled={profiles.isFetching}
          onClick={() => void profiles.refetch()}
        >
          <ArrowsClockwise
            size={16}
            aria-hidden="true"
            className={
              profiles.isFetching ? "motion-safe:animate-spin" : undefined
            }
          />
        </button>
      </header>
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-functional-balanced-border/40 bg-functional-balanced-bg p-3.5 text-xs text-accent-primary"
        >
          <CheckCircle
            size={16}
            weight="fill"
            aria-hidden="true"
            className="absolute left-3 top-2.5 text-ink-tertiary"
          />
          <span>
            {t(
              "residueProfiles.retiredSuccess",
              `Đã ngừng sử dụng hồ sơ ${notice}.`,
              { code: notice },
            )}
          </span>
        </div>
      )}
      {profiles.error && (
        <div role="alert" className={alert}>
          <WarningCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>
            {t(
              "residueProfiles.loadError",
              "Không thể tải hồ sơ dư lượng. Vui lòng thử tải lại.",
            )}{" "}
            {profiles.error.message}
          </span>
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label={t("residueProfiles.summary", "Tổng hợp phiên bản hồ sơ")}
      >
        {[
          {
            label: t("residueProfiles.totalVersions", "Tổng phiên bản"),
            value: allProfiles.length,
            Icon: FileText,
          },
          {
            label: t(
              "residueProfiles.publishedVersions",
              "Phiên bản chưa ngừng sử dụng",
            ),
            value: allProfiles.length - retiredCount,
            Icon: CheckCircle,
          },
          {
            label: t(
              "residueProfiles.retiredVersions",
              "Phiên bản đã ngừng sử dụng",
            ),
            value: retiredCount,
            Icon: Archive,
          },
        ].map(({ label, value, Icon }) => (
          <div key={label} className={`${panel} p-4`}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-ink-secondary">{label}</p>
              <Icon
                size={18}
                aria-hidden="true"
                className="text-accent-primary"
              />
            </div>
            <p className="font-display text-2xl font-bold text-ink-primary">
              {profiles.data
                ? new Intl.NumberFormat(i18n.language).format(value)
                : "—"}
            </p>
          </div>
        ))}
      </div>

      <section
        className={`${panel} space-y-4 p-4 sm:p-5`}
        aria-label={t("residueProfiles.filters", "Bộ lọc hồ sơ")}
      >
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label
              htmlFor="residue-search"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("residueProfiles.search", "Tìm hồ sơ")}
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
              />
              <input
                id="residue-search"
                type="search"
                className={`${field} pl-10`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(
                  "residueProfiles.searchPlaceholder",
                  "Mã hoặc định nghĩa dư lượng",
                )}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="residue-status"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("residueProfiles.status", "Trạng thái")}
            </label>
            <span className="relative block">
              <StatusFilterIcon
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
              />
              <select
                id="residue-status"
                className={field}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">
                  {t("residueProfiles.allStatuses", "Tất cả trạng thái")}
                </option>
                <option value="published">{publishedLabel}</option>
                <option value="retired">{retiredLabel}</option>
              </select>
            </span>
          </div>
          <div>
            <label
              htmlFor="residue-scope"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("residueProfiles.scope", "Phạm vi áp dụng")}
            </label>
            <span className="relative block">
              <ScopeFilterIcon
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
              />
              <select
                id="residue-scope"
                className={field}
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value)}
              >
                <option value="all">
                  {t("residueProfiles.allScopes", "Tất cả phạm vi")}
                </option>
                <option value="system">
                  {t("residueProfiles.systemScope", "Phạm vi hệ thống")}
                </option>
                <option value="company">
                  {t("residueProfiles.companyScope", "Phạm vi công ty")}
                </option>
              </select>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3">
          <p className="text-xs text-ink-secondary" role="status">
            {t(
              "residueProfiles.showing",
              "Hiển thị {{count}} / {{total}} phiên bản",
              { count: visible.length, total: allProfiles.length },
            )}
          </p>
          {filtered && (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-accent-primary hover:bg-accent-primary/5"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" />
              {t("residueProfiles.clearFilters", "Xóa bộ lọc")}
            </button>
          )}
        </div>
      </section>
      {profiles.isPending && (
        <div className="py-12">
          <GrainLoader
            label={t("residueProfiles.loading", "Đang tải hồ sơ dư lượng…")}
          />
        </div>
      )}
      {profiles.isSuccess && visible.length === 0 && (
        <div
          className={`${panel} flex flex-col items-center px-5 py-12 text-center`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <FileText size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-sm font-bold text-ink-primary">
            {t("residueProfiles.emptyTitle", "Không có hồ sơ phù hợp")}
          </h3>
          <p className="mt-1 max-w-md text-xs text-ink-secondary">
            {filtered
              ? t(
                  "residueProfiles.emptyFiltered",
                  "Thử thay đổi từ khóa, trạng thái hoặc phạm vi áp dụng.",
                )
              : t(
                  "residueProfiles.empty",
                  "Chưa có hồ sơ dư lượng trong phạm vi được phép xem.",
                )}
          </p>
          {filtered && (
            <button
              type="button"
              className={`${button} mt-4`}
              onClick={clearFilters}
            >
              {t("residueProfiles.clearFilters", "Xóa bộ lọc")}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((profile) => (
          <button
            type="button"
            key={profile.id}
            className={`${panel} group flex flex-col p-5 text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary`}
            onClick={() => {
              setSelectedId(profile.id);
              setRetiring(false);
              setReason("");
              mutation.reset();
            }}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <Flask size={22} weight="bold" aria-hidden="true" />
              </div>
              <StatusBadge
                status={profile.retirement ? "CLOSED" : "ACTIVE"}
                label={profile.retirement ? retiredLabel : publishedLabel}
              />
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="break-all font-display text-base font-bold text-ink-primary">
                {profile.code}
              </h3>
              <span className="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary">
                v{profile.versionNo}
              </span>
            </div>
            <p className="mt-2 break-words text-sm font-medium text-ink-primary">
              {profile.residueDefinition}
            </p>
            <div className="mt-3 space-y-2 text-xs text-ink-secondary">
              <p className="flex items-center gap-2">
                {profile.companyId ? (
                  <Buildings size={15} aria-hidden="true" />
                ) : (
                  <Globe size={15} aria-hidden="true" />
                )}
                {scopeLabel(profile)}
                <span aria-hidden="true">·</span>
                <span>{profile.unit}</span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarBlank size={15} aria-hidden="true" />
                {t("residueProfiles.effectiveSince", "Hiệu lực từ {{date}}", {
                  date: date(profile.effectiveFrom),
                })}
              </p>
            </div>
            <div
              data-ui-detail="secondary"
              className="mt-4 flex flex-wrap gap-2 text-xs text-ink-secondary"
            >
              <span className="rounded-lg bg-surface-raised px-2 py-1">
                {t("residueProfiles.methodCount", "{{count}} phương pháp", {
                  count: profile.laboratory.length,
                })}
              </span>
              <span className="rounded-lg bg-surface-raised px-2 py-1">
                {t("residueProfiles.stepCount", "{{count}} bước xử lý", {
                  count: profile.steps.length,
                })}
              </span>
            </div>
            <div className="mt-auto pt-4">
              <span className="flex items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3 text-xs font-semibold text-accent-primary">
                {t("residueProfiles.view", "Xem hồ sơ")}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <Modal
        isOpen={Boolean(selectedId)}
        onClose={close}
        ariaLabel={t("residueProfiles.detailTitle", "Chi tiết hồ sơ dư lượng")}
        className="w-[48rem]"
        closeOnBackdrop={!mutation.isPending}
      >
        <div className={`${panel} overflow-hidden`}>
          <header className="flex items-center justify-between gap-3 border-b border-ink-tertiary/15 bg-surface-raised p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <Flask size={20} weight="bold" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-secondary">
                  {t("residueProfiles.detailTitle", "Chi tiết hồ sơ dư lượng")}
                </p>
                <h3 className="break-words font-display text-lg font-bold text-ink-primary">
                  {selected ? `${selected.code} · v${selected.versionNo}` : "—"}
                </h3>
              </div>
            </div>
            <button
              type="button"
              className={`${button}`}
              aria-label={t("common.close", "Đóng")}
              disabled={mutation.isPending}
              onClick={close}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="space-y-5 p-4 sm:p-6">
            {detail.isFetching && (
              <div
                role="status"
                className="flex items-center gap-2 text-xs text-ink-secondary"
              >
                <ArrowsClockwise
                  size={16}
                  className="motion-safe:animate-spin"
                  aria-hidden="true"
                />
                {t("residueProfiles.loadingDetail", "Đang tải thông tin…")}
              </div>
            )}
            {detail.error && (
              <div role="alert" className={alert}>
                <WarningCircle
                  size={18}
                  aria-hidden="true"
                  className="shrink-0"
                />
                <div>
                  <p>
                    {t(
                      "residueProfiles.detailError",
                      "Không thể tải chi tiết hồ sơ.",
                    )}{" "}
                    {detail.error.message}
                  </p>
                  <button
                    type="button"
                    className="mt-2 min-h-9 font-semibold underline"
                    disabled={detail.isFetching}
                    onClick={() => void detail.refetch()}
                  >
                    {t("common.reload", "Tải lại")}
                  </button>
                </div>
              </div>
            )}
            {selected && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={selected.retirement ? "CLOSED" : "ACTIVE"}
                    label={selected.retirement ? retiredLabel : publishedLabel}
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-tertiary/20 px-3 py-1 text-xs text-ink-secondary">
                    {selected.companyId ? (
                      <Buildings
                        size={14}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    ) : (
                      <Globe
                        size={14}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                    )}
                    {scopeLabel(selected)}
                  </span>
                  <span className="rounded-full bg-accent-primary/10 px-3 py-1 font-mono text-xs text-accent-primary">
                    {selected.kind}
                  </span>
                </div>
                <dl className="grid gap-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.definition", "Định nghĩa dư lượng")}
                    </dt>
                    <dd className="mt-1 break-words font-semibold text-ink-primary">
                      {selected.residueDefinition}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.precision", "Đơn vị / độ chính xác")}
                    </dt>
                    <dd className="mt-1 text-ink-primary">
                      {selected.unit} /{" "}
                      {t("residueProfiles.decimalPlaces", "{{count}} chữ số", {
                        count: Number(selected.decimalPlaces),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.effectiveFrom", "Bắt đầu hiệu lực")}
                    </dt>
                    <dd className="mt-1 text-ink-primary">
                      {date(selected.effectiveFrom)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.effectiveTo", "Kết thúc hiệu lực")}
                    </dt>
                    <dd className="mt-1 text-ink-primary">
                      {selected.effectiveTo
                        ? date(selected.effectiveTo)
                        : t("residueProfiles.noEndDate", "Không thời hạn")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.applicability", "Căn cứ áp dụng")}
                    </dt>
                    <dd className="mt-1 break-words text-ink-primary">
                      {selected.applicabilityStatement || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t("residueProfiles.evidence", "Tài liệu tham chiếu")}
                    </dt>
                    <dd className="mt-1 break-words text-ink-primary">
                      {selected.evidenceRef || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t(
                        "residueProfiles.reviewer",
                        "Người / đơn vị thẩm định",
                      )}
                    </dt>
                    <dd className="mt-1 break-words text-ink-primary">
                      {selected.reviewedBy} · {selected.reviewAuthority}
                      <span className="mt-1 block text-xs text-ink-secondary">
                        {date(selected.reviewedAt, true)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-secondary">
                      {t(
                        "residueProfiles.asReceived",
                        "Cơ sở mẫu nguyên trạng",
                      )}
                    </dt>
                    <dd
                      className={`mt-1 flex items-center gap-1.5 ${selected.asReceivedConfirmed ? "text-accent-primary" : "text-accent-warning"}`}
                    >
                      {selected.asReceivedConfirmed ? (
                        <CheckCircle size={16} aria-hidden="true" />
                      ) : (
                        <WarningCircle size={16} aria-hidden="true" />
                      )}
                      {selected.asReceivedConfirmed
                        ? t("residueProfiles.confirmed", "Đã xác nhận")
                        : t("residueProfiles.unconfirmed", "Chưa xác nhận")}
                    </dd>
                  </div>
                </dl>
                <section className="space-y-3">
                  <h4 className="flex items-center gap-2 border-b border-ink-tertiary/15 pb-3 text-sm font-bold text-ink-primary">
                    <Flask
                      size={18}
                      className="text-accent-primary"
                      aria-hidden="true"
                    />
                    {t("residueProfiles.methods", "Phương pháp xét nghiệm")}
                    <span className="ml-auto rounded-full bg-accent-primary/10 px-2 py-0.5 font-mono text-xs text-accent-primary">
                      {selected.laboratory.length}
                    </span>
                  </h4>
                  {selected.laboratory.length ? (
                    <ul className="space-y-2">
                      {selected.laboratory.map((lab, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-ink-tertiary/15 p-3 text-xs"
                        >
                          <p className="font-semibold text-ink-primary">
                            {lab.analyticalMethod}
                          </p>
                          <p className="mt-1 text-ink-secondary">
                            {lab.numericInterpretationKind ??
                              t(
                                "residueProfiles.noNumericInterpretation",
                                "Không diễn giải giá trị số",
                              )}
                          </p>
                          {lab.relativeUncertaintyPercent !== null && (
                            <p className="mt-1 text-ink-secondary">
                              {t(
                                "residueProfiles.uncertainty",
                                "Độ không đảm bảo tương đối: {{value}}%",
                                { value: lab.relativeUncertaintyPercent },
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-surface-raised/60 p-4 text-xs text-ink-secondary">
                      {t(
                        "residueProfiles.noMethods",
                        "Không có phương pháp xét nghiệm trong hồ sơ.",
                      )}
                    </p>
                  )}
                </section>
                <section className="space-y-3">
                  <h4 className="flex items-center gap-2 border-b border-ink-tertiary/15 pb-3 text-sm font-bold text-ink-primary">
                    <SlidersHorizontal
                      size={18}
                      className="text-accent-primary"
                      aria-hidden="true"
                    />
                    {t("residueProfiles.steps", "Bước xử lý")}
                    <span className="ml-auto rounded-full bg-accent-primary/10 px-2 py-0.5 font-mono text-xs text-accent-primary">
                      {selected.steps.length}
                    </span>
                  </h4>
                  {selected.steps.length ? (
                    <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
                      <table className="w-full min-w-[520px] text-left text-xs">
                        <caption className="sr-only">
                          {t("residueProfiles.steps", "Bước xử lý")}
                        </caption>
                        <thead className="border-b border-ink-tertiary/15 bg-surface-raised text-ink-secondary">
                          <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">
                              {t("residueProfiles.process", "Quy trình")}
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                              {t("residueProfiles.stage", "Giai đoạn")}
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-right font-semibold"
                            >
                              {t(
                                "residueProfiles.factors",
                                "Hệ số dưới / trên",
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-tertiary/15 text-ink-primary">
                          {selected.steps.map((step) => (
                            <tr key={step.id}>
                              <td className="px-4 py-3 font-medium">
                                {step.process}
                              </td>
                              <td className="px-4 py-3">
                                {step.inputStage} → {step.outputStage}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {step.factorLower} / {step.factorUpper}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-surface-raised/60 p-4 text-xs text-ink-secondary">
                      {t(
                        "residueProfiles.noSteps",
                        "Không có bước xử lý trong hồ sơ.",
                      )}
                    </p>
                  )}
                </section>
                {selected.retirement && (
                  <div className="flex items-start gap-3 rounded-xl border border-accent-warning/25 bg-accent-warning/5 p-4 text-xs">
                    <Archive
                      size={20}
                      aria-hidden="true"
                      className="shrink-0 text-accent-warning"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-primary">
                        {t(
                          "residueProfiles.retiredAt",
                          "Đã ngừng sử dụng ngày {{date}}",
                          { date: date(selected.retirement.retiredAt, true) },
                        )}
                      </p>
                      <p className="mt-1 break-words text-ink-secondary">
                        {t(
                          "residueProfiles.retirementReason",
                          "Lý do: {{reason}}",
                          { reason: selected.retirement.reason },
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {mutation.error && (
                  <div role="alert" className={alert}>
                    <WarningCircle
                      size={18}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    <span>{mutation.error.message}</span>
                  </div>
                )}
                {mayRetire && !retiring && (
                  <div className="flex justify-end border-t border-ink-tertiary/15 pt-4">
                    <button
                      type="button"
                      className={`${button} border-accent-danger/30 text-accent-danger hover:bg-accent-danger/5`}
                      disabled={detail.isFetching || detail.isError}
                      onClick={() => setRetiring(true)}
                    >
                      <Archive size={16} aria-hidden="true" />
                      {t("residueProfiles.retire", "Ngừng sử dụng hồ sơ")}
                    </button>
                  </div>
                )}
                {mayRetire && retiring && (
                  <form
                    className="space-y-4 rounded-xl border border-accent-danger/25 bg-accent-danger/5 p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      mutation.mutate();
                    }}
                  >
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-primary">
                      <WarningCircle
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-accent-danger"
                      />
                      <span>
                        {t(
                          "residueProfiles.retirementWarning",
                          "Cả chuỗi hồ sơ {{code}} sẽ ngừng được dùng cho đánh giá mới. Lịch sử đã ghi nhận được giữ lại.",
                          { code: selected.code },
                        )}
                      </span>
                    </p>
                    <div>
                      <label
                        htmlFor="retirement-reason"
                        className="mb-2 block text-xs font-semibold text-ink-primary"
                      >
                        {t(
                          "residueProfiles.reasonLabel",
                          "Lý do ngừng sử dụng (bắt buộc)",
                        )}
                      </label>
                      <textarea
                        id="retirement-reason"
                        className={field}
                        rows={3}
                        required
                        maxLength={1000}
                        value={reason}
                        disabled={mutation.isPending}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className={button}
                        disabled={mutation.isPending}
                        onClick={() => setRetiring(false)}
                      >
                        {t("common.cancel", "Hủy")}
                      </button>
                      <button
                        type="submit"
                        className={`${button} border-accent-danger bg-accent-danger text-white hover:bg-accent-danger/90`}
                        disabled={!reason.trim() || mutation.isPending}
                      >
                        {mutation.isPending
                          ? t("residueProfiles.saving", "Đang ghi nhận…")
                          : t(
                              "residueProfiles.confirmRetire",
                              "Xác nhận ngừng sử dụng",
                            )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
