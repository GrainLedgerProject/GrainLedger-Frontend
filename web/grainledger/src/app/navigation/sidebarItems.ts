import { dashboardPaths } from "@/features/dashboard/paths";
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
  ChartPieSlice,
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

interface NavItem {
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
}

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
            icon: BookOpen,
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
          },
          {
            label: t("nav.mill.corrections", "Yêu cầu sửa"),
            path: millPaths.requestCorrection,
            permission: requestCorrectionPermission,
            icon: ClockCounterClockwise,
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
            label: t("nav.mill.operations", "Ghi bước chế biến"),
            path: millPaths.operation,
            icon: Factory,
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
            label: t("nav.export.plansPending", "Duyệt phương án"),
            path: exportPaths.pending,
            icon: CheckSquare,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: catalogsPaths.mrlVersions,
            icon: BookOpen,
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
            label: t("nav.export.orders", "Đơn xuất khẩu"),
            path: exportPaths.orders,
            icon: Export,
            isPrimary: true,
          },
          {
            label: t("nav.export.plans", "Yêu cầu phương án"),
            path: exportPaths.plans,
            icon: ChartPieSlice,
          },
          {
            label: t("nav.export.containers", "Xếp container"),
            path: exportPaths.containers,
            icon: Truck,
          },
          {
            label: t("nav.export.dossiers", "Hồ sơ & Chứng từ"),
            path: exportPaths.dossiers,
            icon: FileText,
          },
          {
            label: t("nav.risk.holdAlerts", "Cảnh báo HOLD"),
            path: riskPaths.holds,
            icon: LockSimple,
          },
          {
            label: t("nav.compliance.mrlVersions", "Phiên bản MRL"),
            path: catalogsPaths.mrlVersions,
            icon: BookOpen,
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

export function getSidebarItems(role: UserRole, permissions: string[], t: TFunction, pendingOfflineCount: number) {
  const navItems = roleNavigation(role, t, pendingOfflineCount);
  if (permissions.includes("residue.company-policy.manage")) {
    navItems.push({
      label: t("apiAudit.policy.title"),
      path: compliancePaths.companyPolicies,
      icon: Flask,
    });
  }
  if (
    permissions.includes("export-orders.read") &&
    !navItems.some((item) => item.path === exportPaths.pending)
  ) {
    navItems.push({
      label: t("nav.export.plansPending", "Duyệt phương án"),
      path: exportPaths.pending,
      icon: CheckSquare,
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

  return navItems.filter(item => !item.permission || permissions.includes(item.permission));
}
