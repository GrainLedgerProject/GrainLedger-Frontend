import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { Sun, Moon, Globe, ArrowRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const navSectionIds = [
  "problem",
  "tech",
  "comparison",
  "simulators",
  "ecosystem",
] as const;

type SectionId = (typeof navSectionIds)[number];

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const { isAuthenticated } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = useUiStore();
  const headerRef = useRef<HTMLElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems: { id: SectionId; label: string }[] = [
    { id: "problem", label: text("Thách thức", "Challenges") },
    { id: "tech", label: text("Hệ thống lõi", "Core System") },
    { id: "comparison", label: text("Đối chiếu", "Comparison") },
    { id: "simulators", label: text("Mô phỏng", "Simulators") },
    { id: "ecosystem", label: text("Hệ sinh thái", "Ecosystem") },
  ];

  useEffect(() => {
    function updateActiveSection() {
      const headerBottom =
        headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const activationLine = headerBottom + 24;
      const page = document.scrollingElement ?? document.documentElement;
      setIsScrolled(page.scrollTop > 8);

      let currentSection: SectionId | null = null;
      let lastSection: SectionId | null = null;

      for (const id of navSectionIds) {
        const section = document.getElementById(id);
        if (!section) continue;

        lastSection = id;
        if (section.getBoundingClientRect().top <= activationLine) {
          currentSection = id;
        }
      }

      const canScroll = page.scrollHeight > page.clientHeight;
      const isAtBottom =
        page.scrollTop + page.clientHeight >= page.scrollHeight - 2;

      setActiveSection(canScroll && isAtBottom ? lastSection : currentSection);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    window.addEventListener("hashchange", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
        isScrolled
          ? "border-ink-tertiary/20 bg-white/75 shadow-sm backdrop-blur-xl dark:border-surface-overlay dark:bg-surface-base/95"
          : "border-transparent bg-transparent shadow-none backdrop-blur-none"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link to="/" className="group flex h-full items-center gap-3">
          <div className="flex h-10 w-auto items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <img
              src="/icons.svg"
              alt="GrainLedger"
              className="h-10 w-auto object-contain"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-black/[0.04] bg-black/[0.03] p-1 text-xs font-medium dark:border-white/[0.06] dark:bg-white/[0.05] lg:flex">
          {navItems.map(({ id, label }) => {
            const isActive = activeSection === id;

            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? "location" : undefined}
                className={`rounded-full px-4 py-2 transition-colors duration-200 ${
                  isActive
                    ? "bg-white text-ink-primary shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-ink-tertiary hover:bg-white hover:text-ink-primary dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-tertiary transition-all duration-200 hover:bg-black/[0.04] hover:text-ink-primary active:scale-95 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun size={18} weight="bold" />
            ) : (
              <Moon size={18} weight="bold" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="hidden items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-ink-primary transition-all duration-200 hover:bg-black/[0.08] active:scale-95 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] sm:flex"
          >
            <Globe size={14} weight="bold" />
            <span className="font-mono uppercase">{language}</span>
          </button>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to={isAuthenticated ? "/home" : "/sign-in"}
              className="inline-flex items-center gap-2 rounded-full bg-ink-primary px-5 py-2.5 text-xs font-semibold text-ink-inverse shadow-sm transition-all duration-200 hover:bg-black hover:shadow-md dark:hover:bg-white/90"
            >
              <span>
                {isAuthenticated
                  ? text("Vào Home", "Go to Home")
                  : t("landing.ctaSignIn", "Đăng nhập")}
              </span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
};
