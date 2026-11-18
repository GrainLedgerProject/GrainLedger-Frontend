import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowsClockwise,
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  FileArrowUp,
  FileText,
  Flask,
  Globe,
  ListBullets,
  MagnifyingGlass,
  NotePencil,
  Plus,
  ShieldCheck,
  SquaresFour,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { catalogsEndpoints, type MrlVersionDto } from "@/api/catalogs";
import { ApiError } from "@/api/client";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { confirmAction } from "@/app/store/feedbackStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import { mrlDecimal, mrlImportSchema } from "../model/mrlImport";

const panel =
  "rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs";
const field =
  "w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg";
const iconButton =
  "p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink-tertiary/20 bg-surface-base px-4 py-2.5 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50";
const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent-primary-dim disabled:opacity-50";
const alert =
  "flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger";
const fieldLabel = "block space-y-1.5 text-xs font-semibold text-ink-secondary";

function MrlDialog({
  open,
  title,
  subtitle,
  icon,
  onClose,
  busy,
  children,
  footer,
  className = "w-[48rem]",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabel={title}
      className={className}
      closeOnBackdrop={!busy}
    >
      <div className={`${panel} overflow-hidden`}>
        <header className="flex items-center justify-between gap-3 border-b border-ink-tertiary/15 bg-surface-raised p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              {icon}
            </div>
            <div className="min-w-0">
              {subtitle && (
                <p className="text-xs text-ink-secondary">{subtitle}</p>
              )}
              <h3 className="break-words font-display text-lg font-bold text-ink-primary">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className={iconButton}
            aria-label={t("apiAudit.close")}
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-5 p-4 sm:p-6">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-tertiary/15 p-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </Modal>
  );
}
const localNow = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function MrlVersionsPage() {
  const user = useAuthStore((state) => state.user);
  const scope = [
    user?.id,
    user?.organizationId,
    user?.permissions.toSorted().join("|"),
  ].join(":");
  return (
    <MrlWorkspace
      key={scope}
      scope={scope}
      canManage={Boolean(user?.permissions.includes("platform.configure"))}
    />
  );
}

function MrlWorkspace({
  scope,
  canManage,
}: {
  scope: string;
  canManage: boolean;
}) {
  const { t, i18n } = useTranslation();
  const cache = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [importing, setImporting] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [stale, setStale] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [form, setForm] = useState({
    marketId: "",
    commodityId: "",
    effectiveFrom: "",
    effectiveTo: "",
    sourceRef: "",
  });
  const [limit, setLimit] = useState({ substanceId: "", value: "" });
  const [lookup, setLookup] = useState({
    marketId: "",
    commodityId: "",
    decisionAt: localNow(),
  });
  const [resolved, setResolved] = useState<MrlVersionDto | null>(null);
  const listKey = ["mrl-catalog", scope];
  const detailKey = ["mrl-detail", scope, selectedId];
  const catalogs = useQuery({
    queryKey: listKey,
    retry: false,
    queryFn: async () => {
      const [versions, markets, commodities, substances] = await Promise.all([
        collectPages(catalogsEndpoints.getMrlVersions),
        collectPages(catalogsEndpoints.getMarkets),
        collectPages(catalogsEndpoints.getCommodities),
        collectPages(catalogsEndpoints.getActiveSubstances),
      ]);
      return { versions, markets, commodities, substances };
    },
  });
  const detail = useQuery({
    queryKey: detailKey,
    enabled: Boolean(selectedId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const resource = await catalogsEndpoints.getMrlVersion(selectedId!);
      const limits = await collectPages((query) =>
        catalogsEndpoints.getMrlLimits(selectedId!, query),
      );
      return { ...resource, limits };
    },
  });
  const data = catalogs.data;
  const selected = detail.data?.data;
  const editable =
    canManage &&
    selected?.status === "DRAFT" &&
    Boolean(detail.data?.etag) &&
    !stale &&
    !detail.isFetching;
  const label = (version: MrlVersionDto) =>
    [
      data?.markets.find((item) => item.id === version.marketId)?.name ||
        version.marketId,
      data?.commodities.find((item) => item.id === version.commodityId)?.name ||
        version.commodityId,
    ].join(" · ");
  const date = (value: string) =>
    new Date(value).toLocaleString(i18n.language === "en" ? "en-GB" : "vi-VN");
  const toLocal = (value: string) => {
    const parsed = new Date(value);
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const reportError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 412) {
      setStale(true);
      setError(t("apiAudit.conflict"));
    } else if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 405)
    ) {
      setError(
        err.problem?.code === "MRL_VERSION_NOT_AVAILABLE"
          ? t("apiAudit.mrl.notAvailable")
          : t("apiAudit.unavailable"),
      );
    } else {
      const validation =
        err instanceof ApiError
          ? Object.values(err.problem?.errors ?? {})
              .flat()
              .join(" · ")
          : "";
      setError(
        validation ||
          (err instanceof Error ? err.message : t("apiAudit.failed")),
      );
    }
  };
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      reportError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: listKey });
    if (selectedId) {
      const result = await detail.refetch();
      if (result.error) throw result.error;
      setStale(false);
    }
  };
  const saveVersion = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const effectiveFrom = new Date(form.effectiveFrom).toISOString();
      const effectiveTo = form.effectiveTo
        ? new Date(form.effectiveTo).toISOString()
        : null;
      if (effectiveTo && effectiveTo <= effectiveFrom)
        throw new Error(t("apiAudit.invalidInterval"));
      const request = {
        ...form,
        effectiveFrom,
        effectiveTo,
        sourceRef: form.sourceRef.trim(),
      };
      if (editor === "edit") {
        if (!editable || !selected || !selectedId || !detail.data?.etag)
          throw new Error(t("apiAudit.missingEtag"));
        await catalogsEndpoints.updateMrlVersion(
          selectedId,
          {
            sourceRef: request.sourceRef,
            ...(form.effectiveFrom !== toLocal(selected.effectiveFrom)
              ? { effectiveFrom }
              : {}),
            ...(form.effectiveTo !==
            (selected.effectiveTo ? toLocal(selected.effectiveTo) : "")
              ? { effectiveTo }
              : {}),
          },
          detail.data.etag,
        );
      } else await catalogsEndpoints.createMrlVersion(request);
      setEditor(null);
      await refresh();
      setNotice(t("apiAudit.saved"));
    });
  };
  const saveLimit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!editable || !selectedId || !detail.data?.etag)
        throw new Error(t("apiAudit.missingEtag"));
      if (!mrlDecimal.test(limit.value.trim()))
        throw new Error(t("apiAudit.mrl.invalidLimit"));
      await catalogsEndpoints.upsertMrlLimit(
        selectedId,
        limit.substanceId,
        { limitValue: limit.value.trim(), unit: "mg/kg" },
        detail.data.etag,
      );
      await refresh();
      setNotice(t("apiAudit.saved"));
    });
  };
  const publish = () =>
    void run(async () => {
      if (!editable || !selectedId || !detail.data?.etag) return;
      if (
        !(await confirmAction({
          title: t("apiAudit.mrl.publish"),
          description: t("apiAudit.mrl.publishConfirm"),
          confirmLabel: t("apiAudit.mrl.publish"),
          variant: "warning",
        }))
      )
        return;
      await catalogsEndpoints.publishMrlVersion(selectedId, detail.data.etag);
      await refresh();
      setNotice(t("apiAudit.mrl.publishedNotice"));
    });
  const closeDetail = () => {
    if (!busy) {
      setSelectedId(null);
      setStale(false);
      setError("");
    }
  };
  const versions = data?.versions ?? [];
  const searchTerm = search.trim().toLocaleLowerCase(i18n.language);
  const visible = versions.filter(
    (version) =>
      (!filter || version.status === filter) &&
      (!marketFilter || version.marketId === marketFilter) &&
      (!searchTerm ||
        [label(version), version.sourceRef, `v${version.versionNo}`]
          .join(" ")
          .toLocaleLowerCase(i18n.language)
          .includes(searchTerm)),
  );
  const filtered = Boolean(searchTerm || filter || marketFilter);
  const clearFilters = () => {
    setSearch("");
    setFilter("");
    setMarketFilter("");
  };
  const openDetail = (version: MrlVersionDto) => {
    setLookupOpen(false);
    setSelectedId(version.id);
    setStale(false);
    setError("");
    setNotice("");
    setLimit({ substanceId: data?.substances[0]?.id || "", value: "" });
  };
  const statusBadge = (version: MrlVersionDto) => (
    <StatusBadge
      status={version.status === "PUBLISHED" ? "ACTIVE" : "PENDING"}
      label={
        version.status === "PUBLISHED"
          ? t("apiAudit.mrl.published")
          : t("apiAudit.mrl.draft")
      }
    />
  );
  const StatusFilterIcon =
    filter === "PUBLISHED"
      ? CheckCircle
      : filter === "DRAFT"
        ? NotePencil
        : ShieldCheck;
  const alerts = (
    <>
      {error && (
        <div role="alert" className={alert}>
          <WarningCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-functional-balanced-border/40 bg-functional-balanced-bg p-3.5 text-xs text-accent-primary"
        >
          <CheckCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
  const editVersion = () => {
    if (!selected) return;
    setForm({
      marketId: selected.marketId,
      commodityId: selected.commodityId,
      effectiveFrom: toLocal(selected.effectiveFrom),
      effectiveTo: selected.effectiveTo ? toLocal(selected.effectiveTo) : "",
      sourceRef: selected.sourceRef,
    });
    setEditor("edit");
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-ink-tertiary/15 pb-4 xl:flex-row xl:items-center">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("catalogs.mrl.tag")}
          </span>
          <h2 className="font-display text-2xl font-bold text-ink-primary">
            {t("catalogs.mrl.title")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="mt-0.5 max-w-2xl text-xs text-ink-secondary"
          >
            {t("apiAudit.mrl.subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start xl:self-auto">
          <button
            type="button"
            className={button}
            disabled={!data || busy}
            onClick={() => {
              setError("");
              setNotice("");
              setLookupOpen(true);
            }}
            aria-label={t("apiAudit.mrl.lookup")}
          >
            <Globe size={16} aria-hidden="true" />
            {t("apiAudit.mrl.lookupAction")}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  setError("");
                  setNotice("");
                  setImporting(true);
                }}
                aria-label={t("apiAudit.mrl.import")}
              >
                <FileArrowUp size={16} aria-hidden="true" />
                {t("apiAudit.mrl.importAction")}
              </button>
              <button
                type="button"
                className={primary}
                disabled={!data || busy}
                aria-label={t("catalogs.mrl.createBtn")}
                onClick={() => {
                  setError("");
                  setNotice("");
                  setForm({
                    marketId: data?.markets[0]?.id || "",
                    commodityId: data?.commodities[0]?.id || "",
                    effectiveFrom: localNow(),
                    effectiveTo: "",
                    sourceRef: "",
                  });
                  setEditor("create");
                }}
              >
                <Plus size={16} weight="bold" aria-hidden="true" />
                {t("apiAudit.mrl.createAction")}
              </button>
            </>
          )}
          <button
            type="button"
            className={`${iconButton} shrink-0`}
            disabled={busy || catalogs.isFetching}
            onClick={() => void run(refresh)}
            aria-label={t("common.reload")}
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={
                catalogs.isFetching ? "motion-safe:animate-spin" : undefined
              }
            />
          </button>
        </div>
      </header>
      {!selectedId && !editor && !importing && !lookupOpen && alerts}
      {catalogs.error && (
        <div role="alert" className={alert}>
          <WarningCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>{catalogs.error.message}</span>
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label={t("apiAudit.mrl.summary")}
      >
        {[
          {
            label: t("residueProfiles.totalVersions"),
            value: versions.length,
            Icon: FileText,
          },
          {
            label: t("apiAudit.mrl.publishedVersions"),
            value: versions.filter((version) => version.status === "PUBLISHED")
              .length,
            Icon: CheckCircle,
          },
          {
            label: t("apiAudit.mrl.draftVersions"),
            value: versions.filter((version) => version.status === "DRAFT")
              .length,
            Icon: NotePencil,
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
              {data ? new Intl.NumberFormat(i18n.language).format(value) : "—"}
            </p>
          </div>
        ))}
      </div>

      <section
        className={`${panel} space-y-4 p-4 sm:p-5`}
        aria-label={t("apiAudit.mrl.filters")}
      >
        <div className="grid items-end gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label
              htmlFor="mrl-search"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("apiAudit.mrl.search")}
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-2.5 text-ink-tertiary"
              />
              <input
                id="mrl-search"
                type="search"
                className={`${field} pl-10`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("apiAudit.mrl.searchPlaceholder")}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="mrl-status"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("apiAudit.mrl.status")}
            </label>
            <span className="relative block">
              <StatusFilterIcon
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
              />
              <select
                id="mrl-status"
                className={field}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="">{t("residueProfiles.allStatuses")}</option>
                <option value="DRAFT">{t("apiAudit.mrl.draft")}</option>
                <option value="PUBLISHED">{t("apiAudit.mrl.published")}</option>
              </select>
            </span>
          </div>
          <div>
            <label
              htmlFor="mrl-market-filter"
              className="mb-1.5 block text-xs font-semibold text-ink-secondary"
            >
              {t("apiAudit.mrl.market")}
            </label>
            <span className="relative block">
              <Globe
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
              />
              <select
                id="mrl-market-filter"
                className={field}
                value={marketFilter}
                onChange={(event) => setMarketFilter(event.target.value)}
              >
                <option value="">{t("apiAudit.mrl.allMarkets")}</option>
                {data?.markets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3">
          <p className="text-xs text-ink-secondary" role="status">
            {t("residueProfiles.showing", {
              count: visible.length,
              total: versions.length,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {filtered && (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-accent-primary hover:bg-accent-primary/5"
                onClick={clearFilters}
              >
                <X size={14} aria-hidden="true" />
                {t("residueProfiles.clearFilters")}
              </button>
            )}
            <div
              role="group"
              aria-label={t("apiAudit.mrl.viewMode")}
              className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-raised p-1"
            >
              {(
                [
                  {
                    mode: "list",
                    label: t("apiAudit.mrl.listView"),
                    Icon: ListBullets,
                  },
                  {
                    mode: "grid",
                    label: t("apiAudit.mrl.gridView"),
                    Icon: SquaresFour,
                  },
                ] as const
              ).map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${viewMode === mode ? "bg-accent-primary text-white shadow-xs" : "text-ink-secondary hover:bg-surface-base hover:text-ink-primary"}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      {catalogs.isPending && (
        <div className="py-12">
          <GrainLoader label={t("catalogs.mrl.loading")} />
        </div>
      )}
      {catalogs.isSuccess && !visible.length && (
        <div
          className={`${panel} flex flex-col items-center px-5 py-12 text-center`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <FileText size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-sm font-bold text-ink-primary">
            {t("apiAudit.mrl.empty")}
          </h3>
          <p className="mt-1 max-w-md text-xs text-ink-secondary">
            {filtered
              ? t("apiAudit.mrl.emptyFiltered")
              : t("catalogs.mrl.emptyDesc")}
          </p>
          {filtered && (
            <button
              type="button"
              className={`${button} mt-4`}
              onClick={clearFilters}
            >
              {t("residueProfiles.clearFilters")}
            </button>
          )}
        </div>
      )}

      {viewMode === "list" && visible.length > 0 ? (
        <div className={`${panel} overflow-hidden`}>
          <div
            tabIndex={0}
            role="region"
            aria-label={t("apiAudit.mrl.versions")}
            className="max-h-[70vh] overflow-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
          >
            <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-xs">
              <caption className="sr-only">
                {t("apiAudit.mrl.versions")}
              </caption>
              <thead className="sticky top-0 z-20 bg-surface-raised text-ink-secondary">
                <tr>
                  {[
                    t("apiAudit.mrl.market"),
                    t("apiAudit.mrl.commodity"),
                    t("apiAudit.mrl.period"),
                    t("apiAudit.mrl.source"),
                    t("apiAudit.mrl.status"),
                    t("common.actions"),
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="whitespace-nowrap border-b border-ink-tertiary/15 px-5 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ink-primary">
                {visible.map((version) => (
                  <tr key={version.id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-ink-tertiary/15 bg-surface-base px-5 py-4 text-left font-semibold group-hover:bg-surface-raised dark:bg-surface-raised dark:group-hover:bg-surface-overlay"
                    >
                      <div className="flex items-center gap-2">
                        <Globe
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-accent-primary"
                        />
                        <span className="max-w-52 truncate">
                          {data?.markets.find(
                            (item) => item.id === version.marketId,
                          )?.name || version.marketId}
                        </span>
                        <span className="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-ink-secondary">
                          v{version.versionNo}
                        </span>
                      </div>
                    </th>
                    <td className="whitespace-nowrap border-b border-ink-tertiary/15 px-5 py-4 group-hover:bg-surface-raised/50">
                      {data?.commodities.find(
                        (item) => item.id === version.commodityId,
                      )?.name || version.commodityId}
                    </td>
                    <td className="whitespace-nowrap border-b border-ink-tertiary/15 px-5 py-4 text-ink-secondary group-hover:bg-surface-raised/50">
                      <p>{date(version.effectiveFrom)}</p>
                      <p className="mt-1 text-ink-tertiary">
                        {version.effectiveTo
                          ? date(version.effectiveTo)
                          : t("apiAudit.noEnd")}
                      </p>
                    </td>
                    <td className="border-b border-ink-tertiary/15 px-5 py-4 text-ink-secondary group-hover:bg-surface-raised/50">
                      <p className="max-w-64 truncate">
                        {version.sourceRef || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap border-b border-ink-tertiary/15 px-5 py-4 group-hover:bg-surface-raised/50">
                      {statusBadge(version)}
                    </td>
                    <td className="border-b border-ink-tertiary/15 px-5 py-4 group-hover:bg-surface-raised/50">
                      <button
                        type="button"
                        className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 font-semibold text-accent-primary transition-colors hover:bg-accent-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                        aria-label={`${t("catalogs.mrl.limitsBtn")} · ${label(version)} · v${version.versionNo}`}
                        onClick={() => openDetail(version)}
                      >
                        {t("catalogs.mrl.limitsBtn")}
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((version) => (
            <button
              type="button"
              key={version.id}
              aria-label={`${t("catalogs.mrl.limitsBtn")} · ${label(version)} · v${version.versionNo}`}
              className={`${panel} group flex flex-col p-5 text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary`}
              onClick={() => openDetail(version)}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Globe size={22} weight="bold" aria-hidden="true" />
                </div>
                {statusBadge(version)}
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="break-words font-display text-base font-bold text-ink-primary">
                  {data?.markets.find((item) => item.id === version.marketId)
                    ?.name || version.marketId}
                </h3>
                <span className="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary">
                  v{version.versionNo}
                </span>
              </div>
              <p className="mt-2 break-words text-sm font-medium text-ink-primary">
                {data?.commodities.find(
                  (item) => item.id === version.commodityId,
                )?.name || version.commodityId}
              </p>
              <div className="mt-3 space-y-2 text-xs text-ink-secondary">
                <p className="flex items-start gap-2">
                  <CalendarBlank
                    size={15}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {t("residueProfiles.effectiveSince", {
                      date: date(version.effectiveFrom),
                    })}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <CalendarBlank
                    size={15}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {version.effectiveTo
                      ? date(version.effectiveTo)
                      : t("apiAudit.noEnd")}
                  </span>
                </p>
              </div>
              <div
                data-ui-detail="secondary"
                className="mt-4 rounded-lg bg-surface-raised px-3 py-2 text-xs text-ink-secondary"
              >
                <p className="mb-1 font-semibold">{t("apiAudit.mrl.source")}</p>
                <p className="line-clamp-2 break-words">
                  {version.sourceRef || "—"}
                </p>
              </div>
              <div className="mt-auto pt-4">
                <span className="flex items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3 text-xs font-semibold text-accent-primary">
                  {t("catalogs.mrl.limitsBtn")}
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <MrlDialog
        open={Boolean(selectedId) && !editor}
        onClose={closeDetail}
        title={
          selected
            ? label(selected) + " · v" + selected.versionNo
            : t("apiAudit.mrl.details")
        }
        subtitle={t("apiAudit.mrl.details")}
        icon={<ShieldCheck size={20} weight="bold" aria-hidden="true" />}
        busy={busy}
        footer={
          <>
            <button
              type="button"
              className={button}
              disabled={busy || detail.isFetching}
              onClick={() =>
                void run(async () => {
                  const result = await detail.refetch();
                  if (result.error) throw result.error;
                  setStale(false);
                })
              }
            >
              <ArrowsClockwise size={16} aria-hidden="true" />
              {t("common.reload")}
            </button>
            {canManage && selected?.status === "DRAFT" && (
              <>
                <button
                  type="button"
                  className={button}
                  disabled={!editable || busy}
                  onClick={editVersion}
                >
                  <NotePencil size={16} aria-hidden="true" />
                  {t("apiAudit.mrl.edit")}
                </button>
                <button
                  type="button"
                  className={primary}
                  disabled={!editable || busy || !detail.data?.limits.length}
                  onClick={publish}
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  {t("apiAudit.mrl.publish")}
                </button>
              </>
            )}
          </>
        }
      >
        {alerts}
        {detail.isPending || detail.isFetching ? (
          <div className="py-8">
            <GrainLoader />
          </div>
        ) : detail.isError ? (
          <div role="alert" className={alert}>
            <WarningCircle size={18} aria-hidden="true" className="shrink-0" />
            <span>{detail.error.message}</span>
          </div>
        ) : (
          selected && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(selected)}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-tertiary/20 px-3 py-1 text-xs text-ink-secondary">
                  <Globe size={14} aria-hidden="true" className="shrink-0" />
                  {t("apiAudit.mrl.market")}:{" "}
                  {data?.markets.find((item) => item.id === selected.marketId)
                    ?.code || selected.marketId}
                </span>
                <span className="rounded-full bg-accent-primary/10 px-3 py-1 font-mono text-xs text-accent-primary">
                  MRL
                </span>
              </div>
              <dl className="grid gap-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-ink-secondary">
                    <Globe size={14} aria-hidden="true" className="shrink-0" />
                    {t("apiAudit.mrl.market")}
                  </dt>
                  <dd className="mt-1 break-words font-semibold text-ink-primary">
                    {data?.markets.find((item) => item.id === selected.marketId)
                      ?.name || selected.marketId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">
                    {t("apiAudit.mrl.commodity")}
                  </dt>
                  <dd className="mt-1 break-words font-semibold text-ink-primary">
                    {data?.commodities.find(
                      (item) => item.id === selected.commodityId,
                    )?.name || selected.commodityId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">
                    {t("residueProfiles.effectiveFrom")}
                  </dt>
                  <dd className="mt-1 text-ink-primary">
                    {date(selected.effectiveFrom)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">
                    {t("residueProfiles.effectiveTo")}
                  </dt>
                  <dd className="mt-1 text-ink-primary">
                    {selected.effectiveTo
                      ? date(selected.effectiveTo)
                      : t("apiAudit.noEnd")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-ink-secondary">
                    {t("apiAudit.mrl.source")}
                  </dt>
                  <dd className="mt-1 break-words text-ink-primary">
                    {selected.sourceRef || "—"}
                  </dd>
                </div>
              </dl>
              {canManage &&
                selected.status === "DRAFT" &&
                !detail.data?.etag && (
                  <div role="alert" className={alert}>
                    <WarningCircle
                      size={18}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    <span>{t("apiAudit.missingEtag")}</span>
                  </div>
                )}
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 border-b border-ink-tertiary/15 pb-3 text-sm font-bold text-ink-primary">
                  <Flask
                    size={18}
                    className="text-accent-primary"
                    aria-hidden="true"
                  />
                  {t("apiAudit.mrl.limits")}
                  <span className="ml-auto rounded-full bg-accent-primary/10 px-2 py-0.5 font-mono text-xs text-accent-primary">
                    {detail.data?.limits.length ?? 0}
                  </span>
                </h4>
                {detail.data?.limits.length ? (
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={t("apiAudit.mrl.limits")}
                    className="max-h-80 overflow-auto rounded-xl border border-ink-tertiary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
                  >
                    <table className="w-full min-w-[440px] border-separate border-spacing-0 text-left text-xs">
                      <caption className="sr-only">
                        {t("apiAudit.mrl.limits")}
                      </caption>
                      <thead className="sticky top-0 z-10 bg-surface-raised text-ink-secondary">
                        <tr>
                          <th
                            scope="col"
                            className="border-b border-ink-tertiary/15 px-4 py-3 font-semibold"
                          >
                            {t("apiAudit.mrl.substance")}
                          </th>
                          <th
                            scope="col"
                            className="border-b border-ink-tertiary/15 px-4 py-3 text-right font-semibold"
                          >
                            {t("apiAudit.mrl.limit")}
                          </th>
                          {canManage && selected.status === "DRAFT" && (
                            <th
                              scope="col"
                              className="border-b border-ink-tertiary/15 px-4 py-3 text-right font-semibold"
                            >
                              {t("common.actions")}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="text-ink-primary">
                        {detail.data.limits.map((row) => (
                          <tr key={row.id}>
                            <th
                              scope="row"
                              className="sticky left-0 border-b border-ink-tertiary/15 bg-surface-base px-4 py-3 text-left font-medium dark:bg-surface-raised"
                            >
                              {data?.substances.find(
                                (item) => item.id === row.substanceId,
                              )?.name || row.substanceId}
                            </th>
                            <td className="whitespace-nowrap border-b border-ink-tertiary/15 px-4 py-3 text-right font-mono">
                              {row.limitValue} {row.unit}
                            </td>
                            {canManage && selected.status === "DRAFT" && (
                              <td className="border-b border-ink-tertiary/15 px-4 py-3 text-right">
                                <button
                                  type="button"
                                  className={`${iconButton} text-accent-danger hover:text-accent-danger`}
                                  disabled={!editable || busy}
                                  aria-label={t("apiAudit.mrl.deleteLimit")}
                                  onClick={() =>
                                    void run(async () => {
                                      if (
                                        !detail.data?.etag ||
                                        !(await confirmAction({
                                          title: t("apiAudit.mrl.deleteLimit"),
                                          description: t(
                                            "apiAudit.mrl.deleteConfirm",
                                          ),
                                          confirmLabel: t("common.delete"),
                                          variant: "danger",
                                        }))
                                      )
                                        return;
                                      await catalogsEndpoints.deleteMrlLimit(
                                        selected.id,
                                        row.substanceId,
                                        detail.data.etag,
                                      );
                                      await refresh();
                                      setNotice(t("apiAudit.saved"));
                                    })
                                  }
                                >
                                  <Trash size={16} aria-hidden="true" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-surface-raised/60 p-4 text-xs text-ink-secondary">
                    {t("apiAudit.mrl.noLimits")}
                  </p>
                )}
              </section>
              {canManage && selected.status === "DRAFT" && (
                <form
                  onSubmit={saveLimit}
                  className="space-y-4 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4"
                >
                  <h4 className="text-sm font-bold text-ink-primary">
                    {t("catalogs.mrl.addLimitTitle")}
                  </h4>
                  <div className="grid items-end gap-3 sm:grid-cols-2">
                    <label className={fieldLabel}>
                      {t("apiAudit.mrl.substance")}
                      <select
                        className={field}
                        value={limit.substanceId}
                        required
                        disabled={!editable || busy}
                        onChange={(event) =>
                          setLimit({
                            ...limit,
                            substanceId: event.target.value,
                          })
                        }
                      >
                        <option value="">{t("apiAudit.select")}</option>
                        {data?.substances.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={fieldLabel}>
                      {t("apiAudit.mrl.limit")} (mg/kg)
                      <input
                        className={`${field} font-mono`}
                        inputMode="decimal"
                        required
                        pattern="[0-9]{1,12}(\.[0-9]{1,12})?"
                        value={limit.value}
                        disabled={!editable || busy}
                        onChange={(event) =>
                          setLimit({ ...limit, value: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button className={primary} disabled={!editable || busy}>
                      {t("catalogs.mrl.saveLimitBtn")}
                    </button>
                  </div>
                </form>
              )}
              {selected.status === "PUBLISHED" && (
                <p className="flex items-start gap-2 rounded-xl bg-surface-raised/60 p-4 text-xs text-ink-secondary">
                  <ShieldCheck
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-accent-primary"
                  />
                  {t("apiAudit.mrl.readonly")}
                </p>
              )}
            </>
          )
        )}
      </MrlDialog>

      <MrlDialog
        open={lookupOpen}
        onClose={() => {
          if (!busy) setLookupOpen(false);
        }}
        title={t("apiAudit.mrl.lookup")}
        subtitle={t("apiAudit.mrl.versions")}
        icon={<Globe size={20} weight="bold" aria-hidden="true" />}
        busy={busy}
        className="w-[40rem]"
      >
        {alerts}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setResolved(null);
            void run(async () => {
              setResolved(
                await catalogsEndpoints.resolveMrlVersion({
                  ...lookup,
                  decisionAt: new Date(lookup.decisionAt).toISOString(),
                }),
              );
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>
              {t("apiAudit.mrl.market")}
              <span className="relative block">
                <Globe
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
                />
                <select
                  autoFocus
                  className={field}
                  required
                  disabled={busy}
                  value={lookup.marketId}
                  onChange={(event) => {
                    setResolved(null);
                    setLookup({ ...lookup, marketId: event.target.value });
                  }}
                >
                  <option value="">{t("apiAudit.select")}</option>
                  {data?.markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={fieldLabel}>
              {t("apiAudit.mrl.commodity")}
              <select
                className={field}
                required
                disabled={busy}
                value={lookup.commodityId}
                onChange={(event) => {
                  setResolved(null);
                  setLookup({ ...lookup, commodityId: event.target.value });
                }}
              >
                <option value="">{t("apiAudit.select")}</option>
                {data?.commodities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={fieldLabel}>
            {t("apiAudit.mrl.decisionAt")}
            <input
              className={field}
              type="datetime-local"
              required
              disabled={busy}
              value={lookup.decisionAt}
              onChange={(event) => {
                setResolved(null);
                setLookup({ ...lookup, decisionAt: event.target.value });
              }}
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-ink-tertiary/15 pt-4">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setLookupOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button className={primary} disabled={busy}>
              <MagnifyingGlass size={16} aria-hidden="true" />
              {t("apiAudit.mrl.lookup")}
            </button>
          </div>
        </form>
        {resolved && (
          <div
            role="status"
            className="space-y-3 rounded-xl border border-functional-balanced-border/40 bg-functional-balanced-bg p-4 text-sm text-accent-primary"
          >
            <div className="flex items-start gap-2">
              <CheckCircle
                size={18}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <strong className="break-words">
                {label(resolved)} · v{resolved.versionNo}
              </strong>
            </div>
            <p className="text-xs">
              {date(resolved.effectiveFrom)} —{" "}
              {resolved.effectiveTo
                ? date(resolved.effectiveTo)
                : t("apiAudit.noEnd")}
            </p>
            <p className="break-words text-xs">{resolved.sourceRef}</p>
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold underline"
              onClick={() => openDetail(resolved)}
            >
              {t("catalogs.mrl.limitsBtn")}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </MrlDialog>

      <MrlDialog
        open={Boolean(editor)}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
        title={
          editor === "create"
            ? t("catalogs.mrl.createBtn")
            : t("apiAudit.mrl.edit")
        }
        subtitle={t("apiAudit.mrl.versions")}
        icon={
          editor === "create" ? (
            <Plus size={20} weight="bold" aria-hidden="true" />
          ) : (
            <NotePencil size={20} weight="bold" aria-hidden="true" />
          )
        }
        busy={busy}
        className="w-[40rem]"
      >
        {alerts}
        <form onSubmit={saveVersion} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>
              {t("apiAudit.mrl.market")}
              <span className="relative block">
                <Globe
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
                />
                <select
                  autoFocus
                  className={field}
                  required
                  disabled={editor === "edit" || busy}
                  value={form.marketId}
                  onChange={(event) =>
                    setForm({ ...form, marketId: event.target.value })
                  }
                >
                  <option value="">{t("apiAudit.select")}</option>
                  {data?.markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={fieldLabel}>
              {t("apiAudit.mrl.commodity")}
              <select
                className={field}
                required
                disabled={editor === "edit" || busy}
                value={form.commodityId}
                onChange={(event) =>
                  setForm({ ...form, commodityId: event.target.value })
                }
              >
                <option value="">{t("apiAudit.select")}</option>
                {data?.commodities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={fieldLabel}>
              {t("apiAudit.from")}
              <input
                className={field}
                type="datetime-local"
                required
                value={form.effectiveFrom}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, effectiveFrom: event.target.value })
                }
              />
            </label>
            <label className={fieldLabel}>
              {t("apiAudit.until")}
              <input
                className={field}
                type="datetime-local"
                value={form.effectiveTo}
                disabled={busy}
                onChange={(event) =>
                  setForm({ ...form, effectiveTo: event.target.value })
                }
              />
            </label>
          </div>
          <label className={fieldLabel}>
            {t("apiAudit.mrl.source")}
            <input
              className={field}
              required
              value={form.sourceRef}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, sourceRef: event.target.value })
              }
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-ink-tertiary/15 pt-4">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setEditor(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              className={primary}
              disabled={busy || (editor === "edit" && !editable)}
            >
              {busy ? t("common.saving") : t("apiAudit.save")}
            </button>
          </div>
        </form>
      </MrlDialog>
      <MrlDialog
        open={importing}
        onClose={() => {
          if (!busy) setImporting(false);
        }}
        title={t("apiAudit.mrl.import")}
        subtitle={t("apiAudit.mrl.versions")}
        icon={<FileArrowUp size={20} weight="bold" aria-hidden="true" />}
        busy={busy}
        className="w-[40rem]"
      >
        {alerts}
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              let parsed: unknown;
              try {
                parsed = JSON.parse(rawJson);
              } catch (cause) {
                throw new Error(t("apiAudit.mrl.invalidJson"), { cause });
              }
              const result = mrlImportSchema.safeParse(parsed);
              if (!result.success)
                throw new Error(
                  t("apiAudit.mrl.invalidImport") +
                    " · " +
                    result.error.issues
                      .map((issue) => issue.path.join("."))
                      .join(", "),
                );
              await catalogsEndpoints.importMrlVersion(result.data);
              setImporting(false);
              setRawJson("");
              await refresh();
              setNotice(t("apiAudit.saved"));
            });
          }}
        >
          <label className={fieldLabel}>
            {t("apiAudit.mrl.jsonLabel")}
            <textarea
              autoFocus
              required
              rows={12}
              className={`${field} font-mono text-xs`}
              value={rawJson}
              disabled={busy}
              onChange={(event) => setRawJson(event.target.value)}
            />
          </label>
          <p className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4 text-xs leading-relaxed text-ink-secondary">
            {t("apiAudit.mrl.importHelp")}
          </p>
          <div className="flex justify-end gap-2 border-t border-ink-tertiary/15 pt-4">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => setImporting(false)}
            >
              {t("common.cancel")}
            </button>
            <button className={primary} disabled={busy}>
              <FileArrowUp size={16} aria-hidden="true" />
              {busy ? t("common.saving") : t("apiAudit.mrl.import")}
            </button>
          </div>
        </form>
      </MrlDialog>
    </div>
  );
}
