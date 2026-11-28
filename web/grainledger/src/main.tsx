import { StrictMode } from "react";
import { configureApplicationApi } from "@/app/providers/configureApi";
import { authEndpoints } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/app/store/authStore";
import { toUserProfile } from "@/features/auth/api/sessionUser";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { confirmAction } from "@/app/store/feedbackStore";
import i18n from "@/app/i18n";

configureApplicationApi();
if (useAuthStore.getState().isLoading) {
  void authEndpoints.getSession(true).then(user => {
    useAuthStore.getState().restoreBrowserSession(toUserProfile(user));
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) useAuthStore.getState().logout();
    else useAuthStore.setState({ isLoading: false });
  });
}
registerServiceWorker(() => confirmAction({
      title: i18n.t("common.pwaUpdateTitle", "Có phiên bản mới"),
      description: i18n.t(
        "common.pwaUpdateDesc",
        "Ứng dụng GrainLedger đã có bản cập nhật mới. Bạn có muốn tải lại để áp dụng ngay không?",
      ),
      confirmLabel: i18n.t("common.pwaUpdateConfirm", "Cập nhật ngay"),
      cancelLabel: i18n.t("common.pwaUpdateCancel", "Để sau"),
      variant: "primary",
    }));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
