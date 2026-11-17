import { AuthError, parseTokens, parseUser, type AuthUser } from './contracts';
import { createHttpClient, type ApiClient, type ApiRequestOptions } from '../../services/api/http-client';
import type { ApiError } from '../../services/api/errors';
import { recoveryEmailError, type ForgotPasswordRequest } from './password-recovery';
import { resetPasswordErrors, type ResetPasswordRequest } from './password-reset';
export { normalizeOrigin } from '../../services/api/config';

export interface CredentialStorage { read(): Promise<string | null>; write(value: string | null): Promise<void> }
export type AuthSnapshot = { status: 'restoring' | 'authenticated' | 'anonymous'; user: AuthUser | null;
  expiresAt: number; busy: boolean; message: string | null; cleanupRequired: boolean };
type ClientOptions = { origin: string; storage: CredentialStorage; fetcher?: typeof fetch; allowHttp?: boolean;
  timeoutMs?: number; configurationError?: ApiError };
const initial: AuthSnapshot = { status: 'restoring', user: null, expiresAt: 0, busy: false, message: null, cleanupRequired: false };
const cancelled = () => new AuthError('The authentication attempt was cancelled.', 0, 'cancelled');

export function createAuthClient(options: ClientOptions) {
  const transport = createHttpClient(options);
  const { origin, configurationError } = transport;
  let snapshot = initial;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let remember = false;
  let generation = 0;
  let refreshTask: Promise<void> | null = null;
  let initializeTask: Promise<void> | null = null;
  let storageQueue = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (update: Partial<AuthSnapshot>) => { snapshot = { ...snapshot, ...update }; listeners.forEach((listener) => listener()); };
  const checkGeneration = (expected: number) => { if (expected !== generation) throw cancelled(); };
  const write = (value: string | null) => {
    const next = storageQueue.catch(() => {}).then(() => options.storage.write(value));
    storageQueue = next;
    return next;
  };
  function raw(path: string, init: RequestInit = {}, token?: string | null): Promise<unknown> {
    // Compatibility for the Phase 6 auth-facing API; all transport now goes through Axios.
    return transport.request(path, { method: (init.method ?? 'GET') as ApiRequestOptions['method'], data: init.body,
      headers: Object.fromEntries(new Headers(init.headers).entries()), signal: init.signal ?? undefined }, token);
  }
  async function invalidate(message: string | null) {
    const expected = ++generation;
    accessToken = refreshToken = null;
    remember = false;
    publish({ status: 'anonymous', user: null, expiresAt: 0, busy: false, message, cleanupRequired: false });
    try { await write(null); }
    catch { if (expected === generation) publish({ cleanupRequired: true, message: 'Saved credentials could not be removed. Retry sign-out before closing the app.' }); }
  }
  async function commit(data: unknown, expected: number) {
    const tokens = parseTokens(data);
    checkGeneration(expected);
    if (remember) await write(JSON.stringify({ version: 1, origin, refreshToken: tokens.refreshToken }));
    checkGeneration(expected);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    publish({ status: 'authenticated', user: tokens.user, expiresAt: tokens.expiresAt, busy: false, message: null, cleanupRequired: false });
  }
  function refresh(): Promise<void> {
    if (refreshTask) return refreshTask;
    const expected = generation;
    const token = refreshToken;
    const task = (async () => {
      try {
        if (!token) throw new AuthError('Your session has ended. Sign in again.', 401, 'expired');
        const data = await raw('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: token }) });
        await commit(data, expected);
      } catch (error) {
        if (expected === generation) await invalidate(error instanceof Error ? error.message : 'Your session could not be renewed. Sign in again.');
        throw error;
      }
    })();
    refreshTask = task;
    void task.finally(() => { if (refreshTask === task) refreshTask = null; }).catch(() => {});
    return task;
  }
  async function withSession<T>(send: (token: string) => Promise<T>, signal?: AbortSignal) {
    const expected = generation;
    const check = () => {
      checkGeneration(expected);
      if (signal?.aborted) throw new AuthError('The request was cancelled.', 0, 'cancelled');
    };
    check();
    if (!accessToken || snapshot.expiresAt <= Date.now() + 15_000) await refresh();
    check();
    const used = accessToken;
    try {
      const data = await send(used!);
      check();
      return data;
    } catch (error) {
      if (!(error instanceof AuthError) || error.status !== 401) throw error;
      check();
      if (used === accessToken) await refresh();
      check();
      try {
        const data = await send(accessToken!);
        check();
        return data;
      } catch (retryError) {
        if (expected === generation && retryError instanceof AuthError && retryError.status === 401) await invalidate('Your session has ended. Sign in again.');
        throw retryError;
      }
    }
  }
  const api: ApiClient = { request: (path, init = {}) => withSession((token) => transport.request(path, init, token), init.signal) };
  const request = (path: string, init: RequestInit = {}) => withSession((token) => raw(path, init, token), init.signal ?? undefined);
  function initialize(): Promise<void> {
    if (initializeTask) return initializeTask;
    const expected = generation;
    initializeTask = (async () => {
      try {
        if (!origin) { publish({ status: 'anonymous', message: configurationError }); return; }
        const stored = await options.storage.read();
        checkGeneration(expected);
        if (!stored) { publish({ status: 'anonymous' }); return; }
        const parsed: unknown = JSON.parse(stored);
        const value = parsed as { version?: unknown; origin?: unknown; refreshToken?: unknown } | null;
        if (!value || value.version !== 1 || value.origin !== origin || typeof value.refreshToken !== 'string' || !value.refreshToken) {
          await invalidate('The saved session is no longer compatible. Sign in again.'); return;
        }
        refreshToken = value.refreshToken;
        remember = true;
        await refresh(); // Backend round trip; never restore identity from cached profile/JWT claims.
      } catch (error) {
        if (expected === generation) await invalidate(error instanceof Error ? error.message : 'The saved session could not be restored.');
      }
    })();
    return initializeTask;
  }
  async function login(email: string, password: string, persist: boolean) {
    if (snapshot.busy) throw new AuthError('An authentication operation is already in progress.');
    const expected = ++generation;
    accessToken = refreshToken = null;
    refreshTask = null;
    remember = persist;
    publish({ status: 'anonymous', user: null, expiresAt: 0, busy: true, message: null });
    try {
      await write(null);
      checkGeneration(expected);
      const data = await raw('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
      await commit(data, expected);
    } catch (error) {
      if (expected === generation) await invalidate(error instanceof Error ? error.message : 'Sign-in failed.');
      throw error;
    }
  }
  async function logout() {
    const token = accessToken;
    const expected = ++generation;
    accessToken = refreshToken = null;
    remember = false;
    publish({ status: 'anonymous', user: null, expiresAt: 0, busy: true, message: null, cleanupRequired: false });
    const [local, remote] = await Promise.allSettled([
      write(null), origin && token ? raw('/api/auth/logout', { method: 'POST' }, token) : Promise.resolve(),
    ]);
    if (expected !== generation) return;
    publish({ busy: false, cleanupRequired: local.status === 'rejected',
      message: local.status === 'rejected' ? 'Saved credentials could not be removed. Retry sign-out before closing the app.'
        : remote.status === 'rejected' ? 'Signed out on this device. Server sign-out could not be confirmed.' : 'Signed out.' });
  }
  async function getSession() {
    const expected = generation;
    try {
      const user = parseUser(await request('/api/auth/session'));
      checkGeneration(expected);
      publish({ user });
      return user;
    } catch (error) {
      if (expected === generation && error instanceof AuthError && error.code === 'inactive') await invalidate(error.message);
      throw error;
    }
  }
  async function forgotPassword(body: ForgotPasswordRequest, signal?: AbortSignal): Promise<void> {
    if (recoveryEmailError(body.email)) throw new AuthError('Enter a valid email address.', 0, 'auth');
    // Public endpoint: no bearer/cookie transport, protected retry, login grant or credential mutation.
    await transport.request('/api/auth/forgot-password', { method: 'POST', data: { email: body.email.trim() }, signal });
  }
  async function resetPassword(body: ResetPasswordRequest, signal?: AbortSignal): Promise<void> {
    if (Object.keys(resetPasswordErrors(body)).length) throw new AuthError('Complete the recovery form.', 0, 'auth');
    // Public reset: no authenticated retry, token grant or local session/storage mutation.
    await transport.request('/api/auth/reset-password', { method: 'POST',
      data: { email: body.email.trim(), otp: body.otp, newPassword: body.newPassword }, signal });
  }
  return { configurationError, initialize, login, logout, refresh, request, getSession, api, forgotPassword, resetPassword,
    updateUser: (user: AuthUser) => { publish({ user }); },
    getRequestScope: () => snapshot.status === 'authenticated' && snapshot.user
      ? JSON.stringify([generation, snapshot.user.id, snapshot.user.organizationId, snapshot.user.normalizedRole, [...snapshot.user.permissions].sort()]) : null,
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
