import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/app/store/authStore";
import { ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

export const LandingCtaFooter: React.FC = () => {
  const text = useWorkflowText();
  const { isAuthenticated } = useAuthStore();
  return (
    <>
      {/* Apple-grade CTA Banner */}
      <section className="py-24 bg-surface-raised text-ink-primary relative overflow-hidden border-t border-ink-tertiary/20 dark:border-surface-overlay">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-accent-primary/25 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="font-sans text-3xl sm:text-5xl font-extrabold tracking-[-0.035em] max-w-2xl mx-auto leading-tight">
            {text(
              "Sẵn sàng chuẩn hóa chuỗi cung ứng lúa gạo của bạn?",
              "Ready to standardize your rice supply chain custody?",
            )}
          </h2>
          <p className="text-base text-ink-secondary max-w-xl mx-auto leading-relaxed font-normal">
            {text(
              "Tham gia chương trình thí điểm tại Tiền Giang và trải nghiệm nền tảng sổ cái cân bằng khối lượng đầu tiên tại Việt Nam.",
              "Join our Tiền Giang pilot program and experience Vietnam's first mass-balance custody ledger platform.",
            )}
          </p>
          <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={isAuthenticated ? "/home" : "/sign-in"}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-white text-ink-primary hover:bg-white/95 shadow-lg transition-all"
              >
                <span className="text-black">
                  {isAuthenticated
                    ? text("Vào Home", "Go to Home")
                    : text("Đăng nhập vào hệ thống", "Sign in to GrainLedger")}
                </span>
                <ArrowRight className="text-black" size={15} weight="bold" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modern Apple Minimal Footer */}
      <footer className="bg-surface-base text-ink-secondary text-xs py-16 border-t border-ink-tertiary/20 dark:border-surface-overlay transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-ink-tertiary/20 dark:border-surface-overlay">
            {/* Col 1: Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center">
                <img
                  src="/icons.svg"
                  alt="GrainLedger"
                  className="w-auto object-contain"
                />
              </div>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                {text(
                  "Nền tảng sổ cái lưu giữ theo cân bằng khối lượng (Mass-Balance Custody Ledger) phục vụ xuất khẩu lúa gạo sang các thị trường cao cấp.",
                  "Mass-Balance Custody Ledger platform built for compliant rice exports to strict international markets.",
                )}
              </p>
              <div className="text-xs font-mono text-ink-tertiary">
                {text("Đề tài FA26SE272 · Nhóm GFA26SE137", "Project FA26SE272 · Team GFA26SE137")}
              </div>
            </div>

            {/* Col 2: Nền tảng */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-ink-primary">
                {text("Công nghệ", "Technology")}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="#tech"
                    className="hover:text-ink-primary dark:hover:text-white transition-colors"
                  >
                    {text("Sổ cái Cân bằng Khối lượng", "Mass Balance Ledger")}
                  </a>
                </li>
                <li>
                  <a
                    href="#tech"
                    className="hover:text-ink-primary dark:hover:text-white transition-colors"
                  >
                    {text("Động cơ MRL & An toàn", "MRL Safety Engine")}
                  </a>
                </li>
                <li>
                  <a
                    href="#tech"
                    className="hover:text-ink-primary dark:hover:text-white transition-colors"
                  >
                    {text("Thu mua Ngoại tuyến Mobile", "Offline Field Procurement")}
                  </a>
                </li>
                <li>
                  <a
                    href="#tech"
                    className="hover:text-ink-primary dark:hover:text-white transition-colors"
                  >
                    {text("Truy vết Hai chiều Đồ thị", "Bidirectional Graph Trace")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Chuẩn mực */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-ink-primary">
                {text("Tiêu chuẩn Xuất khẩu", "Export Standards")}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-ink-tertiary">
                    ISO 22095:2020 Mass Balance
                  </span>
                </li>
                <li>
                  <span className="text-ink-tertiary">
                    EU EC 396/2005 (Tricyclazole)
                  </span>
                </li>
                <li>
                  <span className="text-ink-tertiary">
                    US EPA 40 CFR Part 180
                  </span>
                </li>
                <li>
                  <span className="text-ink-tertiary">
                    Japan MHLW Positive List
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 4: Cơ sở */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-ink-primary">
                {text("Cơ sở Thí điểm", "Pilot Facility")}
              </h4>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                {text(
                  "Nhà máy Xay xát Lúa gạo Tiền Giang, Đồng bằng sông Cửu Long, Việt Nam.",
                  "Tiền Giang Rice Milling Plant, Mekong Delta, Vietnam.",
                )}
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-tertiary">
            <div>
              {text(
                "GrainLedger © 2026 GFA26SE137. Mọi quyền được bảo lưu.",
                "GrainLedger © 2026 GFA26SE137. All rights reserved.",
              )}
            </div>
            <div>
              {text(
                "Tuân thủ nghiêm ngặt tiêu chuẩn bảo toàn khối lượng ISO 22095:2020.",
                "Strict compliance with ISO 22095:2020 Mass Balance Chain of Custody.",
              )}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
