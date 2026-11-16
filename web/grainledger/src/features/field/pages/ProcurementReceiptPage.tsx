import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  procurementEndpoints,
  type RegisterProcurementRequest,
  type ProcurementReceivingOption,
} from "@/api/procurement";
import { ApiError } from "@/api/client";
import {
  getQueuedProcurementCount,
  getQueuedProcurements,
  onProcurementQueueChanged,
  queueProcurement,
} from "@/pwa/procurementQueue";
import {
  getCachedFarmers,
  getCachedRefData,
  onOfflineCacheUpdated,
  saveCachedFarmers,
  saveCachedRefData,
  type CachedFarmer,
  type CachedReferenceData,
  type CachedPlotSeason,
  type CachedPlot,
} from "@/pwa/offlineCache";
import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import {
  Receipt,
  Plus,
  ArrowsClockwise,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  X,
  Drop,
  User,
  Calendar,
  Warehouse,
  CloudSlash,
  Plant,
} from "@phosphor-icons/react";

interface ProcurementReceiptItem {
  id: string;
  code?: string;
  farmerId: string;
  farmerName?: string;
  commodityName?: string;
  receivedAt: string;
  totalQuantityKg?: number;
  totalNetMassKg?: string;
  status?: string;
  isOfflinePending?: boolean;
  items?: Array<{
    lineNo: number;
    measuredValue: string | null;
    measuredUnit: string | null;
    moisturePercent: string | null;
    lotId: string;
  }>;
}

export const ProcurementReceiptPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useUiStore((state) => state.isOnline);
  const procurementSyncMode = useUiStore((state) => state.procurementSyncMode);
  const setPendingOfflineCount = useUiStore(
    (state) => state.setPendingOfflineCount,
  );
  const [receipts, setReceipts] = useState<ProcurementReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Concurrency and mount guards
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Reference data for creation
  const [farmers, setFarmers] = useState<CachedFarmer[]>([]);
  const [refData, setRefData] = useState<CachedReferenceData | null>(null);
  const [allPlotSeasons, setAllPlotSeasons] = useState<CachedPlotSeason[]>([]);
  const [allPlots, setAllPlots] = useState<CachedPlot[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    farmerId: "",
    collectionSiteId: "",
    receivingLocationId: "",
    commodityId: "",
    plotSeasonId: "",
    measuredWeightKg: "5000.0",
    moisturePercent: "24.5",
  });
  const [submitting, setSubmitting] = useState(false);

  // Helper to extract receiving options
  const getReceivingOptions = useCallback(
    (ref: CachedReferenceData | null): ProcurementReceivingOption[] => {
      if (ref?.receivingOptions && ref.receivingOptions.length > 0) {
        return ref.receivingOptions;
      }
      if (ref?.collectionSites && ref.collectionSites.length > 0) {
        return ref.collectionSites.map((site, idx) => ({
          collectionSiteId: site.id,
          collectionSiteCode: site.code || `SITE-${idx + 1}`,
          collectionSiteName: site.name || `Trạm cân ${idx + 1}`,
          receivingLocationId:
            ref.receivingLocations?.[idx]?.id ||
            ref.receivingLocations?.[0]?.id ||
            site.id,
          receivingLocationCode:
            ref.receivingLocations?.[idx]?.code || "LOC-MAIN",
        }));
      }
      return [];
    },
    [],
  );

  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // 1. Immediately read cached farmers & reference data
      const [cachedFarmers, cachedRef] = await Promise.all([
        getCachedFarmers(),
        getCachedRefData(),
      ]);

      if (!isMountedRef.current) return;

      if (cachedFarmers && cachedFarmers.length > 0) {
        setFarmers(cachedFarmers);
      }
      if (cachedRef) {
        setRefData(cachedRef);
        if (cachedRef.plotSeasons) setAllPlotSeasons(cachedRef.plotSeasons);
        if (cachedRef.plots) setAllPlots(cachedRef.plots);
      }

      // 2. Read queued offline procurements
      const queued = await getQueuedProcurements().catch(() => []);
      if (!isMountedRef.current) return;

      const pendingItems: ProcurementReceiptItem[] = queued.map((q) => {
        const item = q.request.payload?.items?.[0];
        const matchedFarmer = (cachedFarmers || []).find(
          (f) => f.id === q.request.payload?.farmerId,
        );
        return {
          id: q.id,
          code: `OFFLINE-${q.request.clientOperationId.slice(0, 8).toUpperCase()}`,
          farmerId: q.request.payload?.farmerId || "",
          farmerName:
            matchedFarmer?.name ||
            t("field.receipt.offlineFarmer", "Nông hộ (Chờ đồng bộ)"),
          receivedAt: q.capturedAt,
          isOfflinePending: true,
          status: "PENDING",
          items: item
            ? [
                {
                  lineNo: 1,
                  measuredValue: item.measuredValue,
                  measuredUnit: item.measuredUnit,
                  moisturePercent: item.moisturePercent,
                  lotId: item.lotId,
                },
              ]
            : [],
        };
      });

      // 3. If online, fetch fresh server data
      if (isOnline) {
        const [receiptsRes, farmersRes, refRes, plotSeasonsRes, plotsRes] =
          await Promise.all([
            procurementEndpoints.getProcurements().catch(() => []),
            procurementEndpoints
              .getFarmers({ pageSize: 100 })
              .catch(() => null),
            procurementEndpoints
              .getProcurementReferenceData()
              .catch(() => null),
            procurementEndpoints
              .getPlotSeasons({ pageSize: 100 })
              .catch(() => null),
            procurementEndpoints.getPlots({ pageSize: 100 }).catch(() => null),
          ]);

        if (!isMountedRef.current) return;

        const serverReceipts: ProcurementReceiptItem[] = Array.isArray(
          receiptsRes,
        )
          ? receiptsRes
          : (receiptsRes as { items?: ProcurementReceiptItem[] })?.items || [];

        setReceipts([...pendingItems, ...serverReceipts]);

        if (farmersRes) {
          const farmerList = Array.isArray(farmersRes)
            ? (farmersRes as CachedFarmer[])
            : (farmersRes as { items?: CachedFarmer[] })?.items || [];
          if (farmerList.length > 0) {
            setFarmers(farmerList);
            void saveCachedFarmers(farmerList, false);
          }
        }

        const plotSeasonItems = Array.isArray(plotSeasonsRes)
          ? (plotSeasonsRes as CachedPlotSeason[])
          : (plotSeasonsRes as { items?: CachedPlotSeason[] })?.items || [];
        if (plotSeasonItems.length > 0) {
          setAllPlotSeasons(plotSeasonItems);
        }

        const plotItems = Array.isArray(plotsRes)
          ? (plotsRes as CachedPlot[])
          : (plotsRes as { items?: CachedPlot[] })?.items || [];
        if (plotItems.length > 0) {
          setAllPlots(plotItems);
        }

        if (refRes) {
          const compositeRefData: CachedReferenceData = {
            ...refRes,
            plotSeasons:
              plotSeasonItems.length > 0
                ? plotSeasonItems
                : cachedRef?.plotSeasons,
            plots: plotItems.length > 0 ? plotItems : cachedRef?.plots,
          };
          setRefData(compositeRefData);
          void saveCachedRefData(compositeRefData, false);
        }
      } else {
        setReceipts(pendingItems);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "field.receipt.errorLoad",
            "Không thể tải danh sách phiếu thu mua.",
          ),
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [isOnline, t]);

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;

    async function initData() {
      try {
        const [cachedFarmers, cachedRef] = await Promise.all([
          getCachedFarmers(),
          getCachedRefData(),
        ]);
        if (!active) return;
        if (cachedFarmers && cachedFarmers.length > 0) {
          setFarmers(cachedFarmers);
        }
        if (cachedRef) {
          setRefData(cachedRef);
          if (cachedRef.plotSeasons) setAllPlotSeasons(cachedRef.plotSeasons);
          if (cachedRef.plots) setAllPlots(cachedRef.plots);
        }

        const queued = await getQueuedProcurements().catch(() => []);
        if (!active) return;
        const pendingItems: ProcurementReceiptItem[] = queued.map((q) => {
          const item = q.request.payload?.items?.[0];
          const matchedFarmer = (cachedFarmers || []).find(
            (f) => f.id === q.request.payload?.farmerId,
          );
          return {
            id: q.id,
            code: `OFFLINE-${q.id.slice(0, 8).toUpperCase()}`,
            farmerId: q.request.payload?.farmerId || "",
            farmerName:
              matchedFarmer?.name ||
              t("field.receipt.offlineFarmer", "Nông hộ (Chờ đồng bộ)"),
            receivedAt: q.capturedAt,
            isOfflinePending: true,
            status: "PENDING",
            items: item
              ? [
                  {
                    lineNo: 1,
                    measuredValue: item.measuredValue,
                    measuredUnit: item.measuredUnit,
                    moisturePercent: item.moisturePercent,
                    lotId: item.lotId,
                  },
                ]
              : [],
          };
        });

        if (isOnline) {
          const [receiptsRes, farmersRes, refRes, plotSeasonsRes, plotsRes] =
            await Promise.all([
              procurementEndpoints.getProcurements().catch(() => []),
              procurementEndpoints
                .getFarmers({ pageSize: 100 })
                .catch(() => null),
              procurementEndpoints
                .getProcurementReferenceData()
                .catch(() => null),
              procurementEndpoints
                .getPlotSeasons({ pageSize: 100 })
                .catch(() => null),
              procurementEndpoints
                .getPlots({ pageSize: 100 })
                .catch(() => null),
            ]);
          if (!active) return;

          const serverReceipts = Array.isArray(receiptsRes)
            ? receiptsRes
            : (receiptsRes as { items?: ProcurementReceiptItem[] })?.items ||
              [];

          setReceipts([...pendingItems, ...serverReceipts]);

          if (farmersRes) {
            const farmerList = Array.isArray(farmersRes)
              ? (farmersRes as CachedFarmer[])
              : (farmersRes as { items?: CachedFarmer[] })?.items || [];
            if (farmerList.length > 0) {
              setFarmers(farmerList);
              void saveCachedFarmers(farmerList, false);
            }
          }

          const plotSeasonItems = Array.isArray(plotSeasonsRes)
            ? (plotSeasonsRes as CachedPlotSeason[])
            : (plotSeasonsRes as { items?: CachedPlotSeason[] })?.items || [];
          if (plotSeasonItems.length > 0) {
            setAllPlotSeasons(plotSeasonItems);
          }

          const plotItems = Array.isArray(plotsRes)
            ? (plotsRes as CachedPlot[])
            : (plotsRes as { items?: CachedPlot[] })?.items || [];
          if (plotItems.length > 0) {
            setAllPlots(plotItems);
          }

          if (refRes) {
            const compositeRefData: CachedReferenceData = {
              ...refRes,
              plotSeasons:
                plotSeasonItems.length > 0
                  ? plotSeasonItems
                  : cachedRef?.plotSeasons,
              plots: plotItems.length > 0 ? plotItems : cachedRef?.plots,
            };
            setRefData(compositeRefData);
            void saveCachedRefData(compositeRefData, false);
          }
        } else {
          setReceipts(pendingItems);
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            t(
              "field.receipt.errorLoad",
              "Không thể tải danh sách phiếu thu mua.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initData();

    const unsubQueue = onProcurementQueueChanged(() => {
      void loadData();
    });

    const unsubCache = onOfflineCacheUpdated(async () => {
      const [cachedFarmers, cachedRef] = await Promise.all([
        getCachedFarmers(),
        getCachedRefData(),
      ]);
      if (!isMountedRef.current) return;
      if (cachedFarmers && cachedFarmers.length > 0) {
        setFarmers(cachedFarmers);
      }
      if (cachedRef) {
        setRefData(cachedRef);
        if (cachedRef.plotSeasons) setAllPlotSeasons(cachedRef.plotSeasons);
        if (cachedRef.plots) setAllPlots(cachedRef.plots);
      }
    });

    return () => {
      active = false;
      isMountedRef.current = false;
      unsubQueue();
      unsubCache();
    };
  }, [isOnline, loadData, t]);

  // Filter plot-seasons for the currently selected farmer in formData
  const getAvailablePlotSeasons = useCallback(
    (selectedFarmerId: string): CachedPlotSeason[] => {
      if (!selectedFarmerId) return allPlotSeasons;
      const farmerPlots = allPlots.filter(
        (p) => p.farmerId === selectedFarmerId,
      );
      if (farmerPlots.length === 0) return allPlotSeasons;
      const plotIds = new Set(farmerPlots.map((p) => p.id));
      const filtered = allPlotSeasons.filter((ps) => plotIds.has(ps.plotId));
      return filtered.length > 0 ? filtered : allPlotSeasons;
    },
    [allPlots, allPlotSeasons],
  );

  const handleOpenCreate = () => {
    const selectedFarmer = farmers[0];
    const farmerId = selectedFarmer?.id || "";

    const options = getReceivingOptions(refData);
    const defaultOption = options[0];
    const defaultSiteId =
      defaultOption?.collectionSiteId || crypto.randomUUID();
    const defaultLocId =
      defaultOption?.receivingLocationId || crypto.randomUUID();

    const defaultCommId =
      refData?.commodity?.id ||
      refData?.commodities?.[0]?.id ||
      crypto.randomUUID();

    const availablePlotSeasons = getAvailablePlotSeasons(farmerId);
    const defaultPlotSeasonId =
      availablePlotSeasons[0]?.id ||
      allPlotSeasons[0]?.id ||
      crypto.randomUUID();

    setFormData({
      farmerId,
      collectionSiteId: defaultSiteId,
      receivingLocationId: defaultLocId,
      commodityId: defaultCommId,
      plotSeasonId: defaultPlotSeasonId,
      measuredWeightKg: "5000.0",
      moisturePercent: "24.5",
    });
    setIsModalOpen(true);
  };

  const handleFarmerChange = (farmerId: string) => {
    const availablePlotSeasons = getAvailablePlotSeasons(farmerId);
    const newPlotSeasonId =
      availablePlotSeasons[0]?.id || formData.plotSeasonId;
    setFormData((prev) => ({
      ...prev,
      farmerId,
      plotSeasonId: newPlotSeasonId,
    }));
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.farmerId) {
      setError(
        t("field.receipt.errorSelectFarmer", "Vui lòng chọn Nông hộ thu mua."),
      );
      return;
    }
    const selectedCommodityId = formData.commodityId || refData?.commodity?.id;
    if (
      !formData.collectionSiteId ||
      !formData.receivingLocationId ||
      !selectedCommodityId ||
      !formData.plotSeasonId
    ) {
      setError(
        "Cần chọn đủ điểm thu mua, vị trí tiếp nhận, mặt hàng và vụ mùa trước khi lưu phiếu.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    let request: RegisterProcurementRequest | null = null;
    try {
      // Normalize decimal format with dot for C# backend regex: ^[0-9]+(?:.[0-9]+)?$
      const normalizedWeight = formData.measuredWeightKg
        .trim()
        .replace(",", ".");
      const normalizedMoisture = formData.moisturePercent
        .trim()
        .replace(",", ".");

      const entityId = crypto.randomUUID();
      const clientOperationId = crypto.randomUUID();
      const itemId = crypto.randomUUID();
      const lotId = crypto.randomUUID();
      const sourceLotId = crypto.randomUUID();

      const finalCollectionSiteId = formData.collectionSiteId;
      const finalReceivingLocationId = formData.receivingLocationId;
      const finalCommodityId = selectedCommodityId;
      const finalPlotSeasonId = formData.plotSeasonId;

      request = {
        deviceId: "grainledger-web",
        clientOperationId,
        capturedAt: new Date().toISOString(),
        payloadSchemaVersion: 2,
        payload: {
          entityId,
          farmerId: formData.farmerId,
          collectionSiteId: finalCollectionSiteId,
          receivingLocationId: finalReceivingLocationId,
          commodityId: finalCommodityId,
          receivedAt: new Date().toISOString(),
          items: [
            {
              itemId,
              lineNo: 1,
              plotSeasonId: finalPlotSeasonId,
              measuredValue: normalizedWeight,
              measuredUnit: "KG",
              moisturePercent: normalizedMoisture,
              lotId,
              sourceLotId,
            },
          ],
        },
      };

      if (!isOnline) {
        await queueProcurement(request);
        setPendingOfflineCount(await getQueuedProcurementCount());
        setSuccessMsg(
          t(
            procurementSyncMode === "auto"
              ? "field.receipt.savedOfflineAuto"
              : "field.receipt.savedOfflineManual",
            procurementSyncMode === "auto"
              ? "Đã lưu phiếu trên thiết bị. Phiếu sẽ tự đồng bộ khi kết nối máy chủ trở lại."
              : "Đã lưu phiếu trên thiết bị. Vào Hàng đợi thu mua và bấm Đồng bộ để gửi phiếu.",
          ),
        );
      } else {
        const response =
          await procurementEndpoints.registerProcurement(request);
        setSuccessMsg(
          t(
            "field.receipt.successCreated",
            "Đã lập thành công Phiếu thu mua {{code}} ({{weight}} kg lúa tươi)",
            {
              code: response?.code || "mới",
              weight: normalizedWeight,
            },
          ),
        );
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 0) {
        if (request) {
          await queueProcurement(request);
          setPendingOfflineCount(await getQueuedProcurementCount());
          setSuccessMsg(
            t(
              procurementSyncMode === "auto"
                ? "field.receipt.savedOfflineAuto"
                : "field.receipt.savedOfflineManual",
              procurementSyncMode === "auto"
                ? "Kết nối bị gián đoạn; phiếu đã được lưu trên thiết bị và sẽ tự đồng bộ khi kết nối máy chủ trở lại."
                : "Kết nối bị gián đoạn; phiếu đã được lưu trên thiết bị. Vào Hàng đợi thu mua và bấm Đồng bộ để gửi phiếu.",
            ),
          );
          setIsModalOpen(false);
          await loadData();
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t("field.receipt.errorCreate", "Không thể lập phiếu thu mua."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.code?.toLowerCase().includes(q) ||
      r.farmerName?.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  const receivingOptions = getReceivingOptions(refData);
  const currentPlotSeasons = getAvailablePlotSeasons(formData.farmerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("field.receipt.tag", "LẬP PHIẾU THU MUA & TẠO LÔ NGUỒN")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("field.receipt.title", "Phiếu Thu Mua Lúa Tươi Tại Bờ Ruộng")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "field.receipt.subtitle",
              "Ghi nhận khối lượng cân thực tế, tỷ lệ độ ẩm và sinh Lô Nguồn (Source Lot) bất biến trên sổ cái.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.reload", "Tải lại dữ liệu")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>{t("field.receipt.createBtn", "Lập Phiếu Thu Mua mới")}</span>
          </button>
        </div>
      </div>

      {/* Offline Status Notice */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-functional-stale-bg border border-functional-stale-border/60 text-accent-warning text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CloudSlash size={20} weight="fill" className="shrink-0" />
            <div>
              <p className="font-bold text-ink-primary">
                {t(
                  "field.receipt.offlineTitle",
                  "Chế độ hiện trường ngoại tuyến (Offline)",
                )}
              </p>
              <p className="text-ink-secondary text-xs mt-0.5">
                {t(
                  procurementSyncMode === "auto"
                    ? "field.receipt.offlineDescAuto"
                    : "field.receipt.offlineDescManual",
                  procurementSyncMode === "auto"
                    ? "Đang dùng dữ liệu nông hộ trên thiết bị. Phiếu mới được lưu vào hàng đợi và tự đồng bộ khi kết nối máy chủ trở lại."
                    : "Đang dùng dữ liệu nông hộ trên thiết bị. Phiếu mới được lưu vào hàng đợi; bạn cần bấm Đồng bộ để gửi.",
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/field/sync")}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-surface-base border border-ink-tertiary/20 text-ink-primary font-semibold text-xs hover:bg-surface-raised transition-colors shrink-0"
          >
            {t("field.receipt.viewQueue", "Xem hàng đợi đồng bộ")}
          </button>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="p-4 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={t(
              "field.receipt.searchPlaceholder",
              "Tìm theo mã phiếu hoặc nông hộ...",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-base dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
          />
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-2.5 text-ink-tertiary"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-secondary">
          <div>
            {t("field.receipt.totalReceipts", "Tổng số phiếu thu mua:")}{" "}
            <strong className="font-mono text-ink-primary font-bold">
              {filteredReceipts.length}
            </strong>
          </div>
          {farmers.length > 0 && (
            <div className="text-ink-tertiary">
              ({farmers.length}{" "}
              {t("field.receipt.farmersCached", "nông hộ sẵn sàng")})
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "field.receipt.loading",
                "Đang tải danh sách phiếu thu mua...",
              )}
            />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt
              size={40}
              className="mx-auto text-ink-tertiary opacity-60"
            />
            <p className="text-sm font-semibold text-ink-primary">
              {t("field.receipt.emptyTitle", "Chưa có phiếu thu mua nào")}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "field.receipt.emptyDesc",
                'Nhấn "Lập Phiếu Thu Mua mới" để ghi nhận mẻ lúa tươi vừa thu hoạch tại điểm cân.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("field.receipt.receiptCode", "Mã phiếu")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.weighedAt", "Thời điểm cân")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.farmer", "Nông hộ")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.weightKg", "Khối lượng cân (kg)")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.moisture", "Độ ẩm (%)")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.ledgerStatus", "Trạng thái sổ cái")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {filteredReceipts.map((r) => {
                  const firstItem = r.items?.[0];
                  const displayWeight =
                    firstItem?.measuredValue ||
                    (r.totalNetMassKg ? `${r.totalNetMassKg}` : null) ||
                    "5.000";
                  const displayMoisture = firstItem?.moisturePercent || "24.5";

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                        {r.code || `RC-${r.id.slice(0, 8)}`}
                      </td>
                      <td className="py-3 px-4 text-ink-secondary">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar size={13} />
                          <span>
                            {new Date(r.receivedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-primary">
                        <span className="inline-flex items-center gap-1.5">
                          <User size={13} className="text-ink-tertiary" />
                          <span>
                            {r.farmerName ||
                              t(
                                "field.receipt.defaultFarmer",
                                "Nông hộ liên kết",
                              )}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ink-primary">
                        {displayWeight} kg
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 text-accent-info font-semibold">
                          <Drop size={13} />
                          <span>{displayMoisture}%</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.isOfflinePending ? (
                          <StatusBadge
                            status="PENDING"
                            label={t(
                              "field.receipt.pendingOfflineSync",
                              "Chờ đồng bộ",
                            )}
                          />
                        ) : r.status === "RECEIVED_MATCHED" ? (
                          <StatusBadge
                            status="BALANCED"
                            label={t("field.receipt.matched", "Đã khớp kho")}
                          />
                        ) : r.status === "PENDING_ARRIVAL" ? (
                          <StatusBadge
                            status="IN_PROGRESS"
                            label={t(
                              "field.receipt.pendingArrival",
                              "Chờ về nhà máy",
                            )}
                          />
                        ) : (
                          <StatusBadge
                            status="BALANCED"
                            label={t(
                              "field.receipt.sourceLotCreated",
                              "Đã lập Lô nguồn",
                            )}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        ariaLabel={t(
          "field.receipt.modalTitle",
          "Lập Phiếu Thu Mua Lúa Tươi Mới",
        )}
      >
        <div className="w-full max-w-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-ink-primary">
              {t("field.receipt.modalTitle", "Lập Phiếu Thu Mua Lúa Tươi Mới")}
            </h3>
            <button
              type="button"
              onClick={handleCloseModal}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {/* 1. Farmer Selection */}
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                {t("field.receipt.farmerLabel", "Chọn Nông hộ bán lúa *")}
              </label>
              <select
                required
                value={formData.farmerId}
                onChange={(e) => handleFarmerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full"
              >
                <option value="">
                  {t(
                    "field.receipt.selectFarmerPlaceholder",
                    "-- Chọn Nông hộ --",
                  )}
                </option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Plot Season Selection */}
            {currentPlotSeasons.length > 0 && (
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t(
                    "field.receipt.plotSeasonLabel",
                    "Thửa ruộng / Lô mùa vụ *",
                  )}
                </label>
                <select
                  required
                  value={formData.plotSeasonId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      plotSeasonId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full"
                >
                  {currentPlotSeasons.map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {ps.plotCode || "Thửa"} · {ps.seasonName || "Vụ mùa"} (
                      {ps.riceVariety || "Lúa tươi"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Collection Site & Receiving Location Selection */}
            {receivingOptions.length > 0 && (
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t(
                    "field.receipt.receivingOptionLabel",
                    "Điểm cân bờ ruộng & Trạm tiếp nhận *",
                  )}
                </label>
                <select
                  required
                  value={`${formData.collectionSiteId}|${formData.receivingLocationId}`}
                  onChange={(e) => {
                    const [siteId, locId] = e.target.value.split("|");
                    setFormData((prev) => ({
                      ...prev,
                      collectionSiteId: siteId,
                      receivingLocationId: locId,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full"
                >
                  {receivingOptions.map((opt) => (
                    <option
                      key={`${opt.collectionSiteId}|${opt.receivingLocationId}`}
                      value={`${opt.collectionSiteId}|${opt.receivingLocationId}`}
                    >
                      {opt.collectionSiteName || opt.collectionSiteCode} →{" "}
                      {opt.receivingLocationCode}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Commodity Info */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs">
              <span className="text-ink-secondary flex items-center gap-1.5 font-medium">
                <Plant size={14} className="text-accent-primary" />
                Danh mục hàng hóa:
              </span>
              <span className="font-semibold text-ink-primary">
                {refData?.commodity?.name || "Lúa tươi"}
              </span>
            </div>

            {/* 5. Measured Weight & Moisture */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t(
                    "field.receipt.weightLabel",
                    "Khối lượng cân thực tế (kg) *",
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formData.measuredWeightKg}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        measuredWeightKg: val,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono font-bold"
                  />
                  <span className="absolute right-3 top-2 text-ink-tertiary font-bold">
                    KG
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t(
                    "field.receipt.moistureLabel",
                    "Độ ẩm đo tại điểm cân (%) *",
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.moisturePercent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        moisturePercent: val,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono text-accent-info font-bold"
                  />
                  <span className="absolute right-3 top-2 text-ink-tertiary font-bold">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Policy notice */}
            <div className="p-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1.5 text-xs text-ink-secondary">
              <div className="flex items-center gap-1.5 font-semibold text-accent-primary">
                <Warehouse size={14} />
                <span>
                  {t(
                    "field.receipt.policyTitle",
                    "Quy trình bảo toàn dòng chảy khối lượng",
                  )}
                </span>
              </div>
              <p>
                {t(
                  "field.receipt.policyDesc",
                  "Khối lượng lúa tươi ghi nhận tại đây sẽ tạo Source Lot bất biến làm căn cứ đối soát khi xe tải chở lúa cập bến nhà máy sấy.",
                )}
              </p>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
              >
                {t("common.cancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
              >
                {submitting
                  ? t("field.receipt.submitting", "Đang ghi nhận...")
                  : t("field.receipt.submitBtn", "Lập Phiếu & Tạo Lô Nguồn")}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
