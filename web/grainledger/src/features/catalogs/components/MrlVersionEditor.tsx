import { Globe, NotePencil, Plus } from "@phosphor-icons/react";
import { field, button, primary, fieldLabel } from "./mrlStyles";
import { MrlDialog } from "./MrlDialog";
import { MrlAlerts } from "./MrlAlerts";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionEditor(props: MrlWorkspaceModel["editorDialog"]) {
  const {
    t,
    editor,
    setEditor,
    error,
    notice,
    busy,
    form,
    setForm,
    data,
    editable,
    saveVersion,
  } = props;
  return (
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
      {<MrlAlerts error={error} notice={notice} />}
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
  );
}
