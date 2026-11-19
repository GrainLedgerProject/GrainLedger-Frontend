import { dashboardPaths } from "@/features/dashboard/paths";
import { getSidebarItems } from "@/app/navigation/sidebarItems";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { RoleChip } from "@/shared/ui/RoleChip";
import type { UserRole } from "@/shared/types/roles";
import { CaretDoubleLeft, X } from "@phosphor-icons/react";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

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

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen, setMobileSidebarOpen]);

  const navItems = getSidebarItems(role, user?.permissions ?? [], t, pendingOfflineCount);

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
        className={`fixed inset-y-0 left-0 lg:sticky lg:top-0 h-screen shrink-0 overflow-hidden backdrop-blur-2xl bg-surface-base/95 lg:bg-surface-base/80 dark:bg-surface-base dark:shadow-lg border-r border-ink-tertiary/20 dark:border-surface-overlay flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform] z-50 lg:z-40 shadow-[1px_0_3px_0_rgba(0,0,0,0.02)] ${
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
              to={dashboardPaths.home}
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
                <span
                  data-ui-detail="secondary"
                  className="text-[10px] text-ink-tertiary uppercase tracking-wider truncate font-mono"
                >
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
                (item.path !== dashboardPaths.home &&
                  location.pathname.startsWith(item.path + "/"));

              const showExpanded = !isSidebarCollapsed || isMobileSidebarOpen;

              const badgeColor =
                item.badgeTone === "danger"
                  ? "bg-accent-danger text-white"
                  : item.badgeTone === "warning"
                    ? "bg-accent-warning text-ink-primary dark:text-ink-inverse"
                    : "bg-accent-primary text-ink-inverse";

              const dotColor =
                item.badgeTone === "danger"
                  ? "bg-accent-danger"
                  : item.badgeTone === "warning"
                    ? "bg-accent-warning"
                    : "bg-accent-primary";

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`group relative flex h-10 w-full items-center overflow-hidden rounded-full border text-xs font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ${
                    isActive
                      ? "bg-accent-primary/10 text-accent-primary border-accent-primary/40 shadow-xs font-semibold dark:bg-accent-primary/15 dark:border-accent-primary/40 dark:shadow-sm"
                      : "border-transparent text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                  aria-label={!showExpanded ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  title={!showExpanded ? item.label : undefined}
                >
                  {/* Icon - cố định vị trí tuyệt đối */}
                  <span className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center shrink-0">
                    <Icon
                      size={19}
                      weight={isActive ? "fill" : "regular"}
                      className={`transition-[color,transform] duration-200 group-hover:scale-105 ${
                        isActive
                          ? "text-accent-primary"
                          : "text-ink-tertiary group-hover:text-ink-primary dark:group-hover:text-white"
                      }`}
                    />
                  </span>

                  {/* Label - fade và trượt nhẹ */}
                  <span
                    className={`absolute left-11 ${
                      item.badge !== undefined ? "right-[60px]" : "right-3"
                    } truncate whitespace-nowrap text-left transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      showExpanded
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0 pointer-events-none"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Badge khi mở rộng */}
                  {item.badge !== undefined && (
                    <>
                      <span
                        className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono shadow-2xs transition-[opacity,scale] duration-300 ease-out ${badgeColor} ${
                          showExpanded
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-75 pointer-events-none"
                        }`}
                      >
                        {item.badge}
                      </span>

                      {/* Dot badge khi thu gọn */}
                      <span
                        className={`absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-surface-base transition-[opacity,scale] duration-300 ease-out ${dotColor} ${
                          showExpanded
                            ? "opacity-0 scale-50"
                            : "opacity-100 scale-100"
                        }`}
                      />
                    </>
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
