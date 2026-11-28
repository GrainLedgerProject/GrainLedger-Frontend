import { NotificationCenter } from "./NotificationCenter";
import { useAuthStore } from "@/app/store/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { toast } from "@/app/store/feedbackStore";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useUiStore } from "@/app/store/uiStore";
import { ConfirmPopover } from "@/shared/ui/ConfirmPopover";
import { NetworkStatusIndicator } from "@/app/layout/NetworkStatusIndicator";
import { RoleChip } from "@/shared/ui/RoleChip";
import { MinimalModeToggle } from "@/app/layout/MinimalModeToggle";
import { isCustomerSide } from "@/shared/types/roles";
import {
  CaretDownIcon,
  GlobeIcon,
  ListIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  QuestionIcon,
  SignOutIcon,
  SunIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

export interface AppHeaderProps {
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  breadcrumbs,
}) => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const { user, hasUnsavedDrafts } = useAuthStore();
  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    setSearchOpen,
    isNotificationsOpen,
    setNotificationsOpen,
    setMobileSidebarOpen,
  } = useUiStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNotificationsOpen && !isUserMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        isNotificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isNotificationsOpen, isUserMenuOpen, setNotificationsOpen]);

  // Determine Initials for Avatar
  const getInitials = (name?: string) => {
    if (!name) return "GL";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogoutConfirm = async () => {
    if (signingOut) return;
    setIsLogoutModalOpen(false);
    setSigningOut(true);
    try {
      await authApi.logout();
      navigate("/sign-in", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("Không thể đăng xuất.", "Could not sign out."));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="h-16 backdrop-blur-xl bg-surface-base/95 dark:bg-surface-base/95 border-b border-ink-tertiary/20 dark:border-surface-overlay px-5 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shadow-xs">
        {/* Left: Mobile Menu Toggle, Dynamic Title & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-all"
            aria-label={t("header.openMenu", "Mở menu điều hướng")}
          >
            <ListIcon size={20} weight="bold" />
          </button>
          <div className="flex flex-col justify-center">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                <Link
                  to="/home"
                  className="hover:text-ink-primary dark:hover:text-white transition-colors"
                >
                  {t("sidebar.home", "Tổng quan")}
                </Link>
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={idx}>
                    <span className="opacity-40">/</span>
                    {bc.path ? (
                      <Link
                        to={bc.path}
                        className="hover:text-ink-primary dark:hover:text-white transition-colors"
                      >
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="text-ink-primary font-medium">
                        {bc.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            ) : null}
          </div>
        </div>

        {/* Center: Global Search Trigger Button (Apple Pill style) */}
        <div className="hidden md:flex items-center justify-center max-w-sm w-full mx-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-ink-tertiary/20 text-xs text-ink-tertiary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200 shadow-xs focus:outline-none"
            aria-label={t(
              "header.searchTitle",
              "Tìm kiếm trong hệ thống (Cmd/Ctrl+K)",
            )}
          >
            <div className="flex items-center gap-2.5">
              <MagnifyingGlassIcon size={15} weight="bold" />
              <span>
                {t(
                  "common.searchPlaceholder",
                  "Tìm kiếm lô, container, nông hộ...",
                )}
              </span>
            </div>
            <kbd className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-white/10 border border-ink-tertiary/20 dark:border-white/[0.12] text-ink-secondary shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right side controls (Ergonomic Circular Buttons) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Network Indicator (for field users or test) */}
          <div className="hidden lg:block">
            <NetworkStatusIndicator />
          </div>

          {/* Search Trigger for Mobile */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-all"
            aria-label={t("header.searchTitle")}
          >
            <MagnifyingGlassIcon size={18} weight="bold" />
          </button>

          {/* Notification Bell with Badge */}
          <div className="relative" ref={notificationsRef}>
            <NotificationCenter key={`${user?.id}:${user?.organizationId}`} onOpen={() => setIsUserMenuOpen(false)} />
          </div>

          {/* Theme Toggle (Light / Dark) */}
          <MinimalModeToggle compact />
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-all"
            title={
              theme === "dark"
                ? t("header.switchToLight", "Chuyển sang chế độ sáng")
                : t("header.switchToDark", "Chuyển sang chế độ tối")
            }
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <SunIcon size={18} weight="bold" />
            ) : (
              <MoonIcon size={18} weight="bold" />
            )}
          </button>

          {/* Language Toggle (vi / en) */}
          <button
            type="button"
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="h-10 px-3 rounded-full flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-all text-xs font-semibold"
            title={t("header.switchLang", "Chuyển ngôn ngữ / Switch language")}
            aria-label="Toggle language"
          >
            <GlobeIcon size={16} weight="bold" />
            <span className="uppercase font-mono text-xs">{language}</span>
          </button>

          {/* Help link */}
          <Link
            to="/"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-secondary hover:text-ink-primary dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] active:scale-95 transition-all"
            title={t("header.helpTitle", "Giới thiệu & Hướng dẫn hệ thống")}
            aria-label={t("header.helpTitle")}
          >
            <QuestionIcon size={18} weight="bold" />
          </Link>

          {/* User Menu Dropdown (Apple Capsule Pill) */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setIsUserMenuOpen(!isUserMenuOpen);
              }}
              className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border border-ink-tertiary/20 active:scale-95 transition-all"
              aria-label={t("header.userMenu", "Menu hồ sơ người dùng")}
            >
              <div className="w-7 h-7 rounded-full bg-ink-primary text-ink-inverse flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(user?.displayName)}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-ink-primary max-w-[120px] truncate">
                {user?.displayName || t("header.notLoggedIn", "Người dùng")}
              </span>
              <CaretDownIcon
                size={12}
                weight="bold"
                className="text-ink-tertiary"
              />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  key="user-menu-dropdown"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] bg-surface-base dark:bg-surface-raised backdrop-blur-2xl border border-ink-tertiary/20 rounded-3xl shadow-xl p-4 z-50 text-xs space-y-3"
                >
                  {/* User Profile Header in Menu */}
                  <div className="space-y-1.5 pb-3 border-b border-ink-tertiary/20 dark:border-surface-overlay">
                    <p className="font-bold text-sm text-ink-primary truncate">
                      {user?.displayName ||
                        t("header.notLoggedIn", "Chưa đăng nhập")}
                    </p>
                    <p className="text-ink-tertiary truncate font-mono text-xs">
                      {user?.email ||
                        t("header.guestEmail", "guest@grainledger.local")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {user && user.hasAssignedRole !== false && user.role ? (
                        <>
                          <RoleChip role={user.role} size="sm" />
                          {isCustomerSide(user.role) && (
                            <span className="font-medium text-[10px] px-2 py-0.5 rounded-full bg-accent-info/10 text-accent-info">
                              {user.organizationName || "Rice"}
                            </span>
                          )}
                        </>
                      ) : user ? (
                        <span className="font-medium text-[10px] px-2 py-0.5 rounded-full bg-functional-hold-bg text-accent-warning">
                          {t("header.pendingAccess", "Chờ cấp quyền")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <MinimalModeToggle />
                    <Link
                      to="/settings/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-ink-primary font-medium transition-colors"
                    >
                      <UserIcon
                        size={16}
                        weight="bold"
                        className="text-ink-secondary"
                      />
                      <span>{t("nav.profile", "Thông tin cá nhân")}</span>
                    </Link>

                    <Link
                      to="/settings/security"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-ink-primary font-medium transition-colors"
                    >
                      <LockSimpleIcon
                        size={16}
                        weight="bold"
                        className="text-ink-secondary"
                      />
                      <span>{t("nav.security", "Bảo mật tài khoản")}</span>
                    </Link>
                  </div>

                  <div className="border-t border-ink-tertiary/20 dark:border-surface-overlay pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-accent-danger hover:bg-accent-danger/10 font-semibold transition-colors"
                    >
                      <SignOutIcon size={16} weight="bold" />
                      <span>{t("nav.signOut", "Đăng xuất")}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmPopover
        isOpen={isLogoutModalOpen}
        title={t("auth.signOutConfirmTitle", "Đăng xuất khỏi GrainLedger?")}
        description={t(
          "auth.signOutConfirmDesc",
          "Phiên làm việc hiện tại của bạn sẽ kết thúc an toàn. Mọi dữ liệu đã ghi nhận vào sổ cái luôn được bảo toàn.",
        )}
        warningNote={
          hasUnsavedDrafts
            ? t(
                "auth.signOutConfirmDraftWarning",
                "Bạn có thay đổi biểu mẫu chưa lưu. Đăng xuất sẽ xoá các nháp chưa commit.",
              )
            : undefined
        }
        confirmLabel={t("auth.confirmSignOut", "Đăng xuất")}
        cancelLabel={t("auth.cancel", "Huỷ")}
        variant="danger"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
};
