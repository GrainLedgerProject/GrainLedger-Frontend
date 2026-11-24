import { EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { authPaths } from "../paths";

export function AcceptInvitationPage() {
  const { t } = useTranslation();
  return <main className="app-workspace grid min-h-dvh place-items-center bg-parchment-grain p-4">
    <section className="gl-workflow w-full max-w-lg space-y-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 shadow-lg dark:bg-surface-raised" aria-labelledby="invitation-title">
      <EnvelopeSimple size={28} className="text-accent-primary" aria-hidden="true" />
      <h1 id="invitation-title" className="font-display text-2xl font-bold">{t("auth.registration.inviteTitle")}</h1>
      <p className="text-sm text-ink-secondary">{t("auth.registration.inviteUnavailable")}</p>
      <div className="flex flex-wrap gap-4"><Link to={authPaths.register}>{t("auth.registration.start")}</Link><Link to={authPaths.signIn}>{t("auth.backToSignIn")}</Link></div>
    </section>
  </main>;
}
