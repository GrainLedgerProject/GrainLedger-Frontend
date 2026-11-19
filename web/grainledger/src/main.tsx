import { StrictMode } from "react";
import { configureApplicationApi } from "@/app/providers/configureApi";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { confirmAction } from "@/app/store/feedbackStore";
import "@/app/i18n";

configureApplicationApi();
registerServiceWorker(() => confirmAction({
      title: "Có phiên bản mới",
      description: "Ứng dụng GrainLedger đã có bản cập nhật mới. Bạn có muốn tải lại để áp dụng ngay không?",
      confirmLabel: "Cập nhật ngay",
      cancelLabel: "Để sau",
      variant: "primary",
    }));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
