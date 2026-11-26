import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Globe,
  LockKey,
  LockSimple,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "@phosphor-icons/react";
import {
  authEndpoints,
  type RegistrationPendingDto,
  type SessionUserDto,
} from "@/api/auth";
import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { authPaths } from "../paths";

export function RegisterPage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const { theme, toggleTheme, language, setLanguage } = useUiStore();
  const [registration, setRegistration] =
    useState<RegistrationPendingDto | null>(null);
  const [account, setAccount] = useState<SessionUserDto | null>(null);
  const [otp, setOtp] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = account ? "done" : registration ? "verify" : "start";

  useEffect(() => {
    if (step !== "start") heading.current?.focus();
  }, [step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const body = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setResent(false);
    try {
      if (registration) {
        setAccount(
          await authEndpoints.verifyEmail({
            email: registration.email,
            registrationId: registration.registrationId,
            otp,
          }),
        );
        setOtp("");
      } else {
        setRegistration(
          await authEndpoints.register({
            email: String(body.get("email") ?? "").trim(),
            displayName: String(body.get("name") ?? "").trim(),
            password: String(body.get("password") ?? ""),
          }),
        );
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!registration || pending) return;
    setPending(true);
    setError(null);
    setResent(false);
    try {
      setRegistration(
        await authEndpoints.resendVerification({
          email: registration.email,
          registrationId: registration.registrationId,
        }),
      );
      setOtp("");
      setResent(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  const googleReturnUrl = "/sign-in?google=complete&returnUrl=%2Fhome";

  return (
    <main className="min-h-screen bg-parchment-grain flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Top right quick controls (synchronized with SignInPage) */}
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

      {/* Main Two-Column Card */}
      <section
        aria-labelledby="register-title"
        className="w-full max-w-4xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12"
      >
        {/* Left Brand Panel */}
        <div className="md:col-span-5 bg-surface-raised dark:bg-surface-overlay p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-ink-tertiary/20 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <img src="/icons.svg" alt="GrainLedger" />
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              {t(
                "brand.subtagline",
                "Hệ thống sổ cái cân bằng khối lượng lúa gạo theo tiêu chuẩn ISO 22095:2020.",
              )}
            </p>

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
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-primary">
                GrainLedger
              </span>
              <StatusBadge
                status={
                  step === "done"
                    ? "COMPLIANT"
                    : step === "verify"
                      ? "IN_PROGRESS"
                      : "ACTIVE"
                }
                size="sm"
                label={
                  step === "done"
                    ? text("Hoàn tất", "Completed")
                    : step === "verify"
                      ? text("Bước 2 / 2", "Step 2 / 2")
                      : text("Bước 1 / 2", "Step 1 / 2")
                }
              />
            </div>
            <h1
              ref={heading}
              tabIndex={-1}
              id="register-title"
              className="text-2xl font-bold text-ink-primary focus:outline-none"
            >
              {t(`auth.registration.${step}`)}
            </h1>
            <p className="text-xs text-ink-secondary">
              {step === "start"
                ? text(
                    "Đăng ký tài khoản mới và xác minh email qua mã OTP 6 chữ số.",
                    "Create a new account and verify your email via a 6-digit OTP.",
                  )
                : step === "verify"
                  ? text(
                      "Nhập mã xác minh vừa được gửi tới địa chỉ email của bạn.",
                      "Enter the verification code sent to your email address.",
                    )
                  : text(
                      "Email đã được xác minh hợp lệ trên hệ thống GrainLedger.",
                      "Your email address has been verified on GrainLedger.",
                    )}
            </p>
          </div>

          {account ? (
            <div className="space-y-4">
              <div
                role="status"
                className="p-4 rounded-md bg-functional-balanced-bg border border-functional-balanced-border text-accent-primary text-xs flex items-start gap-2.5"
              >
                <CheckCircle
                  size={18}
                  weight="fill"
                  className="shrink-0 mt-0.5"
                />
                <p className="text-sm font-medium text-ink-primary leading-relaxed">
                  {t(
                    account.isActive && account.role
                      ? "auth.registration.ready"
                      : "auth.registration.awaitAccess",
                  )}
                </p>
              </div>
              <Link
                to={authPaths.signIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent-primary text-white font-semibold text-sm hover:bg-accent-primary-dim transition-colors shadow-xs"
              >
                <span>{t("auth.backToSignIn")}</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          ) : (
            <>
              {error != null && (
                <div className="mb-4 text-xs">
                  <Feedback error={error} />
                </div>
              )}

              {resent && (
                <div
                  role="status"
                  className="mb-4 p-3 rounded-md bg-functional-balanced-bg border border-functional-balanced-border text-accent-primary text-xs flex items-center gap-2 font-medium"
                >
                  <CheckCircle size={16} weight="fill" className="shrink-0" />
                  <span>{t("auth.registration.resent")}</span>
                </div>
              )}

              <form
                method="post"
                onSubmit={(e) => void submit(e)}
                aria-labelledby="register-title"
                className="space-y-4"
                key={step}
              >
                {registration ? (
                  <div className="space-y-4">
                    <p className="text-xs text-ink-secondary [overflow-wrap:anywhere] rounded-md border border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay p-3">
                      {t("auth.registration.sent", { email: registration.email })}
                    </p>
                    <div>
                      <label
                        htmlFor="verify-otp"
                        className="block text-xs font-semibold text-ink-secondary mb-1"
                      >
                        {t("auth.resetOtpLabel")}
                      </label>
                      <input
                        id="verify-otp"
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="000000"
                        className="w-full px-3 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/30 focus:border-accent-primary focus:outline-none transition-colors font-mono tracking-widest"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="register-name"
                        className="block text-xs font-semibold text-ink-secondary mb-1"
                      >
                        {t("auth.registration.name")}
                      </label>
                      <div className="relative">
                        <User
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-2.5 text-ink-tertiary"
                        />
                        <input
                          id="register-name"
                          name="name"
                          autoComplete="name"
                          required
                          maxLength={120}
                          placeholder={text("Nguyễn Văn A", "Full name")}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/30 focus:border-accent-primary focus:outline-none transition-colors font-body"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-email"
                        className="block text-xs font-semibold text-ink-secondary mb-1"
                      >
                        {t("auth.registration.email")}
                      </label>
                      <div className="relative">
                        <EnvelopeSimple
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-2.5 text-ink-tertiary"
                        />
                        <input
                          id="register-email"
                          name="email"
                          type="email"
                          autoComplete="username"
                          spellCheck={false}
                          required
                          placeholder={t(
                            "auth.emailPlaceholder",
                            "ten.ban@congty.com",
                          )}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/30 focus:border-accent-primary focus:outline-none transition-colors font-body"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="register-password"
                        className="block text-xs font-semibold text-ink-secondary mb-1"
                      >
                        {t("auth.registration.password")}
                      </label>
                      <div className="relative">
                        <LockKey
                          size={16}
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-2.5 text-ink-tertiary"
                        />
                        <input
                          id="register-password"
                          name="password"
                          type={visible ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={12}
                          maxLength={128}
                          aria-describedby="register-password-hint"
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-10 py-2 text-sm rounded-md bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/30 focus:border-accent-primary focus:outline-none transition-colors font-mono"
                        />
                        <button
                          type="button"
                          aria-pressed={visible}
                          aria-label={t("auth.registration.showPassword")}
                          onClick={() => setVisible(!visible)}
                          className="absolute right-3 top-2.5 text-ink-tertiary hover:text-ink-primary"
                        >
                          {visible ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p
                        id="register-password-hint"
                        className="mt-1 text-xs text-ink-secondary"
                      >
                        {t("auth.resetPasswordRequirements")}
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent-primary text-white font-semibold text-sm hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-60"
                  >
                    {pending ? (
                      <GrainLoader
                        size="sm"
                        label={text("Đang xử lý...", "Processing...")}
                      />
                    ) : (
                      <>
                        <span>
                          {t(
                            registration
                              ? "auth.registration.verify"
                              : "auth.registration.start",
                          )}
                        </span>
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </button>
                </div>

                {registration && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void resend()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-ink-tertiary/25 bg-surface-raised dark:bg-surface-overlay px-3 py-1.5 text-xs font-semibold text-ink-primary hover:border-accent-primary transition-colors disabled:opacity-50"
                    >
                      <ArrowsClockwise size={14} aria-hidden="true" />
                      <span>{t("auth.registration.resend")}</span>
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setRegistration(null);
                        setOtp("");
                        setError(null);
                        setResent(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-ink-tertiary/25 bg-surface-base dark:bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50"
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      <span>{t("auth.registration.changeEmail")}</span>
                    </button>
                  </div>
                )}
              </form>

              {!registration && (
                <GoogleAuthButton
                  href={authEndpoints.getGoogleAuthUrl(googleReturnUrl)}
                />
              )}
            </>
          )}

          <div className="mt-8 pt-4 border-t border-ink-tertiary/15 text-center text-xs text-ink-tertiary">
            <Link
              to={authPaths.signIn}
              className="text-accent-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>{t("auth.backToSignIn")}</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
