import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Modal } from "@/components/Modal/Modal";
import {
  ShieldCheck,
  Calculator,
  Sliders,
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowRight,
  BookOpen,
  Flask,
  Globe,
  Tag,
  Check,
  X,
  FileText,
} from "@phosphor-icons/react";

interface SubstanceThreshold {
  id: string;
  code: string;
  name: string;
  commercialName: string;
  category: "FUNGICIDE" | "INSECTICIDE" | "HERBICIDE" | "HEAVY_METAL";
  marketLimits: {
    marketCode: string;
    marketName: string;
    mrlMgKg: number;
    upperBound95: number;
  }[];
}

const SUBSTANCE_RULES: SubstanceThreshold[] = [
  {
    id: "SUB-01",
    code: "TRICYCLAZOLE",
    name: "Tricyclazole",
    commercialName: "Beam 75WP, Filia 525SE (Trừ đạo ôn)",
    category: "FUNGICIDE",
    marketLimits: [
      {
        marketCode: "EU",
        marketName: "Liên minh Châu Âu (EC 396/2005)",
        mrlMgKg: 0.01,
        upperBound95: 0.0078,
      },
      {
        marketCode: "USA",
        marketName: "Hoa Kỳ (US FDA)",
        mrlMgKg: 0.05,
        upperBound95: 0.038,
      },
      {
        marketCode: "JP",
        marketName: "Nhật Bản (MHLW Positive List)",
        mrlMgKg: 0.02,
        upperBound95: 0.015,
      },
      {
        marketCode: "KR",
        marketName: "Hàn Quốc (MFDS PLS)",
        mrlMgKg: 0.01,
        upperBound95: 0.008,
      },
      {
        marketCode: "CN",
        marketName: "Trung Quốc (GB 2763)",
        mrlMgKg: 0.1,
        upperBound95: 0.075,
      },
      {
        marketCode: "VN",
        marketName: "Việt Nam (TT 50/2016/TT-BYT)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
    ],
  },
  {
    id: "SUB-02",
    code: "HEXACONAZOLE",
    name: "Hexaconazole",
    commercialName: "Anvil 5SC (Trừ nấm khô vằn, lem lép hạt)",
    category: "FUNGICIDE",
    marketLimits: [
      {
        marketCode: "EU",
        marketName: "Liên minh Châu Âu (EC 396/2005)",
        mrlMgKg: 0.02,
        upperBound95: 0.016,
      },
      {
        marketCode: "USA",
        marketName: "Hoa Kỳ (US FDA)",
        mrlMgKg: 0.1,
        upperBound95: 0.078,
      },
      {
        marketCode: "JP",
        marketName: "Nhật Bản (MHLW Positive List)",
        mrlMgKg: 0.05,
        upperBound95: 0.039,
      },
      {
        marketCode: "KR",
        marketName: "Hàn Quốc (MFDS PLS)",
        mrlMgKg: 0.02,
        upperBound95: 0.015,
      },
      {
        marketCode: "CN",
        marketName: "Trung Quốc (GB 2763)",
        mrlMgKg: 0.05,
        upperBound95: 0.04,
      },
      {
        marketCode: "VN",
        marketName: "Việt Nam (TT 50/2016/TT-BYT)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
    ],
  },
  {
    id: "SUB-03",
    code: "CHLORPYRIFOS",
    name: "Chlorpyrifos-ethyl",
    commercialName: "Hoạt chất cấm tuyệt đối tại EU (Trừ sâu rầy)",
    category: "INSECTICIDE",
    marketLimits: [
      {
        marketCode: "EU",
        marketName: "Liên minh Châu Âu (EC 396/2005 - Cấm)",
        mrlMgKg: 0.01,
        upperBound95: 0.007,
      },
      {
        marketCode: "USA",
        marketName: "Hoa Kỳ (US FDA)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
      {
        marketCode: "JP",
        marketName: "Nhật Bản (MHLW Positive List)",
        mrlMgKg: 0.01,
        upperBound95: 0.008,
      },
      {
        marketCode: "KR",
        marketName: "Hàn Quốc (MFDS PLS)",
        mrlMgKg: 0.01,
        upperBound95: 0.0075,
      },
      {
        marketCode: "CN",
        marketName: "Trung Quốc (GB 2763)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
      {
        marketCode: "VN",
        marketName: "Việt Nam (TT 50/2016/TT-BYT)",
        mrlMgKg: 0.1,
        upperBound95: 0.085,
      },
    ],
  },
  {
    id: "SUB-04",
    code: "ISOPROTHIOLANE",
    name: "Isoprothiolane",
    commercialName: "Fuji-One 40EC (Trừ đạo ôn lá và cổ bông)",
    category: "FUNGICIDE",
    marketLimits: [
      {
        marketCode: "EU",
        marketName: "Liên minh Châu Âu (EC 396/2005)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
      {
        marketCode: "USA",
        marketName: "Hoa Kỳ (US FDA)",
        mrlMgKg: 0.5,
        upperBound95: 0.38,
      },
      {
        marketCode: "JP",
        marketName: "Nhật Bản (MHLW Positive List)",
        mrlMgKg: 0.2,
        upperBound95: 0.15,
      },
      {
        marketCode: "KR",
        marketName: "Hàn Quốc (MFDS PLS)",
        mrlMgKg: 0.2,
        upperBound95: 0.16,
      },
      {
        marketCode: "CN",
        marketName: "Trung Quốc (GB 2763)",
        mrlMgKg: 0.5,
        upperBound95: 0.4,
      },
      {
        marketCode: "VN",
        marketName: "Việt Nam (TT 50/2016/TT-BYT)",
        mrlMgKg: 1.0,
        upperBound95: 0.78,
      },
    ],
  },
  {
    id: "SUB-05",
    code: "FENOXANIL",
    name: "Fenoxanil",
    commercialName: "Aviso 350SC (Đặc trị đạo ôn kháng thuốc)",
    category: "FUNGICIDE",
    marketLimits: [
      {
        marketCode: "EU",
        marketName: "Liên minh Châu Âu (EC 396/2005)",
        mrlMgKg: 0.01,
        upperBound95: 0.008,
      },
      {
        marketCode: "USA",
        marketName: "Hoa Kỳ (US FDA)",
        mrlMgKg: 0.05,
        upperBound95: 0.038,
      },
      {
        marketCode: "JP",
        marketName: "Nhật Bản (MHLW Positive List)",
        mrlMgKg: 0.05,
        upperBound95: 0.04,
      },
      {
        marketCode: "KR",
        marketName: "Hàn Quốc (MFDS PLS)",
        mrlMgKg: 0.02,
        upperBound95: 0.015,
      },
      {
        marketCode: "CN",
        marketName: "Trung Quốc (GB 2763)",
        mrlMgKg: 0.1,
        upperBound95: 0.08,
      },
      {
        marketCode: "VN",
        marketName: "Việt Nam (TT 50/2016/TT-BYT)",
        mrlMgKg: 0.2,
        upperBound95: 0.15,
      },
    ],
  },
];

export const SafetyMarginPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  // Safety buffer percentage (Default 20%)
  const [safetyBufferPercent, setSafetyBufferPercent] = useState<number>(20);
  const [selectedMarket, setSelectedMarket] = useState<string>("EU");

  // Simulator test inputs
  const [testSubstance, setTestSubstance] = useState<string>("TRICYCLAZOLE");
  const [testMeasuredValue, setTestMeasuredValue] = useState<number>(0.0075);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Technical Modal
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);

  const activeSubstance = useMemo(() => {
    return (
      SUBSTANCE_RULES.find((s) => s.code === testSubstance) ||
      SUBSTANCE_RULES[0]
    );
  }, [testSubstance]);

  const activeLimit = useMemo(() => {
    return (
      activeSubstance.marketLimits.find(
        (m) => m.marketCode === selectedMarket,
      ) || activeSubstance.marketLimits[0]
    );
  }, [activeSubstance, selectedMarket]);

  const safeThreshold = useMemo(() => {
    return activeLimit.mrlMgKg * (1 - safetyBufferPercent / 100);
  }, [activeLimit, safetyBufferPercent]);

  const simulationVerdict = useMemo(() => {
    if (testMeasuredValue <= safeThreshold) {
      return {
        status: "SAFE_PASS",
        label: t(
          "compliance.safetyMargin.safePassLabel",
          "ĐẠT CHUẨN AN TOÀN (SAFE PASS)",
        ),
        description: `Nồng độ đo thực tế (${testMeasuredValue.toFixed(4)} mg/kg) nằm trong biên an toàn -${safetyBufferPercent}% (ngưỡng tối đa cho phép là ${safeThreshold.toFixed(4)} mg/kg). Đủ điều kiện phê duyệt phương án phối trộn xuất khẩu.`,
        icon: CheckCircle,
        badgeBg:
          "bg-functional-balanced-bg border-functional-balanced-border/40 text-accent-primary",
      };
    } else if (testMeasuredValue <= activeLimit.mrlMgKg) {
      return {
        status: "WARNING_BUFFER",
        label: t(
          "compliance.safetyMargin.warningBufferLabel",
          "CẢNH BÁO BIÊN AN TOÀN (SAFETY MARGIN WARNING)",
        ),
        description: `Nồng độ đo (${testMeasuredValue.toFixed(4)} mg/kg) đã tiệm cận hoặc vượt qua biên an toàn -${safetyBufferPercent}% (dù chưa vượt MRL chính thức ${activeLimit.mrlMgKg.toFixed(4)} mg/kg). Có nguy cơ bị từ chối nếu phát sinh sai số đo kiểm tại cảng đích.`,
        icon: WarningCircle,
        badgeBg:
          "bg-functional-hold-bg border-accent-warning/30 text-accent-warning",
      };
    } else {
      return {
        status: "EXCEEDED_MRL",
        label: t(
          "compliance.safetyMargin.exceededLabel",
          "VI PHẠM MRL (MRL EXCEEDED - KHÓA HOLD)",
        ),
        description: `Vượt quá giới hạn dư lượng tối đa chính thức (${activeLimit.mrlMgKg.toFixed(4)} mg/kg) của thị trường ${activeLimit.marketName}! Hệ thống tự động kích hoạt Lệnh HOLD phong tỏa khẩn cấp, từ chối xuất kho.`,
        icon: XCircle,
        badgeBg:
          "bg-functional-rejected-bg border-accent-danger/30 text-accent-danger",
      };
    }
  }, [testMeasuredValue, safeThreshold, activeLimit, safetyBufferPercent, t]);

  const handleSavePolicy = () => {
    setSavedSuccessMsg(
      `Đã lưu cấu hình biên an toàn -${safetyBufferPercent}% cho thị trường ${activeLimit.marketName}. Thuật toán giải bài toán phối trộn sẽ áp dụng ngay lập tức!`,
    );
    setTimeout(() => setSavedSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            QUẢN TRỊ RỦI RO & CHÍNH SÁCH BẢO THỦ ISO 22095
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            Chính Sách Biên An Toàn MRL (Safety Margin Policy)
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            Hệ số đệm an toàn -20% và cận bảo thủ thống kê 95% áp dụng tự động
            cho mọi kế hoạch phối trộn rút gạo xuất khẩu nhằm triệt tiêu sai số
            sắc ký và biến thiên chất lượng trên hành trình vận tải biển.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsIsoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary font-semibold text-xs transition-colors"
          >
            <BookOpen size={15} className="text-accent-primary" />
            <span>Hướng dẫn kỹ thuật ISO</span>
          </button>
          <Link
            to="/export/plans/pending"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            <span>Duyệt Phương Án</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Hệ số biên an toàn</span>
            <Sliders size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-accent-primary">
            -{safetyBufferPercent}%
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Khấu trừ vào MRL chính thức
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Thị trường hỗ trợ</span>
            <Globe size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            6 Thị trường
          </div>
          <span className="text-[11px] text-ink-tertiary">
            EU, US FDA, Nhật Bản, Hàn Quốc, TQ, VN
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Cận bảo thủ chất lượng</span>
            <ShieldCheck size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            95% UCB
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Upper Confidence Bound cho lô chưa đo
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Kiểm soát xuất khẩu</span>
            <Flask size={18} className="text-accent-warning" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            Tự động
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Tự động kích hoạt khi lập phương án
          </span>
        </div>
      </div>

      {/* Main Grid: Simulator & Policy Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-3">
            <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
              <Calculator size={18} className="text-accent-primary" />
              <span>Công Cụ Mô Phỏng & Đánh Giá Biên An Toàn Thực Tế</span>
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-raised dark:bg-surface-overlay text-ink-secondary font-medium">
              Simulation Mode
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-ink-secondary font-medium mb-1">
                Thị trường xuất khẩu đích:
              </label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
              >
                <option value="EU">Liên minh Châu Âu - EU (EC 396/2005)</option>
                <option value="USA">Hoa Kỳ (US FDA / EPA 40 CFR)</option>
                <option value="JP">Nhật Bản (MHLW Positive List)</option>
                <option value="KR">Hàn Quốc (MFDS PLS)</option>
                <option value="CN">Trung Quốc (GB 2763)</option>
                <option value="VN">Việt Nam (TT 50/2016/TT-BYT)</option>
              </select>
            </div>

            <div>
              <label className="block text-ink-secondary font-medium mb-1">
                Hoạt chất thuốc BVTV cần thử nghiệm:
              </label>
              <select
                value={testSubstance}
                onChange={(e) => setTestSubstance(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
              >
                {SUBSTANCE_RULES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.commercialName.split("(")[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Buffer Slider */}
          <div className="p-4 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                <Sliders size={16} className="text-accent-primary" />
                <span>Hệ số Biên an toàn cấu hình cho thị trường:</span>
              </span>
              <span className="font-mono font-bold text-accent-primary text-sm">
                -{safetyBufferPercent}% Buffer
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="30"
              step="5"
              value={safetyBufferPercent}
              onChange={(e) =>
                setSafetyBufferPercent(parseInt(e.target.value) || 20)
              }
              className="w-full accent-accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-tertiary font-mono">
              <span>10% (Cơ bản)</span>
              <span className="font-bold text-accent-primary">
                20% (Chuẩn ISO GrainLedger)
              </span>
              <span>30% (Thắt chặt tối đa)</span>
            </div>
          </div>

          {/* Measured Value Input */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label className="font-medium text-ink-secondary">
                Nồng độ đo thực tế từ phòng Lab độc lập (mg/kg):
              </label>
              <span className="font-mono font-bold text-ink-primary">
                {testMeasuredValue.toFixed(4)} mg/kg
              </span>
            </div>
            <input
              type="number"
              step="0.001"
              min="0"
              max={activeLimit.mrlMgKg * 1.8}
              value={testMeasuredValue}
              onChange={(e) =>
                setTestMeasuredValue(parseFloat(e.target.value) || 0)
              }
              className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Visual Gauge Bar */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[11px] text-ink-tertiary font-mono">
              <span>0.000 mg/kg</span>
              <span className="text-accent-primary font-semibold">
                Biên an toàn: {safeThreshold.toFixed(4)}
              </span>
              <span className="text-accent-danger font-semibold">
                MRL Max: {activeLimit.mrlMgKg.toFixed(4)}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-raised dark:bg-surface-overlay overflow-hidden flex">
              <div
                style={{
                  width: `${(safeThreshold / (activeLimit.mrlMgKg * 1.3)) * 100}%`,
                }}
                className="h-full bg-functional-balanced-border"
                title="Vùng an toàn"
              />
              <div
                style={{
                  width: `${((activeLimit.mrlMgKg - safeThreshold) / (activeLimit.mrlMgKg * 1.3)) * 100}%`,
                }}
                className="h-full bg-functional-hold-border"
                title="Vùng cảnh báo đệm an toàn"
              />
              <div
                className="h-full flex-1 bg-functional-rejected-border"
                title="Vùng vi phạm MRL"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div
            className={`p-4 rounded-xl border ${simulationVerdict.badgeBg} space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <simulationVerdict.icon size={16} weight="bold" />
                <span>{simulationVerdict.label}</span>
              </span>
              <span className="font-mono text-xs font-semibold">
                Thực đo: {testMeasuredValue.toFixed(4)} / An toàn:{" "}
                {safeThreshold.toFixed(4)}
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {simulationVerdict.description}
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSavePolicy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors shadow-xs"
            >
              <Check size={15} weight="bold" />
              <span>Lưu Cấu Hình Biên An Toàn</span>
            </button>
          </div>
        </div>

        {/* Right Column: Multi-substance Rule Table (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
                <Tag size={16} className="text-accent-primary" />
                <span>Bảng Ngưỡng Giới Hạn & Biên Đệm ({selectedMarket})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {SUBSTANCE_RULES.map((substance) => {
                const limit =
                  substance.marketLimits.find(
                    (m) => m.marketCode === selectedMarket,
                  ) || substance.marketLimits[0];
                const calculatedSafe =
                  limit.mrlMgKg * (1 - safetyBufferPercent / 100);

                return (
                  <div
                    key={substance.id}
                    className="p-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised dark:bg-surface-overlay text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">
                        {substance.name}
                      </span>
                      <span className="font-mono font-bold text-accent-primary">
                        {calculatedSafe.toFixed(4)} mg/kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
                      <span>
                        MRL chính thức: {limit.mrlMgKg.toFixed(4)} mg/kg
                      </span>
                      <span>
                        Cận 95%: {limit.upperBound95.toFixed(4)} mg/kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="pt-2 border-t border-ink-tertiary/10 space-y-2">
              <Link
                to="/compliance/mrl-versions"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg border border-ink-tertiary/20 text-xs font-semibold text-ink-primary hover:bg-surface-raised transition-colors"
              >
                <span>Xem danh mục phiên bản MRL quốc tế</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                to="/compliance/lab-results"
                className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg border border-ink-tertiary/20 text-xs font-semibold text-ink-primary hover:bg-surface-raised transition-colors"
              >
                <span>Xem kết quả xét nghiệm phòng Lab</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Hướng Dẫn Kỹ Thuật ISO 22095:2020 */}
      <Modal
        isOpen={isIsoModalOpen}
        onClose={() => setIsIsoModalOpen(false)}
        ariaLabel="Hướng dẫn kỹ thuật ISO 22095"
      >
        <div className="w-full max-w-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                <BookOpen size={18} weight="bold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  Mô Hình Bảo Thủ ISO 22095 & Biên An Toàn MRL
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Nguyên tắc toán học Mass Balance và cận bảo thủ thống kê 95%
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsIsoModalOpen(false)}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-5 space-y-4 text-xs text-ink-secondary leading-relaxed">
            <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1.5">
              <h4 className="font-bold text-ink-primary flex items-center gap-1.5">
                <FileText size={16} className="text-accent-primary" />
                <span>1. Trừ đệm an toàn -20% (Safety Margin Buffer)</span>
              </h4>
              <p>
                Để chống lại biến thiên đo lường sắc ký lỏng khối phổ (LC-MS/MS)
                và biến động độ ẩm trong container vận tải biển kéo dài 20–30
                ngày, hệ thống GrainLedger tự động áp dụng công thức:
              </p>
              <p className="font-mono text-accent-primary font-bold bg-surface-base p-2 rounded-lg border border-ink-tertiary/15">
                MRL_Effective = MRL_Official × (1 - 0.20)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1.5">
              <h4 className="font-bold text-ink-primary flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-accent-primary" />
                <span>2. Ước lượng cận trên bảo thủ 95% (Upper Bound 95%)</span>
              </h4>
              <p>
                Đối với các lô nguyên liệu thành phần chưa có kết quả xét nghiệm
                phòng lab độc lập, hệ thống không bao giờ giả định bằng 0. Thay
                vào đó, thuật toán tự động gán giá trị cận trên phân phối chuẩn
                95% bảo thủ dựa trên lịch sử nhật ký phun xịt tại cánh đồng.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 space-y-1.5">
              <h4 className="font-bold text-ink-primary flex items-center gap-1.5">
                <Calculator size={16} className="text-accent-primary" />
                <span>3. Bảo toàn khối lượng Mass Balance</span>
              </h4>
              <p>
                Theo ISO 22095:2020, nồng độ hoạt chất dự báo trong mẻ gạo xuất
                khẩu là bình quân gia quyền theo khối lượng thực tế của từng lô
                thành phần được rút từ các silo công nghiệp.
              </p>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex justify-end">
              <button
                type="button"
                onClick={() => setIsIsoModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-xs font-semibold text-ink-secondary hover:bg-surface-raised transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
