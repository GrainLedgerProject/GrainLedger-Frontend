import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { receiptPath } from "../paths";
import { toDecimal } from "@/shared/utils/decimalMass";
import {
  procurementEndpoints,
  type RegisterProcurementRequest,
  type ProcurementReceivingOption,
} from "@/api/procurement";
import { ApiError } from "@/api/client";
import { collectPages, type ApiPage } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import {
  getQueuedProcurementCount,
  getQueuedProcurements,
  onProcurementQueueChanged,
  queueProcurement,
} from "@/features/field/offline/procurementQueue";
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
} from "@/features/field/offline/offlineCache";
import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { RecordPagination } from "@/shared/ui/RecordWorkspace";
import { StatusBadge } from "@/shared/ui/StatusBadge";
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
  Trash,
} from "@phosphor-icons/react";

const DEFAULT_MASS_UNITS = [
  { code: "KG", name: "Kilogram", kgFactor: "1" },
  { code: "G", name: "Gram", kgFactor: "0.001" },
  { code: "T", name: "Tấn", kgFactor: "1000" },
];

function toLocalDateTimeInput(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ReceiptLineDraft {
  key: string;
  plotSeasonId: string;
  measuredValue: string;
  measuredUnit: string;
  moisturePercent: string;
}

interface ProcurementReceiptItem {
  id: string;
  code?: string;
  farmerId: string;
  farmerName?: string;
  commodityName?: string;
  receivedAt: string;
  itemCount?: number;
  totalQuantityKg?: number;
  totalNetMassKg?: string;
  remainingStockKg?: string;
  availableStockKg?: string;
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

function buildPendingReceiptItems(
  queued: Awaited<ReturnType<typeof getQueuedProcurements>>,
  cachedFarmers: CachedFarmer[] | null | undefined,
  massUnits: ReadonlyArray<{ code: string; kgFactor: string }> | undefined,
  fallbackFarmerLabel: string,
): ProcurementReceiptItem[] {
  const units = massUnits?.length ? massUnits : DEFAULT_MASS_UNITS;
  return queued.map((q) => {
    const rawItems = q.request.payload?.items ?? [];
    const mappedItems = rawItems.map((item, idx) => ({
      lineNo: Number(item.lineNo ?? idx + 1),
      measuredValue: item.measuredValue,
      measuredUnit: item.measuredUnit,
      moisturePercent: item.moisturePercent,
      lotId: item.lotId,
    }));
    let computedWeight = toDecimal(0);
    let canComputeWeight = mappedItems.length > 0;
    for (const item of mappedItems) {
      const unitCode = (item.measuredUnit || "KG").toUpperCase();
      const unitMeta = units.find((u) => u.code.toUpperCase() === unitCode);
      const valStr = item.measuredValue?.trim();
      if (!unitMeta || !valStr || isNaN(Number(valStr))) {
        canComputeWeight = false;
        break;
      }
      computedWeight = computedWeight.plus(toDecimal(valStr).mul(toDecimal(unitMeta.kgFactor)));
    }
    const matchedFarmer = (cachedFarmers || []).find(
      (f) => f.id === q.request.payload?.farmerId,
    );
    return {
      id: q.id,
      code: `OFFLINE-${q.request.clientOperationId.slice(0, 8).toUpperCase()}`,
      farmerId: q.request.payload?.farmerId || "",
      farmerName: matchedFarmer?.name || fallbackFarmerLabel,
      receivedAt: q.capturedAt,
      itemCount: mappedItems.length,
      totalNetMassKg: canComputeWeight ? computedWeight.toString() : undefined,
      isOfflinePending: true,
      status: "PENDING",
      items: mappedItems,
    };
  });
}

export const ProcurementReceiptPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canCapture = useAuthStore((state) =>
    state.user?.permissions.includes("purchases.write"),
  );
  const isOnline = useUiStore((state) => state.isOnline);
  const procurementSyncMode = useUiStore((state) => state.procurementSyncMode);
  const setPendingOfflineCount = useUiStore(
    (state) => state.setPendingOfflineCount,
  );
  const [receipts, setReceipts] = useState<ProcurementReceiptItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [farmerFilter, setFarmerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"receivedAt" | "code" | "status">(
    "receivedAt",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
  const [formData, setFormData] = useState<{
    farmerId: string;
    collectionSiteId: string;
    receivingLocationId: string;
    commodityId: string;
    receivedAt: string;
    items: ReceiptLineDraft[];
  }>({
    farmerId: "",
    collectionSiteId: "",
    receivingLocationId: "",
    commodityId: "",
    receivedAt: "",
    items: [],
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

      const pendingItems = buildPendingReceiptItems(
        queued,
        cachedFarmers,
        cachedRef?.massUnits,
        t("field.receipt.offlineFarmer", "Nông hộ (Chờ đồng bộ)"),
      );

      // 3. If online, fetch fresh server data
      if (isOnline) {
        const receiptParams: Record<string, string | number> = {
          page,
          pageSize: 20,
          sortBy,
          sortDirection,
        };
        if (debouncedSearch) receiptParams.search = debouncedSearch;
        if (farmerFilter) receiptParams.farmerId = farmerFilter;
        if (fromDate) receiptParams.from = fromDate;
        if (toDate) receiptParams.to = toDate;

        const [receiptsRes, farmerList, refRes, plotSeasonItems, plotItems] =
          await Promise.all([
            procurementEndpoints.getProcurements(receiptParams),
            collectPages<CachedFarmer>((paging) =>
              procurementEndpoints.getFarmers(paging) as Promise<
                ApiPage<CachedFarmer>
              >,
            ).catch(() => null),
            canCapture
              ? procurementEndpoints.getReferenceData().catch(() => null)
              : Promise.resolve(null),
            collectPages<CachedPlotSeason>((paging) =>
              procurementEndpoints.getPlotSeasons(paging) as Promise<
                ApiPage<CachedPlotSeason>
              >,
            ).catch(() => null),
            collectPages<CachedPlot>((paging) =>
              procurementEndpoints.getPlots(paging) as Promise<
                ApiPage<CachedPlot>
              >,
            ).catch(() => null),
          ]);

        if (!isMountedRef.current) return;

        const serverReceipts: ProcurementReceiptItem[] = Array.isArray(
          receiptsRes,
        )
          ? receiptsRes
          : (receiptsRes as { items?: ProcurementReceiptItem[] })?.items || [];
        const serverTotal = Array.isArray(receiptsRes)
          ? serverReceipts.length
          : ((receiptsRes as { totalCount?: number })?.totalCount ??
            serverReceipts.length);
        const serverHasMore = Array.isArray(receiptsRes)
          ? false
          : Boolean((receiptsRes as { hasMore?: boolean })?.hasMore);

        setReceipts([...(page === 1 ? pendingItems : []), ...serverReceipts]);
        setTotalCount(serverTotal);
        setHasMore(serverHasMore);

        if (farmerList && farmerList.length > 0) {
          setFarmers(farmerList);
          void saveCachedFarmers(farmerList, false);
        }

        if (plotSeasonItems && plotSeasonItems.length > 0) {
          setAllPlotSeasons(plotSeasonItems);
        }

        if (plotItems && plotItems.length > 0) {
          setAllPlots(plotItems);
        }

        if (refRes) {
          const compositeRefData: CachedReferenceData = {
            ...refRes,
            plotSeasons:
              plotSeasonItems && plotSeasonItems.length > 0
                ? plotSeasonItems
                : cachedRef?.plotSeasons,
            plots:
              plotItems && plotItems.length > 0 ? plotItems : cachedRef?.plots,
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
  }, [
    canCapture,
    debouncedSearch,
    farmerFilter,
    fromDate,
    isOnline,
    page,
    sortBy,
    sortDirection,
    t,
    toDate,
  ]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  const filterInitializedRef = useRef(false);
  useEffect(() => {
    if (!filterInitializedRef.current) {
      filterInitializedRef.current = true;
      return;
    }
    void loadData();
  }, [loadData]);

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
        const pendingItems = buildPendingReceiptItems(
          queued,
          cachedFarmers,
          cachedRef?.massUnits,
          t("field.receipt.offlineFarmer", "Nông hộ (Chờ đồng bộ)"),
        );

        if (isOnline) {
          const [receiptsRes, farmerList, refRes, plotSeasonItems, plotItems] =
            await Promise.all([
              procurementEndpoints.getProcurements({
                page: 1,
                pageSize: 20,
                sortBy: "receivedAt",
                sortDirection: "desc",
              }),
              collectPages<CachedFarmer>((paging) =>
                procurementEndpoints.getFarmers(paging) as Promise<
                  ApiPage<CachedFarmer>
                >,
              ).catch(() => null),
              canCapture
                ? procurementEndpoints.getReferenceData().catch(() => null)
                : Promise.resolve(null),
              collectPages<CachedPlotSeason>((paging) =>
                procurementEndpoints.getPlotSeasons(paging) as Promise<
                  ApiPage<CachedPlotSeason>
                >,
              ).catch(() => null),
              collectPages<CachedPlot>((paging) =>
                procurementEndpoints.getPlots(paging) as Promise<
                  ApiPage<CachedPlot>
                >,
              ).catch(() => null),
            ]);
          if (!active) return;

          const serverReceipts = Array.isArray(receiptsRes)
            ? receiptsRes
            : (receiptsRes as { items?: ProcurementReceiptItem[] })?.items ||
              [];
          const serverTotal = Array.isArray(receiptsRes)
            ? serverReceipts.length
            : ((receiptsRes as { totalCount?: number })?.totalCount ??
              serverReceipts.length);
          const serverHasMore = Array.isArray(receiptsRes)
            ? false
            : Boolean((receiptsRes as { hasMore?: boolean })?.hasMore);

          setReceipts([...pendingItems, ...serverReceipts]);
          setTotalCount(serverTotal);
          setHasMore(serverHasMore);

          if (farmerList && farmerList.length > 0) {
            setFarmers(farmerList);
            void saveCachedFarmers(farmerList, false);
          }

          if (plotSeasonItems && plotSeasonItems.length > 0) {
            setAllPlotSeasons(plotSeasonItems);
          }

          if (plotItems && plotItems.length > 0) {
            setAllPlots(plotItems);
          }

          if (refRes) {
            const compositeRefData: CachedReferenceData = {
              ...refRes,
              plotSeasons:
                plotSeasonItems && plotSeasonItems.length > 0
                  ? plotSeasonItems
                  : cachedRef?.plotSeasons,
              plots:
                plotItems && plotItems.length > 0
                  ? plotItems
                  : cachedRef?.plots,
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
      void loadDataRef.current();
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
  }, [isOnline, t, canCapture]);

  // Filter plot-seasons for the currently selected farmer in formData
  const getAvailablePlotSeasons = useCallback(
    (selectedFarmerId: string): CachedPlotSeason[] => {
      if (!selectedFarmerId) return [];
      const farmerPlots = allPlots.filter(
        (p) => p.farmerId === selectedFarmerId,
      );
      if (farmerPlots.length === 0) return [];
      const plotIds = new Set(farmerPlots.map((p) => p.id));
      return allPlotSeasons.filter((ps) => plotIds.has(ps.plotId));
    },
    [allPlots, allPlotSeasons],
  );

  const unitOptions =
    refData?.massUnits && refData.massUnits.length > 0
      ? refData.massUnits
      : DEFAULT_MASS_UNITS;
  const maxLines = Math.max(1, refData?.maxLinesPerReceipt ?? 20);

  const handleOpenCreate = () => {
    if (!canCapture) return;
    const selectedFarmer = farmers[0];
    const farmerId = selectedFarmer?.id || "";

    const options = getReceivingOptions(refData);
    const defaultOption = options[0];
    const defaultSiteId = defaultOption?.collectionSiteId || "";
    const defaultLocId = defaultOption?.receivingLocationId || "";

    const defaultCommId =
      refData?.commodity?.id || refData?.commodities?.[0]?.id || "";

    const availablePlotSeasons = getAvailablePlotSeasons(farmerId);
    const defaultPlotSeasonId = availablePlotSeasons[0]?.id || "";
    const defaultUnit = unitOptions[0]?.code || "KG";

    setFormData({
      farmerId,
      collectionSiteId: defaultSiteId,
      receivingLocationId: defaultLocId,
      commodityId: defaultCommId,
      receivedAt: toLocalDateTimeInput(new Date()),
      items: [
        {
          key: crypto.randomUUID(),
          plotSeasonId: defaultPlotSeasonId,
          measuredValue: "",
          measuredUnit: defaultUnit,
          moisturePercent: "",
        },
      ],
    });
    setIsModalOpen(true);
  };

  const handleFarmerChange = (farmerId: string) => {
    const availablePlotSeasons = getAvailablePlotSeasons(farmerId);
    const allowedIds = new Set(availablePlotSeasons.map((ps) => ps.id));
    const fallbackId = availablePlotSeasons[0]?.id || "";
    setFormData((prev) => ({
      ...prev,
      farmerId,
      items: prev.items.map((line) => ({
        ...line,
        plotSeasonId: allowedIds.has(line.plotSeasonId)
          ? line.plotSeasonId
          : fallbackId,
      })),
    }));
  };

  const handleAddLine = () => {
    if (formData.items.length >= maxLines) return;
    const availablePlotSeasons = getAvailablePlotSeasons(formData.farmerId);
    const defaultPlotSeasonId =
      availablePlotSeasons[0]?.id || allPlotSeasons[0]?.id || "";
    const defaultUnit = unitOptions[0]?.code || "KG";
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: crypto.randomUUID(),
          plotSeasonId: defaultPlotSeasonId,
          measuredValue: "",
          measuredUnit: defaultUnit,
          moisturePercent: "",
        },
      ],
    }));
  };

  const handleUpdateLine = (key: string, patch: Partial<ReceiptLineDraft>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    }));
  };

  const handleRemoveLine = (key: string) => {
    setFormData((prev) =>
      prev.items.length <= 1
        ? prev
        : { ...prev, items: prev.items.filter((line) => line.key !== key) },
    );
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
      formData.items.length === 0
    ) {
      setError(
        "Cần chọn đủ điểm thu mua, vị trí tiếp nhận, mặt hàng và ít nhất một dòng cân trước khi lưu phiếu.",
      );
      return;
    }

    const parsedReceivedAt = formData.receivedAt
      ? new Date(formData.receivedAt)
      : new Date();
    if (Number.isNaN(parsedReceivedAt.getTime())) {
      setError("Thời điểm cân thu mua không hợp lệ.");
      return;
    }

    const normalizedLines = formData.items.map((line) => ({
      plotSeasonId: line.plotSeasonId,
      measuredValue: line.measuredValue.trim().replace(",", "."),
      measuredUnit: line.measuredUnit || "KG",
      moisturePercent: line.moisturePercent.trim().replace(",", "."),
    }));
    const invalidLine = normalizedLines.find(
      (line) =>
        !line.plotSeasonId ||
        !/^[0-9]+(?:\.[0-9]+)?$/.test(line.measuredValue) ||
        Number(line.measuredValue) <= 0 ||
        !/^[0-9]+(?:\.[0-9]+)?$/.test(line.moisturePercent) ||
        Number(line.moisturePercent) < 0 ||
        Number(line.moisturePercent) > 100,
    );
    if (invalidLine) {
      setError(
        "Vui lòng nhập đầy đủ thửa-vụ, khối lượng (> 0) và độ ẩm (0–100%) hợp lệ cho tất cả các dòng.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    let request: RegisterProcurementRequest | null = null;
    try {
      const entityId = crypto.randomUUID();
      const clientOperationId = crypto.randomUUID();

      request = {
        deviceId: "grainledger-web",
        clientOperationId,
        capturedAt: new Date().toISOString(),
        payloadSchemaVersion: 2,
        payload: {
          entityId,
          farmerId: formData.farmerId,
          collectionSiteId: formData.collectionSiteId,
          receivingLocationId: formData.receivingLocationId,
          commodityId: selectedCommodityId,
          receivedAt: parsedReceivedAt.toISOString(),
          items: normalizedLines.map((line, index) => ({
            itemId: crypto.randomUUID(),
            lineNo: index + 1,
            plotSeasonId: line.plotSeasonId,
            measuredValue: line.measuredValue,
            measuredUnit: line.measuredUnit,
            moisturePercent: line.moisturePercent,
            lotId: crypto.randomUUID(),
            sourceLotId: crypto.randomUUID(),
          })),
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
        const summaryMass = normalizedLines
          .map((line) => `${line.measuredValue} ${line.measuredUnit}`)
          .join(" + ");
        setSuccessMsg(
          t(
            "field.receipt.successCreated",
            "Đã lập thành công Phiếu thu mua {{code}} ({{weight}})",
            {
              code: response?.code || "mới",
              weight: summaryMass,
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
    if (isOnline && !r.isOfflinePending) return true;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.code?.toLowerCase().includes(q) ||
      r.farmerName?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
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
          {canCapture && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
            >
              <Plus size={16} weight="bold" />
              <span>
                {t("field.receipt.createBtn", "Lập Phiếu Thu Mua mới")}
              </span>
            </button>
          )}
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
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div className="relative lg:col-span-2">
            <MagnifyingGlass
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
            />
            <input
              type="text"
              placeholder={t(
                "field.receipt.searchPlaceholder",
                "Tìm theo mã phiếu hoặc nông hộ...",
              )}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 dark:bg-surface-base"
            />
          </div>

          <select
            aria-label={t("field.receipt.farmer", "Nông hộ")}
            value={farmerFilter}
            onChange={(e) => {
              setFarmerFilter(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-base"
          >
            <option value="">Tất cả nông hộ</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="Từ ngày"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-base"
          />

          <input
            type="date"
            aria-label="Đến ngày"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-base"
          />

          <div className="flex items-center gap-2">
            <select
              aria-label="Sắp xếp theo"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setPage(1);
              }}
              className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-base"
            >
              <option value="receivedAt">Ngày cân</option>
              <option value="code">Mã phiếu</option>
              <option value="status">Trạng thái</option>
            </select>
            <select
              aria-label="Chiều sắp xếp"
              value={sortDirection}
              onChange={(e) => {
                setSortDirection(e.target.value as "asc" | "desc");
                setPage(1);
              }}
              className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-base"
            >
              <option value="desc">Giảm</option>
              <option value="asc">Tăng</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-secondary">
          <div className="flex items-center gap-4">
            <div>
              {t("field.receipt.totalReceipts", "Tổng số phiếu thu mua:")}{" "}
              <strong className="font-mono text-ink-primary font-bold">
                {totalCount || filteredReceipts.length}
              </strong>
            </div>
            {farmers.length > 0 && (
              <div className="text-ink-tertiary">
                ({farmers.length}{" "}
                {t("field.receipt.farmersCached", "nông hộ sẵn sàng")})
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1 font-semibold text-accent-primary hover:underline"
          >
            <ArrowsClockwise size={13} />
            <span>Áp dụng lọc</span>
          </button>
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
                  <th className="py-3 px-4 text-right">
                    {t("field.receipt.lineCount", "Số dòng")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.weightKg", "Khối lượng cân (kg)")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.remainingStockKg", "Tồn còn lại (kg)")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.receipt.availableStockKg", "Tồn khả dụng (kg)")}
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
                  const lineCount = r.itemCount ?? r.items?.length;
                  const displayWeight = r.totalNetMassKg ?? r.totalQuantityKg;
                  const displayMoisture =
                    r.items?.length === 1
                      ? firstItem?.moisturePercent != null
                        ? `${firstItem.moisturePercent}%`
                        : null
                      : r.items && r.items.length > 1
                        ? r.items
                            .map((item) =>
                              item.moisturePercent != null
                                ? `${item.moisturePercent}%`
                                : "—",
                            )
                            .join(" / ")
                        : null;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                        {r.isOfflinePending ? (
                          r.code || r.id
                        ) : (
                          <Link
                            className="underline underline-offset-2"
                            to={receiptPath(r.id)}
                          >
                            {r.code || r.id}
                          </Link>
                        )}
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
                      <td className="py-3 px-4 text-right font-mono text-ink-secondary">
                        {lineCount == null ? "—" : lineCount}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ink-primary">
                        <div>
                          {displayWeight == null ? "—" : `${displayWeight} kg`}
                        </div>
                        {r.isOfflinePending && r.items && r.items.length > 1 && (
                          <div className="mt-0.5 text-[11px] font-normal text-ink-secondary">
                            {r.items
                              .map(
                                (item) =>
                                  `${item.measuredValue || "0"} ${item.measuredUnit || "KG"} (${item.moisturePercent || "0"}%)`,
                              )
                              .join(" + ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-secondary">
                        {r.remainingStockKg == null ? "—" : `${r.remainingStockKg} kg`}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-secondary">
                        {r.availableStockKg == null ? "—" : `${r.availableStockKg} kg`}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 text-accent-info font-semibold">
                          <Drop size={13} />
                          <span>{displayMoisture ?? "—"}</span>
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
                            status={
                              r.status?.startsWith("RECEIVED_")
                                ? "BALANCED"
                                : "PENDING"
                            }
                            label={r.status || "—"}
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
        <div className="border-t border-ink-tertiary/15 px-4">
          <RecordPagination
            page={page}
            hasMore={hasMore}
            count={totalCount}
            onPage={(nextPage) => setPage(nextPage)}
            label={t("field.receipt.title", "Phiếu Thu Mua")}
          />
        </div>
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
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl animate-ledger-in">
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
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger font-medium flex items-start gap-2"
              >
                <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {/* 1. Farmer Selection & Received At */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t("field.receipt.farmerLabel", "Chọn Nông hộ bán lúa *")}
                </label>
                <select
                  required
                  value={formData.farmerId}
                  onChange={(e) => handleFarmerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
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

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t("field.receipt.weighedAt", "Thời điểm cân")} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.receivedAt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      receivedAt: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Collection Site & Receiving Location Selection */}
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
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
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

            {/* 3. Commodity Info */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs">
              <span className="text-ink-secondary flex items-center gap-1.5 font-medium">
                <Plant size={14} className="text-accent-primary" />
                Danh mục hàng hóa:
              </span>
              <span className="font-semibold text-ink-primary">
                {refData?.commodity?.name || "Lúa tươi"}
              </span>
            </div>

            {/* 4. Weighing Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-secondary">
                  {t(
                    "field.receipt.linesTitle",
                    "Danh sách dòng cân & thửa-vụ",
                  )}{" "}
                  ({formData.items.length}/{maxLines})
                </span>
                <button
                  type="button"
                  disabled={formData.items.length >= maxLines}
                  onClick={handleAddLine}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-accent-primary/30 bg-accent-primary/10 text-accent-primary font-semibold hover:bg-accent-primary/20 disabled:opacity-50"
                >
                  <Plus size={13} weight="bold" />
                  <span>{t("field.receipt.addLine", "Thêm dòng")}</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((line, index) => (
                  <div
                    key={line.key}
                    className="p-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/60 dark:bg-surface-overlay/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-ink-primary">
                        Dòng #{index + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.key)}
                          className="inline-flex items-center gap-1 text-accent-danger hover:underline"
                        >
                          <Trash size={13} />
                          <span>Xóa dòng</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-secondary mb-1">
                        {t(
                          "field.receipt.plotSeasonLabel",
                          "Thửa ruộng / Lô mùa vụ *",
                        )}
                      </label>
                      <select
                        required
                        value={line.plotSeasonId}
                        onChange={(e) =>
                          handleUpdateLine(line.key, {
                            plotSeasonId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none"
                      >
                        <option value="">-- Chọn thửa ruộng / vụ mùa --</option>
                        {currentPlotSeasons.map((ps) => (
                          <option key={ps.id} value={ps.id}>
                            {ps.plotCode || "Thửa"} ·{" "}
                            {ps.seasonName || "Vụ mùa"} (
                            {ps.riceVariety || "Lúa tươi"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-ink-secondary mb-1">
                          {t("field.receipt.weightLabel", "Khối lượng cân *")}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          placeholder="VD: 5000"
                          value={line.measuredValue}
                          onChange={(e) =>
                            handleUpdateLine(line.key, {
                              measuredValue: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-ink-secondary mb-1">
                          {t("field.receipt.unitLabel", "Đơn vị *")}
                        </label>
                        <select
                          required
                          value={line.measuredUnit}
                          onChange={(e) =>
                            handleUpdateLine(line.key, {
                              measuredUnit: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono font-semibold"
                        >
                          {unitOptions.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code} ({u.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-ink-secondary mb-1">
                          {t("field.receipt.moistureLabel", "Độ ẩm (%) *")}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            required
                            placeholder="VD: 24.5"
                            value={line.moisturePercent}
                            onChange={(e) =>
                              handleUpdateLine(line.key, {
                                moisturePercent: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 pe-8 rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono text-accent-info font-bold"
                          />
                          <span className="absolute right-3 top-2 text-ink-tertiary font-bold">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
