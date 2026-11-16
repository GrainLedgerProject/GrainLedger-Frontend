import type { Source } from "@/features/dashboard/model/dashboardConfig";
import type { UserRole } from "@/shared/types/roles";

// Synthetic, isolated data shared by regression tests and the developer preview.
export const dashboardPermissions: Record<UserRole, string[]> = {
  MILL_ADMIN: [
    "identity.manage",
    "platform.configure",
    "residue.policy.manage",
  ],
  MILL_MANAGER: [
    "platform.read",
    "lots.read.all",
    "conversions.read",
    "corrections.reconcile",
    "receiving.reconcile",
    "holds.process",
  ],
  MILL_OPERATOR: [
    "platform.read",
    "lots.read.facility",
    "lots.receive",
    "conversions.write",
  ],
  CUSTOMER_PROCUREMENT_OFFICER: ["farms.write", "purchases.write"],
  CUSTOMER_MANAGER: [
    "lots.read.tenant",
    "lab.write",
    "blend.approve",
    "holds.manage",
    "trace.read.tenant",
    "export-orders.read",
  ],
  CUSTOMER_EXPORT_OFFICER: [
    "lots.read.tenant",
    "lab.read",
    "blend.propose",
    "export-orders.read",
  ],
  AUTHORIZED_STOCK_VIEWER: [],
};
const page = (items: unknown[], totalCount = items.length) => ({
  items,
  totalCount,
  hasMore: totalCount > items.length,
});
export const dashboardFixtures: Record<Source, unknown> = {
  organizations: [
    { id: "org-mill", name: "Nhà máy minh họa", kind: "Mill" },
    { id: "org-1", name: "Doanh nghiệp An Hòa", kind: "Customer" },
    { id: "org-2", name: "Doanh nghiệp Sông Xanh", kind: "Customer" },
  ],
  users: [
    {
      id: "user-1",
      email: "manager@example.test",
      displayName: "Nguyễn An",
      role: "MillManager",
      isActive: true,
    },
    {
      id: "user-2",
      email: "operator@example.test",
      displayName: "Trần Bình",
      role: "MillOperator",
      isActive: true,
    },
    {
      id: "user-3",
      email: "operator2@example.test",
      displayName: "Lê Cường",
      role: "MillOperator",
      isActive: true,
    },
    {
      id: "user-4",
      email: "quality@example.test",
      displayName: "Phạm Dung",
      role: "CustomerManager",
      isActive: true,
    },
    {
      id: "user-5",
      email: "new@example.test",
      displayName: "Tài khoản mới",
      role: null,
      isActive: false,
    },
  ],
  setup: {
    facilities: [
      { id: "facility-1", name: "Nhà máy Tiền Giang" },
      { id: "facility-2", name: "Trạm An Giang" },
    ],
    locations: [{ id: "location-1", name: "Silo 01" }],
    equipment: [{ id: "equipment-1", name: "Cân xe" }],
  },
  stock: page(
    [
      {
        id: "lot-1",
        code: "LOT-LUA-001",
        stage: "RAW_PADDY",
        restrictions: [],
        positions: [
          {
            facilityId: "facility-1",
            locationId: "silo-1",
            quantityKg: "32000.100001",
            availableKg: "28000.100001",
          },
          {
            facilityId: "facility-2",
            locationId: "silo-2",
            quantityKg: "5000.200002",
            availableKg: "5000.200002",
          },
        ],
      },
      {
        id: "lot-2",
        code: "LOT-GAO-002",
        stage: "HEAD_RICE",
        restrictions: ["HOLD"],
        positions: [
          {
            facilityId: "facility-1",
            locationId: "silo-3",
            quantityKg: "18500.000000",
            availableKg: "0.000000",
          },
        ],
      },
      {
        id: "lot-3",
        code: "LOT-GAO-003",
        stage: "BAGGED_RICE",
        restrictions: [],
        positions: [
          {
            facilityId: "facility-1",
            locationId: "warehouse-1",
            quantityKg: "25000.000000",
            availableKg: "25000.000000",
          },
        ],
      },
      {
        id: "lot-4",
        code: "LOT-LUA-004",
        stage: "DRIED_PADDY",
        restrictions: [],
        positions: [
          {
            facilityId: "facility-1",
            locationId: "silo-4",
            quantityKg: "42000.000000",
            availableKg: "35000.000000",
          },
        ],
      },
    ],
    48,
  ),
  receiving: page(
    [
      {
        id: "receipt-1",
        code: "PRC-20261116-001",
        status: "PENDING_ARRIVAL",
        expectedTotalKg: "15000.000000",
        receivedAt: "2026-11-16T03:00:00Z",
      },
      {
        id: "receipt-2",
        code: "PRC-20261116-002",
        status: "AWAITING_MANAGER_REVIEW",
        expectedTotalKg: "12000.000000",
        receivedAt: "2026-11-16T02:00:00Z",
      },
      {
        id: "receipt-3",
        code: "PRC-20261116-003",
        status: "RECEIVED_MATCHED",
        expectedTotalKg: "18000.000000",
        receivedAt: "2026-11-16T01:00:00Z",
      },
      {
        id: "receipt-4",
        code: "PRC-20261116-004",
        status: "RECEIVED_WITHIN_TOLERANCE",
        expectedTotalKg: "20000.000000",
        receivedAt: "2026-11-15T23:00:00Z",
      },
    ],
    36,
  ),
  operations: page(
    [
      {
        id: "op-1",
        kind: "DRYING",
        status: "DRAFT",
        ownerName: "Doanh nghiệp An Hòa",
        occurredAt: "2026-11-16T04:00:00Z",
      },
      {
        id: "op-2",
        kind: "MILLING",
        status: "COMMITTED",
        ownerName: "Doanh nghiệp Sông Xanh",
        occurredAt: "2026-11-16T03:00:00Z",
      },
      {
        id: "op-3",
        kind: "DRYING",
        status: "COMMITTED",
        ownerName: "Doanh nghiệp An Hòa",
        occurredAt: "2026-11-16T02:00:00Z",
      },
      {
        id: "op-4",
        kind: "BAGGING",
        status: "COMMITTED",
        ownerName: "Doanh nghiệp An Hòa",
        occurredAt: "2026-11-16T01:00:00Z",
      },
    ],
    80,
  ),
  corrections: page([
    {
      id: "correction-1",
      status: "REQUESTED",
      reason: "Đối chiếu lại khối lượng đầu ra",
    },
  ]),
  holds: page([
    {
      id: "hold-1",
      status: "ACTIVE",
      lotCode: "LOT-GAO-002",
      reason: "Đang chờ đối chiếu chứng thư",
    },
  ]),
  farmers: page(
    [{ id: "farmer-1", name: "Nông hộ minh họa", code: "FRM-001" }],
    128,
  ),
  plots: page([{ id: "plot-1", code: "PLT-001", areaHa: 2.5 }], 247),
  procurements: page(
    Array.from({ length: 7 }, (_, index) => ({
      id: `proc-${index}`,
      code: `PRC-202611${16 - index}-001`,
      farmerName: ["Nông hộ An Hòa", "Nông hộ Bình Minh"][index % 2],
      totalNetMassKg: [
        "18000",
        "12000",
        "22000",
        "9500",
        "24000",
        "16500",
        "11000",
      ][index],
      receivedAt: `2026-11-${16 - index}T02:00:00Z`,
      status: "COMMITTED",
    })),
    72,
  ),
  labs: page([
    {
      id: "report-1",
      reportNumber: "LAB-2026-001",
      laboratoryName: "Phòng lab minh họa",
      status: "PENDING_REVIEW",
      confirmedAt: null,
      assessmentStatus: "INCOMPLETE",
      issuedOn: "2026-11-16",
    },
    {
      id: "report-2",
      reportNumber: "LAB-2026-002",
      laboratoryName: "Phòng lab minh họa",
      status: "CONFIRMED",
      confirmedAt: "2026-11-15T03:00:00Z",
      assessmentStatus: "NOT_ASSESSED",
      issuedOn: "2026-11-15",
    },
    {
      id: "report-3",
      reportNumber: "LAB-2026-003",
      laboratoryName: "Phòng lab minh họa",
      status: "UNRESOLVED",
      confirmedAt: null,
      assessmentStatus: "INCOMPLETE",
      issuedOn: "2026-11-14",
    },
  ]),
  samples: page([
    { id: "sample-1", code: "SMP-20261116-001", handoverCount: 0 },
    { id: "sample-2", code: "SMP-20261115-002", handoverCount: 1 },
  ]),
  orders: page(
    [
      {
        id: "order-1",
        code: "EXP-2026-001",
        requiredMassKg: "50000",
        shippingFrom: "2026-11-16",
        shippingTo: "2026-11-20",
      },
      {
        id: "order-2",
        code: "EXP-2026-002",
        requiredMassKg: "25000",
        shippingFrom: "2026-11-20",
        shippingTo: "2026-11-24",
      },
      {
        id: "order-3",
        code: "EXP-2026-003",
        requiredMassKg: "75000",
        shippingFrom: "2026-12-01",
        shippingTo: "2026-12-05",
      },
    ],
    18,
  ),
};
export const dashboardPaths: Record<string, Source> = {
  "/api/admin/organizations": "organizations",
  "/api/admin/users": "users",
  "/api/ledger/setup": "setup",
  "/api/ledger/lots": "stock",
  "/api/ledger/receiving-tasks": "receiving",
  "/api/ledger/operations": "operations",
  "/api/ledger/corrections": "corrections",
  "/api/ledger/holds": "holds",
  "/api/farmers": "farmers",
  "/api/plots": "plots",
  "/api/procurements": "procurements",
  "/api/lab-reports": "labs",
  "/api/samples": "samples",
  "/api/export-orders": "orders",
};
