import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldWarning, UploadSimple } from "@phosphor-icons/react";
import { containerExecutionEndpoints, type ContainerExecution } from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      resolve(dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

export function ContainerHoldForm({
  container,
  saved,
}: {
  container: ContainerExecution;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [manualEvidenceId, setManualEvidenceId] = useState("");
  const [facilityOverride, setFacilityOverride] = useState("");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const lookups = useQuery({
    queryKey: ["container-hold-lookups"],
    queryFn: () => ledgerEndpoints.getLookups() as Promise<SetupApiResponse>,
    enabled: Boolean(evidenceFile && !container.facilityId),
  });

  const command = useContainerCommand(
    (operationId, input: { version: number; reason: string; evidenceId?: string }) =>
      containerExecutionEndpoints.placeHold(container.id, { operationId, ...input }),
    async () => {
      setReason("");
      setEvidenceFile(null);
      setManualEvidenceId("");
      setLocalError(null);
      await saved();
    },
    { persistKey: `container:${container.id}:hold` },
  );

  async function resolveEvidenceId(): Promise<string | undefined> {
    if (manualEvidenceId.trim()) {
      const cleaned = manualEvidenceId.trim();
      if (!/^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(cleaned)) {
        throw new Error(
          text("Mã chứng cứ phải là UUID hợp lệ.", "Evidence ID must be a valid UUID."),
        );
      }
      return cleaned;
    }
    if (!evidenceFile) return undefined;
    const ownerId =
      container.companyId ||
      lookups.data?.owners?.[0]?.id ||
      user?.organizationId ||
      "";
    const facilityId =
      container.facilityId ||
      facilityOverride ||
      lookups.data?.facilities?.[0]?.id ||
      "";
    if (!ownerId || !facilityId) {
      throw new Error(
        text(
          "Chọn cơ sở lưu giữ để tải tệp chứng cứ lên sổ cái.",
          "Select a facility before uploading evidence to the ledger.",
        ),
      );
    }
    const evidenceId = crypto.randomUUID();
    const contentBase64 = await readFileAsBase64(evidenceFile);
    await ledgerEndpoints.uploadEvidence({
      id: evidenceId,
      ownerId,
      facilityId,
      fileName: evidenceFile.name,
      contentType: evidenceFile.type || "application/octet-stream",
      contentBase64,
    });
    return evidenceId;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!reason.trim()) return;
    try {
      setUploading(true);
      const evidenceId = await resolveEvidenceId();
      command.submit({
        version: container.version,
        reason: reason.trim(),
        ...(evidenceId ? { evidenceId } : {}),
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="gl-workflow">
      <Panel title={text("Ban hành HOLD cho container", "Place container on HOLD")}>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <fieldset disabled={uploading || command.isPending || command.uncertain} className="space-y-3 text-xs">
            <label htmlFor={`${uid}-reason`} className="block space-y-1">
              <span className="font-semibold text-ink-secondary">
                {text("Lý do HOLD", "HOLD reason")} *
              </span>
              <textarea
                id={`${uid}-reason`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                rows={3}
                maxLength={1000}
              />
            </label>

            <div className="rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/40 p-3 space-y-2.5">
              <p className="font-semibold text-ink-secondary flex items-center gap-1.5">
                <UploadSimple size={15} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Đính kèm tệp chứng cứ (tùy chọn)", "Attach evidence file (optional)")}</span>
              </p>
              <input
                type="file"
                aria-label={text("Tệp chứng cứ HOLD container", "Container HOLD evidence file")}
                onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
                className="w-full text-[11px]"
              />
              {evidenceFile && !container.facilityId && lookups.data?.facilities?.length ? (
                <label className="block space-y-1">
                  <span className="text-[11px] text-ink-secondary">
                    {text("Cơ sở lưu chứng cứ", "Evidence facility")}
                  </span>
                  <select
                    value={facilityOverride || lookups.data.facilities[0]?.id || ""}
                    onChange={(e) => setFacilityOverride(e.target.value)}
                    className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1.5 text-[11px]"
                  >
                    {lookups.data.facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label htmlFor={`${uid}-evid`} className="block space-y-1">
                <span className="text-[11px] text-ink-secondary">
                  {text("Hoặc nhập mã chứng cứ đã lưu (UUID)", "Or existing evidence ID (UUID)")}
                </span>
                <input
                  id={`${uid}-evid`}
                  type="text"
                  value={manualEvidenceId}
                  onChange={(e) => setManualEvidenceId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1.5 font-mono text-[11px]"
                />
              </label>
            </div>

            {container.status === "CLOSED" && (
              <p className="text-[11px] text-accent-danger font-medium">
                {text(
                  "Container đã niêm phong (CLOSED): vẫn có thể ghi nhận lệnh HOLD kèm chứng cứ.",
                  "Container is CLOSED: container HOLD with evidence remains supported.",
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={uploading || command.isPending || command.uncertain || !reason.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-danger px-4 py-2 font-semibold text-white hover:bg-accent-danger/90 disabled:opacity-50"
            >
              <ShieldWarning size={15} weight="fill" aria-hidden="true" />
              <span>
                {uploading || command.isPending
                  ? text("Đang xử lý...", "Submitting...")
                  : text("Ban hành HOLD", "Place HOLD")}
              </span>
            </button>
          </fieldset>
        </form>
        {localError && <Feedback error={new Error(localError)} />}
        <ContainerCommandFeedback
          error={command.error}
          uncertain={command.uncertain}
          retry={command.retry}
          success={command.isSuccess}
          isPending={command.isPending}
          restoredPending={command.restoredPending}
          discardPending={command.discardPending}
        />
      </Panel>
    </div>
  );
}
