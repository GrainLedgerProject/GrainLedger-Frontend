import type * as ApiSchemas from './generated/schemas';
import type { RegistrationPendingDto, IssuedTokens, SessionUserDto } from './generated/schemas';
export type { RegisterRequest, RegistrationPendingDto, VerifyEmailRequest, ResendVerificationRequest, LoginRequest, IssuedTokens, SessionUserDto, ForgotPasswordRequest, ResetPasswordRequest } from './generated/schemas';
import { apiFetch } from './client';
import { getApiUrl } from './config';

export const authEndpoints = {
  register: (req: ApiSchemas.RegisterRequest) =>
    apiFetch<RegistrationPendingDto>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  verifyEmail: (req: ApiSchemas.VerifyEmailRequest) =>
    apiFetch<SessionUserDto>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  resendVerification: (req: ApiSchemas.ResendVerificationRequest) =>
    apiFetch<RegistrationPendingDto>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  login: (req: ApiSchemas.LoginRequest) =>
    apiFetch<IssuedTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  webLogin: (req: ApiSchemas.LoginRequest) =>
    apiFetch<SessionUserDto>('/api/auth/web-login', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  refresh: (refreshToken: string) =>
    apiFetch<IssuedTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  forgotPassword: (req: ApiSchemas.ForgotPasswordRequest) =>
    apiFetch<void>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  resetPassword: (req: ApiSchemas.ResetPasswordRequest) =>
    apiFetch<void>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getSession: () => apiFetch<SessionUserDto>('/api/auth/session'),

  getCsrf: () => apiFetch<{ token: string }>('/api/auth/csrf'),

  getGoogleAuthUrl: (returnUrl?: string) =>
    getApiUrl(returnUrl ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}` : '/api/auth/google'),

  loginGoogle: (returnUrl?: string) => {
    const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    window.location.assign(getApiUrl(`/api/auth/google${qs}`));
  },

  googleComplete: (returnUrl?: string) => {
    const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    window.location.assign(getApiUrl(`/api/auth/google/complete${qs}`));
  },

  getHealth: () => apiFetch<void>('/health'),

  logout: () =>
    apiFetch<void>('/api/auth/logout', {
      method: 'POST',
    }),

  logoutAll: () =>
    apiFetch<void>('/api/auth/logout-all', {
      method: 'POST',
    }),
};
