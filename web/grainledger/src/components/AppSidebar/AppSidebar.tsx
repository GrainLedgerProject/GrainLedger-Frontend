import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { RoleChip } from "@/components/RoleChip/RoleChip";
import type { UserRole } from "@/shared/types/roles";
import {
  ArrowsClockwise,
  BookOpen,
  Buildings,
  CaretDoubleLeft,
  ChartPieSlice,
  CheckSquare,
  ClockCounterClockwise,
  Crosshair,
  Drop,
  Export,
  Factory,
  FileText,
  Flask,
  HandCoins,
  House,
  ListBullets,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  Package,
  Scales,
  ShieldCheck,
  Tag,
  TestTube,
  Truck,
  Users,
  X,
} from "@phosphor-icons/react";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{
    size?: number;
    weight?: "bold" | "fill" | "regular";
    className?: string;
  }>;
  badge?: number | string;
  badgeTone?: "danger" | "warning" | "primary";
  isPrimary?: boolean;
}

export const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const {
    isSidebarCollapsed,
    toggleSidebar,
    pendingOfflineCount,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUiStore();
  const location = useLocation();

  const role: UserRole = user?.role || "MILL_OPERATOR";

  // Role-based Nav Structure defined precisely by SRS §3.1.3
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "MILL_ADMIN":
        return [
          {
            label: t("nav.home", "Tổng quan hệ thống"),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.admin.customers", "Khách hàng"),
            path: "/admin/customers",
            icon: Buildings,
          },
          {
            label: t("nav.admin.access", "Tài khoản & Quyền"),
            path: "/admin/access",
            icon: Users,
          },
          {
            label: t("nav.admin.facilities", "Cơ sở & Thiết bị"),
            path: "/admin/facilities",
            icon: Factory,
          },
          {
            label: t("nav.admin.balancePolicy", "Chính sách cân bằng"),
            path: "/admin/balance-policy",
            icon: Scales,
          },
          {
            label: t("nav.admin.receivingThresholds", "Ngưỡng tiếp nhận"),
            path: "/admin/receiving-thresholds",
            icon: Scales,
          },
          {
            label: t("nav.admin.masterData", "Danh mục vận hành"),
            path: "/admin/master-data",
            icon: ListBullets,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: "/compliance/mrl-versions",
            icon: BookOpen,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "MILL_OPERATOR":
        return [
          {
            label: t("nav.mill.today", "Hôm nay tại dây chuyền"),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.mill.receiving", "Tiếp nhận & Cân đến"),
            path: "/mill/receiving",
            icon: Truck,
          },
          {
            label: t("nav.mill.operations", "Ghi bước chế biến"),
            path: "/mill/operations/new",
            icon: Scales,
            isPrimary: true,
          },
          {
            label: t("nav.mill.corrections", "Yêu cầu sửa"),
            path: "/mill/corrections/new",
            icon: ClockCounterClockwise,
          },
          {
            label: t("nav.mill.commitCorrection", "Ghi bút toán bù"),
            path: "/mill/corrections/pending",
            icon: CheckSquare,
            badge: 2,
            badgeTone: "warning",
          },
          {
            label: t("nav.mill.planExecutions", "Thực thi plan"),
            path: "/mill/plan-executions/PLAN-001",
            icon: ArrowsClockwise,
            badge: 1,
            badgeTone: "primary",
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "MILL_MANAGER":
        return [
          {
            label: t("nav.manager.home", "Bàn điều hành Quản lý"),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.manager.receiving", "Tiếp nhận & Đối soát cân"),
            path: "/mill/receiving",
            icon: Truck,
          },
          {
            label: t("nav.mill.reconciliations", "Đối soát & Xác nhận"),
            path: "/mill/reconciliations",
            icon: CheckSquare,
            badge: 1,
            badgeTone: "warning",
          },
          {
            label: t("nav.mill.commitCorrection", "Ghi bút toán bù"),
            path: "/mill/corrections/pending",
            icon: ClockCounterClockwise,
          },
          {
            label: t("nav.risk.holdAlerts", "Cảnh báo HOLD"),
            path: "/risk/holds",
            icon: LockSimple,
            badge: 1,
            badgeTone: "danger",
          },
          {
            label: t("nav.admin.balancePolicy", "Chính sách cân bằng"),
            path: "/admin/balance-policy",
            icon: Scales,
          },
          {
            label: t("nav.mill.operations", "Ghi bước chế biến"),
            path: "/mill/operations/new",
            icon: Scales,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_PROCUREMENT_OFFICER":
        return [
          {
            label: t("nav.field.home", "Bàn làm việc thu mua"),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.field.sync", "Đồng bộ / Hàng đợi"),
            path: "/field/sync",
            icon: ArrowsClockwise,
            badge: pendingOfflineCount > 0 ? pendingOfflineCount : undefined,
            badgeTone: pendingOfflineCount > 0 ? "warning" : undefined,
          },
          {
            label: t("nav.field.farmers", "Nông hộ"),
            path: "/field/farmers/new",
            icon: Users,
          },
          {
            label: t("nav.field.plots", "Thửa ruộng"),
            path: "/field/plots/new",
            icon: MapPin,
          },
          {
            label: t("nav.field.declarations", "Khai báo thuốc BVTV"),
            path: "/field/declarations/new",
            icon: Drop,
          },
          {
            label: t("nav.field.receipts", "Thu mua lúa"),
            path: "/field/receipts/new",
            icon: HandCoins,
          },
          {
            label: t("nav.field.samples", "Lấy mẫu niêm phong"),
            path: "/field/samples/new",
            icon: TestTube,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_MANAGER":
        return [
          {
            label: t(
              "nav.customerManager.home",
              "Điều phối Chất lượng & Rủi ro",
            ),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.risk.traceback", "Truy vết hai chiều"),
            path: "/risk/traceback",
            icon: Crosshair,
            isPrimary: true,
          },
          {
            label: t("nav.risk.holds", "Lệnh giữ HOLD"),
            path: "/risk/holds",
            icon: LockSimple,
            badge: 1,
            badgeTone: "danger",
          },
          {
            label: t("nav.compliance.labSamples", "Mẫu xét nghiệm"),
            path: "/compliance/lab-samples",
            icon: Flask,
          },
          {
            label: t("nav.compliance.labResults", "Kết quả xét nghiệm"),
            path: "/compliance/lab-results",
            icon: TestTube,
          },
          {
            label: t("nav.compliance.safetyMargin", "Biên an toàn MRL"),
            path: "/compliance/safety-margin",
            icon: ShieldCheck,
          },
          {
            label: t("nav.export.plansPending", "Duyệt phương án"),
            path: "/export/plans/pending",
            icon: CheckSquare,
            badge: 1,
            badgeTone: "warning",
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: "/compliance/mrl-versions",
            icon: BookOpen,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_EXPORT_OFFICER":
        return [
          {
            label: t(
              "nav.exportOfficer.home",
              "Điều phối Đơn hàng & Xuất khẩu",
            ),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.export.orders", "Đơn xuất khẩu"),
            path: "/export/orders",
            icon: Export,
            isPrimary: true,
          },
          {
            label: t("nav.export.plans", "Yêu cầu phương án"),
            path: "/export/plans",
            icon: ChartPieSlice,
          },
          {
            label: t("nav.export.containers", "Xếp container"),
            path: "/export/containers",
            icon: Truck,
          },
          {
            label: t("nav.export.dossiers", "Hồ sơ & Chứng từ"),
            path: "/export/dossiers",
            icon: FileText,
          },
          {
            label: t("nav.risk.holdAlerts", "Cảnh báo HOLD"),
            path: "/risk/holds",
            icon: LockSimple,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: "/compliance/mrl-versions",
            icon: BookOpen,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];

      case "AUTHORIZED_STOCK_VIEWER":
        return [
          {
            label: t("nav.stockViewer.home", "Tổng quan tồn kho"),
            path: "/home",
            icon: House,
          },
          {
            label: t("nav.stock.overview", "Tồn kho theo vị trí"),
            path: "/stock",
            icon: Package,
            isPrimary: true,
          },
          {
            label: t("nav.stock.lots", "Chi tiết lô lúa/gạo"),
            path: "/stock/lots/LOT-2026-S1",
            icon: Tag,
          },
        ];

      default:
        return [
          { label: t("nav.home", "Tổng quan"), path: "/home", icon: House },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: "/events",
            icon: MagnifyingGlass,
          },
        ];
    }
  };

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen, setMobileSidebarOpen]);

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 lg:sticky lg:top-0 h-screen shrink-0 overflow-hidden backdrop-blur-2xl bg-surface-base/95 lg:bg-surface-base/80 dark:bg-surface-base dark:shadow-lg border-r border-ink-tertiary/20 dark:border-surface-overlay flex flex-col justify-between transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform] z-50 lg:z-40 shadow-[1px_0_3px_0_rgba(0,0,0,0.02)] ${
          isMobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${isSidebarCollapsed ? "lg:w-[68px] w-[260px]" : "w-[260px]"}`}
        aria-label="Sidebar Navigation"
      >
        {/* Top Branding Section */}
        <div className="min-w-0">
          <div className="h-16 px-[18px] flex items-center justify-between border-b border-ink-tertiary/20 dark:border-surface-overlay">
            <Link
              to="/home"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center gap-3 overflow-hidden group min-w-0"
              title="GrainLedger — Về trang chủ"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <img src="/favicon.svg" alt="GrainLedger" className="w-8 h-8" />
              </div>
              <div
                className={`flex flex-col min-w-0 whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isSidebarCollapsed && !isMobileSidebarOpen
                    ? "lg:opacity-0 lg:max-w-0 lg:pointer-events-none"
                    : "opacity-100 max-w-[160px]"
                }`}
              >
                <span className="font-sans font-extrabold text-base text-ink-primary tracking-tight leading-tight">
                  GrainLedger
                </span>
                <span data-ui-detail="secondary" className="text-[10px] text-ink-tertiary uppercase tracking-wider truncate font-mono">
                  ISO 22095 Custody
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-ink-tertiary hover:text-ink-primary hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              aria-label="Đóng menu"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/home" &&
                  (location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/")));
              const showExpanded = !isSidebarCollapsed || isMobileSidebarOpen;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`group relative flex h-10 items-center rounded-full border text-xs font-medium transition-colors duration-150 ${
                    showExpanded ? "justify-start gap-3 px-3" : "justify-center"
                  } ${
                    isActive
                      ? "bg-accent-primary/10 text-accent-primary border-accent-primary/40 shadow-xs font-semibold dark:bg-accent-primary/15 dark:border-accent-primary/40 dark:shadow-sm"
                      : "border-transparent text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                  aria-label={showExpanded ? undefined : item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    size={19}
                    weight={isActive ? "fill" : "regular"}
                    className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                      isActive
                        ? "text-accent-primary"
                        : "text-ink-tertiary group-hover:text-ink-primary dark:group-hover:text-white"
                    }`}
                  />

                  <span
                    className={`truncate whitespace-nowrap overflow-hidden text-left transition-[opacity,max-width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      showExpanded
                        ? "flex-1 min-w-0 opacity-100 max-w-[170px]"
                        : "opacity-0 max-w-0 pointer-events-none"
                    }`}
                  >
                    {
                      <span
                        className={
                          showExpanded
                            ? "min-w-0 max-w-[170px] flex-1 truncate text-left"
                            : "hidden"
                        }
                      >
                        {item.label}
                      </span>
                    }
                  </span>

                  {/* Badge indicator (expanded) */}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold rounded-full font-mono shrink-0 shadow-2xs transition-[opacity,transform] duration-200 ${
                        showExpanded
                          ? "px-2 py-0.5 opacity-100 scale-100"
                          : "w-0 px-0 py-0 opacity-0 scale-75 overflow-hidden"
                      } ${
                        item.badgeTone === "danger"
                          ? "bg-accent-danger text-white"
                          : item.badgeTone === "warning"
                            ? "bg-accent-warning text-ink-primary dark:text-ink-inverse"
                            : "bg-accent-primary text-ink-inverse"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Dot badge on collapsed state */}
                  {!showExpanded && item.badge !== undefined && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-surface-base ${
                        item.badgeTone === "danger"
                          ? "bg-accent-danger"
                          : item.badgeTone === "warning"
                            ? "bg-accent-warning"
                            : "bg-accent-primary"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Role Chip & Collapse Toggle */}
        <div className="p-3 border-t border-ink-tertiary/20 dark:border-surface-overlay">
          <div
            className={`overflow-hidden transition-[opacity,max-height,margin] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSidebarCollapsed && !isMobileSidebarOpen
                ? "lg:max-h-0 lg:opacity-0 lg:mb-0 lg:pointer-events-none"
                : "max-h-12 opacity-100 mb-2"
            }`}
          >
            <div className="px-1 py-1">
              <RoleChip
                role={role}
                size="sm"
                showCode
                className="w-full justify-center whitespace-nowrap"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full h-10 px-3 flex items-center rounded-2xl text-ink-tertiary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-colors duration-150 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary ${
              isSidebarCollapsed && !isMobileSidebarOpen ? "gap-0" : "gap-2.5"
            }`}
            aria-label={
              isSidebarCollapsed
                ? t("common.expand", "Mở rộng thanh điều hướng")
                : t("common.collapse", "Thu gọn thanh điều hướng")
            }
            title={
              isSidebarCollapsed
                ? t("common.expand", "Mở rộng thanh điều hướng")
                : t("common.collapse", "Thu gọn thanh điều hướng")
            }
          >
            <CaretDoubleLeft
              size={18}
              weight="bold"
              className={`shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isSidebarCollapsed ? "rotate-180" : "rotate-0"
              }`}
            />
            <span
              className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isSidebarCollapsed && !isMobileSidebarOpen
                  ? "lg:opacity-0 lg:max-w-0"
                  : "opacity-100 max-w-[140px]"
              }`}
            >
              {t("common.collapse", "Thu gọn")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
