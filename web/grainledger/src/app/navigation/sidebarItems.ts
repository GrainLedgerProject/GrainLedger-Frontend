import { dashboardPaths } from "@/features/dashboard/paths";
import { authPaths } from "@/features/auth/paths";
import { auditPaths } from "@/features/audit/paths";
import { adminPaths } from "@/features/admin/paths";
import { catalogsPaths } from "@/features/catalogs/paths";
import { fieldPaths } from "@/features/field/paths";
import { millPaths, requestCorrectionPermission } from "@/features/mill/paths";
import { compliancePaths } from "@/features/compliance/paths";
import { exportPaths } from "@/features/export/paths";
import { riskPaths } from "@/features/risk/paths";
import type { UserRole } from "@/shared/types/roles";
import type { TFunction } from "i18next";
import type { ComponentType } from "react";
import {
  ArrowsClockwise,
  BookOpen,
  Buildings,
  CalendarDots,
  CheckSquare,
  ClockCounterClockwise,
  Crosshair,
  Drop,
  Export,
  Factory,
  FileText,
  Flask,
  HandCoins,
  House,
  ListBullets,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  Package,
  Scales,
  ShieldCheck,
  TestTube,
  Truck,
  Users,
} from "@phosphor-icons/react";

export interface NavItem {
  label: string;
  permission?: string;
  path: string;
  icon: ComponentType<{
    size?: number;
    weight?: "bold" | "fill" | "regular";
    className?: string;
  }>;
  badge?: number | string;
  badgeTone?: "danger" | "warning" | "primary";
  isPrimary?: boolean;
  activeMatch?: (pathname: string) => boolean;
}

const isMillOperationPath = (pathname: string) =>
  pathname === millPaths.operation ||
  pathname.startsWith(millPaths.operation + "/") ||
  pathname === millPaths.operationDrafts ||
  pathname.startsWith(millPaths.operationDrafts + "/");

const isStockOverviewPath = (pathname: string) =>
  pathname === millPaths.stock || pathname.startsWith("/stock/lots/");

function roleNavigation(role: UserRole, t: TFunction, pendingOfflineCount: number): NavItem[] {
    switch (role) {
      case "MILL_ADMIN":
        return [
          {
            label: t("nav.home", "Tổng quan hệ thống"),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.admin.customers", "Khách hàng"),
            path: adminPaths.customers,
            icon: Buildings,
          },
          {
            label: t("nav.field.seasons"),
            path: fieldPaths.seasons,
            permission: "platform.configure",
            icon: CalendarDots,
          },
          {
            label: t("nav.admin.access", "Tài khoản & Quyền"),
            path: adminPaths.access,
            icon: Users,
          },
          {
            label: t("nav.admin.facilities", "Cơ sở & Thiết bị"),
            path: adminPaths.facilities,
            icon: Factory,
          },
          {
            label: t("nav.admin.balancePolicy", "Chính sách cân bằng"),
            path: adminPaths.balancePolicy,
            icon: Scales,
          },
          {
            label: t("nav.admin.receivingThresholds", "Ngưỡng tiếp nhận"),
            path: adminPaths.receivingThresholds,
            icon: Scales,
          },
          {
            label: t("nav.admin.masterData", "Danh mục vận hành"),
            path: catalogsPaths.masterData,
            icon: ListBullets,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: catalogsPaths.mrlVersions,
            permission: "platform.configure",
            icon: BookOpen,
          },
          {
            label: t("nav.risk.traceback", "Truy vết hai chiều"),
            path: riskPaths.traceback,
            permission: "trace.read.all",
            icon: Crosshair,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "MILL_OPERATOR":
        return [
          {
            label: t("nav.mill.today", "Hôm nay tại dây chuyền"),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.mill.receiving", "Tiếp nhận & Cân đến"),
            path: millPaths.receiving,
            icon: Truck,
          },
          {
            label: t("nav.mill.operations", "Ghi bước chế biến"),
            path: millPaths.operation,
            icon: Scales,
            isPrimary: true,
            activeMatch: isMillOperationPath,
          },
          {
            label: t("nav.mill.containerWork", "Công việc container"),
            path: millPaths.executePlans,
            icon: Factory,
            permission: "containers.operate",
          },
          {
            label: t("nav.mill.corrections", "Yêu cầu sửa"),
            path: millPaths.requestCorrection,
            permission: requestCorrectionPermission,
            icon: ClockCounterClockwise,
          },
          {
            label: t("nav.mill.reconciliations", "Đối soát & Xác nhận"),
            path: millPaths.reconciliations,
            icon: CheckSquare,
          },
          {
            label: t("nav.admin.facilities", "Cơ sở & Thiết bị"),
            path: adminPaths.facilities,
            permission: "platform.read",
            icon: Factory,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "MILL_MANAGER":
        return [
          {
            label: t("nav.manager.home", "Bàn điều hành Quản lý"),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.manager.receiving", "Tiếp nhận & Đối soát cân"),
            path: millPaths.receiving,
            icon: Truck,
          },
          {
            label: t("nav.stock.overview", "Tồn kho định danh"),
            path: millPaths.stock,
            icon: Package,
            activeMatch: isStockOverviewPath,
          },
          {
            label: t("nav.mill.reconciliations", "Đối soát & Xác nhận"),
            path: millPaths.reconciliations,
            icon: CheckSquare,
          },
          {
            label: t("nav.risk.holdAlerts", "Cảnh báo & Xử lý HOLD"),
            path: riskPaths.holds,
            icon: LockSimple,
          },
          {
            label: t("nav.admin.balancePolicy", "Chính sách cân bằng"),
            path: adminPaths.balancePolicy,
            icon: Scales,
          },
          {
            label: t("nav.admin.facilities", "Cơ sở & Thiết bị"),
            path: adminPaths.facilities,
            permission: "platform.read",
            icon: Factory,
          },
          {
            label: t("nav.mill.operations", "Ghi bước chế biến"),
            path: millPaths.operation,
            permission: "conversions.write",
            icon: Factory,
            activeMatch: isMillOperationPath,
          },
          {
            label: t("nav.mill.containerWork", "Công việc container"),
            path: millPaths.executePlans,
            icon: Factory,
            permission: "holds.process",
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_PROCUREMENT_OFFICER":
        return [
          {
            label: t("nav.field.home", "Bàn làm việc thu mua"),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.field.sync", "Đồng bộ / Hàng đợi"),
            path: fieldPaths.sync,
            icon: ArrowsClockwise,
            badge: pendingOfflineCount > 0 ? pendingOfflineCount : undefined,
            badgeTone: pendingOfflineCount > 0 ? "warning" : undefined,
          },
          {
            label: t("nav.field.farmers", "Nông hộ"),
            path: fieldPaths.farmers,
            icon: Users,
          },
          {
            label: t("nav.field.plots", "Thửa ruộng"),
            path: fieldPaths.plots,
            icon: MapPin,
          },
          {
            label: t("nav.field.seasons"),
            path: fieldPaths.seasons,
            permission: "farms.write",
            icon: CalendarDots,
          },
          {
            label: t("nav.field.declarations", "Khai báo thuốc BVTV"),
            path: fieldPaths.declarations,
            icon: Drop,
          },
          {
            label: t("nav.field.receipts", "Thu mua lúa"),
            path: fieldPaths.receipts,
            icon: HandCoins,
          },
          {
            label: t("nav.field.samples", "Lấy mẫu niêm phong"),
            path: fieldPaths.samples,
            icon: TestTube,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_MANAGER":
        return [
          {
            label: t(
              "nav.customerManager.home",
              "Điều phối Chất lượng & Rủi ro",
            ),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.risk.traceback", "Truy vết hai chiều"),
            path: riskPaths.traceback,
            icon: Crosshair,
            isPrimary: true,
          },
          {
            label: t("nav.field.farmers", "Nông hộ"),
            path: fieldPaths.farmers,
            permission: "farms.read",
            icon: Users,
          },
          {
            label: t("nav.field.plots", "Thửa ruộng"),
            path: fieldPaths.plots,
            permission: "farms.read",
            icon: MapPin,
          },
          {
            label: t("nav.field.seasons"),
            path: fieldPaths.seasons,
            permission: "farms.read",
            icon: CalendarDots,
          },
          {
            label: t("nav.risk.holds", "Lệnh giữ HOLD"),
            path: riskPaths.holds,
            icon: LockSimple,
          },
          {
            label: t("nav.compliance.labSamples", "Mẫu xét nghiệm"),
            path: compliancePaths.samples,
            icon: Flask,
          },
          {
            label: t("nav.compliance.labResults", "Kết quả xét nghiệm"),
            path: compliancePaths.results,
            icon: TestTube,
          },
          {
            label: t("nav.compliance.safetyMargin", "Biên an toàn MRL"),
            path: compliancePaths.safetyMargin,
            icon: ShieldCheck,
          },
          {
            label: t("nav.compliance.byproductMixing", "Trộn phụ phẩm theo giống"),
            path: compliancePaths.byproductMixing,
            permission: "byproduct.variety-policy.manage",
            icon: Scales,
          },
          {
            label: t("nav.export.plansPending"),
            path: exportPaths.pending,
            permission: "blend.approve",
            icon: Scales,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "CUSTOMER_EXPORT_OFFICER":
        return [
          {
            label: t(
              "nav.exportOfficer.home",
              "Điều phối Đơn hàng & Xuất khẩu",
            ),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.export.orders", "Đơn hàng & Điều phối"),
            path: exportPaths.orders,
            permission: "export-orders.read",
            icon: Export,
            isPrimary: true,
            activeMatch: (pathname: string) =>
              pathname.startsWith(exportPaths.orders) ||
              pathname.startsWith(exportPaths.plans) ||
              (pathname.startsWith(exportPaths.containers) && !pathname.includes("/dossier")),
          },
          {
            label: t("nav.export.dossiers", "Kho hồ sơ xuất khẩu"),
            path: exportPaths.dossiers,
            permission: "export-orders.read",
            icon: FileText,
            activeMatch: (pathname: string) =>
              pathname.startsWith(exportPaths.dossiers) || pathname.includes("/dossier"),
          },
          {
            label: t("nav.risk.holdAlerts", "Cảnh báo HOLD"),
            path: riskPaths.holds,
            icon: LockSimple,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: catalogsPaths.mrlVersions,
            permission: "mrl.read",
            icon: BookOpen,
          },
          {
            label: t("nav.compliance.labSamples", "Mẫu xét nghiệm"),
            path: compliancePaths.samples,
            permission: "lab.read",
            icon: Flask,
          },
          {
            label: t("nav.compliance.labResults", "Kết quả xét nghiệm"),
            path: compliancePaths.results,
            permission: "lab.read",
            icon: TestTube,
          },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];

      case "AUTHORIZED_STOCK_VIEWER":
        return [
          {
            label: t("nav.stockViewer.home", "Tổng quan tồn kho"),
            path: dashboardPaths.home,
            icon: House,
          },
          {
            label: t("nav.stock.overview", "Tồn kho theo vị trí"),
            path: millPaths.stock,
            icon: Package,
            isPrimary: true,
            activeMatch: isStockOverviewPath,
          },
        ];

      default:
        return [
          { label: t("nav.home", "Tổng quan"), path: dashboardPaths.home, icon: House },
          {
            label: t("nav.events", "Tìm sự kiện"),
            path: auditPaths.events,
            icon: MagnifyingGlass,
          },
        ];
    }
  }

export function getSidebarItems(
  role: UserRole,
  permissions: string[],
  t: TFunction,
  pendingOfflineCount: number,
  options?: { pendingAccess?: boolean },
): NavItem[] {
  if (options?.pendingAccess) {
    return [
      {
        label: t("nav.home", "Tổng quan"),
        path: dashboardPaths.home,
        icon: House,
      },
      {
        label: t("nav.profile", "Thông tin cá nhân"),
        path: authPaths.profile,
        icon: Users,
      },
    ];
  }
  const navItems = roleNavigation(role, t, pendingOfflineCount);
  if (
    role === "MILL_OPERATOR" ||
    (role === "MILL_MANAGER" && permissions.includes("holds.process"))
  ) {
    navItems.push({ label: t("workflows.transfer.title"), path: millPaths.stockTransfer, icon: Truck });
  }
  if ((role === "MILL_OPERATOR" && permissions.includes("conversions.write")) || (role === "MILL_MANAGER" && permissions.includes("conversions.confirm"))) navItems.push({ label: t("workflows.variance.title"), path: millPaths.varianceReview, icon: Scales });
  if (["CUSTOMER_MANAGER", "CUSTOMER_EXPORT_OFFICER", "CUSTOMER_PROCUREMENT_OFFICER"].includes(role)) navItems.push({ label: t("receivingThreshold.own"), path: adminPaths.companyReceivingThreshold, icon: Scales });
  if (role === "CUSTOMER_MANAGER" && permissions.includes("residue.evidence.manage")) navItems.push({ label: t("workflows.residue.title"), path: compliancePaths.residueEvidence, icon: Flask });
  if (role === "CUSTOMER_EXPORT_OFFICER" || role === "CUSTOMER_MANAGER" || role === "MILL_OPERATOR" || role === "MILL_MANAGER") {
    navItems.push({
      label: t("nav.export.preparation", "Chuẩn bị container"),
      path: exportPaths.preparation,
      icon: Package,
    });
  }
  if ((role === "CUSTOMER_MANAGER" || role === "MILL_ADMIN") &&
    (permissions.includes("trace.read.tenant") || permissions.includes("trace.read.all"))) {
    navItems.push({
      label: t("nav.risk.containerTrace", "Truy xuất nguồn container"),
      path: riskPaths.containerTrace,
      icon: Crosshair,
    });
  }
  if (permissions.includes("residue.company-policy.manage")) {
    navItems.push({
      label: t("apiAudit.policy.title"),
      path: compliancePaths.companyPolicies,
      icon: Flask,
    });
  }
  if (
    permissions.some((permission) =>
      [
        "residue.policy.manage",
        "residue.company-policy.manage",
        "residue.evaluate",
        "residue.evidence.manage",
      ].includes(permission),
    )
  ) {
    navItems.push({
      label: t("nav.compliance.residueProfiles", "Hồ sơ dư lượng"),
      path: compliancePaths.profiles,
      icon: Flask,
    });
  }
  if (
    !navItems.some((item) => item.path === millPaths.stock) &&
    permissions.some((permission) =>
      ["lots.read.all", "lots.read.facility", "lots.read.tenant"].includes(
        permission,
      ),
    )
  ) {
    navItems.push({
      label: t("nav.stock.ledger", "Tồn kho sổ cái"),
      path: millPaths.stock,
      icon: Package,
      activeMatch: isStockOverviewPath,
    });
  }

  return navItems.filter(item => !item.permission || permissions.includes(item.permission));
}
