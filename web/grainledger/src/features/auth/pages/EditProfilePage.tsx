import { useAuthStore } from "@/app/store/authStore";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { confirmAction } from "@/app/store/feedbackStore";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useUiStore } from "@/app/store/uiStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { RoleChip } from "@/shared/ui/RoleChip";
import { SettingsLayout } from "@/app/layout/SettingsLayout";
import { authApi } from "@/features/auth/api/authApi";
import {
  editProfileSchema,
  type EditProfileFormValues,
} from "@/features/auth/model/authSchemas";
import { isCustomerSide, isMillSide } from "@/shared/types/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Buildings,
  CheckCircle,
  Factory,
  Globe,
  LockSimple,
  Phone,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const EditProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const navigate = useNavigate();
  const signOutAll = useMutation({
    mutationFn: () => authApi.logout(true),
    onSuccess: () => navigate("/sign-in", { replace: true }),
  });
  const handleSignOutAll = async () => {
    if (signOutAll.isPending) return;
    if (await confirmAction({
      title: text("Đăng xuất trên mọi thiết bị?", "Sign out on all devices?"),
      description: text("Tất cả phiên đăng nhập của bạn sẽ bị thu hồi.", "All your active sessions will be revoked."),
      confirmLabel: text("Đăng xuất mọi thiết bị", "Sign out on all devices"),
      variant: "danger",
    })) signOutAll.mutate();
  };
  const { user, setUser, updateProfile } = useAuthStore();
  const { language, setLanguage } = useUiStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      language: language,
      phoneNumber: user?.phoneNumber || "",
    },
  });

  useEffect(() => {
    setValue('language', language);
  }, [language, setValue]);

  const getInitials = (name?: string) => {
    if (!name) return "GL";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const onSubmit = async (values: EditProfileFormValues) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await authApi.updateProfile({
        displayName: values.displayName,
        phoneNumber: values.phoneNumber,
      });

      setUser(updatedUser);
      updateProfile({
        displayName: updatedUser.displayName,
        phoneNumber: updatedUser.phoneNumber,
      });

      // Apply language change
      setLanguage(values.language);

      setSuccessMsg(
        t(
          "settings.profileUpdatedSuccess",
          "Thông tin cá nhân đã được lưu thành công.",
        ),
      );
    } catch {
      setErrorMsg(
        t(
          "settings.profileUpdateError",
          "Không thể lưu thông tin cá nhân. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="border-b border-ink-tertiary/15 pb-4">
          <h2 className="text-lg font-bold text-ink-primary">
            {t("settings.profileTitle", "Hồ sơ cá nhân")}
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "settings.profileSubtitle",
              "Quản lý tên hiển thị, số điện thoại liên hệ và ngôn ngữ sử dụng trên hệ thống.",
            )}
          </p>
        </div>

        {/* Success / Error Banners */}
        {successMsg && (
          <div className="p-3.5 rounded-md bg-functional-balanced-bg border border-functional-balanced-border text-accent-primary text-xs flex items-center gap-2">
            <CheckCircle size={18} weight="fill" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-md bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
            <WarningCircle size={18} weight="fill" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-base border border-ink-tertiary/15">
            <div className="w-16 h-16 rounded-full bg-accent-primary text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              {getInitials(user?.displayName)}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-ink-primary">
                {t("settings.avatar", "Ảnh đại diện")}
              </h3>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                {t("settings.fullName", "Họ và tên hiển thị *")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register("displayName")}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-base dark:bg-surface-raised border ${
                    errors.displayName
                      ? "border-accent-danger"
                      : "border-ink-tertiary/30"
                  } focus:border-accent-primary focus:outline-none transition-colors`}
                />
                <User
                  size={16}
                  className="absolute left-3 top-2.5 text-ink-tertiary"
                />
              </div>
              {errors.displayName && (
                <p className="text-xs text-accent-danger mt-1">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                {t(
                  "settings.language",
                  "Ngôn ngữ giao diện (Display Language)",
                )}
              </label>
              <div className="relative">
                <select
                  {...register("language")}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/30 focus:border-accent-primary focus:outline-none transition-colors"
                >
                  <option value="vi">Tiếng Việt (Mặc định)</option>
                  <option value="en">English (Export Compliance)</option>
                </select>
                <Globe
                  size={16}
                  className="absolute left-3 top-2.5 text-ink-tertiary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                {t("settings.phoneNumber", "Số điện thoại liên lạc")}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  {...register("phoneNumber")}
                  placeholder="09xx xxx xxx"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-md bg-surface-base dark:bg-surface-raised border ${
                    errors.phoneNumber
                      ? "border-accent-danger"
                      : "border-ink-tertiary/30"
                  } focus:border-accent-primary focus:outline-none transition-colors font-mono`}
                />
                <Phone
                  size={16}
                  className="absolute left-3 top-2.5 text-ink-tertiary"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-xs text-accent-danger mt-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          {/* Read-Only Admin Managed Scope */}
          <div className="p-4 rounded-lg bg-surface-base border border-ink-tertiary/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-tertiary uppercase tracking-wider">
              <LockSimple size={14} />
              <span>
                {t(
                  "settings.adminManagedScope",
                  "Phân quyền và phạm vi quản lý bởi Quản trị nhà máy",
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-ink-tertiary block">
                  {t("settings.emailReadOnly", "Email tài khoản:")}
                </span>
                <span className="font-mono font-semibold text-ink-primary">
                  {user?.email || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-ink-tertiary block">
                  {t("settings.assignedRoles", "Vai trò nghiệp vụ:")}
                </span>
                <div className="mt-1">
                  {user && user.hasAssignedRole !== false && user.role ? (
                    <RoleChip role={user.role} size="sm" showCode />
                  ) : user ? (
                    <span className="inline-flex items-center rounded-full bg-functional-hold-bg px-2.5 py-1 text-xs font-medium text-accent-warning">
                      {t("header.pendingAccess", "Chờ cấp quyền")}
                    </span>
                  ) : null}
                </div>
              </div>

              {user && isCustomerSide(user.role) && (
                <div className="sm:col-span-2">
                  <span className="text-ink-tertiary block">
                    {t(
                      "settings.assignedCompany",
                      "Công ty khách hàng sở hữu:",
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 font-medium text-ink-primary mt-0.5">
                    <Buildings size={14} className="text-accent-info" />
                    <span>{user.organizationName}</span>
                  </div>
                </div>
              )}

              {user && isMillSide(user.role) && (
                <div className="sm:col-span-2">
                  <span className="text-ink-tertiary block">
                    {t(
                      "settings.assignedFacilities",
                      "Cơ sở vận hành được cấp phép:",
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 font-medium text-ink-primary mt-0.5">
                    <Factory size={14} className="text-accent-primary" />
                    <span>
                      {user.assignedFacilities?.length
                        ? user.assignedFacilities.join(", ")
                        : text("Chưa gán cơ sở cụ thể", "No assigned facility")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-colors shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <GrainLoader
                  size="sm"
                  label={t("common.saving", "Đang lưu...")}
                />
              ) : (
                <span>{t("settings.saveChanges", "Lưu thay đổi")}</span>
              )}
            </button>
          </div>
        </form>
        <section className="space-y-3 border-t border-ink-tertiary/20 pt-4">
          <h2 className="font-semibold">{text("Phiên đăng nhập", "Sessions")}</h2>
          <Feedback error={signOutAll.error} pending={signOutAll.isPending} />
          <button type="button" disabled={signOutAll.isPending} onClick={() => void handleSignOutAll()}
            className="rounded-md border border-accent-danger/40 px-4 py-2 text-sm font-semibold text-accent-danger disabled:opacity-60">
            {text("Đăng xuất trên mọi thiết bị", "Sign out on all devices")}
          </button>
        </section>
      </div>
    </SettingsLayout>
  );
};
