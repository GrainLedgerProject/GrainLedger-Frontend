import { ArrowRight, CheckCircle, Globe, MagnifyingGlass } from "@phosphor-icons/react";
import { field, button, primary, fieldLabel } from "./mrlStyles";
import { MrlDialog } from "./MrlDialog";
import { MrlAlerts } from "./MrlAlerts";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionLookup(props: MrlWorkspaceModel["lookupDialog"]) {
  const {
    t,
    error,
    notice,
    busy,
    lookupOpen,
    setLookupOpen,
    lookup,
    setLookup,
    resolved,
    setResolved,
    data,
    label,
    date,
    openDetail,
    resolveVersion,
  } = props;
  return (
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
      {<MrlAlerts error={error} notice={notice} />}
      <form
        className="space-y-4"
        onSubmit={resolveVersion}
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
  );
}
