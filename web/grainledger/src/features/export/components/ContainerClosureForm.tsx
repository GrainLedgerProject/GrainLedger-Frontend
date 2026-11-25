import { useId, useState } from "react";
import {
  containerExecutionEndpoints,
  type ContainerExecution,
  type ContainerMetadataRequest,
  type ContainerReadiness,
} from "@/api/containerExecution";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import {
  ArrowsClockwise,
  CheckCircle,
  FloppyDisk,
  LockSimple,
  ShieldCheck,
} from "@phosphor-icons/react";

const inputClass =
  "w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-ink-secondary mb-1.5";

export function ContainerClosureForm({
  container: c,
  readiness,
  canWrite,
  canClose,
  refreshing,
  saved,
}: {
  container: ContainerExecution;
  readiness: ContainerReadiness;
  canWrite: boolean;
  canClose: boolean;
  refreshing: boolean;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const [number, setNumber] = useState(c.containerNumber ?? "");
  const [seal, setSeal] = useState(c.sealNumber ?? "");
  const [confirmedVersion, setConfirmedVersion] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState(c.version);

  const metadata = useContainerCommand(
    (operationId, input: Omit<ContainerMetadataRequest, "operationId">) =>
      containerExecutionEndpoints.saveMetadata(c.id, {
        ...input,
        operationId,
      }),
    saved,
    { persistKey: `container:${c.id}:metadata` },
  );

  const close = useContainerCommand(
    (operationId, version: number) =>
      containerExecutionEndpoints.close(c.id, { operationId, version }),
    saved,
    { persistKey: `container:${c.id}:close` },
  );

  const locked =
    metadata.isPending ||
    metadata.uncertain ||
    close.isPending ||
    close.uncertain ||
    refreshing;

  const metadataDirty =
    number.trim() !== (c.containerNumber ?? "") ||
    seal.trim() !== (c.sealNumber ?? "");

  const ready =
    canClose &&
    !metadataDirty &&
    readiness.phase === "CLOSE" &&
    readiness.assessmentStatus === "PASS" &&
    Boolean(c.containerNumber && c.sealNumber) &&
    c.remainingKg !== "" &&
    Number(c.remainingKg) === 0 &&
    c.status === "LOADING" &&
    c.holds.length === 0;

  return (
    <section
      aria-label={text("Thông tin niêm phong", "Closure details")}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-5"
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <ShieldCheck size={20} className="text-accent-primary" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Thông tin niêm phong", "Closure details")}
        </h2>
      </div>

      <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs text-ink-secondary">
        <p>
          {text("Mục tiêu theo container", "This container's target")}:{" "}
          <strong className="font-mono text-ink-primary">{c.targetKg} kg</strong>{" "}
          · {text("Đã thực xếp", "Actually loaded")}:{" "}
          <strong className="font-mono text-accent-primary">{c.loadedKg} kg</strong>
        </p>
      </div>

      {c.status === "CLOSED" ? (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2"
        >
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>
            {text(
              "Container đã được đóng niêm. Xem hồ sơ để tải snapshot đã phát hành.",
              "The container is closed. Open its dossier to download the issued snapshot.",
            )}
          </span>
        </div>
      ) : canWrite ? (
        <div className="space-y-6">
          {editingVersion !== c.version && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-functional-stale-bg/40 border border-functional-stale-border text-xs">
              <span>
                {text(
                  "Phiên bản dữ liệu container đã thay đổi trên máy chủ.",
                  "Container version changed on the server.",
                )}
              </span>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setEditingVersion(c.version);
                  setNumber(c.containerNumber ?? "");
                  setSeal(c.sealNumber ?? "");
                  setConfirmedVersion(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base border border-ink-tertiary/20 text-ink-primary font-semibold text-xs"
              >
                <ArrowsClockwise size={14} />
                <span>
                  {text(
                    "Nạp số container và seal mới nhất",
                    "Use latest container and seal numbers",
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Save Metadata Form */}
          <form
            aria-label={text(
              "Lưu số container và seal",
              "Save container and seal numbers",
            )}
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !locked &&
                editingVersion === c.version &&
                e.currentTarget.reportValidity()
              ) {
                metadata.submit({
                  version: editingVersion,
                  containerNumber: number.trim(),
                  sealNumber: seal.trim(),
                });
              }
            }}
            className="space-y-4"
          >
            <fieldset
              disabled={locked || editingVersion !== c.version}
              className="space-y-4"
            >
              <legend className="sr-only">
                {text("Số container và seal", "Container and seal numbers")}
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-number`} className={labelClass}>
                    {text("Số container", "Container number")}
                    <input
                      id={`${uid}-number`}
                      name="containerNumber"
                      required
                      maxLength={80}
                      value={number}
                      onChange={(e) => {
                        setNumber(e.target.value);
                        setConfirmedVersion(null);
                      }}
                      placeholder="MSKU 123456-7"
                      className={`${inputClass} mt-1 font-mono uppercase`}
                    />
                  </label>
                </div>

                <div>
                  <label htmlFor={`${uid}-seal`} className={labelClass}>
                    {text("Số seal", "Seal number")}
                    <input
                      id={`${uid}-seal`}
                      name="sealNumber"
                      required
                      maxLength={80}
                      value={seal}
                      onChange={(e) => {
                        setSeal(e.target.value);
                        setConfirmedVersion(null);
                      }}
                      placeholder="SEAL-987654"
                      className={`${inputClass} mt-1 font-mono uppercase`}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={locked || editingVersion !== c.version}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                >
                  <FloppyDisk size={16} />
                  <span>
                    {text(
                      "Lưu số container và seal",
                      "Save container and seal numbers",
                    )}
                  </span>
                </button>
              </div>
            </fieldset>

            <ContainerCommandFeedback
              error={metadata.error}
              uncertain={metadata.uncertain}
              retry={metadata.retry}
              success={metadata.isSuccess}
              isPending={metadata.isPending}
              restoredPending={metadata.restoredPending}
              discardPending={metadata.discardPending}
            />
          </form>

          {/* Saved details display */}
          <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs text-ink-secondary">
            <p>
              {text("Thông tin đã lưu", "Saved details")}:{" "}
              <strong className="font-mono text-ink-primary">
                {c.containerNumber ?? "—"}
              </strong>{" "}
              ·{" "}
              <strong className="font-mono text-ink-primary">
                {c.sealNumber ?? "—"}
              </strong>
            </p>
          </div>

          {metadataDirty && (
            <p className="text-xs text-accent-warning">
              {text(
                "Lưu thông tin thay đổi trước khi xác nhận đóng niêm.",
                "Save the changed details before confirming closure.",
              )}
            </p>
          )}

          {/* Close Container Form */}
          <form
            aria-label={text("Đóng niêm container", "Close container")}
            onSubmit={(e) => {
              e.preventDefault();
              if (
                ready &&
                confirmedVersion === c.version &&
                !locked &&
                e.currentTarget.reportValidity()
              ) {
                close.submit(c.version);
              }
            }}
            className="space-y-4 border-t border-ink-tertiary/20 pt-4"
          >
            <fieldset disabled={!ready || locked} className="space-y-4">
              <legend className="sr-only">
                {text("Xác nhận đóng niêm", "Confirm closure")}
              </legend>

              <label
                htmlFor={`${uid}-confirm`}
                className="flex items-start gap-2.5 text-xs text-ink-primary font-medium cursor-pointer"
              >
                <input
                  id={`${uid}-confirm`}
                  name="confirmed"
                  type="checkbox"
                  required
                  checked={confirmedVersion === c.version}
                  onChange={(e) =>
                    setConfirmedVersion(e.target.checked ? c.version : null)
                  }
                  className="mt-0.5 rounded border-ink-tertiary/30 text-accent-primary focus:ring-accent-primary"
                />
                <span>
                  {text(
                    "Tôi xác nhận số container, số seal đã lưu và khối lượng thực xếp trước khi đóng niêm.",
                    "I confirm the saved container number, seal and actual loaded mass before closure.",
                  )}
                </span>
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!ready || locked || confirmedVersion !== c.version}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-md shadow-accent-primary/20 transition-all disabled:opacity-50"
                >
                  <LockSimple size={16} weight="bold" />
                  <span>
                    {close.isPending
                      ? text("Đang đóng niêm...", "Closing...")
                      : text(
                          "Đóng niêm và phát hành hồ sơ",
                          "Close and issue dossier",
                        )}
                  </span>
                </button>
              </div>
            </fieldset>

            <ContainerCommandFeedback
              error={close.error}
              uncertain={close.uncertain}
              retry={close.retry}
              success={close.isSuccess}
              isPending={close.isPending}
              restoredPending={close.restoredPending}
              discardPending={close.discardPending}
            />
          </form>
        </div>
      ) : (
        <p className="text-xs text-ink-secondary">
          {text(
            "Tài khoản chỉ có quyền xem bước này.",
            "Your account can only view this step.",
          )}
        </p>
      )}
    </section>
  );
}
