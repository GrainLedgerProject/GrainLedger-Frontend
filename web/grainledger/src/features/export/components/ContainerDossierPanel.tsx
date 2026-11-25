import { useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  containerExecutionEndpoints,
  type ContainerDocumentRequest,
  type ContainerExecution,
} from "@/api/containerExecution";
import { Feedback } from "@/shared/ui/Workflow";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import { saveExportFile } from "../model/saveExportFile";
import {
  buildPackingListDocument,
  classifyDocumentOrigin,
  displayDocumentReason,
  originBadgeProps,
  rememberUploadedDocument,
} from "../model/packingList";
import {
  DownloadSimple,
  FileCode,
  FilePlus,
  FileText,
  LinkSimple,
  Plus,
} from "@phosphor-icons/react";

const panelClass =
  "rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-4";
const inputClass =
  "w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-ink-secondary mb-1.5";

export function ContainerDossierPanel({
  container: c,
  canWrite,
  saved,
}: {
  container: ContainerExecution;
  canWrite: boolean;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const dossier = useQuery({
    queryKey: ["container-dossier", c.id],
    queryFn: () => containerExecutionEndpoints.getDossier(c.id),
    enabled: c.dossierAvailable,
  });

  const workflow = useQuery({
    queryKey: ["container-workflow", c.id],
    queryFn: () => containerExecutionEndpoints.getWorkflow(c.id),
    staleTime: 0,
  });

  const download = useMutation({
    mutationFn: async (input: { id?: string; name: string }) => {
      const blob = input.id
        ? await containerExecutionEndpoints.downloadDocument(c.id, input.id)
        : await containerExecutionEndpoints.downloadDossier(c.id);
      saveExportFile(blob, input.name);
    },
  });

  const d = dossier.data;

  const generatePackingList = useContainerCommand(
    (operationId, input: Omit<ContainerDocumentRequest, "operationId">) =>
      containerExecutionEndpoints.addDocument(c.id, { operationId, ...input }),
    saved,
    { persistKey: `container:${c.id}:packing-list` },
  );

  function handlePackingListAction(mode: "save" | "preview") {
    if (!d) return;
    const locale: "vi" | "en" = text("vi", "en") === "en" ? "en" : "vi";
    const generated = buildPackingListDocument({
      containerCode: c.code || d.containerNumber,
      dossier: d,
      locale,
    });
    if (mode === "preview") {
      saveExportFile(
        new Blob([generated.html], { type: "text/html;charset=utf-8" }),
        generated.filename,
      );
      return;
    }
    if (!workflow.data) return;
    generatePackingList.submit({
      version: workflow.data.version,
      documentType: generated.documentType,
      filename: generated.filename,
      contentType: generated.contentType,
      content: generated.contentBase64,
      reason: generated.reason,
    });
  }

  return (
    <>
      {/* Issued Dossier Panel */}
      <section
        aria-label={text("Hồ sơ đã phát hành", "Issued dossier")}
        className={`${panelClass}`}
      >
        <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
          <FileText size={20} className="text-accent-primary" />
          <h2 className="font-display text-sm font-bold text-ink-primary">
            {text("Hồ sơ đã phát hành", "Issued dossier")}
          </h2>
        </div>

        {!c.dossierAvailable && (
          <p role="status" className="text-xs text-ink-secondary py-2">
            {text(
              "Chưa có hồ sơ đóng niêm. Hoàn tất thực xếp và đóng niêm trước khi tải snapshot.",
              "No closure dossier has been issued. Complete actual loading and closure before downloading the snapshot.",
            )}
          </p>
        )}

        <Feedback
          error={dossier.error ?? download.error}
          pending={c.dossierAvailable && dossier.isPending}
        />

        {d && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs text-ink-secondary">
              <div>
                <p>
                  {text("Đóng niêm lúc", "Closed at")}:{" "}
                  <strong className="text-ink-primary">
                    {new Date(d.closedAt).toLocaleString()}
                  </strong>
                </p>
                <p className="mt-1">
                  {text("Số container", "Container number")}:{" "}
                  <strong className="font-mono text-ink-primary">
                    {d.containerNumber}
                  </strong>{" "}
                  · {text("Số seal", "Seal")}:{" "}
                  <strong className="font-mono text-ink-primary">
                    {d.sealNumber}
                  </strong>{" "}
                  · <strong className="font-mono">{d.targetKg} kg</strong>
                </p>
              </div>

              <div>
                <p>
                  {text(
                    "Kết quả tại thời điểm phát hành",
                    "Assessment at issuance",
                  )}
                  :{" "}
                  <strong className="text-accent-primary">
                    {d.assessment.assessmentStatus}
                  </strong>
                </p>
                {d.redacted && (
                  <p className="mt-1 text-ink-tertiary">
                    {text(
                      "Hồ sơ được hiển thị theo phạm vi quyền xuất khẩu.",
                      "The dossier is scoped to export permissions.",
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={download.isPending}
                onClick={() =>
                  download.mutate({ name: `${c.code}-dossier.json` })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <DownloadSimple size={16} weight="bold" />
                <span>
                  {text("Tải snapshot JSON", "Download JSON snapshot")}
                </span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Versioned Documents Panel */}
      <section
        aria-label={text("Chứng từ theo phiên bản", "Versioned documents")}
        className={`${panelClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-tertiary/15 pb-3">
          <div className="flex items-center gap-2.5">
            <FileCode size={20} className="text-accent-primary" />
            <h2 className="font-display text-sm font-bold text-ink-primary">
              {text("Chứng từ theo phiên bản", "Versioned documents")}
            </h2>
          </div>

          {c.status === "CLOSED" && d && (
            <div className="flex flex-wrap items-center gap-2">
              {canWrite && workflow.data && (
                <button
                  type="button"
                  disabled={
                    generatePackingList.isPending ||
                    generatePackingList.uncertain
                  }
                  onClick={() => handlePackingListAction("save")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                >
                  <FilePlus size={14} weight="bold" />
                  <span>
                    {generatePackingList.isPending
                      ? text(
                          "Đang sinh Packing List...",
                          "Generating Packing List...",
                        )
                      : text(
                          "Sinh Packing List từ hồ sơ niêm phong",
                          "Generate Packing List from closure dossier",
                        )}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePackingListAction("preview")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary text-xs font-medium transition-all"
              >
                <DownloadSimple size={14} />
                <span>
                  {text(
                    "Tải bản in Packing List",
                    "Download printable Packing List",
                  )}
                </span>
              </button>
            </div>
          )}
        </div>

        <ContainerCommandFeedback
          error={generatePackingList.error}
          uncertain={generatePackingList.uncertain}
          retry={generatePackingList.retry}
          success={generatePackingList.isSuccess}
          isPending={generatePackingList.isPending}
          restoredPending={generatePackingList.restoredPending}
          discardPending={generatePackingList.discardPending}
        />

        <Feedback pending={workflow.isPending} error={workflow.error} />

        {workflow.data?.documents.length === 0 && (
          <p className="text-xs text-ink-secondary py-2">
            {text("Chưa có chứng từ đính kèm.", "No documents attached.")}
          </p>
        )}

        {workflow.data && workflow.data.documents.length > 0 && (
          <div className="space-y-3">
            {workflow.data.documents.map((doc) => {
              const origin = classifyDocumentOrigin(doc, c.id);
              const badge = originBadgeProps(origin);
              const cleanReason = displayDocumentReason(doc.reason);
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink-primary">
                        <span className="font-semibold">
                          {doc.documentType}
                        </span>{" "}
                        · <span className="font-mono">v{doc.version}</span> ·{" "}
                        <span className="font-mono text-accent-primary">
                          {doc.filename}
                        </span>
                      </p>
                      <StatusBadge
                        status={badge.status}
                        label={text(...badge.label)}
                        size="sm"
                      />
                    </div>
                    <p className="text-[11px] text-ink-secondary">
                      {cleanReason || "—"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={download.isPending}
                    onClick={() =>
                      download.mutate({ id: doc.id, name: doc.filename })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs font-semibold shadow-xs transition-all shrink-0"
                  >
                    <DownloadSimple size={14} />
                    <span>
                      {text("Tải chứng từ", "Download document")} ·{" "}
                      {doc.filename}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {canWrite && c.status === "CLOSED" && workflow.data && (
          <div className="pt-3 border-t border-ink-tertiary/15">
            <ContainerDocumentForm
              containerId={c.id}
              version={workflow.data.version}
              saved={saved}
            />
          </div>
        )}
      </section>

      {/* Evidence Supplements Panel */}
      {workflow.data && (
        <section
          aria-label={text("Bổ sung chứng cứ", "Evidence supplements")}
          className={`${panelClass}`}
        >
          <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
            <LinkSimple size={20} className="text-accent-primary" />
            <h2 className="font-display text-sm font-bold text-ink-primary">
              {text("Bổ sung chứng cứ", "Evidence supplements")}
            </h2>
          </div>

          {workflow.data.supplements.length === 0 && (
            <p className="text-xs text-ink-secondary py-2">
              {text(
                "Chưa có bổ sung sau phát hành.",
                "No post-issuance supplements.",
              )}
            </p>
          )}

          {workflow.data.supplements.length > 0 && (
            <div className="space-y-2">
              {workflow.data.supplements.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs text-ink-primary flex items-center justify-between"
                >
                  <p>
                    {s.reason} · {new Date(s.recordedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {canWrite && c.status === "CLOSED" && (
            <div className="pt-3 border-t border-ink-tertiary/15">
              <ContainerSupplementForm
                containerId={c.id}
                version={workflow.data.version}
                saved={saved}
              />
            </div>
          )}
        </section>
      )}
    </>
  );
}

function ContainerDocumentForm({
  containerId,
  version,
  saved,
}: {
  containerId: string;
  version: number;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const readingRef = useRef(false);
  const lastSubmittedRef = useRef<{
    containerId: string;
    documentType: string;
    filename: string;
    reason: string;
  } | null>(null);
  const command = useContainerCommand(
    (operationId, input: Omit<ContainerDocumentRequest, "operationId">) => {
      lastSubmittedRef.current = {
        containerId,
        documentType: input.documentType,
        filename: input.filename,
        reason: input.reason,
      };
      return containerExecutionEndpoints.addDocument(containerId, {
        operationId,
        ...input,
      });
    },
    async () => {
      if (lastSubmittedRef.current) {
        rememberUploadedDocument(lastSubmittedRef.current);
      }
      await saved();
    },
    { persistKey: `container:${containerId}:doc-upload` },
  );

  return (
    <form
      aria-label={text("Thêm phiên bản chứng từ", "Add document version")}
      className="space-y-4 p-4 rounded-xl bg-surface-raised/30 dark:bg-surface-overlay/10 border border-ink-tertiary/20"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (
          command.isPending ||
          command.uncertain ||
          readingRef.current ||
          !form.reportValidity() ||
          !file
        )
          return;
        if (file.size < 1 || file.size > 10 * 1024 * 1024) {
          setError(
            text(
              "Chọn tệp từ 1 byte đến 10 MiB.",
              "Choose a file between 1 byte and 10 MiB.",
            ),
          );
          return;
        }
        const data = new FormData(form);
        const input = {
          version,
          documentType: String(data.get("documentType")).trim(),
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          reason: String(data.get("reason")).trim(),
        };
        readingRef.current = true;
        setReading(true);
        setError("");
        try {
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () =>
              reject(
                new Error(
                  text("Không đọc được tệp.", "Could not read the file."),
                ),
              );
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.readAsDataURL(file);
          });
          command.submit({ ...input, content });
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          readingRef.current = false;
          setReading(false);
        }
      }}
    >
      <fieldset
        disabled={reading || command.isPending || command.uncertain}
        className="space-y-3"
      >
        <legend className="text-xs font-semibold text-ink-primary mb-2">
          {text("Thêm phiên bản chứng từ", "Add document version")}
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-type`} className={labelClass}>
              {text("Loại chứng từ", "Document type")}
              <input
                id={`${uid}-type`}
                name="documentType"
                required
                maxLength={80}
                placeholder="PACKING_LIST, PHYTOSANITARY..."
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>

          <div>
            <label htmlFor={`${uid}-file`} className={labelClass}>
              {text(
                "Tệp chứng từ (tối đa 10 MiB)",
                "Document file (maximum 10 MiB)",
              )}
              <input
                id={`${uid}-file`}
                name="file"
                type="file"
                required
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError("");
                }}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-reason`} className={labelClass}>
            {text("Lý do bổ sung phiên bản", "Reason for this version")}
            <textarea
              id={`${uid}-reason`}
              name="reason"
              required
              maxLength={1000}
              placeholder={text(
                "Nhập lý do cập nhật chứng từ...",
                "Enter document update reason...",
              )}
              className={`${inputClass} mt-1 min-h-[60px]`}
            />
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={reading || command.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Plus size={14} weight="bold" />
            <span>
              {command.isPending
                ? text("Đang lưu...", "Saving...")
                : text("Lưu phiên bản chứng từ", "Save document version")}
            </span>
          </button>
        </div>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="p-3 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs"
        >
          {error}
        </p>
      )}

      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
        isPending={command.isPending}
        restoredPending={command.restoredPending}
        discardPending={command.discardPending}
      />
    </form>
  );
}

function ContainerSupplementForm({
  containerId,
  version,
  saved,
}: {
  containerId: string;
  version: number;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const command = useContainerCommand(
    (
      operationId,
      input: { version: number; evidenceId: string; reason: string },
    ) =>
      containerExecutionEndpoints.addSupplement(containerId, {
        operationId,
        ...input,
      }),
    saved,
    { persistKey: `container:${containerId}:supplement` },
  );

  return (
    <form
      aria-label={text(
        "Liên kết chứng cứ bổ sung",
        "Link supplementary evidence",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (
          command.isPending ||
          command.uncertain ||
          !e.currentTarget.reportValidity()
        )
          return;
        const form = new FormData(e.currentTarget);
        command.submit({
          version,
          evidenceId: String(form.get("evidenceId")).trim(),
          reason: String(form.get("reason")).trim(),
        });
      }}
      className="space-y-4 p-4 rounded-xl bg-surface-raised/30 dark:bg-surface-overlay/10 border border-ink-tertiary/20"
    >
      <fieldset
        disabled={command.isPending || command.uncertain}
        className="space-y-3"
      >
        <legend className="text-xs font-semibold text-ink-primary mb-2">
          {text("Liên kết chứng cứ đã lưu", "Link stored evidence")}
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-evidence`} className={labelClass}>
              {text("Mã chứng cứ", "Evidence ID")}
              <input
                id={`${uid}-evidence`}
                name="evidenceId"
                required
                pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"
                placeholder="00000000-0000-0000-0000-000000000000"
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          </div>

          <div>
            <label htmlFor={`${uid}-reason`} className={labelClass}>
              {text("Lý do bổ sung", "Supplement reason")}
              <textarea
                id={`${uid}-reason`}
                name="reason"
                required
                maxLength={1000}
                placeholder={text(
                  "Nhập căn cứ bổ sung...",
                  "Enter supplement reason...",
                )}
                className={`${inputClass} mt-1 min-h-[60px]`}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={command.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Plus size={14} weight="bold" />
            <span>
              {command.isPending
                ? text("Đang lưu...", "Saving...")
                : text("Lưu bổ sung chứng cứ", "Save evidence supplement")}
            </span>
          </button>
        </div>
      </fieldset>

      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
        isPending={command.isPending}
        restoredPending={command.restoredPending}
        discardPending={command.discardPending}
      />
    </form>
  );
}
