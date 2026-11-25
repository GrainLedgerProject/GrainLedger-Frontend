import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { Plus, ShieldCheck, Truck } from "@phosphor-icons/react";
import { ExportDialogFrame } from "./ExportDialogFrame";
import { exportEndpoints } from "@/api/exports";
import { useExportCommand } from "@/features/export/hooks/useExportCommand";
import { Modal } from "@/shared/ui/Modal";
import { Feedback } from "@/shared/ui/Workflow";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { allocationPercent, massLabel } from "../model/exportPresentation";

export interface AllocateContainerModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AllocateContainerModal({
  orderId,
  isOpen,
  onClose,
}: AllocateContainerModalProps) {
  const text = useWorkflowText();
  const locale = text("vi", "en");
  const cache = useQueryClient();
  const id = useId();
  const [mass, setMass] = useState("");

  const detail = useQuery({
    queryKey: ["export-order-detail", orderId],
    queryFn: () => exportEndpoints.getOrderResource(orderId),
    enabled: isOpen && Boolean(orderId),
  });

  const add = useExportCommand(
    (operationId, input: { mass: string; etag: string }) =>
      exportEndpoints.addContainers(
        orderId,
        { operationId, containers: [{ targetMass: input.mass, unit: "KG" }] },
        input.etag,
      ),
    async () => {
      setMass("");
      await Promise.all([
        cache.invalidateQueries({
          queryKey: ["export-container-list", orderId],
        }),
        cache.invalidateQueries({ queryKey: ["export-order-detail", orderId] }),
        cache.invalidateQueries({ queryKey: ["export-workspace-orders"] }),
      ]);
      onClose();
    },
    { persistKey: `export-order:${orderId}:allocate` },
  );

  const order = detail.data?.data;
  const etag = detail.data?.etag;

  const percent = order
    ? allocationPercent(order.allocatedMassKg, order.requiredMassKg)
    : 0;

  const isFullyAllocated = order
    ? new Decimal(order.remainingMassKg).lte(0)
    : false;

  const remainingAfter = (() => {
    if (!order) return "0";
    try {
      const parsed = new Decimal(mass || "0");
      if (parsed.isNaN() || parsed.lt(0)) return order.remainingMassKg;
      const res = new Decimal(order.remainingMassKg).minus(parsed);
      return res.lt(0) ? "0" : res.toString();
    } catch {
      return order.remainingMassKg;
    }
  })();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order || !etag || !e.currentTarget.reportValidity()) return;

    const input = e.currentTarget.elements.namedItem(
      "targetMass",
    ) as HTMLInputElement;
    try {
      const d = new Decimal(mass);
      const valid = d.gt(0) && d.lte(order.remainingMassKg);
      input.setCustomValidity(
        valid
          ? ""
          : text(
              "Nhập khối lượng dương không vượt phần còn phân bổ.",
              "Enter a positive mass within the unallocated amount.",
            ),
      );
    } catch {
      input.setCustomValidity(
        text("Khối lượng không hợp lệ.", "Invalid mass value."),
      );
    }

    if (e.currentTarget.reportValidity()) {
      add.submit({ mass, etag });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      className="rounded-2xl shadow-xl"
      onClose={() => {
        if (!add.isPending) onClose();
      }}
      closeOnBackdrop={!add.isPending}
      ariaLabel={text("Phân bổ thêm container", "Allocate more containers")}
    >
      <ExportDialogFrame
        kind="allocate"
        title={text("Phân bổ thêm container", "Allocate more containers")}
        icon={<Truck size={20} weight="duotone" />}
        subtitle={
          order && (
            <p className="font-mono text-xs text-ink-secondary">
              {text("Đơn hàng", "Order")}:{" "}
              <span className="font-bold text-accent-primary">
                {order.code}
              </span>
            </p>
          )
        }
        closeLabel={text("Đóng", "Close")}
        closeDisabled={add.isPending}
        onClose={onClose}
      >
        {/* Loading / Error States */}
        {detail.isPending && (
          <div className="flex items-center justify-center py-10">
            <GrainLoader size="md" />
          </div>
        )}

        <Feedback error={detail.error} />

        {/* Order Details & Allocation Form */}
        {order && (
          <div className="space-y-5">
            {/* Allocation progress card */}
            <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-ink-primary">
                  {text(
                    "Tiến độ phân bổ hợp đồng",
                    "Contract allocation progress",
                  )}
                </span>
                <span className="font-mono font-bold text-accent-primary">
                  {percent}%
                </span>
              </div>
              <progress
                className="mt-2.5 h-2 w-full accent-accent-primary"
                max={100}
                value={percent}
                aria-label={text("Tiến độ phân bổ", "Allocation progress")}
              />
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-ink-secondary">
                <div>
                  <span className="text-ink-tertiary">
                    {text("Đã phân bổ", "Allocated")}:
                  </span>{" "}
                  <span className="font-mono font-medium text-ink-primary">
                    {massLabel(order.allocatedMassKg, locale)} /{" "}
                    {massLabel(order.requiredMassKg, locale)} kg
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-ink-tertiary">
                    {text("Còn lại", "Remaining")}:
                  </span>{" "}
                  <span className="font-mono font-bold text-accent-primary">
                    {massLabel(order.remainingMassKg, locale)} kg
                  </span>
                </div>
              </div>
            </div>

            {isFullyAllocated ? (
              <div className="rounded-xl border border-accent-warning/30 bg-accent-warning/10 p-4 text-xs text-ink-primary">
                <p className="font-semibold text-accent-warning">
                  {text(
                    "Đã phân bổ 100% khối lượng hợp đồng",
                    "100% contract mass already allocated",
                  )}
                </p>
                <p className="mt-1 text-ink-secondary">
                  {text(
                    "Đơn hàng này không còn khối lượng dư thừa để tạo thêm container mới.",
                    "This order has no remaining unallocated mass to add new containers.",
                  )}
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                    onClick={onClose}
                  >
                    {text("Đóng", "Close")}
                  </button>
                </div>
              </div>
            ) : (
              <form
                aria-label={text(
                  "Thêm container cho đơn hàng",
                  "Add an order container",
                )}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <fieldset disabled={add.isPending} className="space-y-4">
                  <div>
                    <label
                      htmlFor={id}
                      className="mb-1.5 block text-xs font-semibold text-ink-primary"
                    >
                      {text(
                        "Khối lượng mục tiêu của container mới (kg)",
                        "New container target (kg)",
                      )}
                    </label>
                    <input
                      id={id}
                      name="targetMass"
                      required
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,6})?"
                      value={mass}
                      placeholder={text("VD: 25000", "e.g. 25000")}
                      onChange={(e) => {
                        setMass(e.target.value);
                        e.target.setCustomValidity("");
                      }}
                      className="w-full rounded-xl border border-ink-tertiary/20 bg-surface-base px-3.5 py-2.5 font-mono text-sm text-ink-primary shadow-xs outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                    />
                  </div>

                  {/* Quick suggestion buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-ink-tertiary">
                      {text(
                        "Gợi ý nhanh theo quy cách chuẩn:",
                        "Quick standard suggestions:",
                      )}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {new Decimal(order.remainingMassKg).gte(25000) && (
                        <button
                          type="button"
                          className="rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 font-mono text-xs font-medium text-ink-primary transition-colors hover:bg-surface-raised"
                          onClick={() => setMass("25000")}
                        >
                          25,000 kg (20ft)
                        </button>
                      )}
                      {new Decimal(order.remainingMassKg).gte(28000) && (
                        <button
                          type="button"
                          className="rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 font-mono text-xs font-medium text-ink-primary transition-colors hover:bg-surface-raised"
                          onClick={() => setMass("28000")}
                        >
                          28,000 kg (40ft)
                        </button>
                      )}
                      {new Decimal(order.remainingMassKg).gt(0) && (
                        <button
                          type="button"
                          className="rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/20"
                          onClick={() => setMass(order.remainingMassKg)}
                        >
                          {text("Toàn bộ còn lại", "All remaining")} (
                          {massLabel(order.remainingMassKg, locale)} kg)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live remaining feedback */}
                  {mass && (
                    <div className="rounded-lg bg-surface-raised/70 p-2.5 text-xs">
                      <span className="text-ink-secondary">
                        {text(
                          "Còn lại sau khi phân bổ",
                          "Remaining after allocation",
                        )}
                        :{" "}
                      </span>
                      <span className="font-mono font-bold text-accent-primary">
                        {massLabel(remainingAfter, locale)} kg
                      </span>
                    </div>
                  )}

                  {/* Quality specs note */}
                  {order.limits.length > 0 && (
                    <div className="border-t border-ink-tertiary/15 pt-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
                        <ShieldCheck
                          size={14}
                          className="text-accent-primary"
                        />
                        {text(
                          "Chỉ tiêu áp dụng cho container này",
                          "Quality specs applied to this container",
                        )}
                        : {order.limits.length} {text("chỉ tiêu", "limits")} (v
                        {order.specificationVersion})
                      </p>
                    </div>
                  )}
                </fieldset>

                <ContainerCommandFeedback
                  error={add.error}
                  uncertain={add.uncertain}
                  retry={add.retry}
                  success={add.isSuccess}
                  isPending={add.isPending}
                  restoredPending={add.restoredPending}
                  discardPending={add.discardPending}
                />

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-ink-tertiary/15 pt-4">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-ink-tertiary/25 bg-surface-base text-ink-secondary hover:bg-surface-raised hover:text-ink-primary px-4"
                    disabled={add.isPending}
                    onClick={onClose}
                  >
                    {text("Huỷ", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
                    disabled={add.isPending || add.uncertain || !mass}
                  >
                    <Plus size={16} aria-hidden="true" />
                    {add.isPending
                      ? text("Đang phân bổ…", "Allocating…")
                      : text("Xác nhận phân bổ", "Confirm allocation")}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </ExportDialogFrame>
    </Modal>
  );
}
