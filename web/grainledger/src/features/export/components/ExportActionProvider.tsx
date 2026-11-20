import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { Modal } from "@/shared/ui/Modal";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { ExportActionContext, type ExportAction } from "../model/exportActions";
import { ExportOrderDetails as Order } from "./ExportOrdersWorkspace";
import { ExportEmpty } from "./ExportWorkspaceUI";
import { Feedback } from "@/shared/ui/Workflow";
import { useExportWorkspaceData } from "../hooks/useExportWorkspaceData";
import { ExportContainerList } from "./ExportContainerList";

const Plan = lazy(() =>
  import("../pages/BlendPlanRequestPage").then((m) => ({
    default: m.BlendPlanRequestModalContent,
  })),
);
const Review = lazy(() =>
  import("../pages/BlendPlanReviewPage").then((m) => ({
    default: m.BlendPlanReviewContent,
  })),
);
const Container = lazy(() =>
  import("../pages/ContainerWorkflowPage").then((m) => ({
    default: m.ContainerWorkflowContent,
  })),
);
const CreateOrder = lazy(() =>
  import("./ExportOrderForm").then((m) => ({ default: m.ExportOrderForm })),
);

type Frame = { id: string; action: ExportAction };

function OrderContainers({ orderId }: { orderId: string }) {
  const text = useWorkflowText();
  const { containers, order } = useExportWorkspaceData("containers", orderId);
  return (
    <>
      <Feedback pending={containers.isPending} error={containers.error} />
      {containers.isError && (
        <button type="button" className="export-button" onClick={() => void containers.refetch()}>
          {text("Tải lại container", "Reload containers")}
        </button>
      )}
      {containers.data && (
        <ExportContainerList orderId={orderId} containers={containers.data}
          scope={<div><p className="text-xs text-ink-secondary">{text("Đơn hàng", "Order")}</p><strong className="font-mono">{order?.code ?? orderId}</strong></div>}
        />
      )}
    </>
  );
}
type SubmittedForm = { frame: string; form: HTMLFormElement };

export function ExportActionProvider({ children }: { children: ReactNode }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const [, setParams] = useSearchParams();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [discard, setDiscard] = useState<"back" | "close" | null>(null);
  const busy = useIsMutating() > 0;
  const [dirtyForms, setDirtyForms] = useState(
    new Map<string, Set<HTMLFormElement>>(),
  );
  const submitted = useRef<SubmittedForm | null>(null);
  const mutations = useRef(new Map<object, SubmittedForm>());
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const positions = useRef(new Map<string, number>());
  const previousFrame = useRef<string | undefined>(undefined);
  const current = frames.at(-1);
  const hasDirty = frames.some((frame) =>
    [...(dirtyForms.get(frame.id) ?? [])].some((form) => form.isConnected),
  );
  const titles = {
    "create-order": text("Tạo đơn xuất khẩu", "Create export order"),
    order: text("Chi tiết đơn hàng", "Order details"),
    containers: text("Điều phối container", "Container dispatch"),
    plan: text("Phương án phối trộn", "Blend planning"),
    review: text("Chi tiết đề xuất phối trộn", "Blend proposal details"),
    loading: text("Xếp hàng lên container", "Container loading"),
    closure: text("Đóng niêm container", "Container closure"),
    dossier: text("Hồ sơ theo container", "Container records"),
  };

  useEffect(
    () =>
      cache.getMutationCache().subscribe((event) => {
        if (event.type === "added" && submitted.current) {
          mutations.current.set(event.mutation, submitted.current);
          submitted.current = null;
        }
        if (event.type !== "updated") return;
        const form = mutations.current.get(event.mutation);
        if (form && event.mutation.state.status === "success") {
          setDirtyForms((previous) => {
            const next = new Map(previous);
            const forms = new Set(next.get(form.frame));
            forms.delete(form.form);
            next.set(form.frame, forms);
            return next;
          });
        }
        if (["success", "error"].includes(event.mutation.state.status))
          mutations.current.delete(event.mutation);
      }),
    [cache],
  );

  useEffect(() => {
    if (body.current && current)
      body.current.scrollTop = positions.current.get(current.id) ?? 0;
    if (previousFrame.current && current)
      heading.current?.focus({ preventScroll: true });
    previousFrame.current = current?.id;
  }, [current]);

  function finish(target: "close" | "back") {
    setDiscard(null);
    if (target === "back") {
      if (current) {
        setDirtyForms((previous) => {
          const next = new Map(previous);
          next.delete(current.id);
          return next;
        });
        positions.current.delete(current.id);
      }
      setFrames((previous) => previous.slice(0, -1));
    } else {
      setDirtyForms(new Map());
      positions.current.clear();
      submitted.current = null;
      setFrames([]);
    }
  }
  function requestClose(target: "close" | "back") {
    if (busy) return;
    const candidates = target === "back" ? (current ? [current] : []) : frames;
    if (
      candidates.some((frame) =>
        [...(dirtyForms.get(frame.id) ?? [])].some((form) => form.isConnected),
      )
    )
      setDiscard(target);
    else finish(target);
  }
  function open(action: ExportAction) {
    if (busy) return;
    setFrames((previous) => {
      const existing = previous.find(
        (frame) => JSON.stringify(frame.action) === JSON.stringify(action),
      );
      if (existing === previous.at(-1) && existing) return previous;
      return existing
        ? [...previous.filter((frame) => frame !== existing), existing]
        : [...previous, { id: crypto.randomUUID(), action }];
    });
  }
  async function created(id: string) {
    await cache.invalidateQueries({ queryKey: ["export-workspace-orders"] });
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("order", id);
      next.delete("container");
      next.delete("plan");
      return next;
    });
    finish("close");
  }
  return (
    <ExportActionContext.Provider value={open}>
      {children}
      <Modal
        isOpen={Boolean(current)}
        ariaLabel={current ? titles[current.action.kind] : undefined}
        onClose={() => requestClose("close")}
        closeOnBackdrop={!busy}
        closedBy={busy || hasDirty ? "none" : "closerequest"}
      >
        <div
          className="export-workspace export-action-dialog"
          data-kind={current?.action.kind}
        >
          <header className="export-action-dialog-header">
            <div className="flex min-w-0 items-center gap-3">
              {frames.length > 1 && (
                <button
                  type="button"
                  className="export-button export-button-icon"
                  disabled={busy}
                  aria-label={text(
                    "Quay lại thao tác trước",
                    "Back to previous action",
                  )}
                  onClick={() => requestClose("back")}
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
              )}
              <h2
                ref={heading}
                tabIndex={-1}
                className="font-display text-lg font-bold"
              >
                {current && titles[current.action.kind]}
              </h2>
            </div>
            <button
              type="button"
              autoFocus
              className="export-button export-button-icon shrink-0"
              disabled={busy}
              onClick={() => requestClose("close")}
              aria-label={text("Đóng thao tác", "Close action")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          {busy && (
            <p role="status" className="px-5 pt-3 text-xs text-ink-secondary">
              {text(
                "Đang gửi yêu cầu. Vui lòng chờ trước khi đóng.",
                "Sending the request. Please wait before closing.",
              )}
            </p>
          )}
          <div
            ref={body}
            className="export-action-dialog-body"
            onScroll={(event) => {
              if (current)
                positions.current.set(
                  current.id,
                  event.currentTarget.scrollTop,
                );
            }}
          >
            {frames.map((frame) => (
              <div
                key={frame.id}
                hidden={frame.id !== current?.id}
                onChangeCapture={(event) => {
                  const form = (event.target as HTMLElement).closest("form");
                  if (form) {
                    setDirtyForms((previous) => {
                      const next = new Map(previous);
                      const forms = new Set(next.get(frame.id));
                      forms.add(form);
                      next.set(frame.id, forms);
                      return next;
                    });
                  }
                }}
                onSubmitCapture={(event) => {
                  const form = (event.target as HTMLElement).closest("form");
                  if (!form) return;
                  const pending = { frame: frame.id, form };
                  submitted.current = pending;
                  queueMicrotask(() => {
                    if (submitted.current === pending) submitted.current = null;
                  });
                }}
              >
                <Suspense
                  fallback={
                    <ExportEmpty
                      pending
                      title={text("Đang mở thao tác…", "Opening action…")}
                    />
                  }
                >
                  {frame.action.kind === "create-order" ? (
                    <CreateOrder saved={created} />
                  ) : frame.action.kind === "order" ? (
                    <Order orderId={frame.action.orderId} />
                  ) : frame.action.kind === "containers" ? (
                    <OrderContainers orderId={frame.action.orderId} />
                  ) : frame.action.kind === "plan" ? (
                    <Plan {...frame.action} />
                  ) : frame.action.kind === "review" ? (
                    <Review planId={frame.action.planId} embedded />
                  ) : (
                    <Container
                      id={frame.action.containerId}
                      step={frame.action.kind}
                      embedded
                    />
                  )}
                </Suspense>
              </div>
            ))}
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={discard !== null}
        ariaLabel={text("Bỏ thay đổi chưa lưu?", "Discard unsaved changes?")}
        closeOnBackdrop={!busy}
        onClose={() => setDiscard(null)}
      >
        <div className="export-workspace w-[calc(100dvw-2rem)] max-w-md space-y-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6">
          <h2 className="font-display text-lg font-bold">
            {text("Bỏ thay đổi chưa lưu?", "Discard unsaved changes?")}
          </h2>
          <p
            id="export-discard-description"
            className="text-xs leading-relaxed text-ink-secondary"
          >
            {text(
              "Biểu mẫu có nội dung chưa lưu. Đóng thao tác sẽ bỏ những thay đổi này.",
              "This form has unsaved changes. Leaving will discard them.",
            )}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="export-button"
              aria-describedby="export-discard-description"
              disabled={busy}
              onClick={() => {
                if (discard) finish(discard);
              }}
            >
              {text("Bỏ thay đổi", "Discard changes")}
            </button>
            <button
              type="button"
              autoFocus
              className="export-button export-button-primary"
              aria-describedby="export-discard-description"
              onClick={() => setDiscard(null)}
            >
              {text("Tiếp tục chỉnh sửa", "Keep editing")}
            </button>
          </div>
        </div>
      </Modal>
    </ExportActionContext.Provider>
  );
}
