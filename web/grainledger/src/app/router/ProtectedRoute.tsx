import { useAuthStore } from "@/app/store/authStore";
import { RoleChip } from "@/shared/ui/RoleChip";
import type { UserRole } from "@/shared/types/roles";
import { ArrowLeft, ShieldWarning } from "@phosphor-icons/react";
import React, { type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
}) => {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // If not authenticated, or no user profile, or no accessToken, redirect to sign-in with returnUrl
  // In offline mode: ONLY allow access into protected routes (/home, etc.) if a valid accessToken value exists!
  if (!isAuthenticated || !user || !accessToken) {
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

  // If specific roles are required, verify access
  if ((allowedRoles && !allowedRoles.includes(user.role)) ||
      (requiredPermission && !user.permissions.includes(requiredPermission))) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-functional-hold-bg text-accent-danger flex items-center justify-center mx-auto">
          <ShieldWarning size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-ink-primary">
          Không có quyền truy cập màn hình này
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          Tài khoản của bạn hiện có vai trò{" "}
          <span className="inline-block align-middle mx-1">
            <RoleChip role={user.role} size="sm" />
          </span>
          . {allowedRoles && "Màn hình này chỉ dành cho: "}
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
            Về bàn làm việc của tôi
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
