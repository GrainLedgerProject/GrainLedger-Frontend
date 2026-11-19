import { useNavigate } from "react-router-dom";
import { dashboardPaths } from "@/features/dashboard/paths";
import { CorrectionRequestForm } from "../components/CorrectionRequestForm";

export function CorrectionRequestPage() {
  const navigate = useNavigate();
  const goHome = () => navigate(dashboardPaths.home, { replace: true });
  return <CorrectionRequestForm onClose={goHome} onCreated={goHome} />;
}
