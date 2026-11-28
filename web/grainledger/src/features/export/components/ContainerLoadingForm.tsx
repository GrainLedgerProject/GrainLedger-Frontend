import { useId, useRef, useState } from "react";
import { Decimal } from "@/shared/utils/decimalMass";
import {
  containerExecutionEndpoints,
  type ActualLoadRequest,
  type ContainerExecution,
  type ContainerReadiness,
} from "@/api/containerExecution";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import {
  ArrowsClockwise,
  Truck,
  WarningCircle,
} from "@phosphor-icons/react";

function localNow() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}

const inputClass =
  "w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-ink-secondary mb-1.5";

export function ContainerLoadingForm({
  container: c,
  readiness,
  canWrite,
  refreshing,
  saved,
}: {
  container: ContainerExecution;
  readiness: ContainerReadiness;
  canWrite: boolean;
  refreshing: boolean;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const form = useRef<HTMLFormElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loadedAt, setLoadedAt] = useState(localNow);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const signature = JSON.stringify([c.version, c.approval]);
  const [reviewedSnapshot, setReviewedSnapshot] = useState(signature);
  const stale = reviewedSnapshot !== signature;

  const command = useContainerCommand(
    (operationId, input: Omit<ActualLoadRequest, "operationId">) =>
      containerExecutionEndpoints.recordLoad(c.id, { operationId, ...input }),
    async () => {
      setQuantities({});
      setConfirmed(false);
      await saved();
    },
    { persistKey: `container:${c.id}:loading` },
  );

  const allocations = c.approval?.allocations ?? [];
  const ready =
    readiness.phase === "LOADING" &&
    readiness.assessmentStatus === "PASS" &&
    c.status !== "CLOSED" &&
    c.holds.length === 0 &&
    Boolean(c.approval);
  const locked = command.isPending || command.uncertain;

  const enteredTotal = Object.values(quantities).reduce((acc, val) => {
    if (val && /^[0-9]+(?:\.[0-9]{1,6})?$/.test(val.trim())) {
      try {
        return acc.plus(val.trim());
      } catch {
        return acc;
      }
    }
    return acc;
  }, new Decimal(0));
  const remainingAfterEntered = new Decimal(c.remainingKg).minus(enteredTotal);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorSummary.current?.focus());
  }

  function submit() {
    if (
      !canWrite ||
      !ready ||
      refreshing ||
      locked ||
      stale ||
      !form.current?.reportValidity() ||
      !c.approval
    )
      return;
    const lines: ActualLoadRequest["lines"] = [];
    for (const [index, a] of allocations.entries()) {
      const quantity = quantities[index]?.trim();
      if (!quantity) continue;
      if (
        !/^[0-9]+(?:\.[0-9]{1,6})?$/.test(quantity) ||
        !new Decimal(quantity).gt(0) ||
        new Decimal(quantity).gt(a.remainingKg) ||
        a.restricted ||
        !a.loadingPositionReady
      ) {
        fail(
          text(
            "Khối lượng mỗi dòng phải lớn hơn 0, không vượt bảo lưu còn lại và thuộc vị trí đủ điều kiện xếp.",
            "Each quantity must be positive, within its remaining reservation and at a loading-ready position.",
          ),
        );
        return;
      }
      lines.push({
        lotId: a.lotId,
        locationId: a.locationId,
        quantityKg: quantity,
      });
    }
    if (!lines.length) {
      fail(
        text(
          "Nhập khối lượng thực xếp của ít nhất một lô.",
          "Enter an actual loaded quantity for at least one lot.",
        ),
      );
      return;
    }
    const total = lines.reduce(
      (sum, l) => sum.plus(l.quantityKg),
      new Decimal(0),
    );
    if (total.gt(c.remainingKg)) {
      fail(
        text(
          "Tổng thực xếp vượt khối lượng còn lại của container.",
          "The load exceeds the remaining container target.",
        ),
      );
      return;
    }
    const date = new Date(loadedAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
      fail(
        text(
          "Thời điểm xếp phải hợp lệ và không ở tương lai.",
          "Use a valid loading time that is not in the future.",
        ),
      );
      return;
    }
    setError("");
    command.submit({
      version: c.version,
      proposalId: c.approval.proposalId,
      decisionVersion: c.approval.decisionVersion,
      loadedAt: date.toISOString(),
      lines,
    });
  }

  return (
    <section
      aria-label={text("Ghi nhận thực xếp", "Record actual loading")}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-5"
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <Truck size={20} className="text-accent-primary" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Ghi nhận thực xếp", "Record actual loading")}
        </h2>
      </div>

      {!canWrite && (
        <p className="text-xs text-ink-secondary">
          {text(
            "Tài khoản chỉ có quyền xem bước này.",
            "Your account can only view this step.",
          )}
        </p>
      )}

      {!ready && (
        <p className="text-xs text-accent-warning">
          {text(
            "Xử lý các điều kiện kiểm tra bên trên rồi tải lại trước khi ghi nhận.",
            "Resolve the readiness findings above and reload before recording.",
          )}
        </p>
      )}

      {stale && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-functional-stale-bg/40 border border-functional-stale-border flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-accent-warning shrink-0" />
            <span>
              {text(
                "Dữ liệu đã đổi. Nạp số liệu mới và nhập lại khối lượng trước khi ghi nhận.",
                "Data changed. Load the new snapshot and re-enter quantities before recording.",
              )}
            </span>
          </div>

          <button
            type="button"
            disabled={locked}
            onClick={() => {
              setReviewedSnapshot(signature);
              setQuantities({});
              setConfirmed(false);
              setError("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base hover:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-semibold transition-all shrink-0"
          >
            <ArrowsClockwise size={14} />
            <span>{text("Nạp số liệu mới", "Use latest snapshot")}</span>
          </button>
        </div>
      )}

      {canWrite && (
        <form
          ref={form}
          aria-label={text("Ghi nhận thực xếp", "Record actual loading")}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset
            disabled={locked || !ready || refreshing || stale}
            className="space-y-5"
          >
            <legend className="sr-only">
              {text("Số liệu thực tế", "Actual measurements")}
            </legend>

            <div>
              <label htmlFor={`${uid}-time`} className={labelClass}>
                {text("Thời điểm xếp hàng", "Loading time")}
                <input
                  id={`${uid}-time`}
                  name="loadedAt"
                  type="datetime-local"
                  step="1"
                  required
                  value={loadedAt}
                  onChange={(e) => setLoadedAt(e.target.value)}
                  className={`${inputClass} mt-1.5 max-w-sm`}
                />
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block">
                {text("Chi tiết các mẻ nạp vào container:", "Loading allocation lines:")}
              </span>

              {allocations.map((a, i) => (
                <div
                  key={a.lotId + a.locationId}
                  className="p-4 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 dark:bg-surface-overlay/20 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <p className="font-semibold text-ink-primary flex items-center gap-2">
                      <span className="font-mono text-sm">{a.lotCode}</span>
                      <span>·</span>
                      <span className="text-ink-secondary">
                        {text("Bảo lưu còn lại", "Remaining reservation")}:{" "}
                        <strong className="font-mono text-accent-primary">
                          {a.remainingKg} kg
                        </strong>
                      </span>
                    </p>
                    <p className="break-all text-xs text-ink-secondary font-mono">
                      {text("Vị trí", "Position")}: {a.locationId}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-ink-secondary">
                        {text("Khối lượng nạp", "Load quantity")}
                      </span>
                      <button
                        type="button"
                        disabled={
                          a.restricted ||
                          !a.loadingPositionReady ||
                          new Decimal(a.remainingKg).lte(0)
                        }
                        onClick={() => {
                          const available = new Decimal(a.remainingKg);
                          const needed = Decimal.max(0, new Decimal(c.remainingKg));
                          const fill = available.lt(needed) ? available.toString() : needed.toString();
                          setQuantities({ ...quantities, [i]: fill });
                          setConfirmed(false);
                          setError("");
                        }}
                        className="text-[11px] font-semibold text-accent-primary hover:underline transition-colors disabled:opacity-40"
                      >
                        {text("Điền tối đa (" + a.remainingKg + " kg)", "Fill max (" + a.remainingKg + " kg)")}
                      </button>
                    </div>
                    <label htmlFor={`${uid}-mass-${i}`} className={labelClass}>
                      {text("Thực xếp (kg)", "Actually loaded (kg)")} · {a.lotCode}
                      <input
                        id={`${uid}-mass-${i}`}
                        name={`quantity-${i}`}
                        inputMode="decimal"
                        pattern="[0-9]+([.][0-9]{1,6})?"
                        disabled={
                          a.restricted ||
                          !a.loadingPositionReady ||
                          new Decimal(a.remainingKg).lte(0)
                        }
                        value={quantities[i] ?? ""}
                        onChange={(e) => {
                          setQuantities({ ...quantities, [i]: e.target.value });
                          setConfirmed(false);
                          setError("");
                        }}
                        placeholder="0.00"
                        className={`${inputClass} mt-1 font-mono`}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Loading Summary */}
            <div className="p-3.5 rounded-xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/15 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-ink-secondary block">
                  {text("Tổng thực xếp lần này:", "This load total:")}
                </span>
                <span className="font-mono text-base font-bold text-ink-primary">
                  {enteredTotal.toString()} kg
                </span>
              </div>
              <div>
                <span className="text-ink-secondary block">
                  {text("Còn lại sau lần xếp này:", "Remaining after this load:")}
                </span>
                <span
                  className={`font-mono text-base font-bold ${
                    remainingAfterEntered.lt(0)
                      ? "text-accent-danger"
                      : "text-accent-primary"
                  }`}
                >
                  {remainingAfterEntered.toString()} kg
                </span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="pt-2">
              <label
                htmlFor={`${uid}-confirm`}
                className="flex items-start gap-2.5 text-xs text-ink-primary font-medium cursor-pointer"
              >
                <input
                  id={`${uid}-confirm`}
                  name="confirmed"
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-ink-tertiary/30 text-accent-primary focus:ring-accent-primary"
                />
                <span>
                  {text(
                    "Tôi xác nhận đây là khối lượng đã thực sự xếp lên container.",
                    "I confirm these quantities have actually been loaded into the container.",
                  )}
                </span>
              </label>
            </div>

            {error && (
              <p
                ref={errorSummary}
                role="alert"
                tabIndex={-1}
                className="p-3.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg text-accent-danger text-xs font-medium"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-ink-tertiary/15">
              <button
                type="submit"
                disabled={locked || !ready || refreshing || stale}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-md shadow-accent-primary/20 transition-all disabled:opacity-50"
              >
                <Truck size={16} weight="bold" />
                <span>
                  {command.isPending
                    ? text("Đang ghi nhận...", "Recording...")
                    : text("Ghi nhận thực xếp", "Record actual loading")}
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
      )}
    </section>
  );
}
