import { useTranslation } from "react-i18next";

export function useWorkflowText() {
  const { i18n } = useTranslation();
  return (vi: string, en: string) => i18n.language?.startsWith("en") ? en : vi;
}
