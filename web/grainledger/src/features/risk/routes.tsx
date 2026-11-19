import { lazyScreen, screenRoute } from "@/app/router/screenRoute";
import { riskPaths } from "./paths";
import { PlaceholderPage } from "@/app/router/PlaceholderPage";

const holdManagementPage = lazyScreen(() =>
  import("./pages/HoldManagementPage").then(module => ({ default: module.HoldManagementPage })),
);

export const riskRoutes = [
  screenRoute(riskPaths.traceback, <PlaceholderPage
    titleVi="Truy vết Hai chiều Đồ thị (Bidirectional Traceback)"
    titleEn="Traceback"
    roles={["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER"]}
    descriptionVi="Truy vết xuôi từ kết quả xét nghiệm xấu đến đúng container bị ảnh hưởng; truy vết ngược từ container về danh sách các thửa ruộng và tỷ lệ đóng góp %."
  />, { roles: ["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"], kind: "placeholder" }),
  screenRoute(riskPaths.newHold, holdManagementPage, { roles: ["CUSTOMER_MANAGER", "MILL_ADMIN"] }),
  screenRoute(riskPaths.holds, holdManagementPage, { roles: ["MILL_MANAGER", "CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "MILL_ADMIN"] }),
];
