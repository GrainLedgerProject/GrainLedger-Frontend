import React, { useState } from "react";
import {
  Factory,
  Truck,
  Users,
  Certificate,
  CheckCircle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export const EcosystemSection: React.FC = () => {
  const text = useWorkflowText();
  const [activeStakeholder, setActiveStakeholder] = useState<
    "MILL" | "EXPORTER" | "FARMER" | "AUDIT"
  >("MILL");

  const tabs = [
    { id: "MILL", label: text("Nhà máy Xay xát & Sấy lúa", "Rice Mill & Drying Plant"), icon: Factory },
    { id: "EXPORTER", label: text("Doanh nghiệp Xuất khẩu", "Export Enterprise"), icon: Truck },
    { id: "FARMER", label: text("Nông hộ & Tổ hợp tác", "Farmers & Cooperatives"), icon: Users },
    { id: "AUDIT", label: text("Cơ quan Kiểm định & Hải quan", "Inspectors & Customs"), icon: Certificate },
  ];

  return (
    <section
      id="ecosystem"
      className="py-24 lg:py-32 bg-surface-raised border-y border-ink-tertiary/20 dark:border-surface-overlay"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent-primary">
            {text("Hệ sinh thái liên kết", "Connected Ecosystem")}
          </span>
          <h2 className="font-sans text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-ink-primary">
            {text(
              "Phục vụ toàn diện các bên trong chuỗi giá trị",
              "Built for every participant across the value chain",
            )}
          </h2>
          <p className="text-sm text-ink-secondary text-ink-tertiary">
            {text(
              "Mỗi đối tác trong chuỗi lúa gạo sở hữu một trải nghiệm số hóa tinh gọn, phù hợp đặc thù vận hành.",
              "Each stakeholder receives a focused digital workflow tailored to real operations.",
            )}
          </p>
        </div>

        {/* Stakeholder Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeStakeholder === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveStakeholder(
                    tab.id as "MILL" | "EXPORTER" | "FARMER" | "AUDIT",
                  )
                }
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-white dark:text-black"
                    : "text-ink-secondary text-ink-tertiary hover:text-ink-primary bg-white/70 dark:bg-white/[0.05] border border-ink-tertiary/20"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="stakeholderPillHighlight"
                    className="absolute inset-0 bg-ink-primary rounded-full shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} weight={isActive ? "bold" : "regular"} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Stakeholder Details Card */}
        <div className="bg-surface-base border border-ink-tertiary/20 rounded-3xl p-8 sm:p-12 shadow-apple-card max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {activeStakeholder === "MILL" && (
              <motion.div
                key="mill"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
              >
                <div className="space-y-5">
                  <span className="text-xs font-mono font-bold uppercase text-accent-primary tracking-wider">
                    {text("Dành cho Ban Điều hành Nhà máy", "For Mill Operations & Management")}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold text-ink-primary tracking-[-0.02em]">
                    {text(
                      "Minh bạch sản lượng sấy, xay xát và lưu trữ silo",
                      "Transparent drying, milling yields & silo storage",
                    )}
                  </h3>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Cung cấp dịch vụ sấy, silo và xay xát cho nhiều công ty xuất khẩu mà không lo tranh chấp về hao hụt ẩm hay tỷ lệ thu hồi thành phẩm, tấm và cám.",
                      "Serve multiple export clients with drying, silo storage, and milling without disputes over moisture shrinkage or recovery rates.",
                    )}
                  </p>
                  <ul className="space-y-3 text-xs text-ink-primary">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-primary shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Hạch toán hao hụt theo từng mẻ máy có số đo cân đối chiếu",
                          "Batch-level loss accounting backed by weighbridge proofs",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-primary shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Cách ly tuyệt đối lô hàng của từng công ty khách hàng",
                          "Strict custody isolation across tenant exporters",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-primary shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Xử lý bút toán bù chuẩn mực khi có hiệu chỉnh số cân",
                          "Audited reversal & replacement entries for weight corrections",
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-7 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-ink-tertiary/20 dark:border-surface-overlay pb-3">
                    <span className="text-ink-primary">
                      {text("Mẫu báo cáo mẻ xay xát S1", "Sample Milling Batch Report S1")}
                    </span>
                    <span className="text-accent-primary font-mono">
                      {text("100% Cân bằng", "100% Balanced")}
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">
                        {text("Thóc khô đưa vào:", "Dry paddy input:")}
                      </span>
                      <span className="font-mono font-bold text-ink-primary">
                        88.000,000 kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">
                        {text("Gạo nguyên thu hồi:", "Whole milled rice output:")}
                      </span>
                      <span className="font-mono font-bold text-accent-primary">
                        58.000,000 kg (65.9%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">
                        {text("Tấm + Cám + Trấu:", "Brokens + Bran + Husk:")}
                      </span>
                      <span className="font-mono text-ink-secondary text-ink-tertiary">
                        29.700,000 kg (33.8%)
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-ink-tertiary/20 dark:border-surface-overlay pt-2">
                      <span className="text-ink-tertiary">{text("Hao hụt máy:", "Process loss:")}</span>
                      <span className="font-mono text-ink-secondary text-ink-tertiary">
                        300,000 kg (0.3%)
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStakeholder === "EXPORTER" && (
              <motion.div
                key="exporter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
              >
                <div className="space-y-5">
                  <span className="text-xs font-mono font-bold uppercase text-accent-info tracking-wider">
                    {text("Dành cho Doanh nghiệp Xuất khẩu", "For Export Enterprises")}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold text-ink-primary tracking-[-0.02em]">
                    {text(
                      "Bảo đảm từng container đạt chuẩn thị trường đích",
                      "Ensure every container meets destination standards",
                    )}
                  </h3>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Tối ưu hóa các mẻ phối trộn đạt tiêu chuẩn tỷ lệ tấm, độ ẩm và dư lượng hoạt chất dưới ngưỡng MRL mà không lo bị từ chối đơn hàng.",
                      "Optimize blending ratios to satisfy broken grade, moisture, and strict destination MRL limits without shipment rejections.",
                    )}
                  </p>
                  <ul className="space-y-3 text-xs text-ink-primary">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-info shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Thuật toán đề xuất mẻ trộn tối ưu lợi nhuận và an toàn MRL",
                          "Deterministic blend planning balancing margin and MRL compliance",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-info shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Xuất hồ sơ tuân thủ kèm QR truy xuất nguồn gốc số hoá",
                          "Generate digital compliance dossiers with full origin provenance",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-info shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Giám sát tiến độ đóng niêm container trực tiếp thời gian thực",
                          "Monitor container loading, sealing, and readiness in real time",
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-7 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-ink-tertiary/20 dark:border-surface-overlay pb-3">
                    <span className="text-ink-primary">
                      {text("Hồ sơ xuất xưởng Container C1", "Export Dossier Container C1")}
                    </span>
                    <span className="text-accent-info font-mono">
                      {text("Đạt chuẩn EU", "EU Compliant")}
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">
                        {text("Thị trường đích:", "Target market:")}
                      </span>
                      <span className="font-bold text-ink-primary">
                        {text("Châu Âu (Regulation EC 396)", "European Union (EC 396/2005)")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">
                        {text("Khối lượng tịnh:", "Net weight:")}
                      </span>
                      <span className="font-mono font-bold text-ink-primary">
                        25.000,000 kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">{text("Số niêm chì:", "Seal number:")}</span>
                      <span className="font-mono text-ink-secondary text-ink-tertiary">
                        GL-SEAL-8891
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStakeholder === "FARMER" && (
              <motion.div
                key="farmer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
              >
                <div className="space-y-5">
                  <span className="text-xs font-mono font-bold uppercase text-accent-warning tracking-wider">
                    {text("Dành cho Nông hộ & Hợp tác xã", "For Farmers & Cooperatives")}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold text-ink-primary tracking-[-0.02em]">
                    {text("Ghi nhận công sức canh tác bền vững", "Recognize sustainable farming practices")}
                  </h3>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Nông dân được định danh thửa ruộng trên bản đồ GPS, lưu lại lịch sử canh tác an toàn và nhận đúng giá trị lúa chất lượng cao.",
                      "Farmers register GPS-mapped plots, document safe cultivation logs, and unlock premium pricing for compliant paddy.",
                    )}
                  </p>
                  <ul className="space-y-3 text-xs text-ink-primary">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-warning shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Phiếu cân điện tử tại bờ ruộng có toạ độ định vị",
                          "Geotagged electronic procurement receipts at the field",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-accent-warning shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Lấy mẫu niêm phong đại diện bảo đảm quyền lợi đôi bên",
                          "Sealed representative sampling protecting both buyer and grower",
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-7 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-ink-tertiary/20 dark:border-surface-overlay pb-3">
                    <span className="text-ink-primary">
                      {text("Thửa ruộng L1 — Cái Bè", "Plot L1 — Cái Bè")}
                    </span>
                    <span className="text-accent-warning font-mono">
                      1.8 ha · OM5451
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Nông hộ Nguyễn Văn An · Đã thu hoạch 50.000 kg lúa tươi đạt chuẩn độ ẩm 26,5%.",
                      "Farmer Nguyễn Văn An · Harvested 50,000 kg fresh paddy at 26.5% moisture.",
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            {activeStakeholder === "AUDIT" && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
              >
                <div className="space-y-5">
                  <span className="text-xs font-mono font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                    {text("Dành cho Cơ quan Kiểm định & Hải quan", "For Inspectors & Customs Authorities")}
                  </span>
                  <h3 className="font-sans text-2xl sm:text-3xl font-bold text-ink-primary tracking-[-0.02em]">
                    {text("Truy xuất tức thời không thể làm giả", "Instant tamper-evident audit trails")}
                  </h3>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Dữ liệu lưu giữ bất biến trên sổ cái kỹ thuật số, kèm kết quả thử nghiệm từ phòng thí nghiệm ISO/IEC 17025.",
                      "Immutable ledger custody logs linked directly with ISO/IEC 17025 accredited laboratory certificates.",
                    )}
                  </p>
                  <ul className="space-y-3 text-xs text-ink-primary">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-purple-600 dark:text-purple-400 shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Liên kết trực tiếp tới chứng thư kiểm nghiệm phân tích",
                          "Direct links to verified laboratory analytical certificates",
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle
                        size={17}
                        className="text-purple-600 dark:text-purple-400 shrink-0"
                        weight="fill"
                      />
                      <span>
                        {text(
                          "Truy vết toán học tỷ lệ phần trăm khối lượng nguồn gốc",
                          "Mathematical backward attribution of source lot mass shares",
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-7 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-ink-tertiary/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-ink-tertiary/20 dark:border-surface-overlay pb-3">
                    <span className="text-ink-primary">
                      {text("Chứng thư tuân thủ xuất khẩu", "Export Compliance Certificate")}
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-mono">
                      ISO 17025
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary text-ink-tertiary leading-relaxed">
                    {text(
                      "Chứng thực lô hàng đạt chuẩn kiểm dịch thực vật và kiểm tra dư lượng thuốc trừ sâu theo tiêu chuẩn quốc tế.",
                      "Certifies shipment compliance with phytosanitary and international pesticide MRL tolerances.",
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
