import { describe, expect, it, vi } from "vitest";
vi.mock("@/api/health", () => ({ checkBackendHealth: async () => false }));
import i18n, { normalizeLanguage } from "@/app/i18n";
import { useUiStore } from "@/app/store/uiStore";
import en from "@/app/i18n/locales/en.json";
import viMessages from "@/app/i18n/locales/vi.json";
const keys = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object"
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
describe("Display preferences", () => {
  it("has matching translation keys", () =>
    expect(keys(en).sort()).toEqual(keys(viMessages).sort()));
  it("normalizes stored language codes", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("invalid")).toBe("vi");
  });
  it("persists external language changes and updates document language", async () => {
    await i18n.changeLanguage("en");
    expect(useUiStore.getState().language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("grainledger_lang")).toBe("en");
    useUiStore.getState().setLanguage("vi");
    expect(i18n.language).toBe("vi");
  });
  it("syncs language and minimal mode across tabs", async () => {
    localStorage.setItem("grainledger_lang", "en");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "grainledger_lang", newValue: "en" }),
    );
    expect(useUiStore.getState().language).toBe("en");
    localStorage.setItem("grainledger_minimal_mode", "true");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "grainledger_minimal_mode",
        newValue: "true",
      }),
    );
    expect(useUiStore.getState().isMinimalMode).toBe(true);
    expect(document.documentElement.dataset.minimalUi).toBe("true");
    useUiStore.getState().setMinimalMode(false);
    expect(localStorage.getItem("grainledger_minimal_mode")).toBe("false");
    expect(document.documentElement.dataset.minimalUi).toBe("false");
  });
});
