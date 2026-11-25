import { useState } from "react";
import { ExportActionProvider } from "../components/ExportActionProvider";
import { useExportAction } from "../model/exportActions";
import { Export, Plus } from "@phosphor-icons/react";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useExportWorkspaceData } from "../hooks/useExportWorkspaceData";
import type { ExportView } from "../model/exportPresentation";
import { ExportOrderSelector } from "../components/ExportOrderSelector";
import { ExportOrdersWorkspace } from "../components/ExportOrdersWorkspace";
import { ExportContainerList } from "../components/ExportContainerList";
import { ExportDossiersWorkspace } from "../components/ExportDossiersWorkspace";
import { ExportPlansWorkspace } from "../components/ExportPlansWorkspace";
import { AllocateContainerModal } from "../components/AllocateContainerModal";
import {
  ExportEmpty,
  ExportPageHeader,
  ExportWorkspaceNav,
} from "../components/ExportWorkspaceUI";

export function ExportWorkspacePage({
  view = "orders",
}: {
  view?: ExportView;
}) {
  return (
    <ExportActionProvider>
      <ExportWorkspaceContent view={view} />
    </ExportActionProvider>
  );
}

function ExportWorkspaceContent({ view }: { view: ExportView }) {
  const open = useExportAction()!;
  const text = useWorkflowText();
  const data = useExportWorkspaceData(view);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.permissions.includes("export-orders.write") ?? false;
  const canPropose = user?.permissions.includes("blend.propose") ?? false;
  const [allocating, setAllocating] = useState(false);
  const copy = {
    orders: {
      title: text("Đơn hàng & Điều phối", "Orders & dispatch"),
      eyebrow: text("QUẢN LÝ HỢP ĐỒNG & PHÂN BỔ", "CONTRACTS & ALLOCATION"),
      description: text(
        "Quản lý lịch giao hàng, quy cách chất lượng và phân bổ khối lượng vào từng container.",
        "Manage shipping windows, quality specifications and container mass allocations.",
      ),
    },
    plans: {
      title: text("Phương án phối trộn", "Blend plans"),
      eyebrow: text(
        "LẬP PHƯƠNG ÁN & THEO DÕI ĐỀ XUẤT",
        "BLEND PLANNING & PROPOSALS",
      ),
      description: text(
        "Lập phiên bản theo nhu cầu container, tính đánh giá và theo dõi đề xuất đã gửi quản lý.",
        "Plan container demand, calculate assessments and track proposals submitted for review.",
      ),
    },
    containers: {
      title: text("Container xuất khẩu", "Export containers"),
      eyebrow: text("THEO DÕI THỰC XẾP & NIÊM PHONG", "LOADING & CLOSURE"),
      description: text(
        "Theo dõi container theo đơn hàng và mở đúng bước để ghi nhận thực xếp hoặc đóng niêm.",
        "Track order containers and open the appropriate step for actual loading or closure.",
      ),
    },
    dossiers: {
      title: text("Kho hồ sơ xuất khẩu", "Export dossier archive"),
      eyebrow: text(
        "HỒ SƠ ĐÓNG NIÊM & CHỨNG TỪ",
        "CLOSURE DOSSIERS & DOCUMENTS",
      ),
      description: text(
        "Tra cứu hồ sơ đã phát hành, tải snapshot và quản lý chứng từ của container đã niêm phong.",
        "Inspect issued dossiers, download snapshots and manage documents for closed containers.",
      ),
    },
  }[view];
  const refreshing =
    data.orders.isFetching ||
    data.containers.isFetching ||
    data.detail.isFetching;
  const scope = (
    <ExportOrderSelector
      orders={data.orders.data ?? []}
      value={data.orderId}
      onChange={data.selectOrder}
    />
  );
  return (
    <div className="text-ink-primary [container:workspace/inline-size] space-y-6">
      <ExportPageHeader
        title={copy.title}
        subtitle={copy.description}
        eyebrow={copy.eyebrow}
        refresh={() => void data.refresh()}
        refreshing={refreshing}
        actions={
          view === "orders" && canWrite ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
              onClick={() => open({ kind: "create-order" })}
            >
              <Plus size={16} aria-hidden="true" />
              {text("Thêm đơn hàng", "Add order")}
            </button>
          ) : view === "containers" && canWrite && data.orderId ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-12 border-accent-primary bg-accent-primary px-4 text-ink-inverse hover:bg-accent-primary-dim"
              onClick={() => setAllocating(true)}
            >
              <Plus size={16} aria-hidden="true" />
              {text("Phân bổ thêm container", "Allocate more containers")}
            </button>
          ) : undefined
        }
      />
      <ExportWorkspaceNav
        view={view}
        params={
          new URLSearchParams(data.orderId ? { order: data.orderId } : {})
        }
      />
      <Feedback error={data.orders.error} />
      {data.orders.isPending ? (
        <ExportEmpty
          pending
          title={text("Đang tải đơn hàng…", "Loading orders…")}
        />
      ) : data.orders.data?.length === 0 ? (
        <ExportEmpty
          title={text("Chưa có đơn hàng.", "No orders available.")}
          description={text(
            "Tạo đơn hàng và mục tiêu container để bắt đầu quy trình xuất khẩu.",
            "Create an order and container targets to start the export workflow.",
          )}
          icon={<Export size={24} />}
        />
      ) : (
        data.orders.data && (
          <>
            {view === "orders" ? (
              <ExportOrdersWorkspace data={data} canWrite={canWrite} />
            ) : (
              <>
                {!data.containers.data && (
                  <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base max-w-xl p-5">{scope}</div>
                )}
                <Feedback
                  pending={data.containers.isPending}
                  error={data.containers.error}
                />
                {data.containers.data &&
                  (view === "plans" ? (
                    <ExportPlansWorkspace
                      orderId={data.orderId}
                      containers={data.containers.data}
                      params={data.params}
                      setParams={data.setParams}
                      canPropose={canPropose}
                      scope={scope}
                    />
                  ) : view === "dossiers" ? (
                    <ExportDossiersWorkspace
                      key={data.orderId}
                      containers={data.containers.data}
                      orderId={data.orderId}
                      params={data.params}
                      setParams={data.setParams}
                      scope={scope}
                    />
                  ) : (
                    <ExportContainerList
                      key={data.orderId + view}
                      containers={data.containers.data}
                      orderId={data.orderId}
                      scope={scope}
                      onAllocate={
                        canWrite && data.orderId
                          ? () => setAllocating(true)
                          : undefined
                      }
                    />
                  ))}
              </>
            )}
          </>
        )
      )}
      {canWrite && data.orderId && (
        <AllocateContainerModal
          orderId={data.orderId}
          isOpen={allocating}
          onClose={() => setAllocating(false)}
        />
      )}
    </div>
  );
}
