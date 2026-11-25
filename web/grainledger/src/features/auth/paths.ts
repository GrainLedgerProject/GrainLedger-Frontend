export const authPaths = {
  signIn: "/sign-in",
  register: "/register",
  invite: "/invite/:token",
  forgotPassword: "/forgot-password",
  profile: "/settings/profile",
  security: "/settings/security",
} as const;
