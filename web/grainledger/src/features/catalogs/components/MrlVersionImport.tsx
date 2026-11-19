import { FileArrowUp } from "@phosphor-icons/react";
import { field, button, primary, fieldLabel } from "./mrlStyles";
import { MrlDialog } from "./MrlDialog";
import { MrlAlerts } from "./MrlAlerts";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionImport(props: MrlWorkspaceModel["importDialog"]) {
  const {
    t,
    importing,
    setImporting,
    rawJson,
    setRawJson,
    error,
    notice,
    busy,
    importVersion,
  } = props;
  return (
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
      {<MrlAlerts error={error} notice={notice} />}
      <form
        className="space-y-5"
        onSubmit={importVersion}
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
  );
}
