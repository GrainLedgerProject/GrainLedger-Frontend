// Đăng ký PWA
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Có phiên bản mới. Bạn có muốn cập nhật không?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("Ứng dụng đã sẵn sàng chạy offline!");
  },
});
