import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/app/store/authStore";
import { planningEndpoints } from "@/api/planning";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { millPaths } from "../paths";

export function ApprovedPlanExecutionPage() {
  const text = useWorkflowText();
  const { planId = "" } = useParams();
  const canRead = useAuthStore(s => s.user?.permissions.includes("export-orders.read") ?? false);
  return <Workflow title={text("Thực thi phương án đã duyệt", "Approved plan execution")}>
    <Link to={millPaths.stock}>{text("Kiểm tra tồn kho", "Check stock")}</Link>
    {canRead ? <ExecutionSummary planId={planId}/> : <Panel title={text("Chờ bàn giao lệnh thực thi", "Awaiting execution handoff")}>
      <p role="status">{text("Màn hình chưa hiển thị danh sách lệnh bàn giao theo cơ sở. Quyền vận hành không bao gồm đọc phương án xuất khẩu của doanh nghiệp.", "This screen does not yet display facility-scoped work items. Operator permissions do not include reading company export plans.")}</p>
    </Panel>}
    <Panel title={text("Chưa thể bắt đầu thực thi", "Execution cannot start yet")}><p role="status">{text("Biểu mẫu ghi nhận mẻ sản xuất và bàn giao hàng đang được kết nối trên màn hình vận hành. Yêu cầu sản xuất đã gửi được lưu tại container.", "Production recording and stock handoff forms are pending integration on the operator screen. Submitted production requests are stored with the container.")}</p></Panel>
  </Workflow>;
}

function ExecutionSummary({ planId }: { planId: string }) {
  const text = useWorkflowText();
  const query = useQuery({ queryKey: ["execution-summary", planId], queryFn: async () => {
    const [plan, decision] = await Promise.all([planningEndpoints.getBlendPlan(planId), planningEndpoints.getDecision(planId)]);
    return { plan, decision };
  } });
  return <Panel title={text("Phương án và bảo lưu", "Plan and reservation")}><Feedback error={query.error} pending={query.isPending}/>
    {query.data && <><p>{query.data.plan.targetProductIdentity} · {query.data.plan.targetMassKg} kg · {query.data.decision.status}</p>
      <p>{text("Bảo lưu còn lại", "Remaining reservation")}: {query.data.decision.reservation.remainingKg} kg</p>
      <ul>{query.data.decision.reservation.lines.map((l, i) => <li key={i}>{l.lotId} · {l.locationId} · {l.remainingKg} kg</li>)}</ul>
      {!query.data.decision.activeApproval && <p role="alert">{text("Phương án không có phê duyệt còn hiệu lực.", "The plan has no active approval.")}</p>}
    </>}
  </Panel>;
}
