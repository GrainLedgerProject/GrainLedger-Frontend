import { regexes } from 'zod';
import { normalizeApiError } from '../../services/api/errors';

/** Copied request contract: web src/api/auth.ts. No OTP/reset token in the accepted response. */
export interface ForgotPasswordRequest { email: string }
export type RecoveryEmailError = 'required' | 'format';
export function recoveryEmailError(value: string): RecoveryEmailError | undefined {
  const email = value.trim();
  if (!email) return 'required';
  // Source uses required input[type=email]; do not impose sign-in's stricter domain policy.
  return regexes.html5Email.test(email) ? undefined : 'format';
}
export type RecoveryFailure = 'configuration' | 'network' | 'timeout' | 'rate-limit' | 'request';
export type RecoveryState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldError: RecoveryEmailError }
  | { status: 'loading' }
  | { status: 'success'; submittedEmail: string }
  | { status: 'error'; reason: RecoveryFailure };

/** A public form operation, independent of authenticated data resources/session state. */
export function createPasswordRecovery(send: (body: ForgotPasswordRequest, signal: AbortSignal) => Promise<void>) {
  const initial: RecoveryState = { status: 'idle' };
  let state: RecoveryState = initial;
  let generation = 0;
  let pending: Promise<void> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: RecoveryState) => { state = next; listeners.forEach((listener) => listener()); };

  function submit(value: string): Promise<void> {
    if (pending) return pending;
    if (state.status === 'success') return Promise.resolve();
    const fieldError = recoveryEmailError(value);
    if (fieldError) { publish({ status: 'invalid', fieldError }); return Promise.resolve(); }
    const email = value.trim(); // Preserve case, matching the source request.
    const expected = ++generation;
    const request = new AbortController();
    controller = request;
    publish({ status: 'loading' });
    const task = Promise.resolve().then(() => {
      if (!request.signal.aborted) return send({ email }, request.signal);
    }).then(() => {
      if (expected === generation && !request.signal.aborted) publish({ status: 'success', submittedEmail: email });
    }).catch((failure: unknown) => {
      if (expected !== generation) return;
      const error = normalizeApiError(failure);
      if (error.code === 'cancelled') { publish(initial); return; }
      // Never retain/render server detail that could reveal whether an address exists.
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
