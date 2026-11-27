import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useWorkflowText() {
  const { i18n } = useTranslation();
  return useCallback(
    (vi: string, en: string) => (i18n.language?.startsWith("en") ? en : vi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language],
  );
}
