// Đăng ký PWA
import { logger } from "@/shared/utils/logger";
import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker(confirmUpdate: () => Promise<boolean>) {
  const updateSW = registerSW({
    onNeedRefresh() {
      void confirmUpdate().then((confirmed) => {
        if (confirmed) {
          void updateSW(true);
        }
      });
    },
    onOfflineReady() {
      logger.info("Ứng dụng đã sẵn sàng chạy offline!");
    },
  });
}
