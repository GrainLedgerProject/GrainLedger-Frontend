import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { exportPaths } from "./paths";
import { Navigate } from "react-router-dom";
import { PlaceholderPage } from "@/app/router/PlaceholderPage";

const blendPlanDecisionsPage = lazyScreen(() =>
  import("./pages/BlendPlanDecisionsPage").then(module => ({ default: module.BlendPlanDecisionsPage })),
);

export const exportRoutes = [
  screenRoute(exportPaths.orders, <PlaceholderPage
    titleVi="Đơn hàng Xuất khẩu & Mục tiêu Container (Export Order)"
    titleEn="Export Order"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Ghi nhận hợp đồng xuất khẩu gạo với thị trường đích, khối lượng yêu cầu, chuẩn chất lượng và số lượng container 20ft mục tiêu."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(exportPaths.requestPlan, <PlaceholderPage
    titleVi="Yêu cầu Phương án Phối trộn (Blend Plan Request)"
    titleEn="Blend Plan Request"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Thuật toán đề xuất công thức phối trộn từ các lô khả dụng của công ty để đạt quy cách % tấm và giới hạn MRL thị trường."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  { path: exportPaths.plans, element: <Navigate to={exportPaths.orders} replace />, handle: { kind: "redirect" } },
  screenRoute(exportPaths.pending, blendPlanDecisionsPage, { roles: ["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(exportPaths.review, blendPlanDecisionsPage, { roles: ["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"] }),
  screenRoute(exportPaths.containers, <PlaceholderPage
    titleVi="Danh sách & Giám sát Xếp Container"
    titleEn="Containers Overview"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Theo dõi tiến độ xếp các container xuất khẩu thuộc các đơn hàng đang triển khai."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(exportPaths.loading, <PlaceholderPage
    titleVi="Ghi nhận Xếp hàng lên Container (Container Loading)"
    titleEn="Container Loading"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Ghi nhận số lượng bao gạo thực tế đưa vào container theo đúng phương án đã duyệt. Khấu trừ số dư bảo lưu."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(exportPaths.closure, <PlaceholderPage
    titleVi="Đóng Niêm Container (Container Closure)"
    titleEn="Container Closure"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Xác nhận đủ 25.000 kg, kiểm tra không bị HOLD, gắn số seal niêm chì và tự động phát hành bộ hồ sơ tuân thủ bất biến."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(exportPaths.dossiers, <PlaceholderPage
    titleVi="Quản lý Chứng từ & Hồ sơ Tuân thủ (Compliance Dossiers)"
    titleEn="Shipment Documents and Dossier"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Xuất chứng thư tuân thủ, bảng kê tỷ lệ nguồn gốc đóng góp và phụ lục kiểm định cho các container đã đóng niêm."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(exportPaths.dossier, <PlaceholderPage
    titleVi="Hồ sơ Tuân thủ Container Chi tiết"
    titleEn="Container Compliance Dossier"
    roles={["CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Xem và xuất bản file hồ sơ tuân thủ chính thức của container kèm snapshot bằng chứng phòng lab."
  />, { roles: ["CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
];
