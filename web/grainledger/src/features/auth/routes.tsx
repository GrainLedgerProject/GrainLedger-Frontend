import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { authPaths } from "./paths";

const signInPage = lazyScreen(() =>
  import("./pages/SignInPage").then(module => ({ default: module.SignInPage })),
);
const acceptInvitationPage = lazyScreen(() =>
  import("./pages/AcceptInvitationPage").then(module => ({ default: module.AcceptInvitationPage })),
);
const forgotPasswordPage = lazyScreen(() =>
  import("./pages/ForgotPasswordPage").then(module => ({ default: module.ForgotPasswordPage })),
);
const editProfilePage = lazyScreen(() =>
  import("./pages/EditProfilePage").then(module => ({ default: module.EditProfilePage })),
);
const changePasswordPage = lazyScreen(() =>
  import("./pages/ChangePasswordPage").then(module => ({ default: module.ChangePasswordPage })),
);

export const publicAuthRoutes = [
  screenRoute(authPaths.signIn, signInPage),
  screenRoute(authPaths.register, lazyScreen(() => import("./pages/RegisterPage").then(module => ({ default: module.RegisterPage })))),
  screenRoute(authPaths.invite, acceptInvitationPage),
  screenRoute(authPaths.forgotPassword, forgotPasswordPage),
];

export const authRoutes = [
  screenRoute(authPaths.profile, editProfilePage),
  screenRoute(authPaths.security, changePasswordPage),
];
