import { useUiStore } from "@/app/store/uiStore";
import { Modal } from "@/shared/ui/Modal";
import { MagnifyingGlass, Package, Scroll, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/** Opens the real, server-backed search views instead of displaying sample records. */
export const GlobalSearchModal = () => {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const isSearchOpen = useUiStore((state) => state.isSearchOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(!useUiStore.getState().isSearchOpen);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setSearchOpen]);

  const destinations = [
    { label: en ? "Search stock lots" : "Tìm trong kho lô", icon: Package, path: "/stock" },
    { label: en ? "Search event history" : "Tìm trong lịch sử sự kiện", icon: Scroll, path: "/events" },
  ];

  const select = (path: string) => {
    const search = query.trim();
    navigate(search ? `${path}?search=${encodeURIComponent(search)}` : path);
    setQuery("");
    setActiveIndex(0);
    setSearchOpen(false);
  };

  return (
    <Modal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} ariaLabel={en ? "Search GrainLedger" : "Tìm kiếm GrainLedger"}>
      <div className="w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-ink-tertiary/20 pb-3">
          <MagnifyingGlass size={22} aria-hidden="true" className="text-ink-tertiary" />
          <label htmlFor="global-search-input" className="sr-only">{en ? "Search term" : "Từ khóa tìm kiếm"}</label>
          <input
            id="global-search-input"
            type="search"
            autoFocus
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => (index + 1) % destinations.length); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => (index - 1 + destinations.length) % destinations.length); }
              if (event.key === "Enter") {
                event.preventDefault();
                if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                select(destinations[activeIndex].path);
              }
            }}
            placeholder={en ? "Enter lot code or event ID…" : "Nhập mã lô hoặc mã sự kiện…"}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-primary outline-none placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
          <button type="button" onClick={() => setSearchOpen(false)} aria-label={en ? "Close search" : "Đóng tìm kiếm"} className="rounded-lg p-2 text-ink-secondary hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent-primary">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="px-2 pt-4 text-xs text-ink-secondary">
          {en ? "Choose where to search live data" : "Chọn nơi tìm trong dữ liệu thực"}
        </p>
        <div className="mt-2 space-y-1">
          {destinations.map(({ label, icon: Icon, path }, index) => (
            <button
              key={path}
              type="button"
              onClick={() => select(path)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent-primary ${index === activeIndex ? "bg-accent-primary/10 text-accent-primary" : "text-ink-primary hover:bg-surface-raised"}`}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{query.trim() ? `${label}: “${query.trim()}”` : label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
