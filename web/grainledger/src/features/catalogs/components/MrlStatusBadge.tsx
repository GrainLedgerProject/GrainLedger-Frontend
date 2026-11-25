import { useTranslation } from "react-i18next";
import { type MrlVersionDto } from "@/api/catalogs";
import { StatusBadge } from "@/shared/ui/StatusBadge";

export function MrlStatusBadge({ version }: { version: MrlVersionDto }) {
  const { t } = useTranslation();
  return (
    <StatusBadge
      status={version.status === "PUBLISHED" ? "ACTIVE" : "PENDING"}
      label={
        version.status === "PUBLISHED"
          ? t("apiAudit.mrl.published")
          : t("apiAudit.mrl.draft")
      }
    />
  );
}
