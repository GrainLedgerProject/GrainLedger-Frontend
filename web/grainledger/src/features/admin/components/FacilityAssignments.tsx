import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Buildings,
  CheckCircle,
  FloppyDisk,
  PencilSimple,
  Plus,
  Trash,
  Users,
  X,
} from "@phosphor-icons/react";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type FacilityAssignment } from "@/api/ledger";
import { confirmAction } from "@/app/store/feedbackStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const setupKey = ["ledger-facility-setup"];

export function FacilityAssignments() {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [editing, setEditing] = useState<FacilityAssignment | null>(null);
  const [message, setMessage] = useState("");
  const setup = useQuery({
    queryKey: setupKey,
    queryFn: ledgerEndpoints.getSetup,
  });
  const users = useQuery({
    queryKey: ["facility-assignment-users"],
    queryFn: adminEndpoints.getUsers,
  });
  const operation = useMutation({
    mutationFn: (command: () => Promise<unknown>) => command(),
    onSuccess: () => {
      setEditing(null);
      setMessage(
        text("Đã cập nhật phân công.", "Facility assignments updated."),
      );
      void client.invalidateQueries({ queryKey: setupKey });
    },
  });
  const staff =
    users.data?.filter(
      (row) =>
        row.isActive &&
        ["MillOperator", "MillManager"].includes(row.role ?? ""),
    ) ?? [];
  const [revision, setRevision] = useState(0);
  const facilities = setup.data?.facilities ?? [];
  const assignments = setup.data?.assignments ?? [];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.isPending) return;
    const data = new FormData(event.currentTarget);
    const userId = String(data.get("userId") ?? "");
    const facilityId = String(data.get("facilityId") ?? "");
    if (!userId || !facilityId) return;
    operation.mutate(
      () =>
        editing
          ? ledgerEndpoints.updateAssignment(
              editing.userId,
              editing.facilityId,
              {
                version: editing.version,
                newUserId: userId,
                newFacilityId: facilityId,
              },
            )
          : ledgerEndpoints.createAssignment({ userId, facilityId }),
      {
        onSuccess: () => setRevision((n) => n + 1),
      },
    );
  }

  async function remove(row: FacilityAssignment) {
    if (
      operation.isPending ||
      !(await confirmAction({
        title: text(
          "Gỡ phân công tại cơ sở?",
          "Remove this facility assignment?",
        ),
        confirmLabel: text("Gỡ phân công", "Remove assignment"),
        variant: "danger",
      }))
    ) {
      return;
    }
    operation.mutate(() =>
      ledgerEndpoints.deleteAssignment(row.userId, row.facilityId, {
        version: row.version,
      }),
    );
  }

  return (
    <section
      aria-label={text(
        "Phân công nhân sự theo cơ sở",
        "Facility staff assignments",
      )}
      className="record-card"
    >
      <div className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile shrink-0" aria-hidden="true">
            <Users size={20} weight="bold" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-ink-primary">
              {text(
                "Phân công nhân sự theo cơ sở",
                "Facility staff assignments",
              )}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {text(
                "Gắn nhân sự vận hành và quản lý nhà máy vào từng cơ sở để phân quyền thao tác sổ cái.",
                "Assign active mill operators and managers to facilities for ledger operation permissions.",
              )}
            </p>
          </div>
        </div>
        {setup.data && (
          <StatusBadge
            status="ACTIVE"
            size="sm"
            label={`${assignments.length} ${text("phân công", "assignments")}`}
          />
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {(setup.error || users.error || operation.error) && (
          <div className="text-xs">
            <Feedback error={setup.error ?? users.error ?? operation.error} />
          </div>
        )}

        {(setup.isPending || users.isPending) && (
          <div className="flex justify-center py-6">
            <GrainLoader
              size="sm"
              label={text(
                "Đang tải danh sách nhân sự và phân công...",
                "Loading staff and facility assignments...",
              )}
            />
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-xl border border-functional-balanced-border bg-functional-balanced-bg px-4 py-3 text-xs font-semibold text-accent-primary"
          >
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        {setup.data && users.data && (
          <>
            {assignments.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
                <table className="min-w-full divide-y divide-ink-tertiary/15 text-xs">
                  <thead className="bg-surface-raised/80 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary dark:bg-surface-overlay/60">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">
                        {text("Nhân sự", "Staff member")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-left">
                        {text("Cơ sở", "Facility")}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {text("Thao tác", "Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base dark:bg-surface-raised">
                    {assignments.map((row) => {
                      const matchedUser = users.data?.find(
                        (user) => user.id === row.userId,
                      );
                      const facilityName =
                        facilities.find((f) => f.id === row.facilityId)?.name ??
                        row.facilityId;
                      const isEditing =
                        editing?.userId === row.userId &&
                        editing?.facilityId === row.facilityId;

                      return (
                        <tr
                          key={`${row.userId}:${row.facilityId}`}
                          className={`transition-colors hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 ${
                            isEditing
                              ? "bg-accent-primary/5 dark:bg-accent-primary/10"
                              : ""
                          }`}
                        >
                          <th
                            scope="row"
                            className="px-4 py-3 text-left font-medium text-ink-primary"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {matchedUser?.displayName ?? row.userId}
                              </span>
                              {matchedUser?.role && (
                                <span className="rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-secondary dark:bg-surface-overlay">
                                  {matchedUser.role}
                                </span>
                              )}
                            </div>
                            {matchedUser?.email && (
                              <span className="mt-0.5 block text-[11px] font-normal text-ink-secondary">
                                {matchedUser.email}
                              </span>
                            )}
                          </th>
                          <td className="px-4 py-3 text-ink-primary">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <Buildings
                                size={14}
                                aria-hidden="true"
                                className="shrink-0 text-accent-primary"
                              />
                              <span>{facilityName}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {row.canEdit && (
                                <button
                                  type="button"
                                  disabled={operation.isPending}
                                  onClick={() => setEditing(row)}
                                  className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1.5 text-xs font-semibold text-ink-primary transition-colors hover:border-accent-primary/40 hover:bg-surface-raised disabled:opacity-50 dark:bg-surface-overlay"
                                >
                                  <PencilSimple size={13} aria-hidden="true" />
                                  <span>{text("Sửa", "Edit")}</span>
                                </button>
                              )}
                              {row.canDelete && (
                                <button
                                  type="button"
                                  disabled={operation.isPending}
                                  onClick={() => void remove(row)}
                                  className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-3 py-1.5 text-xs font-semibold text-accent-danger transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  <Trash size={13} aria-hidden="true" />
                                  <span>{text("Gỡ", "Remove")}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-tertiary/25 bg-surface-raised/40 p-8 text-center text-xs text-ink-secondary dark:bg-surface-overlay/20">
                <Users
                  size={28}
                  aria-hidden="true"
                  className="mx-auto mb-2 text-ink-tertiary"
                />
                <p>{text("Chưa có phân công.", "No facility assignments.")}</p>
              </div>
            )}

            <form
              method="post"
              onSubmit={submit}
              key={`${revision}:${editing?.userId}:${editing?.facilityId}`}
              className={`record-form space-y-4 rounded-xl border p-4 sm:p-5 ${
                editing
                  ? "border-accent-primary/40 bg-accent-primary/5 dark:bg-accent-primary/10"
                  : "border-ink-tertiary/20 bg-surface-raised/40 dark:bg-surface-overlay/25"
              }`}
            >
              <fieldset disabled={operation.isPending} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                    {editing ? (
                      <PencilSimple
                        size={15}
                        className="text-accent-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Plus
                        size={15}
                        weight="bold"
                        className="text-accent-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {editing
                        ? text("Sửa phân công", "Edit assignment")
                        : text("Thêm phân công", "Add assignment")}
                    </span>
                  </legend>
                  {editing && (
                    <StatusBadge
                      status="IN_PROGRESS"
                      size="sm"
                      label={text("Đang chỉnh sửa", "Editing")}
                    />
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span>
                      {text("Nhân sự đang hoạt động", "Active mill staff")} *
                    </span>
                    <select
                      name="userId"
                      required
                      defaultValue={editing?.userId ?? ""}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {staff.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.displayName} · {row.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>{text("Cơ sở", "Facility")} *</span>
                    <select
                      name="facilityId"
                      required
                      defaultValue={editing?.facilityId ?? ""}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {facilities.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <div className="record-form-footer">
                {editing && (
                  <button
                    type="button"
                    disabled={operation.isPending}
                    onClick={() => setEditing(null)}
                    className="record-button rounded-full px-4"
                  >
                    <X size={14} aria-hidden="true" />
                    <span>{text("Hủy sửa", "Cancel edit")}</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={operation.isPending}
                  className="record-button record-primary rounded-full px-5"
                >
                  <FloppyDisk size={15} weight="bold" aria-hidden="true" />
                  <span>
                    {operation.isPending
                      ? text("Đang lưu...", "Saving...")
                      : text("Lưu phân công", "Save assignment")}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
