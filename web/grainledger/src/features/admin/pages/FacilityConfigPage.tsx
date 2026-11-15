import { ledgerEndpoints } from "@/api/ledger";
import { confirmAction, toast } from "@/app/store/feedbackStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal/Modal";
import {
  ArrowsClockwise,
  Broom,
  Buildings,
  CheckCircle,
  Copy,
  Info,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Power,
  Scales,
  ShieldWarning,
  Trash,
  Warehouse,
  WarningCircle,
  Wrench,
  X,
} from "@phosphor-icons/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface FacilityDto {
  id: string;
  name: string;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy?: string;
}

export interface LocationDto {
  id: string;
  facilityId: string;
  name: string;
  kind: "STORE" | "ISOLATION" | string;
  cleared: boolean;
  mixedBulk: boolean;
  ownerId: string | null;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy?: string;
  poolRevision?: string | null;
  currentPoolLotId?: string | null;
}

export interface EquipmentDto {
  id: string;
  facilityId: string;
  name: string;
  version: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canRetire?: boolean;
  createdBy?: string;
}

export interface PolicyDto {
  id: string;
  facilityId: string;
  kind: "DRYING" | "MILLING" | "MERGE" | "BLENDING" | "BAGGING" | string;
  tolerancePercent: string;
  effectiveFrom: string;
  evidenceId: string;
}

export interface SetupApiResponse {
  facilities?: FacilityDto[];
  locations?: LocationDto[];
  equipment?: EquipmentDto[];
  policies?: PolicyDto[];
  commodities?: unknown[];
  assignments?: unknown[];
  owners?: unknown[];
  compatibilities?: unknown[];
  mixedBulkPolicies?: unknown[];
}

const POLICY_KIND_LABELS: Record<string, { label: string; color: string }> = {
  DRYING: {
    label: "Sấy lúa tươi (Drying)",
    color: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  },
  MILLING: {
    label: "Xay xát bóc vỏ (Milling)",
    color: "text-blue-700 bg-blue-500/10 border-blue-500/20",
  },
  MERGE: {
    label: "Ghép mẻ đồng nhất (Merge)",
    color: "text-purple-700 bg-purple-500/10 border-purple-500/20",
  },
  BLENDING: {
    label: "Phối trộn cơ học (Blending)",
    color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  },
  BAGGING: {
    label: "Đóng bao & Container (Bagging)",
    color: "text-indigo-700 bg-indigo-500/10 border-indigo-500/20",
  },
};

export const FacilityConfigPage: React.FC = () => {
  const { t } = useTranslation();

  // Primary Data from API
  const [facilities, setFacilities] = useState<FacilityDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [equipment, setEquipment] = useState<EquipmentDto[]>([]);
  const [policies, setPolicies] = useState<PolicyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View & Filter States
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "locations" | "equipment" | "policies"
  >("locations");
  const [locationKindFilter, setLocationKindFilter] = useState<
    "ALL" | "STORE" | "ISOLATION"
  >("ALL");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "FACILITY" | "LOCATION" | "EQUIPMENT"
  >("FACILITY");
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formKind, setFormKind] = useState<"STORE" | "ISOLATION">("STORE");
  const [formMixedBulk, setFormMixedBulk] = useState(false);

  // Clearance Modal State
  const [clearanceTarget, setClearanceTarget] = useState<LocationDto | null>(
    null,
  );
  const [clearanceReason, setClearanceReason] = useState("");
  const [clearanceEvidenceId, setClearanceEvidenceId] = useState("");
  const [submittingClearance, setSubmittingClearance] = useState(false);

  // Manual reload function with feedback
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await ledgerEndpoints.getSetup()) as SetupApiResponse;
      if (res && typeof res === "object") {
        setFacilities(Array.isArray(res.facilities) ? res.facilities : []);
        setLocations(Array.isArray(res.locations) ? res.locations : []);
        setEquipment(Array.isArray(res.equipment) ? res.equipment : []);
        setPolicies(Array.isArray(res.policies) ? res.policies : []);
      } else {
        setFacilities([]);
        setLocations([]);
        setEquipment([]);
        setPolicies([]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "admin.facility.errorLoad",
              "Không thể tải cấu hình cơ sở & vị trí lưu trữ.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Async component initialization with active cancellation (Zero ESLint warning)
  useEffect(() => {
    let active = true;

    async function initSetup() {
      try {
        const res = (await ledgerEndpoints.getSetup()) as SetupApiResponse;
        if (!active) return;
        if (res && typeof res === "object") {
          setFacilities(Array.isArray(res.facilities) ? res.facilities : []);
          setLocations(Array.isArray(res.locations) ? res.locations : []);
          setEquipment(Array.isArray(res.equipment) ? res.equipment : []);
          setPolicies(Array.isArray(res.policies) ? res.policies : []);
        } else {
          setFacilities([]);
          setLocations([]);
          setEquipment([]);
          setPolicies([]);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : t(
                "admin.facility.errorLoad",
                "Không thể tải cấu hình cơ sở & vị trí lưu trữ.",
              ),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initSetup();

    return () => {
      active = false;
    };
  }, [t]);

  // Filtered Facilities and items
  const filteredFacilities = useMemo(() => {
    if (selectedFacilityId === "ALL") return facilities;
    return facilities.filter((f) => f.id === selectedFacilityId);
  }, [facilities, selectedFacilityId]);

  const activeFacility = useMemo(() => {
    if (selectedFacilityId === "ALL") return facilities[0] || null;
    return facilities.find((f) => f.id === selectedFacilityId) || null;
  }, [facilities, selectedFacilityId]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalFacilities = facilities.length;
    const totalLocations = locations.length;
    const storeCount = locations.filter((l) => l.kind === "STORE").length;
    const isolationCount = locations.filter(
      (l) => l.kind === "ISOLATION",
    ).length;
    const clearedLocations = locations.filter((l) => l.cleared).length;
    const totalEquipment = equipment.length;
    const activeEquipment = equipment.filter(
      (e) => e.canRetire !== false,
    ).length;
    const clearanceRate =
      totalLocations > 0
        ? Math.round((clearedLocations / totalLocations) * 100)
        : 100;

    return {
      totalFacilities,
      totalLocations,
      storeCount,
      isolationCount,
      clearedLocations,
      clearanceRate,
      totalEquipment,
      activeEquipment,
    };
  }, [facilities, locations, equipment]);

  // Open Add Modal
  const handleOpenAdd = (
    type: "FACILITY" | "LOCATION" | "EQUIPMENT",
    defaultFacId?: string,
  ) => {
    setModalType(type);
    setIsEdit(false);
    setEditingId(null);
    setEditingVersion("");
    setModalError(null);
    setFormName("");
    setFormFacilityId(
      defaultFacId || activeFacility?.id || facilities[0]?.id || "",
    );
    setFormKind("STORE");
    setFormMixedBulk(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditFacility = (facility: FacilityDto) => {
    setModalType("FACILITY");
    setIsEdit(true);
    setEditingId(facility.id);
    setEditingVersion(facility.version);
    setModalError(null);
    setFormName(facility.name);
    setIsModalOpen(true);
  };

  const handleOpenEditLocation = (location: LocationDto) => {
    setModalType("LOCATION");
    setIsEdit(true);
    setEditingId(location.id);
    setEditingVersion(location.version);
    setModalError(null);
    setFormName(location.name);
    setFormFacilityId(location.facilityId);
    setFormKind(location.kind === "ISOLATION" ? "ISOLATION" : "STORE");
    setFormMixedBulk(location.mixedBulk);
    setIsModalOpen(true);
  };

  const handleOpenEditEquipment = (item: EquipmentDto) => {
    setModalType("EQUIPMENT");
    setIsEdit(true);
    setEditingId(item.id);
    setEditingVersion(item.version);
    setModalError(null);
    setFormName(item.name);
    setFormFacilityId(item.facilityId);
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError("Vui lòng nhập tên.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      if (modalType === "FACILITY") {
        if (isEdit && editingId) {
          await ledgerEndpoints.updateFacility(editingId, {
            name: formName.trim(),
            version: editingVersion,
          });
          toast.success(`Đã cập nhật nhà máy "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createFacility({
            name: formName.trim(),
          });
          toast.success(`Đã thêm nhà máy "${formName}" thành công.`);
        }
      } else if (modalType === "LOCATION") {
        if (!formFacilityId) {
          setModalError("Vui lòng chọn cơ sở nhà máy trực thuộc.");
          return;
        }
        if (isEdit && editingId) {
          await ledgerEndpoints.updateLocation(editingId, {
            facilityId: formFacilityId,
            name: formName.trim(),
            kind: formKind,
            version: editingVersion,
            mixedBulk: formMixedBulk,
          });
          toast.success(`Đã cập nhật vị trí "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createLocation({
            facilityId: formFacilityId,
            name: formName.trim(),
            kind: formKind,
            mixedBulk: formMixedBulk,
          });
          toast.success(`Đã tạo vị trí lưu trữ "${formName}" thành công.`);
        }
      } else {
        // EQUIPMENT
        if (!formFacilityId) {
          setModalError("Vui lòng chọn cơ sở nhà máy trực thuộc.");
          return;
        }
        if (isEdit && editingId) {
          await ledgerEndpoints.updateEquipment(editingId, {
            facilityId: formFacilityId,
            name: formName.trim(),
            version: editingVersion,
          });
          toast.success(`Đã cập nhật thiết bị "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createEquipment({
            facilityId: formFacilityId,
            name: formName.trim(),
          });
          toast.success(`Đã thêm thiết bị "${formName}" thành công.`);
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setModalError(
        err instanceof Error ? err.message : "Thao tác không thành công.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handlers
  const handleDeleteFacility = async (fac: FacilityDto) => {
    const confirmed = await confirmAction({
      title: "Xóa Nhà máy",
      description: `Bạn có chắc chắn muốn xóa cơ sở "${fac.name}"? Chỉ có thể xóa khi nhà máy chưa phát sinh giao dịch tồn kho liên kết.`,
      confirmLabel: "Xóa cơ sở",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await ledgerEndpoints.deleteFacility(fac.id, { version: fac.version });
      toast.success(`Đã xóa nhà máy "${fac.name}".`);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa cơ sở nhà máy.",
      );
    }
  };

  const handleDeleteLocation = async (loc: LocationDto) => {
    const confirmed = await confirmAction({
      title: "Xóa Vị trí Lưu trữ",
      description: `Bạn có chắc chắn muốn xóa vị trí "${loc.name}"? Chỉ có thể xóa khi vị trí không còn tồn kho và chưa có bút toán tham chiếu.`,
      confirmLabel: "Xóa vị trí",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await ledgerEndpoints.deleteLocation(loc.id, { version: loc.version });
      toast.success(`Đã xóa vị trí "${loc.name}".`);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa vị trí lưu trữ.",
      );
    }
  };

  const handleDeleteEquipment = async (eq: EquipmentDto) => {
    const confirmed = await confirmAction({
      title: "Xóa Thiết bị",
      description: `Bạn có chắc chắn muốn xóa thiết bị "${eq.name}" khỏi danh mục vận hành?`,
      confirmLabel: "Xóa thiết bị",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await ledgerEndpoints.deleteEquipment(eq.id, { version: eq.version });
      toast.success(`Đã xóa thiết bị "${eq.name}".`);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xóa thiết bị.",
      );
    }
  };

  const handleRetireEquipment = async (eq: EquipmentDto) => {
    const confirmed = await confirmAction({
      title: "Ngừng vận hành Thiết bị",
      description: `Xác nhận ngừng vận hành thiết bị "${eq.name}"? Thiết bị sẽ chuyển sang trạng thái đã ngưng hoạt động (Retired).`,
      confirmLabel: "Ngừng vận hành",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      await ledgerEndpoints.retireEquipment(eq.id, { version: eq.version });
      toast.success(`Đã ngừng vận hành thiết bị "${eq.name}".`);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể ngừng vận hành thiết bị.",
      );
    }
  };

  // Clearance (Vệ sinh Silo / giải phóng mặt bằng)
  const handleOpenClearance = (loc: LocationDto) => {
    setClearanceTarget(loc);
    setClearanceReason(
      "Đã xuất hết lô hàng và hoàn tất quét hút bụi sạch mặt bằng Silo.",
    );
    // Pre-populate evidenceId from first matching policy evidence or leave blank for user
    const defaultEv =
      policies.find((p) => p.facilityId === loc.facilityId)?.evidenceId || "";
    setClearanceEvidenceId(defaultEv);
  };

  const handleConfirmClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceTarget) return;
    if (!clearanceReason.trim()) {
      toast.warning("Vui lòng nhập lý do giải phóng / vệ sinh mặt bằng.");
      return;
    }

    try {
      setSubmittingClearance(true);
      await ledgerEndpoints.clearLocation(clearanceTarget.id, {
        evidenceId: clearanceEvidenceId.trim() || undefined,
        reason: clearanceReason.trim(),
      });
      toast.success(
        `Đã xác nhận vệ sinh & giải phóng mặt bằng cho "${clearanceTarget.name}" thành công.`,
      );
      setClearanceTarget(null);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể thực hiện giải phóng mặt bằng.",
      );
    } finally {
      setSubmittingClearance(false);
    }
  };

  const handleCopyId = (id: string, label: string) => {
    void navigator.clipboard.writeText(id);
    toast.info(`Đã sao chép mã ${label}: ${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider block">
            {t(
              "admin.facility.tag",
              "CẤU HÌNH NHÀ MÁY, SILO & THIẾT BỊ VẬN HÀNH",
            )}
          </span>
          <h1 className="text-2xl font-display font-bold text-ink-primary mt-1">
            {t("admin.facility.title", "Cơ sở Vật chất & Vị trí Lưu trữ Silo")}
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "admin.facility.subtitle",
              "Sơ đồ cấu hình cơ sở chế biến, danh sách Silo kho lưu trữ và dây chuyền thiết bị hạch toán dòng chảy cân bằng khối lượng (Mass Balance).",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50"
            title={t("common.reload", "Tải lại dữ liệu từ máy chủ")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "animate-spin text-accent-primary" : ""}
            />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd("FACILITY")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-50"
          >
            <Buildings size={15} />
            <span>Thêm Nhà máy</span>
          </button>
          {/* <button
            type="button"
            onClick={() => handleOpenAdd("LOCATION")}
            disabled={facilities.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-50"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm Silo / Kho chứa</span>
          </button> */}
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Cơ sở Nhà máy</span>
            <Buildings size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalFacilities}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            Đang được kích hoạt trên hệ thống
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Vị trí & Silo kho</span>
            <Warehouse size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalLocations}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.storeCount} Kho/Silo · {stats.isolationCount} Khu cách ly
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Mặt bằng sẵn sàng</span>
            <CheckCircle size={16} className="text-functional-balanced" />
          </div>
          <div className="text-2xl font-display font-bold text-functional-balanced font-mono">
            {stats.clearanceRate}%
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.clearedLocations}/{stats.totalLocations} vị trí đã vệ sinh
            sạch
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Máy móc & Thiết bị</span>
            <Wrench size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalEquipment}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.activeEquipment} thiết bị đang vận hành
          </p>
        </div>
      </div>

      {/* Control Bar: Facility Selector + Search */}
      <div className="p-3.5 rounded-2xl bg-surface-base border border-ink-tertiary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-ink-secondary shrink-0">
            Xem theo cơ sở:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFacilityId("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              selectedFacilityId === "ALL"
                ? "bg-accent-primary text-white"
                : "bg-surface-raised text-ink-secondary hover:text-ink-primary border border-ink-tertiary/15"
            }`}
          >
            Tất cả ({facilities.length})
          </button>
          {facilities.map((fac) => (
            <button
              key={fac.id}
              type="button"
              onClick={() => setSelectedFacilityId(fac.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFacilityId === fac.id
                  ? "bg-accent-primary text-white"
                  : "bg-surface-raised text-ink-secondary hover:text-ink-primary border border-ink-tertiary/15"
              }`}
            >
              {fac.name}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên Silo, kho hoặc thiết bị..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none placeholder:text-ink-tertiary focus:rounded-full"
          />
        </div>
      </div>

      {/* Main Facilities Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <GrainLoader label="Đang kiểm tra sơ đồ cơ sở & vị trí lưu trữ từ sổ cái..." />
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-base border border-dashed border-ink-tertiary/25 text-ink-secondary text-sm space-y-3">
          <Buildings size={36} className="mx-auto text-ink-tertiary" />
          <p className="font-semibold text-ink-primary">
            Chưa có cơ sở nhà máy nào được ghi nhận
          </p>
          <p className="text-xs max-w-md mx-auto">
            Hệ thống chưa tìm thấy cơ sở nhà máy nào trong cấu hình sổ cái. Bấm
            nút &quot;Thêm Nhà máy&quot; phía trên để bắt đầu thiết lập.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAdd("FACILITY")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors"
          >
            <Plus size={14} weight="bold" />
            <span>Thêm Nhà máy Đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFacilities.map((fac) => {
            // Associated records for this facility
            const facLocations = locations.filter(
              (l) => l.facilityId === fac.id,
            );
            const facEquipment = equipment.filter(
              (e) => e.facilityId === fac.id,
            );
            const facPolicies = policies.filter((p) => p.facilityId === fac.id);

            // Filter by search query and kind
            const displayLocations = facLocations.filter((l) => {
              const matchesSearch =
                !searchQuery.trim() ||
                l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.id.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesKind =
                locationKindFilter === "ALL" || l.kind === locationKindFilter;
              return matchesSearch && matchesKind;
            });

            const displayEquipment = facEquipment.filter((e) => {
              return (
                !searchQuery.trim() ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.id.toLowerCase().includes(searchQuery.toLowerCase())
              );
            });

            return (
              <div
                key={fac.id}
                className="p-6 rounded-2xl bg-surface-base border border-ink-tertiary/20 shadow-xs space-y-6"
              >
                {/* Facility Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                        <Buildings size={20} weight="bold" />
                      </div>
                      <h2 className="font-display font-bold text-xl text-ink-primary">
                        {fac.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleCopyId(fac.id, "Nhà máy")}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-tertiary hover:text-ink-primary bg-surface-raised px-2 py-0.5 rounded border border-ink-tertiary/15 transition-colors"
                        title="Bấm để sao chép UUID"
                      >
                        <span>{fac.id.slice(0, 13)}...</span>
                        <Copy size={11} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary pl-11">
                      <span className="flex items-center gap-1 font-medium">
                        <Warehouse size={14} className="text-accent-primary" />
                        <span>{facLocations.length} Vị trí lưu trữ</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Wrench size={14} className="text-accent-primary" />
                        <span>{facEquipment.length} Thiết bị vận hành</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Scales size={14} className="text-accent-primary" />
                        <span>{facPolicies.length} Chính sách công đoạn</span>
                      </span>
                    </div>
                  </div>

                  {/* Facility Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("LOCATION", fac.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-ink-primary border border-ink-tertiary/20 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Thêm Silo/Kho</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("EQUIPMENT", fac.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-ink-primary border border-ink-tertiary/20 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Thêm Thiết bị</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditFacility(fac)}
                      className="p-1.5 rounded-lg hover:bg-surface-raised text-ink-secondary hover:text-accent-primary transition-colors text-xs inline-flex items-center gap-1 border border-ink-tertiary/15"
                      title="Sửa tên cơ sở nhà máy"
                    >
                      <PencilSimple size={14} />
                      <span className="hidden sm:inline">Sửa</span>
                    </button>
                    {fac.canDelete !== false && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFacility(fac)}
                        className="p-1.5 rounded-lg hover:bg-surface-raised text-ink-secondary hover:text-accent-danger transition-colors text-xs inline-flex items-center gap-1 border border-ink-tertiary/15"
                        title="Xóa nhà máy nếu chưa phát sinh giao dịch"
                      >
                        <Trash size={14} />
                        <span className="hidden sm:inline">Xóa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inner Facility Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("locations")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "locations"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Warehouse size={15} />
                      <span>Vị trí Lưu trữ & Silo</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "locations"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facLocations.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("equipment")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "equipment"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Wrench size={15} />
                      <span>Thiết bị Máy móc</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "equipment"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facEquipment.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("policies")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "policies"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Scales size={15} />
                      <span>Chính sách Dung sai</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "policies"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facPolicies.length}
                      </span>
                    </button>
                  </div>

                  {/* Filter for locations when tab is active */}
                  {activeTab === "locations" && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-ink-tertiary hidden md:inline">
                        Loại:
                      </span>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("ALL")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "ALL"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("STORE")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "STORE"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Kho/Silo
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("ISOLATION")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "ISOLATION"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Cách ly
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB 1: LOCATIONS */}
                {activeTab === "locations" && (
                  <div className="space-y-4">
                    {displayLocations.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
                        <Warehouse
                          size={28}
                          className="mx-auto text-ink-tertiary"
                        />
                        <p>
                          Không có vị trí lưu trữ nào phù hợp với bộ lọc hiện
                          tại.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {displayLocations.map((loc) => {
                          const isIsolation = loc.kind === "ISOLATION";
                          return (
                            <div
                              key={loc.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-xs ${
                                isIsolation
                                  ? "bg-rose-500/5 border-rose-500/20"
                                  : "bg-surface-raised border-ink-tertiary/15"
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Top Title & Badges */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      {isIsolation ? (
                                        <ShieldWarning
                                          size={16}
                                          weight="bold"
                                          className="text-rose-600 shrink-0"
                                        />
                                      ) : (
                                        <Warehouse
                                          size={16}
                                          weight="bold"
                                          className="text-accent-primary shrink-0"
                                        />
                                      )}
                                      <span className="font-display font-bold text-sm text-ink-primary">
                                        {loc.name}
                                      </span>
                                    </div>

                                    {/* UUID Badge */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyId(loc.id, "Vị trí")
                                      }
                                      className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-tertiary hover:text-ink-primary"
                                      title="Bấm để sao chép UUID"
                                    >
                                      <span>{loc.id.slice(0, 8)}...</span>
                                      <Copy size={10} />
                                    </button>
                                  </div>

                                  {/* Kind Badge */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
                                      isIsolation
                                        ? "bg-rose-100 text-rose-800 border-rose-200"
                                        : "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                                    }`}
                                  >
                                    {isIsolation ? "CÁCH LY" : "KHO/SILO"}
                                  </span>
                                </div>

                                {/* Status attributes */}
                                <div className="space-y-1.5 pt-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-ink-secondary text-[11px]">
                                      Trạng thái mặt bằng:
                                    </span>
                                    {loc.cleared ? (
                                      <span className="inline-flex items-center gap-1 text-functional-balanced font-semibold text-[11px]">
                                        <CheckCircle size={13} weight="fill" />
                                        <span>Đã vệ sinh (Sẵn sàng)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-accent-warning font-semibold text-[11px]">
                                        <WarningCircle
                                          size={13}
                                          weight="fill"
                                        />
                                        <span>Đang chứa / Chưa vệ sinh</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-ink-secondary text-[11px]">
                                      Hình thức lưu trữ:
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        loc.mixedBulk
                                          ? "bg-amber-500/10 text-amber-700"
                                          : "bg-surface-base text-ink-secondary border border-ink-tertiary/15"
                                      }`}
                                    >
                                      {loc.mixedBulk
                                        ? "Hỗn hợp (Mixed Bulk)"
                                        : "Định danh riêng (Identity Preserved)"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions Footer */}
                              <div className="pt-3 mt-3 border-t border-ink-tertiary/10 flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenClearance(loc)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline p-1 rounded hover:bg-surface-base"
                                  title="Thực hiện quy trình kiểm tra vệ sinh và giải phóng mặt bằng Silo"
                                >
                                  <Broom size={13} />
                                  <span>Vệ sinh Silo</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditLocation(loc)}
                                    className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-colors"
                                    title="Chỉnh sửa vị trí"
                                  >
                                    <PencilSimple size={14} />
                                  </button>
                                  {loc.canDelete !== false && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLocation(loc)}
                                      className="p-1 rounded text-ink-tertiary hover:text-accent-danger hover:bg-surface-base transition-colors"
                                      title="Xóa vị trí"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: EQUIPMENT */}
                {activeTab === "equipment" && (
                  <div className="space-y-4">
                    {displayEquipment.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
                        <Wrench
                          size={28}
                          className="mx-auto text-ink-tertiary"
                        />
                        <p>
                          Chưa có thiết bị máy móc nào được đăng ký cho cơ sở
                          này.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {displayEquipment.map((eq) => {
                          const isActive = eq.canRetire !== false;
                          return (
                            <div
                              key={eq.id}
                              className="p-4 rounded-xl bg-surface-raised border border-ink-tertiary/15 flex flex-col justify-between shadow-xs space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-surface-base text-accent-primary border border-ink-tertiary/15">
                                      <Wrench size={16} />
                                    </div>
                                    <div>
                                      <h3 className="font-display font-bold text-sm text-ink-primary">
                                        {eq.name}
                                      </h3>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyId(eq.id, "Thiết bị")
                                        }
                                        className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-tertiary hover:text-ink-primary"
                                        title="Bấm để sao chép UUID"
                                      >
                                        <span>{eq.id.slice(0, 8)}...</span>
                                        <Copy size={10} />
                                      </button>
                                    </div>
                                  </div>

                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isActive
                                        ? "bg-functional-balanced-bg text-functional-balanced border-functional-balanced/30"
                                        : "bg-surface-overlay text-ink-tertiary border-ink-tertiary/20"
                                    }`}
                                  >
                                    {isActive
                                      ? "ĐANG VẬN HÀNH"
                                      : "NGỪNG HOẠT ĐỘNG"}
                                  </span>
                                </div>
                              </div>

                              {/* Equipment Actions Footer */}
                              <div className="pt-2 border-t border-ink-tertiary/10 flex items-center justify-between text-xs">
                                {isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleRetireEquipment(eq)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                                    title="Ngừng vận hành thiết bị"
                                  >
                                    <Power size={13} />
                                    <span>Ngừng vận hành</span>
                                  </button>
                                )}
                                {!isActive && <div />}

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditEquipment(eq)}
                                    className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-colors"
                                    title="Sửa thiết bị"
                                  >
                                    <PencilSimple size={14} />
                                  </button>
                                  {eq.canDelete !== false && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEquipment(eq)}
                                      className="p-1 rounded text-ink-tertiary hover:text-accent-danger hover:bg-surface-base transition-colors"
                                      title="Xóa thiết bị"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: POLICIES */}
                {activeTab === "policies" && (
                  <div className="space-y-4">
                    {facPolicies.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
                        <Scales
                          size={28}
                          className="mx-auto text-ink-tertiary"
                        />
                        <p>
                          Cơ sở này chưa áp dụng chính sách hao hụt hoặc dung
                          sai đặc thù.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface-raised border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-[11px]">
                              <th className="py-2.5 px-4">Công đoạn áp dụng</th>
                              <th className="py-2.5 px-4">
                                Dung sai định mức (%)
                              </th>
                              <th className="py-2.5 px-4">
                                Thời điểm hiệu lực
                              </th>
                              <th className="py-2.5 px-4">
                                Bằng chứng kỹ thuật (Evidence)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base">
                            {facPolicies.map((pol) => {
                              const meta = POLICY_KIND_LABELS[pol.kind] || {
                                label: pol.kind,
                                color:
                                  "text-ink-secondary bg-surface-raised border-ink-tertiary/20",
                              };
                              const tolNum = parseFloat(pol.tolerancePercent);
                              return (
                                <tr
                                  key={pol.id}
                                  className="hover:bg-surface-raised/50 transition-colors"
                                >
                                  <td className="py-3 px-4 font-semibold text-ink-primary">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.color}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-accent-primary text-sm">
                                    {tolNum.toFixed(2)}%
                                  </td>
                                  <td className="py-3 px-4 text-ink-secondary font-mono">
                                    {new Date(pol.effectiveFrom).toLocaleString(
                                      "vi-VN",
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyId(
                                          pol.evidenceId,
                                          "Bằng chứng",
                                        )
                                      }
                                      className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-tertiary hover:text-accent-primary transition-colors"
                                      title="Bấm để sao chép UUID Evidence"
                                    >
                                      <span>
                                        {pol.evidenceId.slice(0, 16)}...
                                      </span>
                                      <Copy size={11} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main CRUD Modal using @/components/Modal/Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        ariaLabel={
          isEdit
            ? "Cập nhật cấu hình"
            : modalType === "FACILITY"
              ? "Thêm Cơ sở Nhà máy Mới"
              : modalType === "LOCATION"
                ? "Thêm Vị trí / Silo Lưu trữ Mới"
                : "Thêm Thiết bị Vận hành Mới"
        }
      >
        <div className="w-full max-w-lg bg-surface-base border border-ink-tertiary/20 rounded-2xl shadow-2xl overflow-hidden animate-ledger-in">
          {/* Header */}
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                {modalType === "FACILITY" ? (
                  <Buildings size={18} weight="bold" />
                ) : modalType === "LOCATION" ? (
                  <Warehouse size={18} weight="bold" />
                ) : (
                  <Wrench size={18} weight="bold" />
                )}
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  {isEdit
                    ? `Chỉnh sửa ${
                        modalType === "LOCATION"
                          ? "Vị trí / Silo"
                          : modalType === "EQUIPMENT"
                            ? "Thiết bị"
                            : "Nhà máy"
                      }`
                    : modalType === "LOCATION"
                      ? "Thêm Vị trí / Silo Lưu trữ Mới"
                      : modalType === "EQUIPMENT"
                        ? "Thêm Thiết bị Máy móc Mới"
                        : "Thêm Cơ sở Nhà máy Mới"}
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Cập nhật sổ cái cấu hình cơ sở vật chất chuỗi cung ứng
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {modalError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger flex items-center gap-2"
              >
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Facility Selector for Location / Equipment */}
            {modalType !== "FACILITY" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-facility-select"
                  className="block font-semibold text-ink-primary"
                >
                  Cơ sở Nhà máy trực thuộc *
                </label>
                <select
                  id="modal-facility-select"
                  required
                  value={formFacilityId}
                  onChange={(e) => setFormFacilityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
                >
                  <option value="">-- Chọn Nhà máy --</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal-name-input"
                className="block font-semibold text-ink-primary"
              >
                {modalType === "FACILITY"
                  ? "Tên Cơ sở Nhà máy *"
                  : modalType === "LOCATION"
                    ? "Tên Vị trí / Silo Lưu trữ *"
                    : "Tên Thiết bị / Dây chuyền *"}
              </label>
              <input
                id="modal-name-input"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  modalType === "FACILITY"
                    ? "VD: Nhà máy Xay xát & Đóng gói Long An"
                    : modalType === "LOCATION"
                      ? "VD: Silo Lúa khô S1, Kho Gạo thành phẩm A1, Khu cách ly Q1"
                      : "VD: Lò sấy tháp 50T/mẻ, Dây chuyền xát trắng A"
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
              />
            </div>

            {/* Additional Fields for Location */}
            {modalType === "LOCATION" && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-kind-select"
                    className="block font-semibold text-ink-primary"
                  >
                    Phân loại Vị trí *
                  </label>
                  <select
                    id="modal-kind-select"
                    required
                    value={formKind}
                    onChange={(e) =>
                      setFormKind(e.target.value as "STORE" | "ISOLATION")
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
                  >
                    <option value="STORE">
                      Kho chứa thông thường / Silo lưu trữ (STORE)
                    </option>
                    <option value="ISOLATION">
                      Khu vực cách ly kiểm định / Hàng lỗi (ISOLATION)
                    </option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised border border-ink-tertiary/15 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMixedBulk}
                      onChange={(e) => setFormMixedBulk(e.target.checked)}
                      className="rounded border-ink-tertiary/20 text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="font-semibold text-ink-primary text-xs">
                      Cho phép lưu trữ hỗn hợp (Mixed Bulk Pool)
                    </span>
                  </label>
                  <p className="text-[11px] text-ink-secondary pl-5">
                    Khi bật, vị trí này có thể gộp nhiều mẻ lúa cùng cấp chất
                    lượng và hạch toán tỷ lệ đóng góp khối lượng.
                  </p>
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised font-semibold transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !formName.trim()}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-50 shadow-xs"
              >
                {submitting
                  ? "Đang lưu..."
                  : isEdit
                    ? "Lưu thay đổi"
                    : "Tạo mới"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Clearance (Vệ sinh Silo) Modal */}
      <Modal
        isOpen={Boolean(clearanceTarget)}
        onClose={() => !submittingClearance && setClearanceTarget(null)}
        ariaLabel="Xác nhận vệ sinh & giải phóng mặt bằng Silo"
      >
        <div className="w-full max-w-md bg-surface-base border border-ink-tertiary/20 rounded-2xl shadow-2xl overflow-hidden animate-ledger-in">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                <Broom size={18} weight="bold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  Vệ sinh & Giải phóng Silo
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Xác nhận mặt bằng sạch trước khi nạp mẻ mới
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClearanceTarget(null)}
              disabled={submittingClearance}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <form
            onSubmit={handleConfirmClearance}
            className="p-5 space-y-4 text-xs"
          >
            <div className="p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/20 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-ink-primary text-xs">
                <Info size={15} className="text-accent-primary" />
                <span>Vị trí xác nhận: {clearanceTarget?.name}</span>
              </div>
              <p className="text-[11px] text-ink-secondary">
                Mã định danh:{" "}
                <span className="font-mono text-ink-primary">
                  {clearanceTarget?.id}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="clearance-reason-input"
                className="block font-semibold text-ink-primary"
              >
                Lý do & Biên bản nghiệm thu vệ sinh *
              </label>
              <textarea
                id="clearance-reason-input"
                required
                rows={3}
                value={clearanceReason}
                onChange={(e) => setClearanceReason(e.target.value)}
                placeholder="VD: Đã xuất hết toàn bộ tồn kho và quét hút bụi đáy silo sạch sẽ..."
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="clearance-evidence-input"
                className="block font-semibold text-ink-primary"
              >
                Mã bằng chứng nghiệm thu (Evidence ID)
              </label>
              <input
                id="clearance-evidence-input"
                type="text"
                value={clearanceEvidenceId}
                onChange={(e) => setClearanceEvidenceId(e.target.value)}
                placeholder="VD: e2dcea67-87e8-4db4-a399-d81eb1e90730"
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono text-xs focus:border-accent-primary focus:outline-none"
              />
              <p className="text-[11px] text-ink-tertiary">
                Có thể nhập UUID biên bản kiểm tra vệ sinh mặt bằng đã đăng ký
                trong sổ cái.
              </p>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClearanceTarget(null)}
                disabled={submittingClearance}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised font-semibold transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingClearance || !clearanceReason.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-50 shadow-xs"
              >
                {submittingClearance ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <CheckCircle size={15} weight="bold" />
                    <span>Xác nhận Vệ sinh Silo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
