// Đăng ký PWA
import { confirmAction } from "@/app/store/feedbackStore";
import { logger } from "@/shared/utils/logger";
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    void confirmAction({
      title: "Có phiên bản mới",
      description: "Ứng dụng GrainLedger đã có bản cập nhật mới. Bạn có muốn tải lại để áp dụng ngay không?",
      confirmLabel: "Cập nhật ngay",
      cancelLabel: "Để sau",
      variant: "primary",
    }).then((confirmed) => {
      if (confirmed) {
        void updateSW(true);
      }
    });
  },
  onOfflineReady() {
    logger.info("Ứng dụng đã sẵn sàng chạy offline!");
  },
});
