import {
  adminEndpoints,
  type AdminRoleDto,
  type AdminUserDto,
  type OrganizationDto,
} from "@/api/admin";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { RoleChip } from "@/shared/ui/RoleChip";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { ROLE_DEFINITIONS, normalizeUserRole } from "@/shared/types/roles";
import {
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  MagnifyingGlass,
  PencilSimple,
  Users,
  UsersIcon,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export const UserAccessManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [roles, setRoles] = useState<AdminRoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Access Modal
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [role, setRole] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  const [reloadCount, setReloadCount] = useState(0);
  const organizationKind = organizations.find(org => org.id === organizationId)?.kind;
  const availableRoles = roles.filter(entry => entry.organizationKind === organizationKind);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([adminEndpoints.getUsers(), adminEndpoints.getOrganizations(), adminEndpoints.getRoles()])
      .then(([usersRes, orgsRes, rolesRes]) => {
        if (!active) return;
        setUsers(Array.isArray(usersRes) ? usersRes : []);
        setOrganizations(Array.isArray(orgsRes) ? orgsRes : []);
        setRoles(rolesRes);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : t(
                "admin.users.errorLoad",
                "Không thể tải danh sách tài khoản người dùng.",
              ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadCount, t]);

  const handleOpenEdit = (user: AdminUserDto) => {
    setSelectedUser(user);
    setRole(user.role || "");
    setOrganizationId(user.organizationId || "");
    setIsActive(user.isActive);
  };

  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || (organizationId && !availableRoles.some(entry => entry.name === role))) return;

    setSubmitting(true);
    setError(null);
    try {
      const etag = selectedUser.etag;
      if (!etag)
        throw new Error(
          "Thiếu phiên bản quyền truy cập. Hãy tải lại danh sách người dùng.",
        );
      await adminEndpoints.updateUserAccess(selectedUser.id, etag, {
        role: role || null,
        organizationId: organizationId || null,
        isActive,
      });

      setSuccessMsg(
        t(
          "admin.users.successUpdate",
          "Đã cập nhật vai trò & quyền hạn cho {{name}}",
          {
            name: selectedUser.displayName,
          },
        ),
      );
      setSelectedUser(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t("admin.users.errorSave", "Không thể lưu quyền hạn tài khoản."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q) ||
      (u.organizationName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("admin.users.tag", "PHÂN QUYỀN VAI TRÒ & TỔ CHỨC (RBAC)")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("admin.users.title", "Phân quyền Tài khoản & Ranh giới Tổ chức")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "admin.users.subtitle",
              "Gán 6 vai trò nghiệp vụ nội bộ hoặc người xem kho, liên kết tài khoản với tổ chức và kiểm soát trạng thái hoạt động.",
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
          title={t("common.reload", "Tải lại danh sách")}
        >
          <ArrowsClockwise
            size={16}
            className={loading ? "motion-safe:animate-spin" : undefined}
          />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={t(
              "admin.users.searchPlaceholder",
              "Tìm theo tên hoặc email người dùng...",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
          />
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-2.5 text-ink-tertiary"
          />
        </div>

        <div className="text-xs text-ink-secondary">
          {t("admin.users.totalUsers", "Tổng số tài khoản:")}{" "}
          <strong className="font-mono text-ink-primary">
            {filteredUsers.length}
          </strong>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "admin.users.loading",
                "Đang kiểm tra ma trận phân quyền RBAC...",
              )}
            />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users size={40} className="mx-auto text-ink-tertiary opacity-60" />
            <p className="text-sm font-semibold text-ink-primary">
              {t("admin.users.empty", "Không có người dùng nào")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("admin.users.user", "Người dùng")}
                  </th>
                  <th className="py-3 px-4">
                    {t("admin.users.organization", "Tổ chức / Công ty")}
                  </th>
                  <th className="py-3 px-4">
                    {t("admin.users.role", "Vai trò vận hành")}
                  </th>
                  <th className="py-3 px-4">
                    {t("admin.users.status", "Trạng thái")}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("common.actions", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-semibold text-ink-primary block">
                        {u.displayName}
                      </span>
                      <span className="font-mono text-xs text-ink-tertiary">
                        {u.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-ink-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <Buildings size={14} className="text-ink-tertiary" />
                        <span>
                          {u.organizationName ||
                            t("admin.users.noOrg", "Chưa gán công ty")}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.role ? (
                        <RoleChip role={normalizeUserRole(u.role)} showCode />
                      ) : (
                        <span className="text-ink-tertiary italic">
                          {t("admin.users.noRole", "Chưa cấp vai trò")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={u.isActive ? "BALANCED" : "REJECTED"}
                        label={
                          u.isActive
                            ? t("admin.users.active", "Đang hoạt động")
                            : t("admin.users.inactive", "Tạm vô hiệu")
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay border border-ink-tertiary/20 font-semibold text-accent-primary text-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <PencilSimple size={14} />
                        <span>
                          {t("admin.users.assignPermission", "Cấp quyền")}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Access Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        ariaLabel={t("admin.ueditPermission", "Cập nhật quyền truy cập")}
      >
        {selectedUser && (
          <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
            <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <UsersIcon weight="bold" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-ink-primary">
                    {t("admin.ueditPermission", "Cập nhật quyền truy cập")}
                  </h2>
                  <p className="text-[11px] text-ink-secondary">
                    {t(
                      "admin.users.updatePermissionDescription",
                      "Cập nhật quyền truy cập hệ thống",
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                disabled={submitting}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSaveAccess} className="p-5 space-y-4 text-xs">
              <div>
                <label htmlFor="access-role" className="block font-semibold text-ink-secondary mb-1">
                  {t("admin.users.roleLabel", "Vai trò nghiệp vụ (Role) *")}
                </label>
                <select
                  id="access-role"
                  name="role"
                  required={Boolean(organizationId)}
                  disabled={!organizationId}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
                >
                  <option value="" disabled={Boolean(organizationId)}>{text("Chọn vai trò", "Choose a role")}</option>
                  {availableRoles.map(entry => {
                    const definition = ROLE_DEFINITIONS[normalizeUserRole(entry.name)];
                    return <option key={entry.name} value={entry.name}>
                      {i18n.language.startsWith("en") ? definition.labelEn : definition.labelVi}
                    </option>;
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="access-org" className="block font-semibold text-ink-secondary mb-1">
                  {t("admin.users.orgLabel", "Thuộc Doanh nghiệp / Tổ chức *")}
                </label>
                <select
                  id="access-org"
                  name="organizationId"
                  value={organizationId}
                  onChange={(e) => {
                    setOrganizationId(e.target.value);
                    setRole("");
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
                >
                  <option value="">
                    {t("admin.users.noOrgSelect", "-- Chưa gán tổ chức --")}
                  </option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} (
                      {org.kind === "Mill"
                        ? t("admin.users.orgMill", "Nhà máy")
                        : t("admin.users.orgCustomer", "Khách hàng")}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-primary focus:ring-accent-primary"
                />
                <label
                  htmlFor="userActiveCheck"
                  className="font-semibold text-ink-primary select-none"
                >
                  {t(
                    "admin.users.allowLogin",
                    "Cho phép tài khoản đăng nhập hoạt động",
                  )}
                </label>
              </div>

              <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
                >
                  {t("common.cancel", "Huỷ")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
                >
                  {submitting
                    ? t("common.saving", "Đang lưu...")
                    : t("admin.users.saveBtn", "Lưu quyền hạn")}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
