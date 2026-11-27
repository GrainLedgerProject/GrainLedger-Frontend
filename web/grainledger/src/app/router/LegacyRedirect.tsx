import { Navigate, useLocation, useParams } from "react-router-dom";
import { labResultPath } from "@/features/compliance/paths";

export function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

export function LegacyLabReportRedirect() {
  const { id = "" } = useParams();
  const { search } = useLocation();
  return <Navigate to={`${labResultPath(id)}${search}`} replace />;
}
