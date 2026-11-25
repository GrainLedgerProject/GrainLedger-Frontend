import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EnvelopeSimple, LockKey, User } from "@phosphor-icons/react";
import { authEndpoints, type RegistrationPendingDto, type SessionUserDto } from "@/api/auth";
import { Feedback } from "@/shared/ui/Workflow";
import { authPaths } from "../paths";

export function RegisterPage() {
  const { t } = useTranslation();
  const [registration, setRegistration] = useState<RegistrationPendingDto | null>(null);
  const [account, setAccount] = useState<SessionUserDto | null>(null);
  const [otp, setOtp] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = account ? "done" : registration ? "verify" : "start";
  useEffect(() => { if (step !== "start") heading.current?.focus(); }, [step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const body = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setResent(false);
    try {
      if (registration) {
        setAccount(await authEndpoints.verifyEmail({ email: registration.email, registrationId: registration.registrationId, otp }));
        setOtp("");
      } else {
        setRegistration(await authEndpoints.register({ email: String(body.get("email") ?? "").trim(), displayName: String(body.get("name") ?? "").trim(), password: String(body.get("password") ?? "") }));
      }
    } catch (cause) { setError(cause); }
    finally { setPending(false); }
  }

  async function resend() {
    if (!registration || pending) return;
    setPending(true);
    setError(null);
    setResent(false);
    try {
      setRegistration(await authEndpoints.resendVerification({ email: registration.email, registrationId: registration.registrationId }));
      setOtp("");
      setResent(true);
    } catch (cause) { setError(cause); }
    finally { setPending(false); }
  }

  return <main className="app-workspace grid min-h-dvh place-items-center bg-parchment-grain p-4">
    <section className="gl-workflow w-full max-w-lg space-y-5 overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 shadow-lg dark:bg-surface-raised sm:p-8" aria-labelledby="register-title">
      <header className="flex gap-4 border-b border-ink-tertiary/20 pb-4">
        <img src="/favicon.svg" alt="" className="size-11 rounded-xl bg-accent-primary p-1" />
        <div><p className="text-sm font-semibold text-accent-primary">GrainLedger</p>
          <h1 ref={heading} tabIndex={-1} id="register-title" className="font-display text-2xl font-bold">{t(`auth.registration.${step}`)}</h1></div>
      </header>
      {account ? <p role="status" className="text-sm">{t(account.isActive && account.role ? "auth.registration.ready" : "auth.registration.awaitAccess")}</p> : <form method="post" onSubmit={submit} aria-labelledby="register-title" className="space-y-4" key={step}>
        {registration ? <>
          <p className="text-sm text-ink-secondary [overflow-wrap:anywhere]">{t("auth.registration.sent", { email: registration.email })}</p>
          <label htmlFor="verify-otp">{t("auth.resetOtpLabel")}</label>
          <input id="verify-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={otp} onChange={event => setOtp(event.target.value)} />
        </> : <>
          <div><label htmlFor="register-name">{t("auth.registration.name")}</label><div className="relative mt-1"><User aria-hidden="true" className="pointer-events-none absolute start-3 top-4" /><input id="register-name" name="name" autoComplete="name" required maxLength={120} className="!ps-10" /></div></div>
          <div><label htmlFor="register-email">{t("auth.registration.email")}</label><div className="relative mt-1"><EnvelopeSimple aria-hidden="true" className="pointer-events-none absolute start-3 top-4" /><input id="register-email" name="email" type="email" autoComplete="username" spellCheck={false} required className="!ps-10" /></div></div>
          <div><label htmlFor="register-password">{t("auth.registration.password")}</label><div className="relative mt-1"><LockKey aria-hidden="true" className="pointer-events-none absolute start-3 top-4" /><input id="register-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="register-password-hint" className="!ps-10" /></div>
            <p id="register-password-hint" className="mt-1 text-xs text-ink-secondary">{t("auth.resetPasswordRequirements")}</p>
            <button type="button" aria-pressed={visible} onClick={() => setVisible(!visible)} className="mt-2">{t("auth.registration.showPassword")}</button></div>
        </>}
        <Feedback error={error} pending={pending} />
        {resent && <p role="status" className="text-sm text-accent-primary">{t("auth.registration.resent")}</p>}
        <button type="submit" disabled={pending} className="w-full">{t(registration ? "auth.registration.verify" : "auth.registration.start")}</button>
        {registration && <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => void resend()}>{t("auth.registration.resend")}</button>
          <button type="button" disabled={pending} onClick={() => { setRegistration(null); setOtp(""); setError(null); setResent(false); }}>{t("auth.registration.changeEmail")}</button>
        </div>}
      </form>}
      <Link to={authPaths.signIn}>{t("auth.backToSignIn")}</Link>
    </section>
  </main>;
}
