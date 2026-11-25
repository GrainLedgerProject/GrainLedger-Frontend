import { FileArrowUp } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { readMrlFile, type ImportGroup } from "../model/mrlSpreadsheetImport";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Feedback } from "@/shared/ui/Workflow";
import { field, button, primary, fieldLabel } from "./mrlStyles";
import { MrlDialog } from "./MrlDialog";
import { MrlAlerts } from "./MrlAlerts";

import type { MrlWorkspaceModel } from "../hooks/useMrlWorkspace";

export function MrlVersionImport(props: MrlWorkspaceModel["importDialog"]) {
  const {
    t,
    importing,
    setImporting,
    error,
    notice,
    busy,
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
      {importing && <ImportSource {...props} />}
    </MrlDialog>
  );
}

function ImportSource(props: MrlWorkspaceModel["importDialog"]) {
  const { t, busy, rawJson, setRawJson, setImporting, importVersion } = props;
  const text = useWorkflowText();
  const [mode, setMode] = useState<"spreadsheet" | "json">("json");
  return <>
    <div role="group" aria-label={text("Định dạng nhập", "Import format")} className="flex flex-wrap gap-2">
      <button type="button" className={button} aria-pressed={mode === "spreadsheet"} disabled={busy} onClick={() => setMode("spreadsheet")}>CSV / XLSX</button>
      <button type="button" className={button} aria-pressed={mode === "json"} disabled={busy} onClick={() => setMode("json")}>JSON</button>
    </div>
    {mode === "spreadsheet" ? <SpreadsheetImport {...props} /> :
      <form
        method="post"
        className="space-y-5"
        onSubmit={event => { event.preventDefault(); importVersion(); }}
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
    }
  </>;
}

function SpreadsheetImport({ markets, commodities, substances, busy, importVersion }: MrlWorkspaceModel["importDialog"]) {
  const text = useWorkflowText();
  const [groupKey, setGroup] = useState("");
  const upload = useMutation({
    mutationFn: readMrlFile,
    onSuccess: file => setGroup(file.groups.find(group => group.limits.length && !group.issues.length)?.key ?? file.groups[0]?.key ?? ""),
  });
  const preview = upload.data;
  const group = preview?.groups.find(row => row.key === groupKey);
  const codes = new Set(substances.map(row => row.code.toUpperCase()));
  const unknown = group?.limits.filter(row => !codes.has(row.substanceCode)).map(row => row.substanceCode) ?? [];

  function submit(event: FormEvent<HTMLFormElement>, group: ImportGroup) {
    event.preventDefault();
    if (busy || !group.limits.length || group.issues.length || unknown.length) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const effectiveTo = value("effectiveTo");
    importVersion({
      marketId: value("marketId"), commodityId: value("commodityId"),
      effectiveFrom: new Date(value("effectiveFrom")).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      sourceRef: value("sourceRef"),
      limits: group.limits.map(({ substanceCode, limitValue, unit }) => ({ substanceCode, limitValue, unit })),
    });
  }

  return <div className="gl-workflow space-y-3">
    <label>{text("Tệp giới hạn dư lượng (CSV hoặc XLSX)", "Residue limits file (CSV or XLSX)")}
      <input type="file" accept=".csv,.xlsx" disabled={busy || upload.isPending} onChange={e => {
        setGroup("");
        upload.reset();
        if (e.target.files?.[0]) upload.mutate(e.target.files[0]);
      }} />
    </label>
    <p className="text-xs text-ink-secondary">{text("Dùng dòng đầu làm tiêu đề. XLSX đọc trang tính đầu tiên.", "Use the first row for headers. XLSX imports read the first worksheet.")}</p>
    <Feedback error={upload.error} pending={upload.isPending} />
    {preview && <label>{text("Nhóm dữ liệu", "Import group")} · {preview.totalRows} {text("dòng", "rows")}
      <select value={groupKey} disabled={busy} onChange={e => setGroup(e.target.value)}>
        {preview.groups.map(row => <option key={row.key} value={row.key}>
          {row.market} · {row.commodityName} · v{row.version} · {row.effectiveDate || "—"} · {row.limits.length}
        </option>)}
      </select>
    </label>}
    {group && <form key={group.key} method="post" className="space-y-3" onSubmit={e => submit(e, group)}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">{text("Ánh xạ và phạm vi", "Catalog mapping and scope")}</legend>
        <label>{text("Thị trường", "Market")} *
          <select name="marketId" required defaultValue={markets.find(row => row.code.toUpperCase() === group.market)?.id ?? ""}>
            <option value="" disabled>—</option>{markets.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
          </select>
        </label>
        <label>{text("Mặt hàng", "Commodity")} *
          <select name="commodityId" required defaultValue={commodities.find(row => row.code.toLowerCase() === group.commodityCode.toLowerCase())?.id ?? ""}>
            <option value="" disabled>—</option>{commodities.map(row => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
          </select>
        </label>
        <label>{text("Hiệu lực từ", "Effective from")} *
          <input name="effectiveFrom" type="datetime-local" required defaultValue={group.effectiveDate ? `${group.effectiveDate}T00:00` : ""} />
        </label>
        <label>{text("Hiệu lực đến", "Effective until")}
          <input name="effectiveTo" type="datetime-local" defaultValue={group.effectiveTo ? `${group.effectiveTo}T00:00` : ""} />
        </label>
        <label className="sm:col-span-2">{text("Tham chiếu nguồn", "Source reference")} *
          <input name="sourceRef" required defaultValue={group.sources.join(" · ")} />
        </label>
      </fieldset>
      <details open><summary>{text("Giới hạn sẽ nhập", "Limits to import")} ({group.limits.length})</summary>
        <ul className="max-h-40 list-disc overflow-y-auto ps-5">{group.limits.map(row => <li key={row.row}>{row.substanceCode} · {row.limitValue} {row.unit}</li>)}</ul>
      </details>
      {!!group.excludedRows.length && <details><summary>{text("Dòng bị loại theo trạng thái", "Rows excluded by status")} ({group.excludedRows.length})</summary>
        <ul className="max-h-32 list-disc overflow-y-auto ps-5">{group.excludedRows.map(row => <li key={row.row}>{row.row} · {row.substanceCode} · {row.status || "—"}</li>)}</ul>
      </details>}
      {!!group.issues.length && <ul role="alert" className="text-accent-danger">{group.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
      {!!unknown.length && <p role="alert" className="text-accent-danger">{text("Mã hoạt chất chưa có trong danh mục", "Unknown active substance codes")} · {unknown.join(", ")}</p>}
      <button type="submit" className={primary} disabled={busy || !group.limits.length || Boolean(group.issues.length || unknown.length)}>
        {text("Nhập vào bản nháp", "Import into draft")}
      </button>
    </form>}
  </div>;
}
