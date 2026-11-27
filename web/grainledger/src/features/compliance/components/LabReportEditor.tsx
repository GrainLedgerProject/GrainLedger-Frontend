import { useId, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import {
  labReportEndpoints,
  type LabReportInput,
  type LabReportResponse,
  type LabResultInput,
  type LabResultSetInput,
} from "@/api/compliance";
import { collectPages } from "@/api/query";
import { useCommand } from "@/shared/hooks/useCommand";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useAuthStore } from "@/app/store/authStore";
import { useLabSamples } from "../hooks/useLabSamples";
import { labCsvHeaders, parseLabCsv } from "../model/labCsv";

const kinds = ["PARTIAL", "FINAL", "SUPPLEMENTARY", "AMENDMENT", "RETEST"];
const resultKinds = [
  "NUMERIC",
  "BELOW_LIMIT",
  "NOT_DETECTED",
  "QUALITATIVE",
  "OTHER",
];
const newResult = () => ({
  key: crypto.randomUUID(),
  testLabel: "",
  originalResultText: "",
  resultKind: "",
  substanceId: null,
});
const newSection = () => ({
  entityId: crypto.randomUUID(),
  sampleId: null,
  laboratorySampleReference: null,
  statedSampleCode: null,
  statedSealCode: null,
  sectionReference: null,
  results: [newResult()],
});
type Result = LabResultInput & { key: string };
type Section = Omit<LabResultSetInput, "results"> & { results: Result[] };

export function LabReportEditor({
  report,
  onClose,
  onSaved,
}: {
  report: LabReportResponse | null;
  onClose: () => void;
  onSaved: (report: LabReportResponse) => void;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const companyId = useAuthStore((state) => state.user?.organizationId);
  const samples = useLabSamples(report?.companyId ?? companyId);
  const uid = useId();
  const [entityId] = useState(() => report?.id ?? crypto.randomUUID());
  const [kind, setKind] = useState(report?.reportKind ?? "");
  const [relatedReportId, setRelatedReportId] = useState(
    report?.relatedReportId ?? "",
  );
  const [relatedReportSearch, setRelatedReportSearch] = useState("");
  const [sections, setSections] = useState<Section[]>(
    () =>
      report?.resultSets.map(
        ({
          id,
          sampleId,
          laboratorySampleReference,
          statedSampleCode,
          statedSealCode,
          sectionReference,
          results,
        }) => ({
          entityId: id,
          sampleId,
          laboratorySampleReference,
          statedSampleCode,
          statedSealCode,
          sectionReference,
          results: results.map(({ id: resultId, ...row }) => ({
            ...row,
            key: resultId,
          })),
        }),
      ) ?? [newSection()],
  );
  const [csvInputs, setCsvInputs] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<unknown>(null);
  const [reading, setReading] = useState(false);
  const reportsQuery = useQuery({
    queryKey: ["lab-report-related-options", report?.companyId ?? companyId],
    queryFn: () => collectPages((p) => labReportEndpoints.getLabReports(p)),
    retry: false,
  });
  const availableRelatedReports = useMemo(() => {
    const q = relatedReportSearch.trim().toLowerCase();
    return (reportsQuery.data ?? []).filter((item) => {
      if (item.id === report?.id) return false;
      if (!q) return true;
      return `${item.reportNumber} ${item.laboratoryName} ${item.reportKind} ${item.id}`
        .toLowerCase()
        .includes(q);
    });
  }, [relatedReportSearch, report?.id, reportsQuery.data]);
  const action = useCommand<{ capturedAt: string; payload: LabReportInput }>(
    async (clientOperationId, input) => {
      const request = {
        ...input,
        clientOperationId,
        deviceId: "grainledger-web",
        payloadSchemaVersion: 1,
      };
      const saved = await (report
        ? labReportEndpoints.updateLabReport(report.id, request)
        : labReportEndpoints.createLabReport(request));
      onSaved(saved);
    },
    () => {},
  );
  const uncertain =
    action.error instanceof ApiError &&
    (action.error.status === 0 ||
      action.error.status === 408 ||
      action.error.status >= 500);
  const title = t(report ? "workflows.lab.edit" : "workflows.lab.create");
  const linked = ["SUPPLEMENTARY", "AMENDMENT", "RETEST"].includes(kind);
  const blocked = action.isPending || reading || uncertain;
  const receipt = localDateTime(report?.receivedAt ?? new Date().toISOString());
  const patchSection = (id: string, change: Partial<Section>) =>
    setSections((previous) =>
      previous.map((section) =>
        section.entityId === id ? { ...section, ...change } : section,
      ),
    );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const file = form.get("file");
    const attachment = file instanceof File && file.size ? file : null;
    if (
      (!report && !attachment) ||
      (attachment && attachment.size > 10 * 1024 * 1024)
    ) {
      setValidation(new Error(t("workflows.lab.fileSize")));
      return;
    }
    if (
      !value("laboratoryName") ||
      !value("reportNumber") ||
      sections.some((section) =>
        section.results.some(
          (result) =>
            !result.testLabel?.trim() || !result.originalResultText?.trim(),
        ),
      )
    ) {
      setValidation(new Error(t("workflows.lab.required")));
      return;
    }
    setReading(true);
    setValidation(null);
    try {
      const enteredReceipt = new Date(value("receivedAt"));
      const receivedAt =
        report && enteredReceipt.getTime() === Date.parse(receipt)
          ? report.receivedAt
          : enteredReceipt.toISOString();
      const capturedAt = new Date().toISOString();
      if (Date.parse(receivedAt) > Date.parse(capturedAt)) {
        setValidation(new Error(t("workflows.lab.receiptInvalid")));
        return;
      }
      action.submit({
        capturedAt,
        payload: {
          entityId,
          laboratoryName: value("laboratoryName"),
          reportNumber: value("reportNumber"),
          issuedOn: value("issuedOn"),
          receivedAt,
          reportKind: kind,
          relatedReportId: value("relatedReportId") || null,
          relationshipReason: value("relationshipReason") || null,
          laboratoryConclusion: value("laboratoryConclusion") || null,
          statedStandard: value("statedStandard") || null,
          companyOnlyConfirmed: form.has("companyOnly"),
          fileName: attachment?.name ?? null,
          contentType: attachment
            ? attachment.type || "application/octet-stream"
            : null,
          contentBase64: attachment ? await encodeFile(attachment) : null,
          resultSets: sections.map((section) => ({
            ...section,
            results: section.results.map((row) => ({
              testLabel: row.testLabel,
              substanceId: row.substanceId,
              originalResultText: row.originalResultText,
              resultKind: row.resultKind,
              numericValue: row.numericValue,
              unit: row.unit,
              lod: row.lod,
              loq: row.loq,
              method: row.method,
              uncertainty: row.uncertainty,
              reference: row.reference,
            })),
          })),
        },
      });
    } catch (error) {
      setValidation(error);
    } finally {
      setReading(false);
    }
  }

  return (
    <Modal
      isOpen
      ariaLabel={title}
      onClose={() => {
        if (!reading && !action.isPending) onClose();
      }}
      closeOnBackdrop={false}
    >
      <div className="gl-workflow w-[calc(100vw-2rem)] max-w-4xl space-y-4 rounded-2xl bg-surface-base p-5 text-ink-primary dark:bg-surface-raised sm:p-6">
        <h2 id={`${uid}-title`} className="font-display text-xl font-bold">
          {title}
        </h2>
        <form
          method="post"
          aria-labelledby={`${uid}-title`}
          onSubmit={save}
          className="space-y-4"
        >
          <fieldset disabled={blocked} className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">{title}</legend>
            {(
              [
                "laboratoryName",
                "reportNumber",
                "issuedOn",
                "receivedAt",
              ] as const
            ).map((key) => (
              <label key={key} htmlFor={`${uid}-${key}`}>
                {t(`workflows.lab.${key}`)}
                <input
                  id={`${uid}-${key}`}
                  name={key}
                  type={
                    key === "issuedOn"
                      ? "date"
                      : key === "receivedAt"
                        ? "datetime-local"
                        : "text"
                  }
                  step={key === "receivedAt" ? 1 : undefined}
                  maxLength={200}
                  required
                  defaultValue={key === "receivedAt" ? receipt : report?.[key]}
                />
              </label>
            ))}
            <label htmlFor={`${uid}-kind`}>
              {t("workflows.lab.kind")}
              <select
                id={`${uid}-kind`}
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                required
              >
                <option value="">{t("workflows.choose")}</option>
                {kinds.map((value) => (
                  <option key={value} value={value}>
                    {t(`workflows.lab.values.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${uid}-file`}>
              {t("workflows.lab.original")}
              <input
                id={`${uid}-file`}
                name="file"
                type="file"
                required={!report}
              />
              {report?.fileName && (
                <span className="break-all text-xs">
                  {t("workflows.lab.retained", { file: report.fileName })}
                </span>
              )}
            </label>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${uid}-related-search`}>
                {t("workflows.lab.relatedReportId")}
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  id={`${uid}-related-search`}
                  type="search"
                  value={relatedReportSearch}
                  onChange={(event) =>
                    setRelatedReportSearch(event.target.value)
                  }
                  placeholder={text(
                    "Tìm mã báo cáo, phòng lab...",
                    "Search report number or lab...",
                  )}
                />
                <select
                  id={`${uid}-related`}
                  name="relatedReportId"
                  required={linked}
                  value={relatedReportId}
                  onChange={(event) => setRelatedReportId(event.target.value)}
                >
                  <option value="">
                    {text("-- Không liên kết báo cáo --", "-- None --")}
                  </option>
                  {relatedReportId &&
                    !availableRelatedReports.some(
                      (item) => item.id === relatedReportId,
                    ) && (
                      <option value={relatedReportId}>{relatedReportId}</option>
                    )}
                  {availableRelatedReports.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.reportNumber} · {item.laboratoryName} (
                      {item.reportKind})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor={`${uid}-relationship`}>
              {t("workflows.lab.relationshipReason")}
              <input
                id={`${uid}-relationship`}
                name="relationshipReason"
                required={linked}
                defaultValue={report?.relationshipReason ?? ""}
              />
            </label>
            {(["laboratoryConclusion", "statedStandard"] as const).map(
              (key) => (
                <label key={key} htmlFor={`${uid}-${key}`}>
                  {t(`workflows.lab.${key}`)}
                  <input
                    id={`${uid}-${key}`}
                    name={key}
                    defaultValue={report?.[key] ?? ""}
                  />
                </label>
              ),
            )}
            <label
              htmlFor={`${uid}-scope`}
              className="!flex-row items-center sm:col-span-2"
            >
              <input
                id={`${uid}-scope`}
                name="companyOnly"
                type="checkbox"
                required
              />
              {t("workflows.lab.companyOnly")}
            </label>
          </fieldset>
          <fieldset disabled={blocked} className="space-y-4">
            <legend className="font-semibold">
              {t("workflows.lab.sections")}
            </legend>
            {sections.map((section, index) => (
              <fieldset
                key={section.entityId}
                className="space-y-3 rounded-xl border border-ink-tertiary/20 p-3"
              >
                <legend>
                  {t("workflows.lab.section", { number: index + 1 })}
                </legend>
                <details open={index === 0 || undefined}>
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("workflows.lab.sampleFields")}
                  </summary>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label htmlFor={`${section.entityId}-sample`}>
                      {t("workflows.lab.sampleId")}
                      <select
                        id={`${section.entityId}-sample`}
                        value={section.sampleId ?? ""}
                        disabled={samples.isPending}
                        onChange={(event) =>
                          patchSection(section.entityId, {
                            sampleId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">{t("workflows.none")}</option>
                        {section.sampleId &&
                          !samples.data?.some(
                            (sample) => sample.id === section.sampleId,
                          ) && (
                            <option value={section.sampleId}>
                              {section.sampleId}
                            </option>
                          )}
                        {samples.data?.map((sample) => (
                          <option key={sample.id} value={sample.id}>
                            {sample.code} · {sample.sealCode}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        "laboratorySampleReference",
                        "statedSampleCode",
                        "statedSealCode",
                        "sectionReference",
                      ] as const
                    ).map((key) => (
                      <label key={key} htmlFor={`${section.entityId}-${key}`}>
                        {t(`workflows.lab.${key}`)}
                        <input
                          id={`${section.entityId}-${key}`}
                          value={section[key] ?? ""}
                          onChange={(event) =>
                            patchSection(section.entityId, {
                              [key]: event.target.value || null,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Feedback error={samples.error} pending={samples.isPending} />
                </details>
                <details className="rounded-lg border border-ink-tertiary/15 bg-surface-raised/40 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold">
                    {text(
                      "Nhập CSV / dán TSV chỉ tiêu phân tích",
                      "Import CSV / paste TSV results",
                    )}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] text-ink-secondary">
                      {text("Cột hỗ trợ", "Expected columns")}:{" "}
                      <code className="font-mono">
                        {labCsvHeaders.join(", ")}
                      </code>
                    </p>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      aria-label={text(
                        "Chọn tệp CSV hoặc TSV",
                        "Choose CSV or TSV file",
                      )}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const content = await file.text();
                        setCsvInputs((prev) => ({
                          ...prev,
                          [section.entityId]: content,
                        }));
                      }}
                    />
                    <textarea
                      rows={4}
                      value={csvInputs[section.entityId] ?? ""}
                      onChange={(event) =>
                        setCsvInputs((prev) => ({
                          ...prev,
                          [section.entityId]: event.target.value,
                        }))
                      }
                      placeholder={`testLabel,originalResultText,resultKind,numericValue,unit,lod,loq,method\nChlorpyrifos,0.008 mg/kg,NUMERIC,0.008,mg/kg,0.002,0.005,LC-MS/MS`}
                    />
                    {(() => {
                      const raw = csvInputs[section.entityId] ?? "";
                      if (!raw.trim()) return null;
                      const preview = parseLabCsv(raw);
                      return (
                        <div className="space-y-2">
                          {preview.errors.length > 0 && (
                            <ul className="list-disc list-inside text-accent-danger">
                              {preview.errors.map((errMsg, idx) => (
                                <li key={idx}>{errMsg}</li>
                              ))}
                            </ul>
                          )}
                          {preview.rows.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-accent-primary">
                                {text(
                                  `Xem trước: ${preview.rows.length} dòng hợp lệ`,
                                  `Preview: ${preview.rows.length} parsed row(s)`,
                                )}
                              </span>
                              <button
                                type="button"
                                disabled={preview.errors.length > 0}
                                onClick={() => {
                                  const parsedResults: Result[] =
                                    preview.rows.map((row) => ({
                                      key: crypto.randomUUID(),
                                      testLabel: row.testLabel,
                                      substanceId: row.substanceId ?? null,
                                      originalResultText:
                                        row.originalResultText,
                                      resultKind: row.resultKind,
                                      numericValue: row.numericValue ?? null,
                                      unit: row.unit ?? null,
                                      lod: row.lod ?? null,
                                      loq: row.loq ?? null,
                                      method: row.method ?? null,
                                      uncertainty: row.uncertainty ?? null,
                                      reference: row.reference ?? null,
                                    }));
                                  const keepExisting = section.results.filter(
                                    (r) =>
                                      (r.testLabel ?? "").trim() ||
                                      (r.originalResultText ?? "").trim(),
                                  );
                                  patchSection(section.entityId, {
                                    results: [
                                      ...keepExisting,
                                      ...parsedResults,
                                    ],
                                  });
                                  setCsvInputs((prev) => ({
                                    ...prev,
                                    [section.entityId]: "",
                                  }));
                                }}
                              >
                                {text(
                                  "Áp dụng vào phần mẫu",
                                  "Append rows to section",
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </details>
                {section.results.map((result, rowIndex) => (
                  <ResultEditor
                    key={result.key}
                    row={result}
                    index={rowIndex}
                    removable={section.results.length > 1}
                    change={(updated) =>
                      patchSection(section.entityId, {
                        results: section.results.map((item) =>
                          item.key === result.key ? updated : item,
                        ),
                      })
                    }
                    remove={() =>
                      patchSection(section.entityId, {
                        results: section.results.filter(
                          (item) => item.key !== result.key,
                        ),
                      })
                    }
                  />
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      patchSection(section.entityId, {
                        results: [...section.results, newResult()],
                      })
                    }
                  >
                    {t("workflows.lab.addResult")}
                  </button>
                  <button
                    type="button"
                    disabled={sections.length === 1}
                    onClick={() =>
                      setSections(
                        sections.filter(
                          (item) => item.entityId !== section.entityId,
                        ),
                      )
                    }
                  >
                    {t("workflows.lab.removeSection")}
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={() => setSections([...sections, newSection()])}
            >
              {t("workflows.lab.addSection")}
            </button>
          </fieldset>
          <Feedback
            error={validation ?? action.error}
            pending={reading || action.isPending}
          />
          <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-tertiary/20 pt-3">
            <button
              type="button"
              disabled={reading || action.isPending}
              onClick={onClose}
            >
              {t("field.seasons.cancel")}
            </button>
            {uncertain ? (
              <button
                type="button"
                onClick={() => {
                  if (action.variables) action.submit(action.variables);
                }}
              >
                {t("field.seasons.retry")}
              </button>
            ) : (
              <button type="submit" disabled={blocked}>
                {t("workflows.lab.saveDraft")}
              </button>
            )}
          </footer>
        </form>
      </div>
    </Modal>
  );
}

function ResultEditor({
  row,
  index,
  removable,
  change,
  remove,
}: {
  row: Result;
  index: number;
  removable: boolean;
  change: (row: Result) => void;
  remove: () => void;
}) {
  const { t } = useTranslation();
  const numeric =
    row.resultKind === "NUMERIC" || row.resultKind === "BELOW_LIMIT";
  return (
    <fieldset className="space-y-2 rounded-lg bg-surface-overlay/50 p-3">
      <legend>{t("workflows.lab.row", { number: index + 1 })}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["testLabel", "originalResultText"] as const).map((key) => (
          <label key={key} htmlFor={`${row.key}-${key}`}>
            {t(`workflows.lab.${key}`)}
            <input
              id={`${row.key}-${key}`}
              required
              value={row[key] ?? ""}
              onChange={(event) =>
                change({ ...row, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label htmlFor={`${row.key}-kind`}>
          {t("workflows.lab.resultKind")}
          <select
            id={`${row.key}-kind`}
            value={row.resultKind ?? ""}
            required
            onChange={(event) =>
              change({ ...row, resultKind: event.target.value })
            }
          >
            <option value="">{t("workflows.choose")}</option>
            {resultKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`workflows.lab.values.${kind}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${row.key}-numeric`}>
          {t("workflows.lab.numericValue")}
          <input
            id={`${row.key}-numeric`}
            inputMode="decimal"
            required={numeric}
            value={row.numericValue ?? ""}
            onChange={(event) =>
              change({ ...row, numericValue: event.target.value || null })
            }
          />
        </label>
      </div>
      <details>
        <summary className="cursor-pointer text-sm">
          {t("workflows.lab.resultDetails")}
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(
            [
              "substanceId",
              "unit",
              "method",
              "lod",
              "loq",
              "uncertainty",
              "reference",
            ] as const
          ).map((key) => (
            <label key={key} htmlFor={`${row.key}-${key}`}>
              {t(`workflows.lab.${key}`)}
              <input
                id={`${row.key}-${key}`}
                value={row[key] ?? ""}
                onChange={(event) =>
                  change({ ...row, [key]: event.target.value || null })
                }
              />
            </label>
          ))}
        </div>
      </details>
      <button type="button" disabled={!removable} onClick={remove}>
        {t("workflows.remove")}
      </button>
    </fieldset>
  );
}

function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
}

function encodeFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
