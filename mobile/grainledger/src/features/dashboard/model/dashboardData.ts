// Copied web dashboard aggregation. null pending means the mobile offline queue is unavailable.
import { Decimal, formatMass } from "./mass";
import {
  normalizeUserRole,
  ROLE_DEFINITIONS,
  type UserRole,
} from "./roles";
import type { DashboardCollection, DashboardRow } from "../api/dashboardApi";
import {
  text,
  type Copy,
  type IconName,
  type Locale,
  type Source,
} from "./dashboardConfig";

export type DashboardData = Partial<Record<Source, DashboardCollection>>;
export type Tone = "primary" | "warning" | "danger" | "info";
export interface Metric {
  label: Copy;
  value: string | null;
  unit?: string;
  detail: string;
  source?: Source;
  icon: IconName;
  tone: Tone;
}
export interface ChartBar {
  label: string;
  value: string;
  mass?: boolean;
  tone: Tone;
}
export interface DashboardItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  status?: string;
  path: string;
  tone: Tone;
  date?: string;
}

export const str = (row: DashboardRow, key: string) =>
  typeof row[key] === "string" ? (row[key] as string) : "";
export const rows = (data: DashboardData, source: Source) =>
  data[source]?.items ?? [];
const count = (
  data: DashboardData,
  source: Source,
  predicate?: (row: DashboardRow) => boolean,
) =>
  !data[source]
    ? null
    : String(
        predicate
          ? rows(data, source).filter(predicate).length
          : (data[source]!.totalCount ?? rows(data, source).length),
      );
export function scopeNote(
  collection: DashboardCollection | undefined,
  locale: Locale,
) {
  if (!collection)
    return text(["Chưa có dữ liệu", "Data not available"], locale);
  const partial =
    collection.hasMore ||
    (collection.totalCount ?? 0) > collection.items.length;
  if (!partial)
    return text(
      [
        `Toàn bộ ${collection.items.length} bản ghi`,
        `All ${collection.items.length} records`,
      ],
      locale,
    );
  const size =
    collection.totalCount === null
      ? String(collection.items.length)
      : `${collection.items.length}/${collection.totalCount}`;
  return text(
    [
      `Mẫu ${size} bản ghi · chưa phải toàn bộ`,
      `Sample of ${size} records · partial dataset`,
    ],
    locale,
  );
}
function decimal(value: unknown): Decimal {
  return new Decimal(
    typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value) ? value : 0,
  );
}
export function sumField(items: DashboardRow[], key: string) {
  return items.reduce(
    (total, row) => total.plus(decimal(row[key])),
    new Decimal(0),
  );
}
export function stockMass(
  items: DashboardRow[],
  key: "quantityKg" | "availableKg",
) {
  return items.reduce(
    (sum, row) =>
      sum.plus(
        (Array.isArray(row.positions) ? row.positions : []).reduce(
          (amount: Decimal, position: DashboardRow) =>
            amount.plus(decimal(position[key])),
          new Decimal(0),
        ),
      ),
    new Decimal(0),
  );
}
const activeHold = (row: DashboardRow) =>
  ["ACTIVE", "ACKNOWLEDGED", "ISOLATED"].includes(str(row, "status"));
const pendingLab = (row: DashboardRow) =>
  row.confirmedAt == null &&
  !["CONFIRMED", "RETIRED", "REPLACED", "SUPERSEDED", "DELETED"].includes(
    str(row, "status"),
  );
const restricted = (row: DashboardRow) =>
  Array.isArray(row.restrictions) && row.restrictions.length > 0;
const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function shippingBucket(
  row: DashboardRow,
  now: Date,
): "past" | "current" | "soon" | "later" {
  const today = dayKey(now),
    soon = dayKey(new Date(now.getTime() + 7 * 86400000));
  if (str(row, "shippingTo") < today) return "past";
  if (str(row, "shippingFrom") <= today) return "current";
  return str(row, "shippingFrom") <= soon ? "soon" : "later";
}

export function getMetrics(
  role: UserRole,
  data: DashboardData,
  locale: Locale,
  pending: number | null,
  now: Date,
): Metric[] {
  const metric = (
    label: Copy,
    source: Source,
    icon: IconName,
    tone: Tone = "primary",
    predicate?: (row: DashboardRow) => boolean,
  ): Metric => ({
    label,
    source,
    icon,
    tone,
    value: count(data, source, predicate),
    detail:
      predicate || data[source]?.totalCount == null
        ? scopeNote(data[source], locale)
        : text(
            ["Trong phạm vi được cấp quyền", "Within your authorized scope"],
            locale,
          ),
  });
  const mass = (
    label: Copy,
    source: "stock" | "procurements" | "orders",
    key: string,
  ): Metric => ({
    label,
    source,
    icon: "scales",
    tone: "primary",
    value: data[source]
      ? formatMass(
          source === "stock"
            ? stockMass(
                rows(data, source),
                key === "quantityKg" ? "quantityKg" : "availableKg",
              )
            : sumField(rows(data, source), key),
          3,
          locale,
        )
      : null,
    unit: "kg",
    detail: scopeNote(data[source], locale),
  });
  switch (role) {
    case "MILL_ADMIN":
      return [
        metric(
          ["Doanh nghiệp khách hàng", "Customer organizations"],
          "organizations",
          "buildings",
          "primary",
          (row) => row.kind === "Customer",
        ),
        metric(
          ["Tài khoản đang hoạt động", "Active accounts"],
          "users",
          "users",
          "info",
          (row) => row.isActive === true,
        ),
        {
          ...metric(
            ["Cơ sở vận hành", "Operational facilities"],
            "setup",
            "factory",
            "primary",
            (row) => row.setupKind === "facility",
          ),
          detail: data.setup
            ? text(
                [
                  `${rows(data, "setup").filter((row) => row.setupKind === "location").length} vị trí · ${rows(data, "setup").filter((row) => row.setupKind === "equipment").length} thiết bị`,
                  `${rows(data, "setup").filter((row) => row.setupKind === "location").length} locations · ${rows(data, "setup").filter((row) => row.setupKind === "equipment").length} equipment items`,
                ],
                locale,
              )
            : scopeNote(undefined, locale),
        },
        metric(
          ["Tài khoản chưa phân vai trò", "Accounts without a role"],
          "users",
          "shield",
          "warning",
          (row) => !row.role,
        ),
      ];
    case "MILL_MANAGER":
      return [
        metric(
          ["Tiếp nhận cần xem xét", "Arrivals requiring review"],
          "receiving",
          "truck",
          "warning",
          (row) =>
            ["AWAITING_MANAGER_REVIEW", "BLOCKED_UNRESOLVED"].includes(
              str(row, "status"),
            ),
        ),
        metric(
          ["Yêu cầu sửa chờ đối soát", "Corrections awaiting review"],
          "corrections",
          "receipt",
          "info",
          (row) => row.status === "REQUESTED",
        ),
        metric(
          ["Lệnh HOLD đang xử lý", "Open holds"],
          "holds",
          "shield",
          "danger",
          activeHold,
        ),
        mass(
          ["Tồn khả dụng đã tải", "Loaded available stock"],
          "stock",
          "availableKg",
        ),
      ];
    case "MILL_OPERATOR":
      return [
        metric(
          ["Chuyến hàng chờ cân đến", "Arrivals awaiting measurement"],
          "receiving",
          "truck",
          "warning",
          (row) => row.status === "PENDING_ARRIVAL",
        ),
        metric(
          ["Công đoạn đang nháp", "Draft operations"],
          "operations",
          "factory",
          "info",
          (row) => row.status === "DRAFT",
        ),
        metric(
          ["Công đoạn đã ghi sổ", "Committed operations"],
          "operations",
          "receipt",
          "primary",
          (row) => row.status === "COMMITTED",
        ),
        mass(
          ["Tồn khả dụng đã tải", "Loaded available stock"],
          "stock",
          "availableKg",
        ),
      ];
    case "CUSTOMER_PROCUREMENT_OFFICER":
      return [
        metric(
          ["Phiếu thu mua", "Procurement receipts"],
          "procurements",
          "receipt",
        ),
        mass(
          ["Khối lượng phiếu đã tải", "Loaded procurement mass"],
          "procurements",
          "totalNetMassKg",
        ),
        {
          ...metric(["Nông hộ", "Farmers"], "farmers", "users", "info"),
          detail: data.plots
            ? text(
                [
                  `${count(data, "plots")} thửa ruộng${data.plots.totalCount === null ? " đã tải" : " trong phạm vi"}`,
                  `${count(data, "plots")} plots${data.plots.totalCount === null ? " loaded" : " in scope"}`,
                ],
                locale,
              )
            : scopeNote(data.farmers, locale),
        },
        {
          label: ["Phiếu chờ đồng bộ", "Receipts awaiting sync"],
          value: pending === null ? null : String(pending),
          icon: "sync",
          tone: pending ? "warning" : "primary",
          detail: pending === null
            ? text(["Hàng đợi ngoại tuyến chưa có trên ứng dụng", "Offline queue is not available on mobile yet"], locale)
            : text(["Hàng đợi trên thiết bị này", "Queue on this device"], locale),
        },
      ];
    case "CUSTOMER_MANAGER":
      return [
        metric(
          ["Chứng thư chờ xác nhận", "Reports awaiting confirmation"],
          "labs",
          "flask",
          "warning",
          pendingLab,
        ),
        metric(
          ["Lệnh HOLD đang xử lý", "Open holds"],
          "holds",
          "shield",
          "danger",
          activeHold,
        ),
        metric(
          ["Mẫu chưa bàn giao", "Samples without a handover"],
          "samples",
          "leaf",
          "info",
          (row) => row.handoverCount === 0,
        ),
        mass(
          ["Tồn khả dụng đã tải", "Loaded available stock"],
          "stock",
          "availableKg",
        ),
      ];
    case "CUSTOMER_EXPORT_OFFICER":
      return [
        metric(["Đơn hàng xuất khẩu", "Export orders"], "orders", "export"),
        metric(
          ["Cửa sổ xuất trong 7 ngày", "Shipping windows within 7 days"],
          "orders",
          "clock",
          "warning",
          (row) => ["current", "soon"].includes(shippingBucket(row, now)),
        ),
        mass(
          ["Nhu cầu đơn hàng đã tải", "Loaded order demand"],
          "orders",
          "requiredMassKg",
        ),
        mass(
          ["Tồn khả dụng đã tải", "Loaded available stock"],
          "stock",
          "availableKg",
        ),
      ];
    case "AUTHORIZED_STOCK_VIEWER":
      return [
        metric(["Lô trong phạm vi xem", "Authorized lots"], "stock", "package"),
        mass(
          ["Tồn vật lý đã tải", "Loaded physical stock"],
          "stock",
          "quantityKg",
        ),
        mass(
          ["Tồn khả dụng đã tải", "Loaded available stock"],
          "stock",
          "availableKg",
        ),
        metric(
          ["Lô có hạn chế", "Restricted lots"],
          "stock",
          "shield",
          "warning",
          restricted,
        ),
      ];
  }
}

const statuses: Record<string, Copy> = {
  PENDING_ARRIVAL: ["Chờ cân đến", "Awaiting arrival"],
  AWAITING_MANAGER_REVIEW: ["Chờ quản lý", "Awaiting review"],
  BLOCKED_UNRESOLVED: ["Chưa giải quyết", "Unresolved"],
  RECEIVED_MATCHED: ["Khớp khối lượng", "Matched"],
  RECEIVED_WITHIN_TOLERANCE: ["Trong ngưỡng", "Within tolerance"],
  RECEIVED_SHORTAGE_APPROVED: ["Chấp thuận thiếu hụt", "Shortage approved"],
  DRAFT: ["Bản nháp", "Draft"],
  COMMITTED: ["Đã ghi sổ", "Committed"],
  CORRECTED: ["Đã sửa đổi", "Corrected"],
  REQUESTED: ["Chờ đối soát", "Awaiting reconciliation"],
  RECONCILED: ["Đã đối soát", "Reconciled"],
  CANCELLED: ["Đã hủy", "Cancelled"],
  DRYING: ["Sấy", "Drying"],
  MILLING: ["Xay xát", "Milling"],
  MERGE: ["Gộp lô", "Merge"],
  BLENDING: ["Phối trộn", "Blending"],
  BAGGING: ["Đóng bao", "Bagging"],
  RAW_PADDY: ["Lúa tươi", "Raw paddy"],
  DRIED_PADDY: ["Lúa khô", "Dried paddy"],
  HEAD_RICE: ["Gạo nguyên", "Head rice"],
  BROKEN_RICE: ["Tấm", "Broken rice"],
  BRAN: ["Cám", "Bran"],
  HUSK: ["Trấu", "Husk"],
  BLENDED_RICE: ["Gạo phối trộn", "Blended rice"],
  BAGGED_RICE: ["Gạo đóng bao", "Bagged rice"],
  CONFIRMED: ["Đã xác nhận", "Confirmed"],
  PENDING_REVIEW: ["Chờ xác nhận", "Pending review"],
  UNRESOLVED: ["Chưa đối chiếu", "Unresolved"],
  ACTIVE: ["Đang hiệu lực", "Active"],
  ACKNOWLEDGED: ["Đã tiếp nhận", "Acknowledged"],
  ISOLATED: ["Đã cách ly", "Isolated"],
  RESPONDED: ["Đã phản hồi", "Responded"],
};
export const statusLabel = (value: string, locale: Locale) =>
  statuses[value] ? text(statuses[value], locale) : value;

export function chartSource(role: UserRole): Source {
  return role === "MILL_ADMIN"
    ? "users"
    : role === "MILL_MANAGER"
      ? "receiving"
      : role === "MILL_OPERATOR"
        ? "operations"
        : role === "CUSTOMER_PROCUREMENT_OFFICER"
          ? "procurements"
          : role === "CUSTOMER_MANAGER"
            ? "labs"
            : role === "CUSTOMER_EXPORT_OFFICER"
              ? "orders"
              : "stock";
}
export function getChart(
  role: UserRole,
  data: DashboardData,
  locale: Locale,
  now: Date,
): ChartBar[] {
  const source = chartSource(role),
    items = rows(data, source);
  const grouped = new Map<string, Decimal>();
  if (role === "CUSTOMER_PROCUREMENT_OFFICER") {
    for (let offset = 6; offset >= 0; offset--)
      grouped.set(
        dayKey(new Date(now.getTime() - offset * 86400000)),
        new Decimal(0),
      );
    for (const row of items) {
      const date = new Date(str(row, "receivedAt"));
      if (Number.isFinite(date.getTime())) {
        const key = dayKey(date);
        if (grouped.has(key))
          grouped.set(key, grouped.get(key)!.plus(decimal(row.totalNetMassKg)));
      }
    }
    return [...grouped].map(([label, value]) => ({
      label: label.slice(8) + "/" + label.slice(5, 7),
      value: value.toString(),
      mass: true,
      tone: "primary",
    }));
  }
  if (role === "CUSTOMER_EXPORT_OFFICER") {
    const labels: Record<string, Copy> = {
      current: ["Đang trong cửa sổ xuất", "Within shipping window"],
      soon: ["Bắt đầu trong 7 ngày", "Starts within 7 days"],
      later: ["Kế hoạch sắp tới", "Future windows"],
      past: ["Cửa sổ đã kết thúc", "Ended windows"],
    };
    return Object.entries(labels).map(([key, label]) => ({
      label: text(label, locale),
      value: String(
        items.filter((row) => shippingBucket(row, now) === key).length,
      ),
      tone: key === "current" ? "warning" : key === "past" ? "info" : "primary",
    }));
  }
  for (const row of items) {
    const key =
      role === "MILL_ADMIN"
        ? str(row, "role") || "UNASSIGNED"
        : role === "AUTHORIZED_STOCK_VIEWER"
          ? str(row, "stage")
          : role === "MILL_OPERATOR"
            ? str(row, "kind")
            : str(row, "status");
    grouped.set(
      key,
      (grouped.get(key) ?? new Decimal(0)).plus(
        role === "AUTHORIZED_STOCK_VIEWER" ? stockMass([row], "quantityKg") : 1,
      ),
    );
  }
  return [...grouped]
    .sort((a, b) => b[1].comparedTo(a[1]))
    .map(([key, value], index) => ({
      label:
        role === "MILL_ADMIN"
          ? key === "UNASSIGNED"
            ? text(["Chưa phân vai trò", "Unassigned"], locale)
            : ROLE_DEFINITIONS[normalizeUserRole(key)][
                locale === "vi" ? "labelVi" : "labelEn"
              ]
          : statusLabel(key, locale),
      value: value.toString(),
      mass: role === "AUTHORIZED_STOCK_VIEWER",
      tone:
        key.includes("BLOCKED") || key === "UNRESOLVED"
          ? "danger"
          : index % 3 === 1
            ? "warning"
            : index % 3 === 2
              ? "info"
              : "primary",
    }));
}

export function getPriorities(
  role: UserRole,
  data: DashboardData,
  locale: Locale,
  pending: number | null,
  now: Date,
): DashboardItem[] {
  const result: DashboardItem[] = [];
  const push = (
    source: Source,
    filter: (row: DashboardRow) => boolean,
    titleKey: string,
    detail: Copy,
    path: string,
    tone: Tone,
  ) => {
    for (const row of rows(data, source).filter(filter).slice(0, 4))
      result.push({
        id: `${source}-${str(row, "id")}`,
        title: str(row, titleKey) || text(detail, locale),
        detail: text(detail, locale),
        value: "",
        status: str(row, "status"),
        path:
          source === "labs"
            ? `${path}/${encodeURIComponent(str(row, "id"))}`
            : path,
        tone,
      });
  };
  if (role === "MILL_ADMIN")
    push(
      "users",
      (row) => !row.role || row.isActive === false,
      "email",
      [
        "Kiểm tra vai trò và trạng thái tài khoản",
        "Review account role and access status",
      ],
      "/admin/access",
      "warning",
    );
  if (role === "MILL_MANAGER" || role === "MILL_OPERATOR") {
    push(
      "receiving",
      (row) =>
        role === "MILL_OPERATOR"
          ? row.status === "PENDING_ARRIVAL"
          : ["AWAITING_MANAGER_REVIEW", "BLOCKED_UNRESOLVED"].includes(
              str(row, "status"),
            ),
      "code",
      role === "MILL_OPERATOR"
        ? ["Chờ ghi nhận cân đến", "Awaiting arrival measurement"]
        : ["Cần đối soát tiếp nhận", "Receiving review required"],
      "/mill/receiving",
      "warning",
    );
    if (role === "MILL_MANAGER")
      push(
        "corrections",
        (row) => row.status === "REQUESTED",
        "reason",
        ["Yêu cầu sửa đổi chờ đối soát", "Correction awaiting reconciliation"],
        "/mill/reconciliations",
        "info",
      );
    else
      push(
        "operations",
        (row) => row.status === "DRAFT",
        "kind",
        ["Công đoạn chưa ghi sổ", "Operation not yet committed"],
        "/mill/operations/new",
        "info",
      );
  }
  if (role === "CUSTOMER_PROCUREMENT_OFFICER" && pending !== null && pending > 0)
    result.push({
      id: "offline",
      title: text(
        [`${pending} phiếu chờ đồng bộ`, `${pending} receipts awaiting sync`],
        locale,
      ),
      detail: text(
        ["Kiểm tra hàng đợi trên thiết bị", "Review the queue on this device"],
        locale,
      ),
      value: String(pending),
      path: "/field/sync",
      tone: "warning",
    });
  if (role === "CUSTOMER_MANAGER") {
    push(
      "labs",
      pendingLab,
      "reportNumber",
      ["Chứng thư cần đối chiếu", "Report awaiting confirmation"],
      "/compliance/lab-results",
      "warning",
    );
    push(
      "holds",
      activeHold,
      "lotCode",
      ["Lô hàng đang chịu lệnh HOLD", "Lot under an open hold"],
      "/risk/holds",
      "danger",
    );
  }
  if (role === "CUSTOMER_EXPORT_OFFICER")
    push(
      "orders",
      (row) => ["current", "soon"].includes(shippingBucket(row, now)),
      "code",
      ["Cửa sổ xuất hàng đang đến gần", "Shipping window is approaching"],
      "/export/orders",
      "warning",
    );
  if (role === "AUTHORIZED_STOCK_VIEWER")
    for (const row of rows(data, "stock").filter(restricted).slice(0, 5))
      result.push({
        id: str(row, "id"),
        title: str(row, "code"),
        detail: (row.restrictions as string[])
          .map((value) =>
            value === "HOLD"
              ? "HOLD"
              : value === "CORRECTION"
                ? text(["Đang sửa đổi", "Correction"], locale)
                : value === "RECEIVING_DISCREPANCY"
                  ? text(
                      ["Chênh lệch tiếp nhận", "Receiving discrepancy"],
                      locale,
                    )
                  : value,
          )
          .join(" · "),
        value: "",
        path: `/stock?search=${encodeURIComponent(str(row, "code"))}`,
        tone: "warning",
      });
  return result.slice(0, 5);
}

export function listSource(role: UserRole): Source {
  return role === "MILL_ADMIN"
    ? "users"
    : role === "MILL_MANAGER" || role === "MILL_OPERATOR"
      ? "operations"
      : role === "CUSTOMER_PROCUREMENT_OFFICER"
        ? "procurements"
        : role === "CUSTOMER_MANAGER"
          ? "labs"
          : role === "CUSTOMER_EXPORT_OFFICER"
            ? "orders"
            : "stock";
}
export function getList(
  role: UserRole,
  data: DashboardData,
  locale: Locale,
): DashboardItem[] {
  return rows(data, listSource(role))
    .slice(0, 6)
    .map((row) => {
      const id = str(row, "id"),
        status = str(row, "status");
      if (role === "MILL_ADMIN")
        return {
          id,
          title: str(row, "displayName") || str(row, "email"),
          detail: str(row, "email"),
          value: row.role
            ? ROLE_DEFINITIONS[normalizeUserRole(str(row, "role"))][
                locale === "vi" ? "labelVi" : "labelEn"
              ]
            : text(["Chưa phân vai trò", "Unassigned"], locale),
          status: row.isActive ? "ACTIVE" : "INACTIVE",
          path: "/admin/access",
          tone: row.isActive ? "primary" : "warning",
        };
      if (role === "MILL_MANAGER" || role === "MILL_OPERATOR")
        return {
          id,
          title: statusLabel(str(row, "kind"), locale),
          detail: str(row, "ownerName") || id.slice(0, 8),
          value: "",
          date: str(row, "occurredAt"),
          status,
          path: "/events",
          tone: status === "DRAFT" ? "warning" : "primary",
        };
      if (role === "CUSTOMER_PROCUREMENT_OFFICER")
        return {
          id,
          title: str(row, "code"),
          detail: str(row, "farmerName"),
          value: `${formatMass(str(row, "totalNetMassKg"), 3, locale)} kg`,
          status,
          date: str(row, "receivedAt"),
          path: "/field/receipts/new",
          tone: "primary",
        };
      if (role === "CUSTOMER_MANAGER")
        return {
          id,
          title: str(row, "reportNumber"),
          detail: str(row, "laboratoryName"),
          value: str(row, "assessmentStatus"),
          status,
          date: str(row, "issuedOn"),
          path: `/compliance/lab-results/${encodeURIComponent(id)}`,
          tone: pendingLab(row) ? "warning" : "primary",
        };
      if (role === "CUSTOMER_EXPORT_OFFICER")
        return {
          id,
          title: str(row, "code"),
          detail: `${str(row, "shippingFrom")} → ${str(row, "shippingTo")}`,
          value: `${formatMass(str(row, "requiredMassKg"), 3, locale)} kg`,
          path: "/export/orders",
          tone: "info",
        };
      return {
        id,
        title: str(row, "code"),
        detail: statusLabel(str(row, "stage"), locale),
        value: `${formatMass(stockMass([row], "availableKg"), 3, locale)} kg`,
        status: restricted(row) ? "RESTRICTED" : "AVAILABLE",
        path: `/stock?search=${encodeURIComponent(str(row, "code"))}`,
        tone: restricted(row) ? "warning" : "primary",
      };
    });
}
