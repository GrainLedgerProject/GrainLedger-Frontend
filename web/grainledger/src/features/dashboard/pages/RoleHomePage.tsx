import { useAuthStore } from "@/app/store/authStore";
import { ROLE_DEFINITIONS, type UserRole } from "@/shared/types/roles";
import { ArrowRight, ClipboardText } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const shortcuts: Record<UserRole, Array<{ label: string; path: string }>> = {
  MILL_ADMIN: [
    { label: "Doanh nghiệp", path: "/admin/customers" },
    { label: "Quyền truy cập", path: "/admin/access" },
    { label: "Ngưỡng tiếp nhận", path: "/admin/receiving-thresholds" },
  ],
  MILL_MANAGER: [
    { label: "Tiếp nhận & Đối soát", path: "/mill/receiving" },
    { label: "Tồn kho định danh", path: "/stock" },
    { label: "Đối soát & Bút toán bù", path: "/mill/reconciliations" },
    { label: "Xử lý lệnh HOLD", path: "/risk/holds" },
    { label: "Chính sách cân bằng", path: "/admin/balance-policy" },
  ],
  MILL_OPERATOR: [
    { label: "Ghi công đoạn", path: "/mill/operations/new" },
    { label: "Yêu cầu sửa đổi", path: "/mill/corrections/new" },
    { label: "Tồn kho", path: "/stock" },
  ],
  CUSTOMER_PROCUREMENT_OFFICER: [
    { label: "Phiếu thu mua", path: "/field/receipts/new" },
    { label: "Hàng đợi ngoại tuyến", path: "/field/sync" },
    { label: "Mẫu niêm phong", path: "/field/samples/new" },
  ],
  CUSTOMER_MANAGER: [
    { label: "Mẫu niêm phong", path: "/compliance/lab-samples" },
    { label: "Báo cáo kiểm nghiệm", path: "/compliance/lab-results" },
    { label: "Truy vết", path: "/risk/traceback" },
  ],
  CUSTOMER_EXPORT_OFFICER: [
    { label: "Đơn xuất khẩu", path: "/export/orders" },
    { label: "Tồn kho", path: "/stock" },
    { label: "Sự kiện", path: "/events" },
  ],
  AUTHORIZED_STOCK_VIEWER: [
    { label: "Tồn kho", path: "/stock" },
    { label: "Sự kiện", path: "/events" },
  ],
};

export const RoleHomePage = () => {
  const { i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const role = user?.role || "AUTHORIZED_STOCK_VIEWER";
  const meta = ROLE_DEFINITIONS[role];

  return <main className="space-y-8">
    <header className="rounded-3xl border border-ink-tertiary/15 bg-surface-base p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">GrainLedger</p>
      <h1 className="mt-2 text-2xl font-display font-bold text-ink-primary">
        {user?.displayName || "Bàn làm việc"}
      </h1>
      <p className="mt-2 text-sm text-ink-secondary">{i18n.language.startsWith("en") ? meta.labelEn : meta.labelVi}
        {user?.organizationName ? ` · ${user.organizationName}` : ""}
      </p>
    </header>
    <section aria-labelledby="home-shortcuts">
      <h2 id="home-shortcuts" className="mb-4 flex items-center gap-2 text-lg font-display font-bold text-ink-primary">
        <ClipboardText size={22} /> Tác vụ
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts[role].map((item) => <Link key={item.path} to={item.path}
          className="group flex items-center justify-between gap-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5 text-ink-primary transition-colors hover:border-accent-primary/50 hover:bg-surface-raised">
          <span className="font-semibold">{item.label}</span>
          <ArrowRight size={18} className="text-accent-primary transition-transform group-hover:translate-x-1" />
        </Link>)}
      </div>
    </section>
  </main>;
};
