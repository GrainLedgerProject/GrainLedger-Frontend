import { normalizeApiError } from '../../services/api/errors';
import { recoveryEmailError, type RecoveryEmailError, type RecoveryFailure } from './password-recovery';

/** Exact web src/api/auth.ts contract; no reset token or login grant is returned. */
export interface ResetPasswordRequest { email: string; otp: string; newPassword: string }
export type ResetFieldErrors = { email?: RecoveryEmailError; otp?: 'required'; newPassword?: 'required' };
export function resetPasswordErrors(input: ResetPasswordRequest): ResetFieldErrors {
  const errors: ResetFieldErrors = {};
  const email = recoveryEmailError(input.email);
  if (email) errors.email = email;
  if (!input.otp.trim()) errors.otp = 'required';
  if (!input.newPassword.length) errors.newPassword = 'required';
  // Source defines no reset-specific OTP/password policy. The backend validates it.
  return errors;
}
export type ResetState = { status: 'idle' } | { status: 'invalid'; errors: ResetFieldErrors }
  | { status: 'loading' } | { status: 'success' } | { status: 'error'; reason: RecoveryFailure };

/** Holds only safe state, never OTP/password, backend detail or issued credentials. */
export function createPasswordReset(send: (body: ResetPasswordRequest, signal: AbortSignal) => Promise<void>) {
  const initial: ResetState = { status: 'idle' };
  let state: ResetState = initial;
  let generation = 0;
  let pending: Promise<void> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: ResetState) => { state = next; listeners.forEach((listener) => listener()); };
  function submit(input: ResetPasswordRequest): Promise<void> {
    if (pending) return pending;
    if (state.status === 'success') return Promise.resolve();
    const errors = resetPasswordErrors(input);
    if (Object.keys(errors).length) { publish({ status: 'invalid', errors }); return Promise.resolve(); }
    // Copy input before queuing; only email is normalized. OTP/password remain opaque.
    const body = { email: input.email.trim(), otp: input.otp, newPassword: input.newPassword };
    const expected = ++generation;
    const request = new AbortController();
    controller = request;
    publish({ status: 'loading' });
    const task = Promise.resolve().then(() => {
      if (!request.signal.aborted) return send(body, request.signal);
    }).then(() => {
      if (expected === generation && !request.signal.aborted) publish({ status: 'success' });
    }).catch((failure: unknown) => {
      if (expected !== generation) return;
      const error = normalizeApiError(failure);
      if (error.code === 'cancelled') { publish(initial); return; }
      const reason: RecoveryFailure = error.status === 429 ? 'rate-limit'
        : error.code === 'configuration' || error.code === 'network' || error.code === 'timeout' ? error.code : 'request';
      publish({ status: 'error', reason });
    }).finally(() => {
      if (expected === generation) { pending = null; controller = null; }
    });
    pending = task;
    return task;
  }
  function reset() {
    generation++;
    controller?.abort(); controller = null; pending = null;
    publish(initial);
  }
  return { submit, reset, getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}
