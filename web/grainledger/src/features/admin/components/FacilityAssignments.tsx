import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type FacilityAssignment } from "@/api/ledger";
import { confirmAction } from "@/app/store/feedbackStore";
import { Feedback, Panel } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";

const setupKey = ["ledger-facility-setup"];

export function FacilityAssignments() {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [editing, setEditing] = useState<FacilityAssignment | null>(null);
  const [message, setMessage] = useState("");
  const setup = useQuery({ queryKey: setupKey, queryFn: ledgerEndpoints.getSetup });
  const users = useQuery({ queryKey: ["facility-assignment-users"], queryFn: adminEndpoints.getUsers });
  const operation = useMutation({
    mutationFn: (command: () => Promise<unknown>) => command(),
    onSuccess: () => {
      setEditing(null);
      setMessage(text("Đã cập nhật phân công.", "Facility assignments updated."));
      void client.invalidateQueries({ queryKey: setupKey });
    },
  });
  const staff = users.data?.filter(row => row.isActive && ["MillOperator", "MillManager"].includes(row.role ?? "")) ?? [];
  const [revision, setRevision] = useState(0);
  const facilities = setup.data?.facilities ?? [];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.isPending) return;
    const data = new FormData(event.currentTarget);
    const userId = String(data.get("userId") ?? "");
    const facilityId = String(data.get("facilityId") ?? "");
    if (!userId || !facilityId) return;
    operation.mutate(() => editing
      ? ledgerEndpoints.updateAssignment(editing.userId, editing.facilityId, { version: editing.version, newUserId: userId, newFacilityId: facilityId })
      : ledgerEndpoints.createAssignment({ userId, facilityId }), {
      onSuccess: () => setRevision(n => n + 1),
    });
  }
  async function remove(row: FacilityAssignment) {
    if (operation.isPending || !await confirmAction({
      title: text("Gỡ phân công tại cơ sở?", "Remove this facility assignment?"),
      confirmLabel: text("Gỡ phân công", "Remove assignment"),
      variant: "danger",
    })) return;
    operation.mutate(() => ledgerEndpoints.deleteAssignment(row.userId, row.facilityId, { version: row.version }));
  }

  return <div className="gl-workflow">
    <Panel title={text("Phân công nhân sự theo cơ sở", "Facility staff assignments")}>
      <Feedback error={setup.error ?? users.error ?? operation.error} pending={setup.isPending || users.isPending || operation.isPending} />
      {message && <p role="status">{message}</p>}
      {setup.data && users.data && <>
        <div className="overflow-x-auto"><table>
          <thead><tr><th scope="col">{text("Nhân sự", "Staff member")}</th><th scope="col">{text("Cơ sở", "Facility")}</th><th scope="col">{text("Thao tác", "Actions")}</th></tr></thead>
          <tbody>{(setup.data.assignments ?? []).map(row => <tr key={`${row.userId}:${row.facilityId}`}>
            <th scope="row">{users.data?.find(user => user.id === row.userId)?.displayName ?? row.userId}</th>
            <td>{facilities.find(facility => facility.id === row.facilityId)?.name ?? row.facilityId}</td>
            <td><div className="flex flex-wrap gap-2">
              {row.canEdit && <button type="button" disabled={operation.isPending} onClick={() => setEditing(row)}>{text("Sửa", "Edit")}</button>}
              {row.canDelete && <button type="button" disabled={operation.isPending} onClick={() => void remove(row)}>{text("Gỡ", "Remove")}</button>}
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {!setup.data.assignments?.length && <p>{text("Chưa có phân công.", "No facility assignments.")}</p>}
        <form method="post" onSubmit={submit} key={`${revision}:${editing?.userId}:${editing?.facilityId}`} className="space-y-3">
          <fieldset disabled={operation.isPending}>
            <legend className="font-semibold">{editing ? text("Sửa phân công", "Edit assignment") : text("Thêm phân công", "Add assignment")}</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label>{text("Nhân sự đang hoạt động", "Active mill staff")} *
                <select name="userId" required defaultValue={editing?.userId ?? ""}>
                  <option value="" disabled>—</option>
                  {staff.map(row => <option key={row.id} value={row.id}>{row.displayName} · {row.email}</option>)}
                </select>
              </label>
              <label>{text("Cơ sở", "Facility")} *
                <select name="facilityId" required defaultValue={editing?.facilityId ?? ""}>
                  <option value="" disabled>—</option>
                  {facilities.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="submit" disabled={operation.isPending}>{text("Lưu phân công", "Save assignment")}</button>
            {editing && <button type="button" onClick={() => setEditing(null)}>{text("Hủy sửa", "Cancel edit")}</button>}
          </div>
        </form>
      </>}
    </Panel>
  </div>;
}
