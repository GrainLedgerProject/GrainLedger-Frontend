import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { confirmAction, toast } from "@/app/store/feedbackStore";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FacilityDto, LocationDto, EquipmentDto, LocationKind } from "@/api/ledger";

const emptySetup = { facilities: [], locations: [], equipment: [], policies: [] };

export function useFacilityConfig() {
  const { t } = useTranslation();
  const canConfigure = useAuthStore(
    (s) => s.user?.permissions.includes("platform.configure") ?? false,
  );

  const setup = useQuery({
    queryKey: ["ledger-facility-setup"],
    queryFn: ledgerEndpoints.getSetup,
    staleTime: 0,
    select: (data) => ({
      facilities: Array.isArray(data?.facilities) ? data.facilities : [],
      locations: Array.isArray(data?.locations) ? data.locations : [],
      equipment: Array.isArray(data?.equipment) ? data.equipment : [],
      policies: Array.isArray(data?.policies) ? data.policies : [],
    }),
  });
  const { facilities, locations, equipment, policies } = setup.data ?? emptySetup;
  const loading = setup.isFetching;
  const error = setup.error?.message;
  const loadData = () => setup.refetch();

  // View & Filter States
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "locations" | "equipment" | "policies"
  >("locations");
  const [locationKindFilter, setLocationKindFilter] = useState<
    "ALL" | LocationKind
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
  const createIdRef = useRef<{ fingerprint: string; id: string } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formKind, setFormKind] = useState<LocationKind>("STORE");
  const [formMixedBulk, setFormMixedBulk] = useState(false);

  // Clearance Modal State
  const [clearanceTarget, setClearanceTarget] = useState<LocationDto | null>(
    null,
  );
  const [clearanceReason, setClearanceReason] = useState("");
  const [clearanceEvidenceId, setClearanceEvidenceId] = useState("");
  const [clearanceError, setClearanceError] = useState("");
  const [submittingClearance, setSubmittingClearance] = useState(false);

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
    createIdRef.current = null;
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
    const normalizedKind: LocationKind =
      location.kind === "SILO" ||
      location.kind === "COMPARTMENT" ||
      location.kind === "ISOLATION"
        ? location.kind
        : "STORE";
    setFormKind(normalizedKind);
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

      const trimmedName = formName.trim();
      const fingerprint = JSON.stringify([modalType, formFacilityId, trimmedName, formKind, formMixedBulk]);
      const createId = isEdit
        ? undefined
        : createIdRef.current?.fingerprint === fingerprint
          ? createIdRef.current.id
          : (createIdRef.current = { fingerprint, id: crypto.randomUUID() }).id;

      if (modalType === "FACILITY") {
        if (isEdit && editingId) {
          await ledgerEndpoints.updateFacility(editingId, {
            name: trimmedName,
            version: editingVersion,
          });
          toast.success(`Đã cập nhật nhà máy "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createFacility({
            id: createId,
            name: trimmedName,
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
            name: trimmedName,
            kind: formKind,
            version: editingVersion,
            mixedBulk: formMixedBulk,
          });
          toast.success(`Đã cập nhật vị trí "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createLocation({
            id: createId,
            facilityId: formFacilityId,
            name: trimmedName,
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
            name: trimmedName,
            version: editingVersion,
          });
          toast.success(`Đã cập nhật thiết bị "${formName}" thành công.`);
        } else {
          await ledgerEndpoints.createEquipment({
            id: createId,
            facilityId: formFacilityId,
            name: trimmedName,
          });
          toast.success(`Đã thêm thiết bị "${formName}" thành công.`);
        }
      }

      createIdRef.current = null;
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
    setClearanceEvidenceId("");
    setClearanceError("");
  };

  const handleConfirmClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceTarget) return;
    const trimmedReason = clearanceReason.trim();
    const trimmedEvidenceId = clearanceEvidenceId.trim();
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!trimmedReason || !trimmedEvidenceId) {
      setClearanceError("Nhập lý do và mã biên bản nghiệm thu vệ sinh.");
      return;
    }
    if (!uuidPattern.test(trimmedEvidenceId)) {
      setClearanceError("Mã bằng chứng nghiệm thu (Evidence ID) phải là UUID hợp lệ.");
      return;
    }

    try {
      setClearanceError("");
      setSubmittingClearance(true);
      await ledgerEndpoints.clearLocation(clearanceTarget.id, {
        evidenceId: trimmedEvidenceId,
        reason: trimmedReason,
      });
      toast.success(
        `Đã xác nhận vệ sinh & giải phóng mặt bằng cho "${clearanceTarget.name}" thành công.`,
      );
      setClearanceTarget(null);
      await loadData();
    } catch (err: unknown) {
      setClearanceError(
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
  return {
    overview: {
      t,
      canConfigure,
      facilities,
      loading,
      error,
      selectedFacilityId,
      setSelectedFacilityId,
      searchQuery,
      setSearchQuery,
      loadData,
      stats,
      handleOpenAdd,
    },
    facilities: {
      canConfigure,
      locations,
      equipment,
      policies,
      loading,
      searchQuery,
      activeTab,
      setActiveTab,
      locationKindFilter,
      setLocationKindFilter,
      filteredFacilities,
      handleOpenAdd,
      handleOpenEditFacility,
      handleOpenEditLocation,
      handleOpenEditEquipment,
      handleDeleteFacility,
      handleDeleteLocation,
      handleDeleteEquipment,
      handleRetireEquipment,
      handleOpenClearance,
      handleCopyId,
    },
    editor: {
      facilities,
      isModalOpen,
      setIsModalOpen,
      modalType,
      isEdit,
      submitting,
      modalError,
      formName,
      setFormName,
      formFacilityId,
      setFormFacilityId,
      formKind,
      setFormKind,
      formMixedBulk,
      setFormMixedBulk,
      handleSubmit,
    },
    clearance: {
      clearanceError,
      clearanceTarget,
      setClearanceTarget,
      clearanceReason,
      setClearanceReason,
      clearanceEvidenceId,
      setClearanceEvidenceId,
      submittingClearance,
      handleConfirmClearance,
    },
  };
}

export type FacilityConfigModel = ReturnType<typeof useFacilityConfig>;
