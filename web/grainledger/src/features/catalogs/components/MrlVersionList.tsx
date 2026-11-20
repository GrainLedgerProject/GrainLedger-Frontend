import {
  ArrowsClockwise,
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  FileArrowUp,
  FileText,
  Globe,
  ListBullets,
  MagnifyingGlass,
  NotePencil,
  Plus,
  ShieldCheck,
  SquaresFour,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { panel, field, iconButton, button, primary, alert } from "./mrlStyles";
import { MrlStatusBadge } from "./MrlStatusBadge";
import { MrlAlerts } from "./MrlAlerts";
import { localNow } from "../model/mrlDate";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionList(props: MrlWorkspaceModel["list"]) {
  const {
    t,
    i18n,
    selectedId,
    editor,
    setEditor,
    importing,
    setImporting,
    error,
    setError,
    notice,
    setNotice,
    busy,
    filter,
    setFilter,
    search,
    setSearch,
    marketFilter,
    setMarketFilter,
    lookupOpen,
    setLookupOpen,
    viewMode,
    setViewMode,
    setForm,
    catalogs,
    data,
    label,
    date,
    run,
    refresh,
    versions,
    visible,
    filtered,
    clearFilters,
    openDetail,
    canManage,
  } = props;
  const StatusFilterIcon =
    filter === "PUBLISHED"
      ? CheckCircle
      : filter === "DRAFT"
        ? NotePencil
        : ShieldCheck;
  return (
    <>
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
      {!selectedId && !editor && !importing && !lookupOpen && (
        <MrlAlerts error={error} notice={notice} />
      )}
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
                    // label: t("apiAudit.mrl.listView"),
                    Icon: ListBullets,
                  },
                  {
                    mode: "grid",
                    // label: t("apiAudit.mrl.gridView"),
                    Icon: SquaresFour,
                  },
                ] as const
              ).map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex min-h-5 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${viewMode === mode ? "bg-accent-primary text-white shadow-xs" : "text-ink-secondary hover:bg-surface-base hover:text-ink-primary"}`}
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
                      {<MrlStatusBadge version={version} />}
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
                {<MrlStatusBadge version={version} />}
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
    </>
  );
}
