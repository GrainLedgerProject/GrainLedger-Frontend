// Copied from the read-only web dashboard configuration; source role/permission policy retained.
import type { UserRole } from "../../auth/contracts";

export type Locale = "vi" | "en";
export type Copy = readonly [vi: string, en: string];
export const text = (copy: Copy, locale: Locale) =>
  copy[locale === "vi" ? 0 : 1];
export type Source =
  | "organizations"
  | "users"
  | "setup"
  | "stock"
  | "receiving"
  | "operations"
  | "corrections"
  | "holds"
  | "farmers"
  | "plots"
  | "procurements"
  | "labs"
  | "samples"
  | "orders";
export type IconName =
  | "users"
  | "buildings"
  | "factory"
  | "truck"
  | "scales"
  | "package"
  | "shield"
  | "flask"
  | "map"
  | "receipt"
  | "export"
  | "clock"
  | "sync"
  | "leaf";
export interface Shortcut {
  label: Copy;
  description: Copy;
  path: string;
  icon: IconName;
  permissions?: string[];
}
export interface DashboardConfig {
  title: Copy;
  description: Copy;
  focus: Copy;
  sources: Source[];
  chartTitle: Copy;
  listTitle: Copy;
  shortcuts: Shortcut[];
}

const stock: Shortcut = {
  label: ["Tồn kho định danh", "Stock positions"],
  description: [
    "Tra cứu lô, vị trí và lượng khả dụng",
    "Inspect lots, locations and available stock",
  ],
  path: "/stock",
  icon: "package",
};
const receiving: Shortcut = {
  label: ["Tiếp nhận nguyên liệu", "Receive materials"],
  description: [
    "Ghi nhận cân đến và đối soát chuyến hàng",
    "Measure arrivals and review deliveries",
  ],
  path: "/mill/receiving",
  icon: "truck",
  permissions: ["lots.receive", "receiving.reconcile"],
};
const holds: Shortcut = {
  label: ["Quản lý HOLD", "Manage holds"],
  description: [
    "Kiểm tra các lô đang bị hạn chế",
    "Review restricted lots and follow up",
  ],
  path: "/risk/holds",
  icon: "shield",
  permissions: ["holds.manage", "holds.process"],
};

export const dashboardConfig: Record<UserRole, DashboardConfig> = {
  MILL_ADMIN: {
    title: ["Tổng quan hệ thống", "System overview"],
    description: [
      "Nắm tình hình doanh nghiệp, tài khoản và hạ tầng vận hành.",
      "Stay on top of organizations, access and operational infrastructure.",
    ],
    focus: ["Quản trị & phân quyền", "Administration & access"],
    sources: ["organizations", "users", "setup"],
    chartTitle: ["Phân bổ vai trò", "Role distribution"],
    listTitle: ["Tài khoản trong hệ thống", "System accounts"],
    shortcuts: [
      {
        label: ["Quản lý tài khoản", "Manage accounts"],
        description: [
          "Phân vai trò và gắn doanh nghiệp",
          "Assign roles and organizations",
        ],
        path: "/admin/access",
        icon: "users",
        permissions: ["identity.manage"],
      },
      {
        label: ["Doanh nghiệp", "Organizations"],
        description: [
          "Quản lý đối tác và đơn vị vận hành",
          "Manage customers and mill organizations",
        ],
        path: "/admin/customers",
        icon: "buildings",
        permissions: ["identity.manage"],
      },
      {
        label: ["Cơ sở & thiết bị", "Facilities & equipment"],
        description: [
          "Cấu hình nhà máy, kho và thiết bị",
          "Configure facilities, locations and equipment",
        ],
        path: "/admin/facilities",
        icon: "factory",
        permissions: ["platform.configure"],
      },
      {
        label: ["Ngưỡng tiếp nhận", "Receiving thresholds"],
        description: [
          "Thiết lập ngưỡng hao hụt vận chuyển",
          "Configure transport loss thresholds",
        ],
        path: "/admin/receiving-thresholds",
        icon: "scales",
        permissions: ["platform.configure"],
      },
    ],
  },
  MILL_MANAGER: {
    title: ["Điều hành nhà máy", "Mill operations overview"],
    description: [
      "Ưu tiên đối soát, xử lý chênh lệch và theo dõi tồn kho tại cơ sở.",
      "Prioritize arrival reviews, corrections and stock at your facility.",
    ],
    focus: ["Đối soát & kiểm soát vận hành", "Reconciliation & operations"],
    sources: ["receiving", "corrections", "holds", "stock", "operations"],
    chartTitle: ["Tình hình tiếp nhận", "Receiving status"],
    listTitle: ["Công đoạn gần đây", "Recent processing operations"],
    shortcuts: [
      receiving,
      {
        label: ["Đối soát & xác nhận", "Review corrections"],
        description: [
          "Xem yêu cầu và bút toán cần đối soát",
          "Review pending corrections and entries",
        ],
        path: "/mill/reconciliations",
        icon: "scales",
        permissions: ["corrections.reconcile"],
      },
      holds,
      stock,
    ],
  },
  MILL_OPERATOR: {
    title: ["Bàn làm việc vận hành", "Operator workspace"],
    description: [
      "Theo dõi tiếp nhận, tiếp tục bản nháp và ghi nhận công đoạn tại cơ sở.",
      "Track arrivals, continue drafts and record processing at your facility.",
    ],
    focus: ["Tiếp nhận & chế biến", "Receiving & processing"],
    sources: ["receiving", "operations", "stock"],
    chartTitle: ["Công đoạn theo loại", "Operations by process"],
    listTitle: ["Công đoạn gần đây", "Recent processing operations"],
    shortcuts: [
      {
        label: ["Ghi công đoạn mới", "Record an operation"],
        description: [
          "Sấy, xay xát, phối trộn hoặc đóng bao",
          "Drying, milling, blending or bagging",
        ],
        path: "/mill/operations/new",
        icon: "factory",
        permissions: ["conversions.write"],
      },
      receiving,
      {
        label: ["Yêu cầu sửa đổi", "Request a correction"],
        description: [
          "Bổ sung yêu cầu chỉnh sửa có kiểm soát",
          "Submit a controlled correction request",
        ],
        path: "/mill/corrections/new",
        icon: "receipt",
        permissions: ["conversions.write"],
      },
    ],
  },
  CUSTOMER_PROCUREMENT_OFFICER: {
    title: ["Tổng quan thu mua", "Procurement overview"],
    description: [
      "Quản lý nguồn nguyên liệu, phiếu thu mua và dữ liệu chờ đồng bộ.",
      "Manage suppliers, procurement receipts and records awaiting sync.",
    ],
    focus: ["Thu mua & nguồn nguyên liệu", "Procurement & sourcing"],
    sources: ["procurements", "farmers", "plots"],
    chartTitle: ["Thu mua trong 7 ngày", "Procurement over 7 days"],
    listTitle: ["Phiếu thu mua mới nhất", "Latest procurement receipts"],
    shortcuts: [
      {
        label: ["Lập phiếu thu mua", "New procurement receipt"],
        description: [
          "Ghi nhận thu mua ngay tại hiện trường",
          "Record procurement in the field",
        ],
        path: "/field/receipts/new",
        icon: "receipt",
        permissions: ["purchases.write"],
      },
      {
        label: ["Hàng đợi đồng bộ", "Sync queue"],
        description: [
          "Kiểm tra dữ liệu được lưu ngoại tuyến",
          "Review records saved offline",
        ],
        path: "/field/sync",
        icon: "sync",
        permissions: ["purchases.write"],
      },
      {
        label: ["Quản lý nông hộ", "Manage farmers"],
        description: [
          "Tra cứu và bổ sung hồ sơ người bán",
          "Find and register supplier profiles",
        ],
        path: "/field/farmers/new",
        icon: "users",
        permissions: ["farms.write"],
      },
      {
        label: ["Thửa ruộng & mùa vụ", "Plots & seasons"],
        description: [
          "Theo dõi thông tin vùng nguyên liệu",
          "Maintain sourcing area information",
        ],
        path: "/field/plots/new",
        icon: "map",
        permissions: ["farms.write"],
      },
    ],
  },
  CUSTOMER_MANAGER: {
    title: ["Chất lượng & rủi ro", "Quality & risk overview"],
    description: [
      "Theo dõi chứng thư, mẫu xét nghiệm và các lô cần kiểm soát.",
      "Monitor lab evidence, samples and lots requiring attention.",
    ],
    focus: ["Chất lượng & truy xuất", "Quality & traceability"],
    sources: ["labs", "samples", "holds", "stock"],
    chartTitle: ["Trạng thái báo cáo kiểm nghiệm", "Lab report status"],
    listTitle: ["Báo cáo kiểm nghiệm", "Laboratory reports"],
    shortcuts: [
      {
        label: ["Báo cáo kiểm nghiệm", "Laboratory reports"],
        description: [
          "Đối chiếu và xác nhận chứng thư",
          "Review and confirm laboratory evidence",
        ],
        path: "/compliance/lab-results",
        icon: "flask",
        permissions: ["lab.write"],
      },
      {
        label: ["Duyệt phương án", "Review blend plans"],
        description: [
          "Thẩm định đề xuất và quyết định phối trộn",
          "Assess proposals and record blend decisions",
        ],
        path: "/export/plans/pending",
        icon: "scales",
        permissions: ["blend.approve"],
      },
      holds,
      {
        label: ["Truy vết hai chiều", "Trace a lot"],
        description: [
          "Theo dõi nguồn gốc và các lô liên quan",
          "Inspect provenance and related lots",
        ],
        path: "/risk/traceback",
        icon: "leaf",
        permissions: ["trace.read.tenant"],
      },
    ],
  },
  CUSTOMER_EXPORT_OFFICER: {
    title: ["Điều phối xuất khẩu", "Export planning overview"],
    description: [
      "Theo dõi đơn hàng, cửa sổ xuất hàng và nguồn tồn khả dụng.",
      "Track orders, shipping windows and available inventory.",
    ],
    focus: ["Đơn hàng & kế hoạch xuất", "Orders & export planning"],
    sources: ["orders", "stock"],
    chartTitle: ["Cửa sổ xuất hàng", "Shipping windows"],
    listTitle: ["Đơn hàng xuất khẩu", "Export orders"],
    shortcuts: [
      {
        label: ["Đơn hàng xuất khẩu", "Export orders"],
        description: [
          "Xem nhu cầu và các container mục tiêu",
          "Review demand and target containers",
        ],
        path: "/export/orders",
        icon: "export",
        permissions: ["export-orders.read"],
      },
      {
        label: ["Phương án phối trộn", "Blend plans"],
        description: [
          "Tra cứu đề xuất và quyết định đã ghi nhận",
          "Inspect proposals and recorded decisions",
        ],
        path: "/export/plans/pending",
        icon: "scales",
        permissions: ["export-orders.read"],
      },
      stock,
    ],
  },
  AUTHORIZED_STOCK_VIEWER: {
    title: ["Tổng quan tồn kho", "Inventory overview"],
    description: [
      "Tra cứu lượng tồn, khả dụng và hạn chế của các lô được cấp quyền.",
      "Inspect stock, availability and restrictions for authorized lots.",
    ],
    focus: ["Tồn kho & vị trí", "Inventory & locations"],
    sources: ["stock"],
    chartTitle: ["Tồn kho theo giai đoạn", "Stock by stage"],
    listTitle: ["Các lô đang theo dõi", "Tracked lots"],
    shortcuts: [stock],
  },
};

export const sourceCopy: Record<Source, Copy> = {
  organizations: ["Doanh nghiệp", "Organizations"],
  users: ["Tài khoản", "Accounts"],
  setup: ["Hạ tầng", "Infrastructure"],
  stock: ["Tồn kho", "Stock"],
  receiving: ["Tiếp nhận", "Receiving"],
  operations: ["Công đoạn", "Operations"],
  corrections: ["Sửa đổi", "Corrections"],
  holds: ["Lệnh HOLD", "Holds"],
  farmers: ["Nông hộ", "Farmers"],
  plots: ["Thửa ruộng", "Plots"],
  procurements: ["Phiếu thu mua", "Procurements"],
  labs: ["Báo cáo lab", "Lab reports"],
  samples: ["Mẫu xét nghiệm", "Samples"],
  orders: ["Đơn xuất khẩu", "Export orders"],
};
const sourcePermissions: Record<Source, string[]> = {
  organizations: ["identity.manage"],
  users: ["identity.manage"],
  setup: ["platform.configure"],
  stock: ["lots.read.all", "lots.read.facility", "lots.read.tenant"],
  receiving: ["lots.receive", "receiving.reconcile"],
  operations: ["conversions.read", "conversions.write"],
  corrections: ["corrections.reconcile", "conversions.write"],
  holds: ["holds.manage", "holds.process"],
  farmers: ["farms.write", "farms.read"],
  plots: ["farms.write", "farms.read"],
  procurements: ["purchases.write"],
  labs: ["lab.write", "lab.read"],
  samples: ["lab.write", "lab.read"],
  orders: ["export-orders.read"],
};
export function canReadSource(
  source: Source,
  role: UserRole,
  permissions: string[],
) {
  // Qualified stock access is also enforced by scoped grants in the backend.
  return (
    (source === "stock" && role === "AUTHORIZED_STOCK_VIEWER") ||
    sourcePermissions[source].some((permission) =>
      permissions.includes(permission),
    )
  );
}
