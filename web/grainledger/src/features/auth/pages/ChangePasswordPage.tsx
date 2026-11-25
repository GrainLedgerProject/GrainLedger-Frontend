import { SettingsLayout } from "@/app/layout/SettingsLayout";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { authPaths } from "../paths";

export function ChangePasswordPage() {
  const { t } = useTranslation();
  return (
    <SettingsLayout>
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink-primary">
          {t("settings.securityTitle", "Bảo mật tài khoản")}
        </h2>
        <p className="text-sm text-ink-secondary">
          {t("settings.passwordResetByEmail", "Xác minh qua email để đặt mật khẩu mới cho tài khoản.")}
        </p>
        <Link to={authPaths.forgotPassword} className="inline-flex rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-primary-dim">
          {t("auth.resetPasswordButton", "Đặt lại mật khẩu")}
        </Link>
      </section>
    </SettingsLayout>
  );
}
