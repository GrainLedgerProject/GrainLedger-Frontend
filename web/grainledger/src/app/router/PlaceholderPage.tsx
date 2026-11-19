import { RoleChip } from "@/shared/ui/RoleChip";
import type { UserRole } from "@/shared/types/roles";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileCode,
  ShieldCheck,
} from "@phosphor-icons/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export interface PlaceholderPageProps {
  titleVi: string;
  titleEn: string;
  roles: UserRole[];
  descriptionVi: string;
  descriptionEn?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  titleVi,
  titleEn,
  roles,
  descriptionVi,
  descriptionEn,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.toLowerCase().startsWith("en");

  const primaryTitle = isEn ? titleEn : titleVi;
  const secondaryTitle = isEn ? titleVi : titleEn;
  const description = isEn && descriptionEn ? descriptionEn : descriptionVi;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          {t("placeholder.back", "Quay lại màn hình trước")}
        </button>
      </div>

      {/* Main specification card */}
      <div className="bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl  font-bold text-ink-primary">
              {primaryTitle}
            </h1>
            <p className="text-sm text-ink-secondary italic">
              {secondaryTitle}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
              {t("placeholder.authorizedRoles", "Vai trò được phép truy cập")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <RoleChip key={r} role={r} size="sm" showCode />
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-4 text-sm text-ink-primary leading-relaxed">
          <div className="p-4 rounded-md bg-surface-base border border-ink-tertiary/20">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-ink-tertiary mb-2 flex items-center gap-1.5">
              <BookOpen size={16} className="text-accent-primary" />
              {isEn ? "Planned workflow" : "Quy trình dự kiến"}
            </h3>
            <p>{description}</p>
          </div>

          {/* Business Rules and Invariants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-surface-base border border-ink-tertiary/20 space-y-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-ink-tertiary flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-accent-success" />
                {t(
                  "placeholder.businessRules",
                  "Ràng buộc nghiệp vụ (Business Rules)",
                )}
              </h4>
              <div className="flex flex-wrap gap-2">
              </div>
              <p className="text-xs text-ink-secondary">
                {t(
                  "placeholder.appendOnlyNotice",
                  "Tuân thủ nghiêm ngặt mô hình sổ cái chỉ-ghi-thêm (Append-only) và cách ly Tenant theo công ty khách hàng.",
                )}
              </p>
            </div>

            <div className="p-4 rounded-md bg-surface-base border border-ink-tertiary/20 space-y-2">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-ink-tertiary flex items-center gap-1.5">
                <FileCode size={16} className="text-accent-info" />
                {t("placeholder.devStatus", "Trạng thái phát triển")}
              </h4>
              <p className="text-xs text-ink-secondary">
                {isEn ? "This screen is not implemented yet. No business data can be viewed or changed here." : "Màn hình này chưa được triển khai. Bạn chưa thể xem hoặc thay đổi dữ liệu nghiệp vụ tại đây."}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-accent-warning font-medium pt-1">
                <Clock size={14} />
                <span>
                  {t(
                    "placeholder.readyNextSprint",
                    "Chưa sẵn sàng sử dụng",
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
