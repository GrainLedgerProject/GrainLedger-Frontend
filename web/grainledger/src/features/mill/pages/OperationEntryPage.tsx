/**
 * @screen SC-15
 * @feature F08, F09 (Custody Ledger)
 * @roles MILL_OPERATOR, MILL_MANAGER (View)
 * @description Record drying, milling, physical blending or merge, bagging, or transfer of an unchanged lot between locations.
 * Validates mass balance conservation and double-spending prevention.
 */
import { ledgerEndpoints, type CorrectionOperation, type PolicyDto } from "@/api/ledger";
import { pageItems } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { useDraftStore } from "@/app/store/draftStore";
import { HoldBanner } from "@/features/risk/components/HoldBanner";
import { LedgerRejectionCard } from "@/features/mill/components/LedgerRejectionCard";
import { MassValue } from "@/shared/ui/MassValue";
import { checkMassBalance, toDecimal } from "@/shared/utils/decimalMass";
import {
  ArrowRight,
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  FloppyDisk,
  LockSimple,
  Scales,
  Stack,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { logger } from "@/shared/utils/logger";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { millPaths } from "../paths";

export interface LotOption {
  id: string;
  code: string;
  stage?: string;
  commodityName?: string;
  commodityId?: string;
  productIdentity?: string;
  poolRevision?: string | number;
  locationId?: string;
  locationName?: string;
  quantityKg: string;
  availableKg: string;
  isHold: boolean;
  holdReason?: string;
  restrictions?: string[];
  ownerId?: string;
  facilityId?: string;
}

interface RawPosition {
  facilityId?: string;
  locationId?: string;
  quantityKg?: string | number;
  availableKg?: string | number;
  poolRevision?: string | number;
}

interface RawLot {
  id?: string;
  code?: string;
  stage?: string;
  stageCode?: string;
  commodityId?: string;
  commodityName?: string;
  productIdentity?: string;
  quantityKg?: string | number;
  currentMassKg?: string | number;
  availableKg?: string | number;
  locationId?: string;
  locationName?: string;
  positions?: RawPosition[];
  restrictions?: string[];
  status?: string;
  holdReason?: string;
  ownerId?: string;
  facilityId?: string;
}

interface LookupItem {
  id: string;
  name?: string;
  code?: string;
  facilityId?: string;
  kind?: string;
  mixedBulk?: boolean;
  ownerId?: string | null;
}

interface LookupData {
  locations?: LookupItem[];
  commodities?: LookupItem[];
  equipment?: LookupItem[];
  policies?: PolicyDto[];
  compatibilities?: { facilityId: string; inputProducts: string[]; outputCommodityId: string; effectiveFrom: string }[];
}

interface CreateOperationResponse {
  id?: string;
  operationId?: string;
}

interface CommitOperationResponse {
  id?: string;
  code?: string;
}

interface DraftData {
  processType: "DRYING" | "MILLING" | "BLENDING" | "BAGGING";
  selectedInputLot: string;
  inputMassKg: string;
  headRiceKg: string;
  brokenRiceKg: string;
  branKg: string;
  huskKg: string;
  declaredLossKg: string;
  lossReason: string;
}

const DRAFT_KEY = "SC15_OPERATION_ENTRY";

export const OperationEntryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setHasUnsavedDrafts, user } = useAuthStore();
  const canWrite = user?.role === "MILL_OPERATOR" && user.permissions.includes("conversions.write");
  const { saveDraft, getDraft, clearDraft } = useDraftStore();

  const initialDraft = useMemo(() => {
    return getDraft<DraftData>(DRAFT_KEY);
  }, [getDraft]);

  // API Lots state
  const [lots, setLots] = useState<LotOption[]>([]);
  const [loadingLots, setLoadingLots] = useState<boolean>(true);
  const [fetchLotsError, setFetchLotsError] = useState<string | null>(null);

  // Process type options initialized from draft or defaults
  const [processType, setProcessType] = useState<
    "DRYING" | "MILLING" | "BLENDING" | "BAGGING"
  >(() => initialDraft?.processType || "MILLING");
  const [selectedInputLot, setSelectedInputLot] = useState<string>(
    () => initialDraft?.selectedInputLot || "",
  );
  const [inputMassKg, setInputMassKg] = useState<string>(
    () => initialDraft?.inputMassKg || "",
  );

  // Outputs (for milling: head rice, broken, bran, husk, and declared loss)
  const [headRiceKg, setHeadRiceKg] = useState<string>(
    () => initialDraft?.headRiceKg || "",
  );
  const [brokenRiceKg, setBrokenRiceKg] = useState<string>(
    () => initialDraft?.brokenRiceKg || "",
  );
  const [branKg, setBranKg] = useState<string>(
    () => initialDraft?.branKg || "",
  );
  const [huskKg, setHuskKg] = useState<string>(
    () => initialDraft?.huskKg || "",
  );
  const [declaredLossKg, setDeclaredLossKg] = useState<string>(
    () => initialDraft?.declaredLossKg || "",
  );
  const [lossReason, setLossReason] = useState<string>(
    () => initialDraft?.lossReason || "",
  );

  const [submissionStatus, setSubmissionStatus] = useState<
    "IDLE" | "AWAITING_CONFIRMATION" | "BALANCED_COMMITTED" | "REJECTED"
  >("IDLE");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [committedTransactionCode, setCommittedTransactionCode] =
    useState<string>("");
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<LookupData>({});
  const [referenceTime, setReferenceTime] = useState(0);
  const [equipmentId, setEquipmentId] = useState("");
  const [outputLocationId, setOutputLocationId] = useState("");
  const [blendCommodityId, setBlendCommodityId] = useState("");
  const attempt = useRef<{ fingerprint: string; body: object; id: string; draftSaved: boolean } | null>(null);

  // Active chosen lot from fetched lots
  const activeLot = useMemo(() => {
    return (
      lots.find(
        (l) => l.id === selectedInputLot || l.code === selectedInputLot,
      ) || lots[0]
    );
  }, [lots, selectedInputLot]);
  const equipment = reference.equipment?.filter(item => item.facilityId === activeLot?.facilityId) ?? [];
  const outputLocations = reference.locations?.filter(item => item.facilityId === activeLot?.facilityId &&
    item.kind !== "ISOLATION" && (!item.ownerId || item.ownerId === activeLot?.ownerId)) ?? [];
  const compatibleCommodities = new Set(reference.compatibilities?.filter(item => item.facilityId === activeLot?.facilityId &&
    Date.parse(item.effectiveFrom) <= referenceTime && activeLot?.productIdentity && item.inputProducts.includes(activeLot.productIdentity))
    .map(item => item.outputCommodityId));
  const blendCommodities = reference.commodities?.filter(item => compatibleCommodities.has(item.id)) ?? [];
  const policy = reference.policies?.filter(item => item.facilityId === activeLot?.facilityId &&
    item.kind === processType && Date.parse(item.effectiveFrom) <= referenceTime)
    .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
  const tolerancePercent = Number(policy?.tolerancePercent ?? 0);

  // Check if chosen lot is under HOLD
  const isInputLotOnHold = Boolean(activeLot?.isHold);

  // Calculate live mass balance
  const totalOut = processType === "MILLING"
    ? toDecimal(headRiceKg).plus(toDecimal(brokenRiceKg)).plus(toDecimal(branKg)).plus(toDecimal(huskKg))
    : toDecimal(headRiceKg);

  const balanceResult = checkMassBalance(
    toDecimal(inputMassKg),
    totalOut,
    toDecimal(declaredLossKg),
    tolerancePercent,
  );

  // Fetch lots from API
  const fetchLots = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setLoadingLots(true);
      setFetchLotsError(null);
    }
    try {
      const [lotsRes, lookupsRes] = await Promise.all([
        ledgerEndpoints.getLots({ pageSize: 100 }),
        ledgerEndpoints.getSetup(),
      ]);
      setReference(lookupsRes as LookupData);
      setReferenceTime(Date.now());

      const items: RawLot[] = Array.isArray(lotsRes)
        ? (lotsRes as RawLot[])
        : (lotsRes as { items?: RawLot[] })?.items || [];

      if (items && items.length > 0) {
        const lookupsData = lookupsRes as LookupData | null;
        const locationsMap = new Map<string, string>();
        if (lookupsData?.locations && Array.isArray(lookupsData.locations)) {
          for (const loc of lookupsData.locations) {
            locationsMap.set(loc.id, loc.name || loc.code || loc.id);
          }
        }

        const commoditiesMap = new Map<string, string>();
        if (
          lookupsData?.commodities &&
          Array.isArray(lookupsData.commodities)
        ) {
          for (const com of lookupsData.commodities) {
            commoditiesMap.set(com.id, com.name || com.id);
          }
        }

        const mappedLots: LotOption[] = items.map((lot: RawLot) => {
          const firstPos =
            lot.positions && lot.positions.length > 0 ? lot.positions[0] : null;
          const locId = firstPos?.locationId || lot.locationId || "";
          const locName =
            locationsMap.get(locId) ||
            lot.locationName ||
            (locId ? `Vị trí Silo ${locId.slice(0, 8)}` : "Silo chính");

          let totalKg: string;
          let availableKg: string;
          if (
            lot.positions &&
            Array.isArray(lot.positions) &&
            lot.positions.length > 0
          ) {
            totalKg = lot.positions
              .reduce(
                (sum: number, p: RawPosition) =>
                  sum + (parseFloat(String(p.quantityKg)) || 0),
                0,
              )
              .toString();
            availableKg = String(firstPos?.availableKg ?? firstPos?.quantityKg ?? "0");
          } else {
            totalKg = String(lot.quantityKg || lot.currentMassKg || "0");
            availableKg = String(lot.availableKg || lot.quantityKg || "0");
          }

          const restrictions = Array.isArray(lot.restrictions)
            ? lot.restrictions
            : [];
          const isHold =
            lot.status === "HOLD" ||
            restrictions.length > 0 ||
            restrictions.some(
              (r: string) =>
                typeof r === "string" && r.toUpperCase().includes("HOLD"),
            ) ||
            String(lot.code || "")
              .toUpperCase()
              .includes("HOLD");

          const holdReason =
            lot.holdReason ||
            restrictions.find(
              (r: string) =>
                typeof r === "string" && r.toUpperCase().includes("HOLD"),
            ) ||
            restrictions[0] ||
            (isHold
              ? "Lô đang trong lệnh phong toả / kiểm dịch tạm thời"
              : undefined);

          return {
            id: String(lot.id || lot.code),
            code: String(lot.code || lot.id),
            stage: lot.stage || "RAW_PADDY",
            commodityName:
              commoditiesMap.get(lot.commodityId || "") ||
              lot.commodityName ||
              lot.productIdentity ||
              "Lúa tươi",
            commodityId: lot.commodityId,
            productIdentity: lot.productIdentity,
            poolRevision: firstPos?.poolRevision,
            locationId: locId,
            locationName: locName,
            quantityKg: totalKg,
            availableKg: availableKg,
            isHold,
            holdReason,
            restrictions,
            ownerId: lot.ownerId,
            facilityId: firstPos?.facilityId || lot.facilityId,
          };
        });

        setLots(mappedLots);

        // Keep selection valid if existing is found, otherwise default to first lot
        setSelectedInputLot((prev) => {
          return (
            mappedLots.find((l) => l.id === prev || l.code === prev)?.id ||
            mappedLots[0]?.id ||
            ""
          );
        });
      } else {
        setLots([]);
        setSelectedInputLot("");
      }
    } catch (err) {
      logger.warn("Could not fetch lots from API:", err);
      setFetchLotsError("Không thể tải danh sách lô từ máy chủ.");
      setLots([]);
      setSelectedInputLot("");
    } finally {
      setLoadingLots(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLots(false);
  }, [fetchLots]);

  const handleFieldChange = () => {
    setHasUnsavedDrafts(true);
    saveDraft(DRAFT_KEY, {
      processType,
      selectedInputLot,
      inputMassKg,
      headRiceKg,
      brokenRiceKg,
      branKg,
      huskKg,
      declaredLossKg,
      lossReason,
    });
  };

  const handleClearDraft = () => {
    clearDraft(DRAFT_KEY);
    setHasUnsavedDrafts(false);
    setInputMassKg("");
    setHeadRiceKg("");
    setBrokenRiceKg("");
    setBranKg("");
    setHuskKg("");
    setDeclaredLossKg("");
    setLossReason("");
    setSubmissionStatus("IDLE");
    setApiErrorMessage(null);
  };

  const handleCommitOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || isSubmitting) return;

    if (
      !activeLot?.id ||
      activeLot.id !== selectedInputLot ||
      !activeLot.locationId ||
      !activeLot.facilityId ||
      !activeLot.ownerId
    ) {
      setApiErrorMessage(
        "Cần chọn lô và vị trí hợp lệ từ máy chủ trước khi ghi sổ.",
      );
      return;
    }
    const outputCommodity = processType === "BLENDING" ? blendCommodityId : activeLot.commodityId;
    if (!equipment.some(item => item.id === equipmentId) || !outputLocations.some(item => item.id === outputLocationId) ||
      !outputCommodity || (processType === "BLENDING" && !compatibleCommodities.has(outputCommodity)) ||
      (processType === "BAGGING" && !activeLot.productIdentity)) {
      setApiErrorMessage(t("mill.operations.selectExecutionDetails", "Chọn thiết bị, vị trí và loại đầu ra hợp lệ."));
      return;
    }
    if (
      toDecimal(inputMassKg).lessThanOrEqualTo(0) ||
      toDecimal(inputMassKg).greaterThan(toDecimal(activeLot.availableKg)) ||
      totalOut.lessThanOrEqualTo(0)
    ) {
      setApiErrorMessage(
        "Khối lượng đầu vào phải lớn hơn 0, không vượt tồn khả dụng và cần có đầu ra.",
      );
      return;
    }

    if (isInputLotOnHold) {
      setSubmissionStatus("REJECTED");
      return;
    }

    if (policy && !balanceResult.isBalanced) {
      setSubmissionStatus("REJECTED");
      return;
    }

    setIsSubmitting(true);
    setApiErrorMessage(null);

    try {
      const stages = processType === "MILLING"
        ? [["HEAD_RICE", headRiceKg], ["BROKEN_RICE", brokenRiceKg], ["BRAN", branKg], ["HUSK", huskKg]]
        : [[processType === "DRYING" ? "DRIED_PADDY" : processType === "BLENDING" ? "BLENDED_RICE" : "BAGGED_RICE", headRiceKg]];
      const outputProducts = stages.filter(([, quantityKg]) => toDecimal(quantityKg).greaterThan(0))
        .map(([stage, quantityKg]) => ({
          stage,
          productIdentity: processType === "BAGGING" ? activeLot.productIdentity : stage,
          commodityId: outputCommodity,
          locationId: outputLocationId,
          quantityKg,
        }));
      if (!outputProducts.length) throw new Error(t("mill.operations.selectExecutionDetails", "Chọn thiết bị, vị trí và loại đầu ra hợp lệ."));
      const fields = {
        facilityId: activeLot.facilityId,
        ownerId: activeLot.ownerId,
        kind: processType,
        equipmentId,
        inputs: [
          {
            lotId: activeLot.id,
            locationId: activeLot.locationId,
            quantityKg: inputMassKg,
            ...(activeLot.poolRevision != null && { poolRevision: activeLot.poolRevision }),
          },
        ],
        outputs: outputProducts,
        declaredLossKg: declaredLossKg || "0",
        declaredLossReason: lossReason,
      };
      const fingerprint = JSON.stringify(fields);
      if (attempt.current?.fingerprint === fingerprint) {
        if (!attempt.current.draftSaved) {
          const found = await ledgerEndpoints.getOperations({ ids: attempt.current.id, pageSize: 1 });
          attempt.current.draftSaved = pageItems<CorrectionOperation>(found).some(item => item.id === attempt.current?.id);
        }
      } else {
        const id = crypto.randomUUID();
        attempt.current = {
          fingerprint,
          id,
          draftSaved: false,
          body: { ...fields, id, occurredAt: new Date().toISOString(), outputs: outputProducts.map(output => ({ ...output, id: crypto.randomUUID() })) },
        };
      }
      const current = attempt.current;
      if (!current.draftSaved) {
        const result = await ledgerEndpoints.recordOperation(current.body) as CreateOperationResponse | null;
        if ((result?.id ?? result?.operationId) !== current.id) throw new Error("Máy chủ không trả về đúng ID bút toán vừa tạo.");
        current.draftSaved = true;
      }
      if (!balanceResult.varianceKg.isZero()) {
        setSubmissionStatus("AWAITING_CONFIRMATION");
        clearDraft(DRAFT_KEY);
        setHasUnsavedDrafts(false);
        return;
      }
      const commitRes = await ledgerEndpoints.commitOperation(current.id, {}) as CommitOperationResponse | null;
      const committedCode = commitRes?.code || commitRes?.id || current.id;
      attempt.current = null;

      setCommittedTransactionCode(committedCode);
      setSubmissionStatus("BALANCED_COMMITTED");
      clearDraft(DRAFT_KEY);
      setHasUnsavedDrafts(false);

      // Re-fetch lots to synchronize available mass
      void fetchLots(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể ghi nhận bút toán vào sổ cái.";
      const isBalanceError =
        !balanceResult.isBalanced ||
        /Mass variance exceeds|exceeds confirmed tolerance|cân bằng khối lượng/i.test(msg);
      setApiErrorMessage(msg);
      setSubmissionStatus(isBalanceError || isInputLotOnHold ? "REJECTED" : "IDLE");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header - Synchronized with CustomerOrganizationsPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("mill.operations.tag", "HẠCH TOÁN SỔ CÁI BẢO TOÀN KHỐI LƯỢNG")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("mill.operations.pageTitle", "Ghi nhận bước chế biến vật lý")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "mill.operations.pageSubtitle",
              "Mọi mẻ chế biến được đối chiếu bảo toàn khối lượng và ghi nhận vào sổ cái chỉ-ghi-thêm.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Link
              to={millPaths.operationDrafts}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent-primary/30 bg-accent-primary/5 hover:bg-accent-primary/10 text-accent-primary text-xs font-semibold transition-colors shadow-xs"
            >
              <Stack size={15} weight="bold" aria-hidden="true" />
              <span>
                {i18n.language.startsWith("en")
                  ? "Multi-lot operations and drafts"
                  : "Công đoạn nhiều lô và bản nháp"}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => void fetchLots(true)}
            disabled={loadingLots}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            title={t(
              "mill.operations.refreshLots",
              "Tải lại danh sách lô từ API",
            )}
          >
            <ArrowsClockwise
              size={15}
              className={loadingLots ? "animate-spin text-accent-primary" : ""}
            />
            <span>
              {loadingLots
                ? t("common.loading", "Đang tải...")
                : t("common.refresh", "Làm mới lô")}
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-colors shadow-xs"
          >
            <Trash size={15} />
            <span>{t("mill.operations.clearDraft", "Xoá nháp")}</span>
          </button>
        </div>
      </div>

      {/* HOLD Alert if chosen lot is under HOLD */}
      {isInputLotOnHold && activeLot && (
        <HoldBanner
          targetType="Lô hàng"
          targetId={activeLot.code}
          reason={
            activeLot.holdReason ||
            t(
              "mill.operations.holdNotice",
              "Lô đang bị giữ theo lệnh phong toả kiểm dịch. Nghi ngờ nhiễm Tricyclazole vượt ngưỡng MRL EU.",
            )
          }
        />
      )}

      {/* API Notice / Error if encountered */}
      {apiErrorMessage && (
        <div className="p-4 rounded-xl bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs flex items-center gap-2 font-mono">
          <Warning size={18} weight="bold" className="shrink-0" />
          <span>{apiErrorMessage}</span>
        </div>
      )}

      {/* Rejection Card if unbalanced */}
      {submissionStatus === "REJECTED" && !isInputLotOnHold && (
        <LedgerRejectionCard
          msgCode="MSG01"
          varianceKg={balanceResult.varianceKg}
          allowedKg={balanceResult.allowedKg}
          inputMassKg={inputMassKg}
          outputMassKg={totalOut}
          lossKg={declaredLossKg}
          suggestedFix={t(
            "mill.operations.rejectionSuggestedFix",
            "Kiểm tra lại số cân bàn cân phân đoạn hoặc đối soát lại khối lượng trấu và tấm trước khi nộp lại.",
          )}
          onRetry={() => setSubmissionStatus("IDLE")}
        />
      )}

      {submissionStatus === "AWAITING_CONFIRMATION" && <div role="status" className="space-y-2 rounded-xl bg-functional-stale-bg p-4">
        <p>{t("workflows.variance.submitted")}</p>
        <Link to={millPaths.varianceReview} className="font-semibold text-accent-primary underline">{t("workflows.variance.title")}</Link>
      </div>}

      {/* Success Committed State */}
      {submissionStatus === "BALANCED_COMMITTED" && (
        <div className="p-5 rounded-2xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary space-y-3 shadow-xs animate-ledger-in">
          <div className="flex items-center gap-2.5 font-display font-bold text-base">
            <CheckCircle
              size={24}
              weight="fill"
              className="text-accent-primary shrink-0"
            />
            <span>
              {t(
                "mill.operations.successTitle",
                "Giao dịch chế biến đã được ghi vào sổ cái thành công!",
              )}
            </span>
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed">
            {t("mill.operations.immutableCode", "Mã bút toán bất biến: ")}
            <code className="font-mono font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">
              {committedTransactionCode}
            </code>
            . {t("mill.operations.inputDeductionPrefix", "Số dư lô đầu vào ")}
            <span className="font-mono font-bold text-ink-primary">
              {activeLot?.code || selectedInputLot}
            </span>{" "}
            {t("mill.operations.inputDeducted", "đã khấu trừ ")}
            <MassValue value={inputMassKg} decimals={3} />{" "}
            {t(
              "mill.operations.outputInherited",
              "và các lô phân đoạn mới đã được sinh với đầy đủ hệ số kế thừa nguồn gốc.",
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmissionStatus("IDLE");
              handleClearDraft();
              void fetchLots(true);
            }}
            className="px-4 py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            {t("mill.operations.recordNextBatch", "Ghi nhận mẻ tiếp theo")}
          </button>
        </div>
      )}

      {/* Conversion Form */}
      <form onSubmit={handleCommitOperation} className="space-y-6">
        <div className="bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xs">
          {/* Process Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-2">
              {t(
                "mill.operations.selectProcessType",
                "Chọn công đoạn chế biến:",
              )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  type: "MILLING",
                  label: t(
                    "mill.operations.typeMilling",
                    "Xay xát gạo (Milling)",
                  ),
                },
                {
                  type: "DRYING",
                  label: t("mill.operations.typeDrying", "Sấy khô lúa tươi"),
                },
                {
                  type: "BLENDING",
                  label: t("mill.operations.typeBlending", "Phối trộn cơ học"),
                },
                {
                  type: "BAGGING",
                  label: t(
                    "mill.operations.typeBagging",
                    "Đóng bao & Xuất kho",
                  ),
                },
              ].map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => {
                    setProcessType(
                      p.type as "DRYING" | "MILLING" | "BLENDING" | "BAGGING",
                    );
                    handleFieldChange();
                  }}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    processType === p.type
                      ? "bg-surface-base dark:bg-surface-raised border-accent-primary text-accent-primary font-bold shadow-xs ring-1 ring-accent-primary"
                      : "bg-surface-raised/60 dark:bg-surface-overlay/50 border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:border-ink-tertiary/40"
                  }`}
                >
                  <span className="block text-xs font-display">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Input Lot (Loaded dynamically via API) */}
          <div className="p-5 rounded-2xl bg-surface-raised/60 dark:bg-surface-overlay/50 border border-ink-tertiary/15 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-primary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>
                  {t(
                    "mill.operations.inputSectionTitle",
                    "1. Lô nguyên liệu đầu vào (Input Lot)",
                  )}
                </span>
                {loadingLots && (
                  <span className="inline-flex items-center gap-1 text-xs font-sans font-normal text-ink-secondary">
                    <ArrowsClockwise
                      size={12}
                      className="animate-spin text-accent-primary"
                    />
                    <span>Đang tải lô từ API...</span>
                  </span>
                )}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary">
                {t("mill.operations.appliedTolerance", "Dung sai áp dụng:")}{" "}
                {policy ? `${policy.tolerancePercent}%` : "—"}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="lot-silo-select"
                    className="block text-xs font-semibold text-ink-secondary"
                  >
                    {t("mill.operations.selectInputLot", "Chọn Lô trong Silo")}
                  </label>
                  {fetchLotsError && (
                    <span
                      className="text-[10px] text-accent-warning font-sans"
                      title={fetchLotsError}
                    >
                      (Không tải được lô)
                    </span>
                  )}
                </div>

                <select
                  id="lot-silo-select"
                  value={selectedInputLot}
                  disabled={loadingLots}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedInputLot(nextId);
                    const found = lots.find(
                      (l) => l.id === nextId || l.code === nextId,
                    );
                    if (
                      found &&
                      found.availableKg &&
                      parseFloat(found.availableKg) > 0
                    ) {
                      setInputMassKg(found.availableKg);
                    }
                    handleFieldChange();
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono text-ink-primary transition-colors disabled:opacity-60"
                >
                  {lots.length === 0 && (
                    <option value="">Không có lô khả dụng</option>
                  )}
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.code} — {lot.locationName || "Silo"} —{" "}
                      {lot.commodityName || lot.stage} — Khả dụng:{" "}
                      {parseFloat(lot.availableKg || "0").toLocaleString(
                        "vi-VN",
                      )}{" "}
                      kg {lot.isHold ? "⚠️ [PHONG TOẢ HOLD]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="input-mass-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t(
                    "mill.operations.inputMassLabel",
                    "Khối lượng đưa vào chế biến *",
                  )}
                </label>
                <div className="relative">
                  <input
                    id="input-mass-field"
                    type="number"
                    value={inputMassKg}
                    onChange={(e) => {
                      setInputMassKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono font-bold text-ink-primary transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Metadata Card for Selected Lot */}
            {activeLot && (
              <div className="mt-3 p-3.5 rounded-xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                    {t(
                      "mill.operations.lotSiloLocation",
                      "Vị trí / Silo lưu trữ",
                    )}
                  </span>
                  <span className="font-mono font-bold text-ink-primary flex items-center gap-1 mt-0.5">
                    <Buildings
                      size={14}
                      className="text-accent-primary shrink-0"
                    />
                    <span className="truncate">
                      {activeLot.locationName || "Silo chính"}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                    {t(
                      "mill.operations.lotCommodityStage",
                      "Chủng loại & Phân đoạn",
                    )}
                  </span>
                  <span className="font-semibold text-ink-primary block mt-0.5 truncate">
                    {activeLot.commodityName || activeLot.stage}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                    {t("mill.operations.lotAvailableBalance", "Số dư khả dụng")}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-accent-primary">
                      <MassValue value={activeLot.availableKg} decimals={3} />{" "}
                      kg
                    </span>
                    {activeLot.availableKg !== inputMassKg &&
                      !activeLot.isHold && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputMassKg(activeLot.availableKg);
                            handleFieldChange();
                          }}
                          className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-medium transition-colors"
                          title={t(
                            "mill.operations.useFullBalance",
                            "Sử dụng toàn bộ số dư khả dụng",
                          )}
                        >
                          {t("mill.operations.fillAll", "Dùng hết")}
                        </button>
                      )}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                    {t("common.status", "Trạng thái")}
                  </span>
                  <div className="mt-0.5">
                    {activeLot.isHold ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-danger/10 text-accent-danger border border-accent-danger/20 font-mono">
                        <LockSimple size={12} weight="bold" />
                        <span>PHONG TOẢ (HOLD)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-primary/10 text-accent-primary border border-accent-primary/20 font-mono">
                        <CheckCircle size={12} weight="bold" />
                        <span>KHẢ DỤNG</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold">
              {t("mill.operations.equipmentLabel", "Thiết bị chế biến")}
              <select required className="min-w-0 rounded-lg border border-ink-tertiary/20 bg-surface-base p-2" value={equipmentId} onChange={event => setEquipmentId(event.target.value)}>
                <option value="">{t("mill.operations.selectEquipment", "Chọn thiết bị")}</option>
                {equipment.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              {t("mill.operations.outputLocationLabel", "Vị trí lưu đầu ra")}
              <select required className="min-w-0 rounded-lg border border-ink-tertiary/20 bg-surface-base p-2" value={outputLocationId} onChange={event => setOutputLocationId(event.target.value)}>
                <option value="">{t("mill.operations.selectOutputLocation", "Chọn vị trí đầu ra")}</option>
                {outputLocations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {processType === "BLENDING" && <label className="grid gap-1 text-xs font-semibold">
              {t("mill.operations.outputCommodityLabel", "Loại hàng đầu ra")}
              <select required className="min-w-0 rounded-lg border border-ink-tertiary/20 bg-surface-base p-2" value={blendCommodityId} onChange={event => setBlendCommodityId(event.target.value)}>
                <option value="">{t("mill.operations.selectOutputCommodity", "Chọn loại hàng đầu ra")}</option>
                {blendCommodities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>}
          </div>

          {/* Section 2: Output Fractions */}
          <div className="p-5 rounded-2xl bg-surface-raised/60 dark:bg-surface-overlay/50 border border-ink-tertiary/15 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-primary">
              {t(
                "mill.operations.outputSectionTitle",
                "2. Các phân đoạn đầu ra & Hao hụt (Output Fractions & Loss)",
              )}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="head-rice-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {processType === "MILLING"
                    ? t("mill.operations.headRice", "Gạo nguyên")
                    : processType === "DRYING"
                      ? t(
                          "mill.operations.driedPaddyOutput",
                          "Thóc khô sau sấy",
                        )
                      : processType === "BLENDING"
                        ? t(
                            "mill.operations.blendedRiceOutput",
                            "Gạo phối trộn",
                          )
                        : t("mill.operations.baggedRiceOutput", "Gạo đóng bao")}
                </label>
                <div className="relative">
                  <input
                    id="head-rice-field"
                    type="number"
                    value={headRiceKg}
                    onChange={(e) => {
                      setHeadRiceKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="broken-rice-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t("mill.operations.brokenRice", "Gạo tấm")}
                </label>
                <div className="relative">
                  <input
                    id="broken-rice-field"
                    type="number"
                    value={brokenRiceKg}
                    onChange={(e) => {
                      setBrokenRiceKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="bran-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t("mill.operations.bran", "Cám gạo")}
                </label>
                <div className="relative">
                  <input
                    id="bran-field"
                    type="number"
                    value={branKg}
                    onChange={(e) => {
                      setBranKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="husk-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t("mill.operations.husk", "Vỏ trấu")}
                </label>
                <div className="relative">
                  <input
                    id="husk-field"
                    type="number"
                    value={huskKg}
                    onChange={(e) => {
                      setHuskKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label
                  htmlFor="declared-loss-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t("mill.operations.declaredLoss", "Hao hụt khai báo *")}
                </label>
                <div className="relative">
                  <input
                    id="declared-loss-field"
                    type="number"
                    value={declaredLossKg}
                    onChange={(e) => {
                      setDeclaredLossKg(e.target.value);
                      handleFieldChange();
                    }}
                    className="w-full px-3 py-2 text-xs text-right rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-ink-tertiary pointer-events-none font-mono">
                    kg
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="loss-reason-field"
                  className="block text-xs font-semibold text-ink-secondary mb-1"
                >
                  {t("mill.operations.lossReason", "Lý do hao hụt vật lý")}
                </label>
                <input
                  id="loss-reason-field"
                  type="text"
                  value={lossReason}
                  onChange={(e) => {
                    setLossReason(e.target.value);
                    handleFieldChange();
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live Conservation Check Widget */}
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 shadow-xs transition-colors ${
              balanceResult.isBalanced
                ? "bg-functional-balanced-bg border-functional-balanced-border/40 text-accent-primary"
                : "bg-functional-rejected-bg border-functional-rejected-border text-accent-danger"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  balanceResult.isBalanced
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-accent-danger/10 text-accent-danger"
                }`}
              >
                <Scales size={22} weight="bold" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm">
                  {balanceResult.isBalanced
                    ? t(
                        "mill.operations.balancePassed",
                        "Đạt điều kiện cân bằng khối lượng",
                      )
                    : t(
                        "mill.operations.balanceFailed",
                        "Không đạt cân bằng — Bút toán sẽ bị từ chối",
                      )}
                </h4>
                <div className="flex items-center gap-2.5 text-xs mt-0.5 opacity-90 font-mono">
                  <span>
                    {t("mill.operations.inMass", "Vào:")}{" "}
                    <MassValue value={inputMassKg} decimals={3} />
                  </span>
                  <span>=</span>
                  <span>
                    {t("mill.operations.outPlusLoss", "Ra + Hao:")}{" "}
                    <MassValue
                      value={totalOut.plus(toDecimal(declaredLossKg))}
                      decimals={3}
                    />
                  </span>
                  <span>
                    ({t("mill.operations.variance", "Lệch:")}{" "}
                    <MassValue value={balanceResult.varianceKg} decimals={3} />)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="block text-ink-tertiary font-sans text-xs">
                {t(
                  "mill.operations.allowedToleranceLabel",
                  "Dung sai cho phép:",
                )}
              </span>
              {policy ? <MassValue
                value={balanceResult.allowedKg}
                decimals={3}
                className="font-bold text-ink-primary font-mono text-sm"
              /> : "—"}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-ink-tertiary flex items-center gap-1.5">
              <FloppyDisk size={15} />
              {t(
                "mill.operations.autosaveNote",
                "Bản nháp tự động lưu trên trình duyệt",
              )}
            </span>

            <button
              type="submit"
              disabled={!canWrite || isSubmitting || loadingLots || lots.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={15} className="animate-spin" />
                  <span>
                    {t("mill.operations.submitting", "Đang ghi vào sổ cái...")}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {t(
                      "mill.operations.submitButton",
                      "Kiểm tra & Ghi vào sổ cái",
                    )}
                  </span>
                  <ArrowRight size={15} weight="bold" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
