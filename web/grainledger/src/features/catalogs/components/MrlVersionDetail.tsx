import { ArrowsClockwise, CheckCircle, Flask, Globe, NotePencil, ShieldCheck, Trash, WarningCircle } from "@phosphor-icons/react";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { field, iconButton, button, primary, alert, fieldLabel } from "./mrlStyles";
import { MrlDialog } from "./MrlDialog";
import { MrlStatusBadge } from "./MrlStatusBadge";
import { MrlAlerts } from "./MrlAlerts";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionDetail(props: MrlWorkspaceModel["detailDialog"]) {
  const {
    t,
    selectedId,
    editor,
    error,
    notice,
    busy,
    setStale,
    limit,
    setLimit,
    detail,
    data,
    selected,
    editable,
    label,
    date,
    run,
    saveLimit,
    publish,
    closeDetail,
    editVersion,
    deleteLimit,
    canManage,
  } = props;
  return (
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
      {<MrlAlerts error={error} notice={notice} />}
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
              {<MrlStatusBadge version={selected} />}
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
                                onClick={() => void deleteLimit(row.substanceId)}
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
  );
}
