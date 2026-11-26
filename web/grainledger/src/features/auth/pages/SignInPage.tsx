/**
 * @screen SC-01
 * @feature F01 (Auth)
 * @roles ALL
 * @description Sign in with credentials. Redirects to role-based home or returnUrl on success.
 */
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { authApi } from "@/features/auth/api/authApi";
import { isPendingUserAccess } from "@/features/auth/api/sessionUser";
import { authEndpoints } from "@/api/auth";
import {
  signInSchema,
  type SignInFormValues,
} from "@/features/auth/model/authSchemas";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { ROLE_DEFINITIONS } from "@/shared/types/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeSlash,
  Globe,
  LockSimple,
  Moon,
  ShieldCheck,
  Sun,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authPaths } from "../paths";
import { GoogleAuthButton } from "../components/GoogleAuthButton";

export const SignInPage: React.FC = () => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const { isAuthenticated, isLoading: restoringSession, user, loginSuccess } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = useUiStore();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const target = searchParams.get("returnUrl") || "";
  const returnUrl = target.startsWith("/") && !target.startsWith("//") && !target.includes("\\") &&
    !target.startsWith("/sign-in") && [...target].every(char => char >= " " && char.charCodeAt(0) !== 127)
    ? target : "";
  const googleFailed = searchParams.has("authError") || searchParams.get("google") === "complete";
  const googleReturnUrl = `/sign-in?google=complete&returnUrl=${encodeURIComponent(returnUrl)}`;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  // Auto-redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !restoringSession) {
      navigate(
        returnUrl ||
          (!isPendingUserAccess(user) && user?.organizationId
            ? ROLE_DEFINITIONS[user.role].defaultPath
            : "/home"),
        { replace: true },
      );
    }
  }, [isAuthenticated, restoringSession, returnUrl, navigate, user]);

  if (isAuthenticated || restoringSession) {
    return (
      <div className="min-h-screen bg-parchment-grain flex flex-col justify-center items-center">
        <GrainLoader
          size="md"
          label={t(
            "auth.redirectingToDashboard",
            "Đang chuyển hướng vào bảng điều khiển...",
          )}
        />
      </div>
    );
  }

  const onSubmit = async (values: SignInFormValues) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const { user, tokens } = await authApi.login(
        values.email,
        values.password,
      );
      loginSuccess(user, tokens, values.rememberMe);
      if ("PasswordCredential" in window && navigator.credentials) {
        try {
          const cred = new (
            window as unknown as {
              PasswordCredential: new (data: unknown) => unknown;
            }
          ).PasswordCredential({
            id: values.email,
            password: values.password,
          });
          await navigator.credentials.store(cred as Credential);
        } catch {
          // Browser PasswordCredential API not available or declined
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError(
          "Đăng nhập thất bại. Kiểm tra lại thông tin đăng nhập hoặc liên hệ Quản trị nhà máy.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment-grain flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Top right quick controls */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <img src="/favicon.svg" alt="GrainLedger" className="w-8 h-8" />
          <span>{t("auth.landingLink", "Trang giới thiệu GrainLedger")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-raised transition-colors"
            title={
              theme === "dark"
                ? t("header.switchToLight", "Chuyển sang chế độ sáng")
                : t("header.switchToDark", "Chuyển sang chế độ tối")
            }
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary"
            title={t("header.switchLang", "Chuyển ngôn ngữ / Switch language")}
          >
            <Globe size={14} />
            <span className="font-mono uppercase">{language}</span>
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-4xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Brand Panel */}
        <div className="md:col-span-5 bg-surface-raised dark:bg-surface-overlay p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-ink-tertiary/20 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <img src="/icons.svg" alt="GrainLedger" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-ink-secondary leading-relaxed">
                {t(
                  "brand.subtagline",
                  "Hệ thống sổ cái cân bằng khối lượng lúa gạo theo tiêu chuẩn ISO 22095:2020.",
                )}
              </p>
            </div>

            <div className="p-3 rounded-md bg-surface-base dark:bg-surface-base/60 border border-ink-tertiary/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-accent-primary">
                <ShieldCheck size={16} />
                <span>
                  {t("auth.securityRuleTitle", "Quy tắc bảo mật hệ thống")}
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                {t(
                  "auth.securityRuleDesc",
                  "Quản trị nhà máy cấp vai trò và phạm vi truy cập. Tài khoản mới xác minh email trước khi được cấp quyền.",
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-start gap-2 text-xs text-ink-secondary">
              <ShieldCheck
                size={16}
                className="text-accent-primary shrink-0 mt-0.5"
              />
              <div>
                <span className="font-semibold text-ink-primary block">
                  {t("auth.chainCustodyTitle", "Bảo toàn chuỗi lưu giữ")}
                </span>
                <span className="text-xs leading-snug">
                  {t(
                    "auth.chainCustodyDesc",
                    "Hạch toán bảo toàn khối lượng chính xác đến từng kg, bất biến và có thể kiểm toán.",
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-ink-secondary">
              <LockSimple
                size={16}
                className="text-accent-primary shrink-0 mt-0.5"
              />
              <div>
                <span className="font-semibold text-ink-primary block">
                  {t(
                    "auth.multiTenantTitle",
                    "Cô lập đa khách hàng (Multi-Tenant)",
                  )}
                </span>
                <span className="text-xs leading-snug">
                  {t(
                    "auth.multiTenantDesc",
                    "Mỗi doanh nghiệp sở hữu và quản lý độc lập toàn bộ dữ liệu lô hàng và tồn kho.",
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-ink-tertiary pt-4 border-t border-ink-tertiary/15 font-mono">
            {t("auth.isoVersionTag", "Phiên bản 2026 • ISO 22095:2020")}
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="space-y-2 mb-6">
            <h3 className="text-2xl font-bold text-ink-primary">
              {t("auth.signInTitle", "Đăng nhập vào hệ thống")}
            </h3>
            <p className="text-xs text-ink-secondary">
              {t(
                "auth.signInSubtitle",
                "Nhập thông tin xác thực để bắt đầu phiên làm việc được bảo vệ.",
              )}
            </p>
          </div>

          {/* Form Level Error Message */}
          {(authError || googleFailed) && (
            <div
              className="mb-5 p-3 rounded-md bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex justify-start items-center gap-2.5 animate-ledger-shake"
              role="alert"
            >
              <WarningCircle size={18} weight="fill" className="shrink-0" />
              <div>
                <span className="leading-none text-center">{authError || text("Không thể xác thực phiên Google. Vui lòng thử lại.", "Could not verify your Google session. Please try again.")}</span>
              </div>
            </div>
          )}

          <form
            method="post"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-ink-secondary mb-1"
              >
                {t("auth.emailLabel", "Địa chỉ email tài khoản")}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  {...register("email")}
                  placeholder={t("auth.emailPlaceholder", "ten.ban@congty.com")}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border ${
                    errors.email
                      ? "border-accent-danger"
                      : "border-ink-tertiary/30"
                  } focus:border-accent-primary focus:outline-none transition-colors font-body`}
                />
                <User
                  size={16}
                  className="absolute left-3 top-2.5 text-ink-tertiary pointer-events-none"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-accent-danger mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-ink-secondary"
                >
                  {t("auth.passwordLabel", "Mật khẩu")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent-primary hover:underline font-medium"
                  tabIndex={-1}
                >
                  {t("auth.forgotPassword", "Quên mật khẩu?")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-10 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border ${
                    errors.password
                      ? "border-accent-danger"
                      : "border-ink-tertiary/30"
                  } focus:border-accent-primary focus:outline-none transition-colors font-mono`}
                />
                <LockSimple
                  size={16}
                  className="absolute left-3 top-2.5 text-ink-tertiary pointer-events-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-ink-tertiary hover:text-ink-primary"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-accent-danger mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                {...register("rememberMe")}
                className="w-4 h-4 rounded border-ink-tertiary/40 text-accent-primary focus:ring-accent-primary"
              />
              <label
                htmlFor="rememberMe"
                className="text-xs text-ink-secondary select-none"
              >
                {t("auth.rememberMe", "Ghi nhớ đăng nhập (30 ngày)")}
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent-primary text-white font-semibold text-sm hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-60"
              >
                {isLoading ? (
                  <GrainLoader size="sm" label="Đang xác thực..." />
                ) : (
                  <>
                    <span>{t("auth.signInButton", "Đăng nhập")}</span>
                    <ArrowRight size={16} weight="bold" />
                  </>
                )}
              </button>
            </div>
          </form>
          <GoogleAuthButton
            href={authEndpoints.getGoogleAuthUrl(googleReturnUrl)}
          />

          <div className="mt-8 pt-4 border-t border-ink-tertiary/15 text-center text-xs text-ink-tertiary">
            <Link
              to={authPaths.register}
              className="text-accent-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              {t("auth.registration.start")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
