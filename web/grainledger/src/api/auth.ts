import { apiFetch } from "./client";
import { getApiUrl } from "./config";

export const authEndpoints = {
  register: (req: RegisterRequest) =>
    apiFetch<RegistrationPendingDto>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  verifyEmail: (req: VerifyEmailRequest) =>
    apiFetch<SessionUserDto>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  resendVerification: (req: ResendVerificationRequest) =>
    apiFetch<RegistrationPendingDto>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  login: (req: LoginRequest) =>
    apiFetch<IssuedTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  webLogin: (req: LoginRequest) =>
    apiFetch<SessionUserDto>("/api/auth/web-login", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  refresh: (refreshToken: string) =>
    apiFetch<IssuedTokens>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  forgotPassword: (req: ForgotPasswordRequest) =>
    apiFetch<void>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  resetPassword: (req: ResetPasswordRequest) =>
    apiFetch<void>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  getSession: () => apiFetch<SessionUserDto>("/api/auth/session"),

  getCsrf: () => apiFetch<{ token: string }>("/api/auth/csrf"),

  getGoogleAuthUrl: (returnUrl?: string) =>
    getApiUrl(
      returnUrl
        ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
        : "/api/auth/google",
    ),

  loginGoogle: (returnUrl?: string) => {
    const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    window.location.assign(getApiUrl(`/api/auth/google${qs}`));
  },

  googleComplete: (returnUrl?: string) => {
    const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    window.location.assign(getApiUrl(`/api/auth/google/complete${qs}`));
  },

  getHealth: () => apiFetch<void>("/health"),

  logout: () =>
    apiFetch<void>("/api/auth/logout", {
      method: "POST",
    }),

  logoutAll: () =>
    apiFetch<void>("/api/auth/logout-all", {
      method: "POST",
    }),
};

export interface ForgotPasswordRequest {
  email: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUserDto;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegistrationPendingDto {
  registrationId: string;
  email: string;
  expiresIn: number;
}

export interface ResendVerificationRequest {
  email: string;
  registrationId: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface SessionUserDto {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: null | string;
  role: null | string;
  organizationId: null | string;
  organizationName: null | string;
  isActive: boolean;
  permissions: Array<string>;
}

export interface VerifyEmailRequest {
  email: string;
  registrationId: string;
  otp: string;
}
