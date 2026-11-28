import React, { useState } from "react";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { CheckCircle, LockSimple, WarningCircle } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export const LiveSimulatorSection: React.FC = () => {
  const text = useWorkflowText();
  // Simulator Tab State
  const [activeSimTab, setActiveSimTab] = useState<"LEDGER" | "MRL">("LEDGER");

  // Interactive Live Ledger Simulator State (Tab 1)
  const [simInputKg, setSimInputKg] = useState(100000);
  const [simOutputKg, setSimOutputKg] = useState(88000);
  const [simLossKg, setSimLossKg] = useState(12000);

  // Interactive MRL Simulator State (Tab 2)
  const [selectedMarket, setSelectedMarket] = useState<
    "EU" | "USA" | "JAPAN" | "KOREA"
  >("EU");
  const [selectedSubstance, setSelectedSubstance] = useState<
    "TCZ" | "IPT" | "HXC"
  >("TCZ");

  // Math for Ledger Simulator
  const simTotalOutAndLoss = simOutputKg + simLossKg;
  const simVariance = Math.abs(simInputKg - simTotalOutAndLoss);
  const simAllowed = simInputKg * 0.005; // 0.5% tolerance
  const isSimBalanced = simVariance <= simAllowed;

  // MRL Data Matrix (from Table 5-3 in SRS)
  const MRL_DATABASE = {
    TCZ: {
      name: "Tricyclazole (Đặc trị đạo ôn)",
      code: "TCZ001",
      cas: "41814-78-2",
      risk: "EXTREME",
      limits: {
        EU: {
          limit: 0.01,
          unit: "mg/kg",
          basis: "LOQ MRL (EC 396/2005)",
          safeMargin: 0.008,
        },
        USA: {
          limit: 3.0,
          unit: "mg/kg",
          basis: "EPA 40 CFR 180",
          safeMargin: 2.4,
        },
        JAPAN: {
          limit: 3.0,
          unit: "mg/kg",
          basis: "MHLW Positive List (Brown)",
          safeMargin: 2.4,
        },
        KOREA: {
          limit: 0.7,
          unit: "mg/kg",
          basis: "MFDS Food Code",
          safeMargin: 0.56,
        },
      },
      currentMeasured: 0.0075,
    },
    IPT: {
      name: "Isoprothiolane (Trừ đạo ôn & rầy nâu)",
      code: "IPT002",
      cas: "50512-35-1",
      risk: "LOW",
      limits: {
        EU: {
          limit: 6.0,
          unit: "mg/kg",
          basis: "EC 396/2005",
          safeMargin: 4.8,
        },
        USA: {
          limit: 6.0,
          unit: "mg/kg",
          basis: "EPA 40 CFR (Husked)",
          safeMargin: 4.8,
        },
        JAPAN: {
          limit: 7.0,
          unit: "mg/kg",
          basis: "MHLW Positive List",
          safeMargin: 5.6,
        },
        KOREA: {
          limit: 2.0,
          unit: "mg/kg",
          basis: "MFDS Food Code",
          safeMargin: 1.6,
        },
      },
      currentMeasured: 1.25,
    },
    HXC: {
      name: "Hexaconazole (Trừ nấm & khô vằn)",
      code: "HXC003",
      cas: "79983-71-4",
      risk: "HIGH",
      limits: {
        EU: { limit: 0.01, unit: "mg/kg", basis: "LOQ MRL", safeMargin: 0.008 },
        USA: {
          limit: 0.05,
          unit: "mg/kg",
          basis: "EPA Default",
          safeMargin: 0.04,
        },
        JAPAN: {
          limit: 0.01,
          unit: "mg/kg",
          basis: "Uniform Standard",
          safeMargin: 0.008,
        },
        KOREA: {
          limit: 0.3,
          unit: "mg/kg",
          basis: "MFDS Rice Limit",
          safeMargin: 0.24,
        },
      },
      currentMeasured: 0.0095,
    },
  };

  const currentMrl = MRL_DATABASE[selectedSubstance].limits[selectedMarket];
  const currentMeasured = MRL_DATABASE[selectedSubstance].currentMeasured;
  const isMrlCompliant = currentMeasured <= currentMrl.safeMargin;

  return (
    <section id="simulators" className="py-24 lg:py-32 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent-primary">
            {text("Trải nghiệm thời gian thực", "Interactive Live Demo")}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-ink-primary">
            {text("Trình mô phỏng Sổ cái & Kiểm định MRL", "Custody Ledger & MRL Simulator")}
          </h2>
          <p className="text-xs text-ink-secondary text-ink-tertiary">
            {text(
              "Khám phá cách thuật toán của GrainLedger xử lý khối lượng và tiêu chuẩn MRL theo thời gian thực.",
              "Explore how GrainLedger enforces mass conservation and MRL safety margins in real time.",
            )}
          </p>
        </div>

        {/* Apple-style Segmented Control */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveSimTab("LEDGER")}
              className={`relative px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeSimTab === "LEDGER"
                  ? "text-ink-primary dark:text-black"
                  : "text-ink-secondary text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              {activeSimTab === "LEDGER" && (
                <motion.div
                  layoutId="simTabHighlight"
                  className="absolute inset-0 bg-white dark:bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {text("1. Sổ cái Cân bằng Khối lượng", "1. Mass Balance Ledger")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSimTab("MRL")}
              className={`relative px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeSimTab === "MRL"
                  ? "text-ink-primary dark:text-black"
                  : "text-ink-secondary text-ink-tertiary hover:text-ink-primary"
              }`}
            >
              {activeSimTab === "MRL" && (
                <motion.div
                  layoutId="simTabHighlight"
                  className="absolute inset-0 bg-white dark:bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {text("2. Đánh giá MRL & Biên An Toàn", "2. MRL Evaluation & Margin")}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: MASS BALANCE SIMULATOR */}
        <AnimatePresence mode="wait">
          {activeSimTab === "LEDGER" ? (
            <motion.div
              key="ledger-sim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface-base border border-ink-tertiary/20 rounded-3xl p-6 sm:p-8 shadow-apple-card space-y-6"
            >
              <div className="flex items-center justify-between border-b border-ink-tertiary/20 dark:border-surface-overlay pb-5">
                <div>
                  <h3 className="font-sans font-bold text-lg text-ink-primary">
                    {text(
                      "Công thức: Tổng Vào = Tổng Ra + Hao Hụt Khai Báo (Dung sai ≤ 0,5%)",
                      "Equation: Total Input = Total Output + Declared Loss (Tolerance ≤ 0.5%)",
                    )}
                  </h3>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {text(
                      "Nhập số liệu hoặc chọn mẻ thử nghiệm để kiểm tra tính toàn vẹn của sổ cái.",
                      "Enter batch figures or load a sample preset to verify ledger conservation.",
                    )}
                  </p>
                </div>
                <StatusBadge
                  status={isSimBalanced ? "BALANCED" : "REJECTED"}
                  label={
                    isSimBalanced
                      ? text("Sổ cái Chấp nhận", "Ledger Accepted")
                      : text("Sổ cái Từ chối (MSG01)", "Ledger Rejected (MSG01)")
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary text-ink-tertiary block mb-2">
                    {text("Đầu vào (Lúa tươi vào máy sấy)", "Input (Fresh paddy fed to dryer)")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={simInputKg}
                      onChange={(e) => setSimInputKg(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm font-mono font-bold text-right rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-ink-tertiary">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-secondary text-ink-tertiary block mb-2">
                    {text("Đầu ra (Thóc khô S1 thu được)", "Output (Dry paddy S1 produced)")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={simOutputKg}
                      onChange={(e) => setSimOutputKg(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm font-mono font-bold text-right rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-ink-tertiary">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-secondary text-ink-tertiary block mb-2">
                    {text("Hao hụt ẩm khai báo", "Declared moisture loss")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={simLossKg}
                      onChange={(e) => setSimLossKg(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm font-mono font-bold text-right rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-ink-tertiary">
                      kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Outcome Banner */}
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 transition-colors ${
                  isSimBalanced
                    ? "bg-accent-primary/[0.06] border-functional-balanced-border/40 text-accent-primary"
                    : "bg-accent-danger/[0.06] border-functional-hold-border/40 text-accent-danger"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      isSimBalanced
                        ? "bg-accent-primary text-ink-inverse"
                        : "bg-accent-danger text-ink-inverse"
                    }`}
                  >
                    {isSimBalanced ? (
                      <CheckCircle size={20} weight="bold" />
                    ) : (
                      <LockSimple size={20} weight="fill" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {isSimBalanced
                        ? text(
                            "BÚT TOÁN CÂN BẰNG — ĐÃ GHI NHẬN VÀO SỔ CÁI BẤT BIẾN",
                            "ENTRY BALANCED — COMMITTED TO IMMUTABLE LEDGER",
                          )
                        : text(
                            "MSG01: BƯỚC CHẾ BIẾN BỊ TỪ CHỐI (VƯỢT DUNG SAI)",
                            "MSG01: OPERATION REJECTED (EXCEEDS TOLERANCE)",
                          )}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {text("Độ lệch:", "Variance:")}{" "}
                      <strong className="font-mono">
                        {simVariance.toLocaleString(text("vi-VN", "en-US"))} kg
                      </strong>{" "}
                      · {text("Dung sai tối đa cho phép (0,5%):", "Max allowed tolerance (0.5%):")}{" "}
                      <span className="font-mono font-bold">
                        {simAllowed.toLocaleString(text("vi-VN", "en-US"))} kg
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimInputKg(100000);
                      setSimOutputKg(88000);
                      setSimLossKg(12000);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/10 border border-ink-tertiary/20 text-ink-primary shadow-xs hover:bg-black/[0.02]"
                  >
                    {text("Mẫu chuẩn (0 kg lệch)", "Balanced preset (0 kg diff)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimInputKg(100000);
                      setSimOutputKg(92000);
                      setSimLossKg(12000);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-white/10 border border-functional-hold-border/40 text-accent-danger shadow-xs hover:bg-accent-danger/10"
                  >
                    {text("Mẫu lỗi gõ nhầm (+4.000 kg)", "Typo preset (+4,000 kg)")}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* TAB 2: MRL SIMULATOR */
            <motion.div
              key="mrl-sim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface-base border border-ink-tertiary/20 rounded-3xl p-6 sm:p-8 shadow-apple-card space-y-6"
            >
              <div className="flex items-center justify-between border-b border-ink-tertiary/20 dark:border-surface-overlay pb-5">
                <div>
                  <h3 className="font-sans font-bold text-lg text-ink-primary">
                    {text(
                      "Kiểm định Giới hạn Dư lượng MRL Đích",
                      "Destination Market MRL Compliance Check",
                    )}
                  </h3>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {text(
                      "Áp dụng ngưỡng trần quy định của thị trường nhập khẩu trừ biên an toàn 20%.",
                      "Enforces destination regulatory limits minus a conservative 20% safety margin.",
                    )}
                  </p>
                </div>
                <StatusBadge
                  status={isMrlCompliant ? "COMPLIANT" : "NON_COMPLIANT"}
                  label={
                    isMrlCompliant
                      ? text("Đạt chuẩn xuất khẩu", "Export Compliant")
                      : text("Nguy cơ vượt ngưỡng", "Threshold Risk")
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary text-ink-tertiary block mb-2">
                    {text("Thị trường đích xuất khẩu:", "Export destination market:")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "EU", label: text("Châu Âu (EU)", "European Union (EU)") },
                      { id: "USA", label: text("Hoa Kỳ (USA)", "United States (USA)") },
                      { id: "JAPAN", label: text("Nhật Bản (MHLW)", "Japan (MHLW)") },
                      { id: "KOREA", label: text("Hàn Quốc (MFDS)", "South Korea (MFDS)") },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setSelectedMarket(
                            m.id as "EU" | "USA" | "JAPAN" | "KOREA",
                          )
                        }
                        className={`p-3 rounded-2xl text-xs font-semibold border transition-all ${
                          selectedMarket === m.id
                            ? "bg-ink-primary text-ink-inverse border-ink-primary shadow-sm"
                            : "bg-black/[0.02] dark:bg-white/[0.04] text-ink-secondary text-ink-tertiary border-ink-tertiary/20 dark:border-surface-overlay hover:bg-black/[0.04]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-secondary text-ink-tertiary block mb-2">
                    {text("Hoạt chất thuốc BVTV kiểm định:", "Evaluated pesticide substance:")}
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: "TCZ",
                        name: text("Tricyclazole (Rủi ro cực cao tại EU)", "Tricyclazole (Strict EU LOQ risk)"),
                      },
                      { id: "IPT", name: text("Isoprothiolane (Trừ đạo ôn)", "Isoprothiolane (Blast control)") },
                      { id: "HXC", name: text("Hexaconazole (Trừ nấm)", "Hexaconazole (Fungicide)") },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setSelectedSubstance(s.id as "TCZ" | "IPT" | "HXC")
                        }
                        className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-medium border transition-all ${
                          selectedSubstance === s.id
                            ? "bg-accent-primary/[0.08] border-accent-primary/40 text-accent-primary font-bold"
                            : "bg-black/[0.02] dark:bg-white/[0.04] text-ink-secondary text-ink-tertiary border-ink-tertiary/20 dark:border-surface-overlay hover:bg-black/[0.04]"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MRL Threshold Comparison Card */}
              <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-ink-tertiary block mb-1">
                      {text("Căn cứ pháp lý:", "Regulatory basis:")}
                    </span>
                    <span className="font-semibold text-ink-primary">
                      {currentMrl.basis}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block mb-1">
                      {text("Ngưỡng MRL tối đa:", "Max MRL ceiling:")}
                    </span>
                    <span className="font-mono font-bold text-ink-primary">
                      {currentMrl.limit} {currentMrl.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block mb-1">
                      {text("Ngưỡng an toàn (-20%):", "Safety margin (-20%):")}
                    </span>
                    <span className="font-mono font-bold text-accent-primary">
                      {currentMrl.safeMargin} {currentMrl.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block mb-1">
                      {text("Dư lượng mẻ thử:", "Sample residue:")}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isMrlCompliant
                          ? "text-accent-primary"
                          : "text-accent-danger"
                      }`}
                    >
                      {currentMeasured} {currentMrl.unit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                  {isMrlCompliant ? (
                    <span className="text-xs text-accent-primary font-semibold flex items-center gap-1.5">
                      <CheckCircle size={16} weight="bold" />
                      {text(
                        `Mẻ gạo đạt chuẩn xuất khẩu sang thị trường ${selectedMarket}. Sẵn sàng cấp phép xếp container.`,
                        `Batch meets export standards for ${selectedMarket}. Ready for container loading approval.`,
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-accent-danger font-semibold flex items-center gap-1.5">
                      <WarningCircle size={16} weight="bold" />
                      {text(
                        "Dư lượng tiếp cận hoặc vượt biên an toàn. Thuật toán phối trộn sẽ đề xuất bổ sung lô gạo sạch để hạ nồng độ.",
                        "Residue approaches or breaches safety margin. Blend planning will dilute with compliant lots.",
                      )}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
