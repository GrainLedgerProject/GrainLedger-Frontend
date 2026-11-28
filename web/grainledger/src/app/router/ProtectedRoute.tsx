import { useAuthStore } from "@/app/store/authStore";
import { isPendingUserAccess } from "@/features/auth/api/sessionUser";
import { RoleChip } from "@/shared/ui/RoleChip";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import type { UserRole } from "@/shared/types/roles";
import { ArrowLeft, ShieldWarning } from "@phosphor-icons/react";
import React, { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredAnyPermissions,
}) => {
  const { isAuthenticated, user, accessToken, cookieSession, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) return <GrainLoader size="md" />;
  if (!isAuthenticated || !user || (!accessToken && !cookieSession)) {
    if (location.pathname.startsWith("/sign-in")) {
      return null;
    }
    return (
      <Navigate
        to={`/sign-in?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  const requiresAuthorization = Boolean(
    (allowedRoles && allowedRoles.length > 0) ||
      requiredPermission ||
      (requiredAnyPermissions && requiredAnyPermissions.length > 0),
  );

  if (requiresAuthorization && isPendingUserAccess(user)) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-functional-hold-bg text-accent-warning flex items-center justify-center mx-auto">
          <ShieldWarning size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-ink-primary">
          {t("auth.pendingTitle", "Tài khoản đang chờ quản trị viên cấp quyền")}
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          {t(
            "auth.pendingDesc",
            "Tài khoản của bạn đã xác thực danh tính nhưng chưa được quản trị viên gán doanh nghiệp và vai trò sử dụng. Vui lòng liên hệ quản trị viên để kích hoạt quyền truy cập.",
          )}
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors"
          >
            <ArrowLeft size={14} />
            {t("auth.pendingButton", "Về trang chờ kích hoạt")}
          </button>
        </div>
      </div>
    );
  }

  // If specific roles or permissions are required, verify access
  if ((allowedRoles && !allowedRoles.includes(user.role)) ||
      (requiredPermission && !user.permissions.includes(requiredPermission)) ||
      (requiredAnyPermissions &&
        requiredAnyPermissions.length > 0 &&
        !requiredAnyPermissions.some((permission) =>
          user.permissions.includes(permission),
        ))) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-functional-hold-bg text-accent-danger flex items-center justify-center mx-auto">
          <ShieldWarning size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-ink-primary">
          {t("auth.forbiddenTitle", "Không có quyền truy cập màn hình này")}
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          {t("auth.forbiddenRolePrefix", "Tài khoản của bạn hiện có vai trò")}{" "}
          <span className="inline-block align-middle mx-1">
            <RoleChip role={user.role} size="sm" />
          </span>
          . {allowedRoles && `${t("auth.forbiddenRolesOnly", "Màn hình này chỉ dành cho:")} `}
          {allowedRoles?.map((r) => (
            <span key={r} className="inline-block align-middle mx-0.5">
              <RoleChip role={r} size="sm" />
            </span>
          ))}
          .
        </p>

        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors"
          >
            <ArrowLeft size={14} />
            {t("auth.forbiddenHomeButton", "Về bàn làm việc của tôi")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
